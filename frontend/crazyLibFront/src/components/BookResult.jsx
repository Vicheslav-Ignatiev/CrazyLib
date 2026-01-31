import React from 'react';
import './css/BookResult.css';

const BookResult = ({ bookDetails, isLoading }) => {
    if (isLoading) {
        return <div className="book-result">Loading book data...</div>;
    }

    if (!bookDetails) {
        return (
            <div className="book-result hint">
                Select a book to see details
            </div>
        );
    }

    return (
        <div className="book-result">
            <h3>Book overview</h3>

            <div className="book-meta">
                <div><strong>Title:</strong> {bookDetails.title}</div>
                <div><strong>Author:</strong> {bookDetails.author_name || '-'}</div>
                <div><strong>UID:</strong> {bookDetails.unique_id}</div>
            </div>

            <div className="book-stats">
                <div className="stat-card">
                    <span className="stat-label">Total copies</span>
                    <span className="stat-value">{bookDetails.copies_count || 0}</span>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Available copies</span>
                    <span className="stat-value">{bookDetails.available_copies || 0}</span>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Times borrowed</span>
                    <span className="stat-value">{bookDetails.total_borrowed || 0}</span>
                </div>
            </div>
        </div>
    );
};

export default BookResult;