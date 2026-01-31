import React, { useState } from 'react';
import apiService from '../services/apiService';
import './css/Searchbar.css';

const SearchBar = ({ onSelectSuggestion }) => {
    const [showPopup, setShowPopup] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = async (e) => {
        const value = e.target.value;
        setSearchValue(value);

        if (value.trim().length > 0) {
            setIsLoading(true);
            try {
                // Real API call to Django backend
                const response = await apiService.searchCustomers(value);
                setSuggestions(response.suggestions || []);
                setShowPopup(true);
            } catch (error) {
                console.error('Search error:', error);
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        } else {
            setSuggestions([]);
            setShowPopup(false);
        }
    };

    const handleFocus = async () => {
        if (searchValue.trim().length > 0) {
            setShowPopup(true);
        }
    };

    const handleBlur = () => {
        // Delay to allow click on suggestion
        setTimeout(() => setShowPopup(false), 200);
    };

    const handleSelectSuggestion = (suggestion) => {
        setSearchValue(suggestion.text);
        setShowPopup(false);

        if (onSelectSuggestion) {
            onSelectSuggestion(suggestion);
        }
    };

    return (
        <div className="search-bar">
            <div className="search-wrapper">
                <input
                    type="text"
                    placeholder="Search customer (name, phone, passport)..."
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
                            suggestions.map((suggestion) => (
                                <div
                                    key={suggestion.id}
                                    className="popup-item"
                                    onClick={() => handleSelectSuggestion(suggestion)}
                                >
                                    <div className="suggestion-main">{suggestion.text}</div>
                                    <div className="suggestion-details">
                                        {suggestion.phone && <span>phone: {suggestion.phone}</span>}
                                        {suggestion.passport && <span>ID: {suggestion.passport}</span>}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="popup-item no-results">No results found</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default SearchBar;