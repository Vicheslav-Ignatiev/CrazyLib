from django.db import models


class Customer(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=50, null=True, blank=True)
    passport = models.CharField(max_length=50, unique=True)
    email = models.EmailField(null=True, blank=True)
    birth_date = models.DateTimeField(null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    city_raw = models.CharField(max_length=255, null=True, blank=True)
    zip = models.CharField(max_length=20, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["last_name", "first_name"]),
            models.Index(fields=["phone"]),
        ]

    def __str__(self):
        return f"{self.last_name} {self.first_name} ({self.passport})"


class Book(models.Model):
    unique_id = models.CharField(max_length=36, unique=True)
    title = models.CharField(max_length=500)
    author_name = models.CharField(max_length=255, null=True, blank=True)
    description_html = models.TextField(null=True, blank=True)
    publication_date = models.DateTimeField(null=True, blank=True)
    image_url = models.URLField(max_length=1000, null=True, blank=True)

    # Count how many times this book was borrowed (all copies combined)
    total_borrowed = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["title"]),
            models.Index(fields=["author_name"]),
            models.Index(fields=["total_borrowed"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.unique_id})"


class BookCopy(models.Model):
    book = models.ForeignKey(Book, on_delete=models.PROTECT, related_name="copies")
    call_number = models.CharField(max_length=200, unique=True)

    # Availability for borrowing
    available = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["book"]),
            models.Index(fields=["available"]),
        ]

    def __str__(self):
        return f"{self.call_number} -> {self.book.title}"


class LibraryEvent(models.Model):
    class EventType(models.TextChoices):
        BORROW = "BORROW", "Borrow"
        RELEASE = "RELEASE", "Release"

    event_type = models.CharField(max_length=10, choices=EventType.choices)
    action_dt = models.DateTimeField()
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="events")
    book_copy = models.ForeignKey(BookCopy, on_delete=models.PROTECT, related_name="events")
    source_hash = models.CharField(max_length=64, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["customer", "action_dt"]),
            models.Index(fields=["book_copy", "action_dt"]),
            models.Index(fields=["event_type", "action_dt"]),
        ]

    def __str__(self):
        return f"{self.event_type} {self.action_dt} {self.customer_id} {self.book_copy_id}"