import React, { useState } from 'react';
import apiService from '../services/apiService';
import SearchBar from './Searchbar';
import SearchProperties from './Searchproperties';
import SearchResult from './Searchresult';
import './css/Mainwindow.css';
import SearchBook from "./BookSearchbar.jsx";
import BookResult from "./BookResult.jsx";

const Mainwindow = () => {
    const [activeTab, setActiveTab] = useState('temp1');
    const [customerDetails, setCustomerDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [bookDetails, setBookDetails] = useState(null);
    const [isBookLoading, setIsBookLoading] = useState(false);


    const handleSelectCustomer = async (customer) => {
        console.log('Selected customer from suggestion:', customer);

        // Load full customer details from API
        setIsLoading(true);
        try {
            const fullDetails = await apiService.getCustomer(customer.id);
            console.log('Loaded full customer details:', fullDetails);
            setCustomerDetails(fullDetails);
        } catch (error) {
            console.error('Error loading customer details:', error);
            setCustomerDetails(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectBook = async (book) => {
        if (!book) {
            setBookDetails(null);
            setIsBookLoading(false);
            return;
        }

        setIsBookLoading(true);
        try {
            // SearchBook component already provides full book data
            setBookDetails(book);
        } catch (e) {
            console.error('Error setting book details:', e);
            setBookDetails(null);
        } finally {
            setIsBookLoading(false);
        }
    };


    return (
        <div className="main-window">
            <div className="tabs-header">
                <button
                    className={`tab-button ${activeTab === 'temp1' ? 'active' : ''}`}
                    onClick={() => setActiveTab('temp1')}
                >
                    Customer
                </button>
                <button
                    className={`tab-button ${activeTab === 'temp2' ? 'active' : ''}`}
                    onClick={() => setActiveTab('temp2')}
                >
                    Book
                </button>
                <button
                    className={`tab-button ${activeTab === 'temp3' ? 'active' : ''}`}
                    onClick={() => setActiveTab('temp3')}
                >
                    Report
                </button>
            </div>

            <div className="tabs-content">
                {activeTab === 'temp1' && (
                    <>
                        <SearchBar onSelectSuggestion={handleSelectCustomer} />
                        <SearchResult
                            customerDetails={customerDetails}
                            isLoading={isLoading}
                        />
                        <SearchProperties customerDetails={customerDetails} />
                    </>
                )}
                {activeTab === 'temp2' && (
                    <>
                        <SearchBook
                            onBookSelect={handleSelectBook}
                            mode="view"
                            showBookInfo={false}
                        />
                        <BookResult
                            bookDetails={bookDetails}
                            isLoading={isBookLoading}
                        />
                    </>
                )}
                {activeTab === 'temp3' && (
                    <div className="blank-tab">
                        <p>Temp3</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Mainwindow;