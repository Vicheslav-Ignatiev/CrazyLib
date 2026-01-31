"""
Updated import command with borrow count tracking
File: crazyLibApp/management/commands/import_logs.py

Counts BORROW events per book and sets availability
"""

import json
import hashlib
from datetime import datetime
from collections import defaultdict

from ...models import Customer, Book, BookCopy, LibraryEvent
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime


def normalize_event_type(value: str) -> str:
    v = (value or "").strip().lower()
    if v == "borrow":
        return LibraryEvent.EventType.BORROW
    if v == "release":
        return LibraryEvent.EventType.RELEASE
    raise ValueError(f"Unknown event Type: {value!r}")


def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def safe_parse_datetime(dt_string):
    """Parse datetime with timezone awareness - FIXES WARNING"""
    if not dt_string:
        return None

    try:
        dt = parse_datetime(dt_string)
        if not dt:
            formats = ['%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d']
            for fmt in formats:
                try:
                    dt = datetime.strptime(str(dt_string), fmt)
                    break
                except ValueError:
                    continue

        if dt and timezone.is_naive(dt):
            dt = timezone.make_aware(dt)  # FIX TIMEZONE WARNING

        return dt
    except Exception:
        return None


def iter_records(file_path: str):
    """supports JSON Lines, JSON Array, Single JSON object"""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read().strip()

    if not content:
        return

    if content[0] in "[{":
        data = json.loads(content)
        if isinstance(data, list):
            for r in data:
                if isinstance(r, dict):
                    yield r
        elif isinstance(data, dict):
            yield data
        else:
            raise ValueError("Unsupported JSON root type")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            yield json.loads(line)


def extract_call_number(record: dict) -> str:
    """Extract LibraryCallNumber from a record"""
    book_block = record.get("Book") or {}
    return (book_block.get("LibraryCallNumber") or "").strip()


def find_books_with_logic_errors(records: list) -> set:
    """bad logs detection"""
    books_events = {}

    for record in records:
        call_num = extract_call_number(record)
        if not call_num:
            continue

        try:
            event_type = normalize_event_type(record.get("Type"))
        except ValueError:
            continue

        action_dt_raw = record.get("ActionDateTime")
        action_dt = safe_parse_datetime(action_dt_raw)

        if not action_dt:
            continue

        if call_num not in books_events:
            books_events[call_num] = []

        books_events[call_num].append({
            'type': event_type,
            'datetime': action_dt,
        })

        #example
        #books_events["CALL001"] = [
        #    {'type': 'BORROW', 'datetime': '2023-01-15'},
        #    {'type': 'RELEASE', 'datetime': '2023-01-25'},
        #    {'type': 'BORROW', 'datetime': '2023-02-01'}
        #]

    error_books = set()

    for call_num, events in books_events.items():
        events.sort(key=lambda x: x['datetime'])

        for i in range(1, len(events)):
            prev_type = events[i-1]['type']
            curr_type = events[i]['type']

            if prev_type == curr_type:
                error_books.add(call_num)
                break

    return error_books


def calculate_book_stats(records: list, error_call_numbers: set):
    """Calculate availability and borrow counts"""
    copy_states = {}  # call_number -> final availability
    book_borrow_counts = defaultdict(int)  # unique_id -> total borrow count

    # Group events by call_number and book
    for record in records:
        call_num = extract_call_number(record)
        if not call_num or call_num in error_call_numbers:
            continue

        # Extract book unique_id
        book_block = record.get("Book") or {}
        lc = (book_block.get("Literary Creation")
              or book_block.get("LiteraryCreation") or {})
        unique_id = (lc.get("UniqueID") or "").strip()

        if not unique_id:
            continue

        try:
            event_type = normalize_event_type(record.get("Type"))
            action_dt = safe_parse_datetime(record.get("ActionDateTime"))

            if not action_dt:
                continue

            # Count BORROW events for this book
            if event_type == LibraryEvent.EventType.BORROW:
                book_borrow_counts[unique_id] += 1

            # Track events for availability calculation
            if call_num not in copy_states:
                copy_states[call_num] = []

            copy_states[call_num].append({
                'type': event_type,
                'datetime': action_dt
            })
        except ValueError:
            continue

    # Calculate final availability for each copy
    final_availability = {}
    for call_num, events in copy_states.items():
        events.sort(key=lambda x: x['datetime'])

        # Start as available
        is_available = True

        # Process events chronologically
        for event in events:
            if event['type'] == LibraryEvent.EventType.BORROW:
                is_available = False
            elif event['type'] == LibraryEvent.EventType.RELEASE:
                is_available = True

        final_availability[call_num] = is_available

    return final_availability, dict(book_borrow_counts)


