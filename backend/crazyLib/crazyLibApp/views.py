from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Exists, OuterRef
from .models import Customer, Book, BookCopy, LibraryEvent
from django.utils import timezone
from rest_framework import status
from .serializers import (
    CustomerSerializer, CustomerSearchSerializer,
    BookSerializer, BookSearchSerializer,
    BookCopySerializer, BookCopySearchSerializer,
    LibraryEventSerializer
)
from django.db import transaction

# Search configuration
SEARCH_MAX_RESULTS = 10


class FirstLetterSearchMixin:
    """
    Mixin for searching by first letters of each word with OR logic
    """
    search_fields = []  # Override in each ViewSet

    def get_search_queryset(self, queryset, query):
        """
        Search by first letters of each word
        """
        if not query:
            return queryset.none()

        # Split query into words
        words = query.strip().split()

        # Create Q objects for each word and each field
        q_objects = Q()
        for word in words:
            for field in self.search_fields:
                q_objects |= Q(**{f"{field}__istartswith": word})

        return queryset.filter(q_objects)


class CustomerViewSet(FirstLetterSearchMixin, viewsets.ModelViewSet):
    """
    ViewSet for working with customers

    CRUD operations:
    - list: GET /api/customers/
    - create: POST /api/customers/
    - retrieve: GET /api/customers/{id}/
    - update: PUT /api/customers/{id}/
    - partial_update: PATCH /api/customers/{id}/
    - destroy: DELETE /api/customers/{id}/

    Additional endpoints:
    - search: GET /api/customers/search/?q=query
    """
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    search_fields = ['first_name', 'last_name', 'phone', 'passport']

    def get_search_queryset(self, queryset, query):
        if not query:
            return queryset.none()

        tokens = [t for t in query.strip().split() if t]
        if not tokens:
            return queryset.none()

        # 1 token -> simple OR across all fields
        if len(tokens) == 1:
            t = tokens[0]
            q = (
                    Q(first_name__istartswith=t) |
                    Q(last_name__istartswith=t) |
                    Q(phone__istartswith=t) |
                    Q(passport__istartswith=t)
            )
            return queryset.filter(q)

        # 2+ tokens -> initials match: first token ~ first_name, second token ~ last_name
        t1, t2 = tokens[0], tokens[1]

        name_q = (
                (Q(first_name__istartswith=t1) & Q(last_name__istartswith=t2)) |
                (Q(first_name__istartswith=t2) & Q(last_name__istartswith=t1))  # allow reversed order
        )

        # Optional: also allow matching phone/passport by ANY token (OR)
        extra_q = Q()
        for t in tokens:
            extra_q |= Q(phone__istartswith=t) | Q(passport__istartswith=t)

        return queryset.filter(name_q | extra_q)


    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Autocomplete search for customers by first letters
        GET /api/customers/search/?q=john
        """
        query = request.query_params.get('q', '').strip()

        if not query:
            return Response({
                'suggestions': [],
                'count': 0
            })

        # Get search results
        results = self.get_search_queryset(self.queryset, query)

        # Limit number of results
        results = results[:SEARCH_MAX_RESULTS]

        # Use simplified serializer for autocomplete
        serializer = CustomerSearchSerializer(results, many=True)

        return Response({
            'suggestions': serializer.data,
            'count': len(serializer.data)
        })

    @action(detail=True, methods=['get'])
    def borrowed(self, request, pk=None):
        """
        Books currently borrowed by this customer (BORROW without later RELEASE)
        GET /api/customers/{id}/borrowed/
        """
        customer = self.get_object()

        borrows = LibraryEvent.objects.filter(
            customer=customer,
            event_type=LibraryEvent.EventType.BORROW
        )

        later_release = LibraryEvent.objects.filter(
            book_copy=OuterRef('book_copy'),
            event_type=LibraryEvent.EventType.RELEASE,
            action_dt__gt=OuterRef('action_dt')
        )

        borrows = borrows.annotate(has_later_release=Exists(later_release)).filter(has_later_release=False)

        # select_related to avoid N+1
        borrows = borrows.select_related('book_copy', 'book_copy__book').order_by('-action_dt')[:SEARCH_MAX_RESULTS]

        data = [{
            "event_id": e.id,
            "borrowed_on": e.action_dt,
            "id": e.book_copy.book.id,
            "title": e.book_copy.book.title,
            "author": e.book_copy.book.author_name,
            "book_copy_id": e.book_copy.id,
        } for e in borrows]

        return Response({
            "results": data,
            "count": len(data)
        })

    @action(detail=True, methods=['post'], url_path='return')
    def return_book(self, request, pk=None):
        customer = self.get_object()

        borrow_event_id = request.data.get("borrow_event_id")
        if not borrow_event_id:
            return Response({"detail": "borrow_event_id is required"},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            borrow_event = LibraryEvent.objects.select_related("book_copy", "book_copy__book").get(
                id=borrow_event_id,
                customer=customer,
                event_type=LibraryEvent.EventType.BORROW
            )
        except LibraryEvent.DoesNotExist:
            return Response({"detail": "Borrow event not found for this customer"},
                            status=status.HTTP_404_NOT_FOUND)

        already_returned = LibraryEvent.objects.filter(
            book_copy=borrow_event.book_copy,
            event_type=LibraryEvent.EventType.RELEASE,
            action_dt__gt=borrow_event.action_dt
        ).exists()
        if already_returned:
            return Response({"detail": "This book is already returned"},
                            status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():

            copy = BookCopy.objects.select_for_update().get(id=borrow_event.book_copy_id)


            copy.available = True
            copy.save(update_fields=["available"])

            release_event = LibraryEvent.objects.create(
                event_type=LibraryEvent.EventType.RELEASE,
                action_dt=timezone.now(),
                customer=customer,
                book_copy=copy
            )

        return Response({"status": "ok", "release_event_id": release_event.id},
                        status=status.HTTP_201_CREATED)



    @action(detail=True, methods=['post'])
    def borrow(self, request, pk=None):
        """
        Borrow a book for this customer
        POST /api/customers/{id}/borrow/
        Body: {"book_id": 123}
        """
        customer = self.get_object()

        book_id = request.data.get("book_id")
        if not book_id:
            return Response({"detail": "book_id is required"},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            # Check if book exists
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({"detail": "Book not found"},
                            status=status.HTTP_404_NOT_FOUND)

        # Find available copy
        available_copy = BookCopy.objects.filter(
            book_id=book_id,
            available=True
        ).first()

        if not available_copy:
            return Response({"detail": f"No available copies of '{book.title}'"},
                            status=status.HTTP_400_BAD_REQUEST)

        # Create borrow event and update counters
        with transaction.atomic():
            # Mark copy as unavailable
            available_copy.available = False
            available_copy.save(update_fields=["available"])

            # Increment book borrow counter
            book.total_borrowed += 1
            book.save(update_fields=["total_borrowed"])

            # Create borrow event
            borrow_event = LibraryEvent.objects.create(
                event_type=LibraryEvent.EventType.BORROW,
                action_dt=timezone.now(),
                customer=customer,
                book_copy=available_copy
            )

        return Response({
            "status": "ok",
            "borrow_event_id": borrow_event.id,
            "book_title": book.title
        }, status=status.HTTP_201_CREATED)



    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Complete borrowing history for this customer
        GET /api/customers/{id}/history/
        """
        customer = self.get_object()

        # Get all BORROW events for this customer
        borrows = LibraryEvent.objects.filter(
            customer=customer,
            event_type=LibraryEvent.EventType.BORROW
        ).select_related('book_copy', 'book_copy__book').order_by('-action_dt')[:50]

        data = []
        for borrow in borrows:
            # Find corresponding RELEASE event
            release = LibraryEvent.objects.filter(
                book_copy=borrow.book_copy,
                event_type=LibraryEvent.EventType.RELEASE,
                action_dt__gt=borrow.action_dt
            ).first()

            data.append({
                "borrow_event_id": borrow.id,
                "borrowed_on": borrow.action_dt,
                "returned_on": release.action_dt if release else None,
                "book_id": borrow.book_copy.book.id,
                "title": borrow.book_copy.book.title,
                "author": borrow.book_copy.book.author_name,
                "book_copy_id": borrow.book_copy.id,
                "status": "returned" if release else "currently borrowed"
            })

        return Response({
            "results": data,
            "count": len(data)
        })



