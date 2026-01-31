import React, { useState, useEffect, useRef } from 'react';
import apiService from '../services/apiService';
import './css/BookSearchbar.css';

const BookSearchbar = ({
                           onBookSelect,
                           onAction,
                           mode = 'view', // 'view' | 'action'
                           actionLabel = 'Select',
                           showBookInfo = true,
                           placeholder = 'Search book (title, author, UID)...',
                           className = ''
                       }) => {
    const [showPopup, setShowPopup] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedBook, setSelectedBook] = useState(null);

    // Fix for race conditions and stale requests
    const currentSearchRef = useRef('');
    const searchTimeoutRef = useRef(null);
    const requestIdRef = useRef(0);

    // Debounced search effect
    useEffect(() => {
        const searchTerm = searchValue.trim();

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // If empty search, clear everything immediately
        if (searchTerm.length === 0) {
            setSuggestions([]);
            setShowPopup(false);
            setSelectedBook(null);
            currentSearchRef.current = '';
            onBookSelect?.(null);
            return;
        }

        // Generate unique request ID
        const currentRequestId = ++requestIdRef.current;

        // Debounce the search
        searchTimeoutRef.current = setTimeout(async () => {
            // Store current search term to detect stale responses
            currentSearchRef.current = searchTerm;

            setIsLoading(true);
            try {
                const response = await apiService.searchBooks(searchTerm);

                // Check if this response is still relevant
                const isStillCurrent = currentSearchRef.current === searchTerm && currentRequestId === requestIdRef.current;

                if (isStillCurrent) {
                    setSuggestions(response.suggestions || []);
                    setShowPopup(true);
                }
            } catch (error) {
                console.error('Book search error:', error);
                const isStillCurrent = currentSearchRef.current === searchTerm && currentRequestId === requestIdRef.current;
                if (isStillCurrent) {
                    setSuggestions([]);
                }
            } finally {
                const isStillCurrent = currentSearchRef.current === searchTerm && currentRequestId === requestIdRef.current;
                if (isStillCurrent) {
                    setIsLoading(false);
                }
            }
        }, 300); // 300ms debounce

        // Cleanup function
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchValue, onBookSelect]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchValue(value);

        // Clear selected book immediately when typing
        if (selectedBook && value !== selectedBook.title) {
            setSelectedBook(null);
            onBookSelect?.(null);
        }
    };

    const handleFocus = () => {
        if (searchValue.trim().length > 0 && suggestions.length > 0) {
            setShowPopup(true);
        }
    };

    const handleBlur = () => {
        // Delay to allow click on suggestion
        setTimeout(() => setShowPopup(false), 200);
    };

    const handleSelectSuggestion = async (suggestion) => {
        // Clear any pending searches
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        setSearchValue(suggestion.text);
        setShowPopup(false);
        setIsLoading(true);

        try {
            const fullBook = await apiService.getBook(suggestion.id);
            setSelectedBook(fullBook);
            onBookSelect?.(fullBook);
        } catch (error) {
            console.error('Error loading book details:', error);
            setSelectedBook(null);
            onBookSelect?.(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = () => {
        if (selectedBook && onAction) {
            onAction(selectedBook);
        }
    };

    const clearSelection = () => {
        // Clear any pending searches
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        setSearchValue('');
        setSelectedBook(null);
        setSuggestions([]);
        setShowPopup(false);
        currentSearchRef.current = '';
        onBookSelect?.(null);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className={`search-book ${className}`}>
            {/* Search Input */}
            <div className="search-book-input-section">
                <div className="search-wrapper">
                    <input
                        type="text"
                        placeholder={placeholder}
                        className="search-input"
                        value={searchValue}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />

                    {showPopup && (
                        <div className="search-popup">
                            {isLoading ? (
                                <div className="popup-item loading">Loading...</div>
                            ) : suggestions.length > 0 ? (
                                suggestions.map((s) => (
                                    <div
                                        key={s.id}
                                        className="popup-item"
                                        onClick={() => handleSelectSuggestion(s)}
                                    >
                                        <div className="suggestion-main">{s.text}</div>
                                        <div className="suggestion-details">
                                            {s.author_name && <span>author: {s.author_name}</span>}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="popup-item no-results">No books found</div>
                            )}
                        </div>
                    )}
                </div>

                {(selectedBook || searchValue) && (
                    <button
                        className="clear-selection-btn"
                        onClick={clearSelection}
                        title="Clear selection"
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Selected Book Info */}
            {selectedBook && showBookInfo && (
                <div className="selected-book-info">
                    <div className="book-preview">
                        <div className="book-main-info">
                            <h4 className="book-title">{selectedBook.title}</h4>
                            <div className="book-meta">
                                {selectedBook.author_name && (
                                    <span className="book-author">by {selectedBook.author_name}</span>
                                )}
                                <span className="book-uid">UID: {selectedBook.unique_id}</span>
                                <span className="book-copies">
                                    {selectedBook.copies_count || 0} copies
                                </span>
                            </div>
                        </div>

                        {mode === 'action' && onAction && (
                            <button
                                className="action-btn"
                                onClick={handleAction}
                            >
                                {actionLabel}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Empty State for Action Mode */}
            {mode === 'action' && !selectedBook && !searchValue && (
                <div className="empty-state">
                    <div className="empty-icon">📚</div>
                    <p>Search and select a book to continue</p>
                </div>
            )}
        </div>
    );
};

export default BookSearchbar;