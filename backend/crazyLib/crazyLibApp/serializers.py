from rest_framework import serializers
from .models import Customer, Book, BookCopy, LibraryEvent


class CustomerSerializer(serializers.ModelSerializer):


    class Meta:
        model = Customer
        fields = [
            'id', 'first_name', 'last_name', 'phone',
            'passport', 'email', 'birth_date', 'address',
            'city_raw', 'zip', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class CustomerSearchSerializer(serializers.ModelSerializer):

    text = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = ['id', 'text', 'phone', 'passport']

    def get_text(self, obj):
        return f"{obj.last_name} {obj.first_name}"


class BookSerializer(serializers.ModelSerializer):

    copies_count = serializers.SerializerMethodField()
    available_copies = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            'id', 'unique_id', 'title', 'author_name',
            'description_html', 'publication_date', 'image_url',
            'copies_count', 'available_copies', 'total_borrowed',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_copies_count(self, obj):
        return obj.copies.count()

    def get_available_copies(self, obj):
        return obj.copies.filter(available=True).count()


class BookSearchSerializer(serializers.ModelSerializer):

    text = serializers.CharField(source='title')

    class Meta:
        model = Book
        fields = ['id', 'text', 'author_name', 'unique_id']


class BookCopySerializer(serializers.ModelSerializer):

    book_title = serializers.CharField(source='book.title', read_only=True)
    book_author = serializers.CharField(source='book.author_name', read_only=True)

    class Meta:
        model = BookCopy
        fields = [
            'id', 'book', 'call_number', 'book_title',
            'book_author', 'created_at'
        ]
        read_only_fields = ['created_at']


class BookCopySearchSerializer(serializers.ModelSerializer):

    text = serializers.SerializerMethodField()
    book_title = serializers.CharField(source='book.title', read_only=True)

    class Meta:
        model = BookCopy
        fields = ['id', 'text', 'call_number', 'book_title']

    def get_text(self, obj):
        return f"{obj.call_number} - {obj.book.title}"


class LibraryEventSerializer(serializers.ModelSerializer):

    customer_name = serializers.SerializerMethodField()
    book_title = serializers.CharField(source='book_copy.book.title', read_only=True)

    class Meta:
        model = LibraryEvent
        fields = [
            'id', 'event_type', 'action_dt', 'customer',
            'customer_name', 'book_copy', 'book_title',
            'source_hash', 'created_at'
        ]
        read_only_fields = ['created_at']

    def get_customer_name(self, obj):
        return f"{obj.customer.last_name} {obj.customer.first_name}"