class Command(BaseCommand):
    help = "Import library logs with borrow count tracking"

    def add_arguments(self, parser):
        parser.add_argument("file_path", type=str)
        parser.add_argument("--dry-run", action="store_true", help="Parse but do not write to DB")
        parser.add_argument("--limit", type=int, default=None, help="Process only first N records")

    def handle(self, *args, **options):
        file_path = options["file_path"]
        dry_run = options["dry_run"]
        limit = options["limit"]

        self.stdout.write(f"Importing logs from: {file_path}")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN: no writes to DB"))

        try:
            all_records = list(iter_records(file_path))
        except FileNotFoundError:
            raise CommandError(f"File not found: {file_path}")
        except json.JSONDecodeError as e:
            raise CommandError(f"Invalid JSON: {e}")

        # Find logic errors
        error_call_numbers = find_books_with_logic_errors(all_records)

        # Calculate stats
        availability_states, borrow_counts = calculate_book_stats(all_records, error_call_numbers)

        if error_call_numbers:
            self.stdout.write(self.style.WARNING(
                f"Found {len(error_call_numbers)} books with logic errors (will be excluded)"
            ))

        self.stdout.write(f"Calculated borrow counts for {len(borrow_counts)} books")

        processed = 0
        created_events = 0
        skipped_events = 0
        excluded_errors = 0

        try:
            for record in all_records:
                processed += 1
                if limit and processed > limit:
                    break

                # Extract customer data
                cust = record.get("Customer") or {}
                passport = (cust.get("Passport") or "").strip()
                if not passport:
                    skipped_events += 1
                    continue

                # Extract book data
                book_block = record.get("Book") or {}
                lc = (book_block.get("Literary Creation")
                      or book_block.get("LiteraryCreation") or {})

                unique_id = (lc.get("UniqueID") or "").strip()
                title = (lc.get("Title") or "").strip()
                if not unique_id or not title:
                    skipped_events += 1
                    continue

                author = lc.get("Author") or {}
                author_name = author.get("Name") if isinstance(author, dict) else None

                call_number = (book_block.get("LibraryCallNumber") or "").strip()
                if not call_number:
                    skipped_events += 1
                    continue

                # Check for logic errors
                if call_number in error_call_numbers:
                    excluded_errors += 1
                    continue

                event_type = normalize_event_type(record.get("Type"))
                action_dt = safe_parse_datetime(record.get("ActionDateTime"))
                if action_dt is None:
                    skipped_events += 1
                    continue

                source_hash = sha256_hex(f"{event_type}|{action_dt}|{passport}|{call_number}")

                if dry_run:
                    continue

                # DATABASE OPERATIONS
                with transaction.atomic():
                    # Create/update customer
                    customer_obj, _ = Customer.objects.update_or_create(
                        passport=passport,
                        defaults={
                            "first_name": cust.get("FirstName") or "",
                            "last_name": cust.get("LastName") or "",
                            "phone": cust.get("PhoneNumber"),
                            "email": cust.get("Email"),
                            "birth_date": safe_parse_datetime(cust.get("BirthDate")),
                            "address": cust.get("Address"),
                            "city_raw": cust.get("City"),
                            "zip": cust.get("Zip"),
                        },
                    )

                    # Create/update book with borrow count
                    book_total_borrowed = borrow_counts.get(unique_id, 0)
                    book_obj, _ = Book.objects.update_or_create(
                        unique_id=unique_id,
                        defaults={
                            "title": title,
                            "author_name": author_name,
                            "description_html": lc.get("Description"),
                            "publication_date": safe_parse_datetime(book_block.get("PublicationDate")),
                            "image_url": book_block.get("Image_url"),
                            "total_borrowed": book_total_borrowed,  # NEW FIELD - count of BORROW events
                        },
                    )

                    # Create/update book copy with calculated availability
                    copy_available = availability_states.get(call_number, True)
                    copy_obj, _ = BookCopy.objects.update_or_create(
                        call_number=call_number,
                        defaults={
                            "book": book_obj,
                            "available": copy_available,  # NEW FIELD - calculated state
                        },
                    )

                    # Create event
                    event_obj, created = LibraryEvent.objects.get_or_create(
                        source_hash=source_hash,
                        defaults={
                            "event_type": event_type,
                            "action_dt": action_dt,
                            "customer": customer_obj,
                            "book_copy": copy_obj,
                        },
                    )

                    if created:
                        created_events += 1
                    else:
                        skipped_events += 1

        except Exception as e:
            raise CommandError(str(e))

        self.stdout.write(self.style.SUCCESS(
            f"Done. processed={processed}, created_events={created_events}, "
            f"skipped_events={skipped_events}, excluded_errors={excluded_errors}"
        ))

        # Show final statistics
        self.stdout.write(f"\nFinal database state:")
        self.stdout.write(f"  Books: {Book.objects.count()}")
        self.stdout.write(f"  Book Copies: {BookCopy.objects.count()}")
        self.stdout.write(f"  Available Copies: {BookCopy.objects.filter(available=True).count()}")
        self.stdout.write(f"  Borrowed Copies: {BookCopy.objects.filter(available=False).count()}")
        self.stdout.write(f"  Customers: {Customer.objects.count()}")
        self.stdout.write(f"  Events: {LibraryEvent.objects.count()}")
