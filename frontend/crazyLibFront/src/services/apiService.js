import API_CONFIG from './apiConfig';

class ApiService {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
        this.headers = API_CONFIG.HEADERS;
    }

    // Base method for making requests
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        const config = {
            ...options,
            headers: {
                ...this.headers,
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;

        return this.request(url, {
            method: 'GET',
        });
    }

    // POST request
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // PUT request (full update)
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // PATCH request (partial update)
    async patch(endpoint, data) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE',
        });
    }

    // ============================================
    // CUSTOMERS CRUD + SEARCH
    // ============================================

    /**
     * Get list of all customers (with pagination)
     * @param {Object} params - request parameters (page, page_size, ordering)
     * @returns {Promise} - list of customers
     */
    async getCustomers(params = {}) {
        return this.get('/customers/', params);
    }

    /**
     * Get customer by ID
     * @param {number} id - customer ID
     * @returns {Promise} - customer data
     */
    async getCustomer(id) {
        return this.get(`/customers/${id}/`);
    }

    /**
     * Create new customer
     * @param {Object} data - customer data
     * @returns {Promise} - created customer
     */
    async createCustomer(data) {
        return this.post('/customers/', data);
    }

    /**
     * Update customer (full update)
     * @param {number} id - customer ID
     * @param {Object} data - complete customer data
     * @returns {Promise} - updated customer
     */
    async updateCustomer(id, data) {
        return this.put(`/customers/${id}/`, data);
    }

    /**
     * Update customer (partial update)
     * @param {number} id - customer ID
     * @param {Object} data - partial customer data
     * @returns {Promise} - updated customer
     */
    async patchCustomer(id, data) {
        return this.patch(`/customers/${id}/`, data);
    }

    /**
     * Delete customer
     * @param {number} id - customer ID
     * @returns {Promise} - deletion result
     */
    async deleteCustomer(id) {
        return this.delete(`/customers/${id}/`);
    }

    /**
     * Autocomplete search for customers
     * @param {string} query - search query
     * @returns {Promise} - search suggestions
     */
    async searchCustomers(query) {
        return this.get('/customers/search/', { q: query });
    }

    // ============================================
    // BOOKS CRUD + SEARCH
    // ============================================

    /**
     * Get list of all books (with pagination)
     * @param {Object} params - request parameters
     * @returns {Promise} - list of books
     */
    async getBooks(params = {}) {
        return this.get('/books/', params);
    }

    /**
     * Get book by ID
     * @param {number} id - book ID
     * @returns {Promise} - book data
     */
    async getBook(id) {
        return this.get(`/books/${id}/`);
    }

    /**
     * Create new book
     * @param {Object} data - book data
     * @returns {Promise} - created book
     */
    async createBook(data) {
        return this.post('/books/', data);
    }

    /**
     * Update book (full update)
     * @param {number} id - book ID
     * @param {Object} data - complete book data
     * @returns {Promise} - updated book
     */
    async updateBook(id, data) {
        return this.put(`/books/${id}/`, data);
    }

    /**
     * Update book (partial update)
     * @param {number} id - book ID
     * @param {Object} data - partial book data
     * @returns {Promise} - updated book
     */
    async patchBook(id, data) {
        return this.patch(`/books/${id}/`, data);
    }

    /**
     * Delete book
     * @param {number} id - book ID
     * @returns {Promise} - deletion result
     */
    async deleteBook(id) {
        return this.delete(`/books/${id}/`);
    }

    /**
     * Autocomplete search for books
     * @param {string} query - search query
     * @returns {Promise} - search suggestions
     */
    async searchBooks(query) {
        return this.get('/books/search/', { q: query });
    }

    // ============================================
    // BOOK COPIES CRUD + SEARCH
    // ============================================

    /**
     * Get list of all book copies (with pagination)
     * @param {Object} params - request parameters
     * @returns {Promise} - list of book copies
     */
    async getBookCopies(params = {}) {
        return this.get('/book-copies/', params);
    }

    /**
     * Get book copy by ID
     * @param {number} id - book copy ID
     * @returns {Promise} - book copy data
     */
    async getBookCopy(id) {
        return this.get(`/book-copies/${id}/`);
    }

    /**
     * Create new book copy
     * @param {Object} data - book copy data
     * @returns {Promise} - created book copy
     */
    async createBookCopy(data) {
        return this.post('/book-copies/', data);
    }

    /**
     * Update book copy (full update)
     * @param {number} id - book copy ID
     * @param {Object} data - complete book copy data
     * @returns {Promise} - updated book copy
     */
    async updateBookCopy(id, data) {
        return this.put(`/book-copies/${id}/`, data);
    }

    /**
     * Update book copy (partial update)
     * @param {number} id - book copy ID
     * @param {Object} data - partial book copy data
     * @returns {Promise} - updated book copy
     */
    async patchBookCopy(id, data) {
        return this.patch(`/book-copies/${id}/`, data);
    }

    /**
     * Delete book copy
     * @param {number} id - book copy ID
     * @returns {Promise} - deletion result
     */
    async deleteBookCopy(id) {
        return this.delete(`/book-copies/${id}/`);
    }

    /**
     * Autocomplete search for book copies
     * @param {string} query - search query
     * @returns {Promise} - search suggestions
     */
    async searchBookCopies(query) {
        return this.get('/book-copies/search/', { q: query });
    }

    // ============================================
    // LIBRARY EVENTS CRUD
    // ============================================

    /**
     * Get list of all library events (with pagination)
     * @param {Object} params - request parameters
     * @returns {Promise} - list of events
     */
    async getEvents(params = {}) {
        return this.get('/events/', params);
    }

    /**
     * Get library event by ID
     * @param {number} id - event ID
     * @returns {Promise} - event data
     */
    async getEvent(id) {
        return this.get(`/events/${id}/`);
    }

    /**
     * Create new library event
     * @param {Object} data - event data
     * @returns {Promise} - created event
     */
    async createEvent(data) {
        return this.post('/events/', data);
    }

    /**
     * Update library event (full update)
     * @param {number} id - event ID
     * @param {Object} data - complete event data
     * @returns {Promise} - updated event
     */
    async updateEvent(id, data) {
        return this.put(`/events/${id}/`, data);
    }

    /**
     * Update library event (partial update)
     * @param {number} id - event ID
     * @param {Object} data - partial event data
     * @returns {Promise} - updated event
     */
    async patchEvent(id, data) {
        return this.patch(`/events/${id}/`, data);
    }

    /**
     * Delete library event
     * @param {number} id - event ID
     * @returns {Promise} - deletion result
     */
    async deleteEvent(id) {
        return this.delete(`/events/${id}/`);
    }

    async getCustomerBorrowed(customerId) {
        return this.get(`/customers/${customerId}/borrowed/`);
    }

    async returnBook(customerId, borrowEventId) {
        return this.post(`/customers/${customerId}/return/`, {
            borrow_event_id: borrowEventId,
        });
    }


    /**
     * Borrow book for a customer
     * @param {number} customerId - customer ID
     * @param {number} bookId - book ID (not copy ID, the system will find available copy)
     * @returns {Promise} - borrow result
     */
    async borrowBook(customerId, bookId) {
        return this.post(`/customers/${customerId}/borrow/`, {
            book_id: bookId,
        });
    }


}

// Export single instance of the service
const apiService = new ApiService();
export default apiService;