class BookViewSet(viewsets.ModelViewSet):
    """
    ViewSet for working with books

    CRUD operations + search endpoint
    """
    queryset = Book.objects.all()
    serializer_class = BookSerializer

    def get_book_search_queryset(self, queryset, query):
        """
        Search books by substring in title, author, or UID
        More strict than FirstLetterSearchMixin - requires full substring match
        """
        if not query:
            return queryset.none()

        query = query.strip()
        if not query:
            return queryset.none()

        # Use icontains for substring search (not istartswith by words)
        q_objects = (
                Q(title__icontains=query) |
                Q(author_name__icontains=query) |
                Q(unique_id__icontains=query)
        )

        return queryset.filter(q_objects)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Autocomplete search for books by substring
        GET /api/books/search/?q=harry
        """
        query = request.query_params.get('q', '').strip()

        if not query:
            return Response({
                'suggestions': [],
                'count': 0
            })

        # Use the new search method
        results = self.get_book_search_queryset(self.queryset, query)
        results = results[:SEARCH_MAX_RESULTS]

        serializer = BookSearchSerializer(results, many=True)

        return Response({
            'suggestions': serializer.data,
            'count': len(serializer.data)
        })


class BookCopyViewSet(FirstLetterSearchMixin, viewsets.ModelViewSet):
    """
    ViewSet for working with book copies

    CRUD operations + search endpoint
    """
    queryset = BookCopy.objects.select_related('book').all()
    serializer_class = BookCopySerializer
    search_fields = ['call_number', 'book__title']

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Autocomplete search for book copies
        GET /api/book-copies/search/?q=call123
        """
        query = request.query_params.get('q', '').strip()

        if not query:
            return Response({
                'suggestions': [],
                'count': 0
            })

        results = self.get_search_queryset(self.queryset, query)
        results = results[:SEARCH_MAX_RESULTS]

        serializer = BookCopySearchSerializer(results, many=True)

        return Response({
            'suggestions': serializer.data,
            'count': len(serializer.data)
        })


class LibraryEventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for working with library events (borrow/return)

    CRUD operations for events
    """
    queryset = LibraryEvent.objects.select_related(
        'customer', 'book_copy', 'book_copy__book'
    ).all()
    serializer_class = LibraryEventSerializer

    # Can add filtering by event type, date, customer, etc.
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['action_dt', 'created_at']
    ordering = ['-action_dt']