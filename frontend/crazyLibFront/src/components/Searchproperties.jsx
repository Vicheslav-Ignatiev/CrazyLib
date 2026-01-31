import React, { useEffect, useState } from 'react';
import apiService from '../services/apiService';
import BorrowBook from './BorrowBook';
import './css/Searchproperties.css';

const SearchProperties = ({ customerDetails }) => {
    const [activeSubTab, setActiveSubTab] = useState('borrowed'); // borrowed | history | borrow
    const [borrowed, setBorrowed] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [returningId, setReturningId] = useState(null);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const loadBorrowed = async () => {
        if (!customerDetails?.id) {
            setBorrowed([]);
            return;
        }

        setIsLoading(true);
        try {
            const res = await apiService.getCustomerBorrowed(customerDetails.id);
            setBorrowed(res.results || []);
        } catch (e) {
            console.error('Failed to load borrowed books:', e);
            setBorrowed([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setActiveSubTab('borrowed');
        loadBorrowed();
    }, [customerDetails?.id]);

    const handleReturn = async (borrowEventId) => {
        if (!customerDetails?.id) return;

        setReturningId(borrowEventId);
        try {
            await apiService.returnBook(customerDetails.id, borrowEventId);
            await loadBorrowed();
        } catch (e) {
            console.error('Return failed:', e);
            alert(e.message || 'Return failed');
        } finally {
            setReturningId(null);
        }
    };

    const handleBorrowSuccess = async () => {
        // Refresh borrowed books list after successful borrow
        await loadBorrowed();
        // Switch back to borrowed tab to see the new book
        setActiveSubTab('borrowed');
    };

    const handleBorrowTab = () => {
        setActiveSubTab('borrow');
    };

    // Don't render component if no customer is selected
    if (!customerDetails) {
        return null;
    }

    return (
        <div className="search-properties">
            <h3>Customer actions</h3>

            <div className="sp-layout">
                {/* LEFT: tabs */}
                <div className="sp-tabs">
                    <button
                        className={`sp-tab ${activeSubTab === 'borrowed' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('borrowed')}
                    >
                        Borrowed
                    </button>

                    <button
                        className={`sp-tab ${activeSubTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('history')}
                    >
                        History
                    </button>

                    <button
                        className={`sp-tab ${activeSubTab === 'borrow' ? 'active' : ''}`}
                        onClick={handleBorrowTab}
                    >
                         Borrow
                    </button>
                </div>

                {/* RIGHT: content */}
                <div className="sp-content">
                    {activeSubTab === 'borrowed' && (
                        <>
                            {isLoading ? (
                                <p className="hint">Loading...</p>
                            ) : borrowed.length === 0 ? (
                                <p className="hint">No borrowed books</p>
                            ) : (
                                <table className="borrowed-table">
                                    <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Title</th>
                                        <th>AUTHOR</th>
                                        <th>Borrowed On</th>
                                        <th></th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {borrowed.map((row) => (
                                        <tr key={row.event_id}>
                                            <td>{row.id}</td>
                                            <td>{row.title || ''}</td>
                                            <td>{row.author || ''}</td>
                                            <td>{formatDate(row.borrowed_on)}</td>
                                            <td>
                                                <button
                                                    className="return-btn"
                                                    disabled={isLoading || returningId === row.event_id}
                                                    onClick={() => handleReturn(row.event_id)}
                                                >
                                                    {returningId === row.event_id ? 'Returning...' : 'Return'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            )}
                        </>
                    )}

                    {activeSubTab === 'history' && (
                        <div className="sp-empty">
                            <p>INOP</p>
                        </div>
                    )}

                    {activeSubTab === 'borrow' && (
                        <BorrowBook
                            customerDetails={customerDetails}
                            onBorrowSuccess={handleBorrowSuccess}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchProperties;