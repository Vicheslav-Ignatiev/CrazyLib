import React, { useState } from 'react';
import apiService from '../services/apiService';

const BorrowBook = ({ customerDetails, onBorrowSuccess }) => {
    const [bookId, setBookId] = useState('');
    const [bookData, setBookData] = useState(null);
    const [availableCopy, setAvailableCopy] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isBorrowing, setIsBorrowing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const searchBookCopy = async () => {
        if (!bookId.trim()) {
            setErrorMessage('Please enter book ID');
            return;
        }

        setIsSearching(true);
        setErrorMessage('');
        setBookData(null);
        setAvailableCopy(null);

        try {
            // First, find the book by ID or unique_id
            const book = await apiService.getBook(bookId.trim());
            setBookData(book);

            // Then check for available copies
            if (book.available_copies > 0) {
                // We have available copies - the actual copy will be selected by backend
                setAvailableCopy({ book_id: book.id });
            } else {
                setErrorMessage(`Book "${book.title}" has no available copies (${book.available_copies}/${book.copies_count})`);
            }
        } catch (error) {
            console.error('Book search error:', error);
            setErrorMessage(`Book with ID "${bookId}" not found`);
        } finally {
            setIsSearching(false);
        }
    };

    const handleBorrowConfirm = async () => {
        if (!customerDetails?.id || !bookData?.id) return;

        setIsBorrowing(true);
        try {
            // Call borrow API endpoint
            await apiService.borrowBook(customerDetails.id, bookData.id);

            // Reset form
            setBookId('');
            setBookData(null);
            setAvailableCopy(null);
            setErrorMessage('');

            // Notify parent component
            onBorrowSuccess?.();

        } catch (error) {
            console.error('Borrow failed:', error);
            setErrorMessage(error.message || 'Failed to borrow book');
        } finally {
            setIsBorrowing(false);
        }
    };

    const handleCancel = () => {
        setBookData(null);
        setAvailableCopy(null);
        setErrorMessage('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            searchBookCopy();
        }
    };

    return (
        <div className="borrow-book">
            <div className="borrow-form">
                <div className="input-section">
                    <label htmlFor="bookId" className="input-label">
                        Book ID or Unique ID:
                    </label>
                    <div className="input-group">
                        <input
                            id="bookId"
                            type="text"
                            className="book-id-input"
                            value={bookId}
                            onChange={(e) => setBookId(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Enter book ID..."
                            disabled={isSearching || isBorrowing}
                        />
                        <button
                            className="search-book-btn"
                            onClick={searchBookCopy}
                            disabled={isSearching || isBorrowing}
                        >
                            {isSearching ? 'Searching...' : ' Find'}
                        </button>
                    </div>
                </div>

                {errorMessage && (
                    <div className="error-message">
                         {errorMessage}
                    </div>
                )}

                {bookData && availableCopy && (
                    <div className="book-confirmation">
                        <div className="book-info">
                            <h4> Found Book:</h4>
                            <div className="book-details">
                                <div><strong>Title:</strong> {bookData.title}</div>
                                <div><strong>Author:</strong> {bookData.author_name || '-'}</div>
                                <div><strong>Available:</strong> {bookData.available_copies}/{bookData.copies_count} copies</div>
                            </div>
                        </div>

                        <div className="confirmation-question">
                            <p>Do you want to borrow this book for <strong>{customerDetails?.first_name} {customerDetails?.last_name}</strong>?</p>

                            <div className="confirmation-buttons">
                                <button
                                    className="borrow-confirm-btn"
                                    onClick={handleBorrowConfirm}
                                    disabled={isBorrowing}
                                >
                                    {isBorrowing ? 'Borrowing...' : 'Borrow'}
                                </button>
                                <button
                                    className="cancel-btn"
                                    onClick={handleCancel}
                                    disabled={isBorrowing}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BorrowBook;