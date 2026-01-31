"""
URL configuration for crazyLibApp
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomerViewSet,
    BookViewSet,
    BookCopyViewSet,
    LibraryEventViewSet
)

# Create router
router = DefaultRouter()

# Register ViewSets
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'books', BookViewSet, basename='book')
router.register(r'book-copies', BookCopyViewSet, basename='bookcopy')
router.register(r'events', LibraryEventViewSet, basename='libraryevent')

urlpatterns = [
    path('', include(router.urls)),
]

"""
Automatically created URL endpoints:

CUSTOMERS:
- GET    /api/customers/              - List all customers
- POST   /api/customers/              - Create customer
- GET    /api/customers/{id}/         - Get customer
- PUT    /api/customers/{id}/         - Update customer (full)
- PATCH  /api/customers/{id}/         - Update customer (partial)
- DELETE /api/customers/{id}/         - Delete customer
- GET    /api/customers/search/?q=    - Autocomplete search

BOOKS:
- GET    /api/books/                  - List all books
- POST   /api/books/                  - Create book
- GET    /api/books/{id}/             - Get book
- PUT    /api/books/{id}/             - Update book
- PATCH  /api/books/{id}/             - Update book (partial)
- DELETE /api/books/{id}/             - Delete book
- GET    /api/books/search/?q=        - Autocomplete search

BOOK COPIES:
- GET    /api/book-copies/            - List all copies
- POST   /api/book-copies/            - Create copy
- GET    /api/book-copies/{id}/       - Get copy
- PUT    /api/book-copies/{id}/       - Update copy
- PATCH  /api/book-copies/{id}/       - Update copy (partial)
- DELETE /api/book-copies/{id}/       - Delete copy
- GET    /api/book-copies/search/?q=  - Autocomplete search

LIBRARY EVENTS:
- GET    /api/events/                 - List all events
- POST   /api/events/                 - Create event
- GET    /api/events/{id}/            - Get event
- PUT    /api/events/{id}/            - Update event
- PATCH  /api/events/{id}/            - Update event (partial)
- DELETE /api/events/{id}/            - Delete event
"""