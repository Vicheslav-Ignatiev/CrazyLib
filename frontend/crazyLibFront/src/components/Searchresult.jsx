import React from 'react';
import './css/Searchresult.css';

const SearchResult = ({ customerDetails, isLoading }) => {
    // Format date to dd/mm/yyyy
    const formatDate = (dateString) => {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();

            return `${day}/${month}/${year}`;
        } catch (error) {
            return dateString; // Return original if formatting fails
        }
    };

    return (
        <div className="search-result">
            <h3>Personal info</h3>
            {isLoading ? (
                <p className="loading">Loading customer details...</p>
            ) : customerDetails ? (
                <div className="customer-details">
                    <div className="detail-row">
                        <label className="detail-label">Name:</label>
                        <input
                            type="text"
                            className="detail-input"
                            value={`${customerDetails.first_name} ${customerDetails.last_name}`}
                            readOnly
                        />
                    </div>

                    <div className="detail-row">
                        <label className="detail-label">Email:</label>
                        <input
                            type="email"
                            className="detail-input"
                            value={customerDetails.email || ''}
                            readOnly
                        />
                    </div>

                    <div className="detail-row">
                        <label className="detail-label">Date of birth:</label>
                        <input
                            type="text"
                            className="detail-input"
                            value={formatDate(customerDetails.birth_date)}
                            readOnly
                        />
                    </div>

                    <div className="detail-row">
                        <label className="detail-label">Address:</label>
                        <input
                            type="text"
                            className="detail-input"
                            value={customerDetails.address || ''}
                            readOnly
                        />
                    </div>
                </div>
            ) : (
                <p className="no-selection">Select a customer from search to see details</p>
            )}
        </div>
    );
}

export default SearchResult;