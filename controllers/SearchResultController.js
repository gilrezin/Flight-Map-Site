

class SearchResultController {
    constructor() {
        this.flightsModel = new FlightsModel();
        this.resultsContainer = document.getElementById('search-results');
        this.currentResults = [];
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Listen for destination selection from map
        document.addEventListener('destinationSelected', (e) => {
            this.searchFlights(e.detail.departure, e.detail.arrival);
        });

        // Listen for search form submission
        document.addEventListener('searchSubmitted', (e) => {
            this.searchFlights(e.detail.departure, e.detail.arrival, e.detail.date);
        });
    }

    async searchFlights(departureCode, arrivalCode, date = null) {
        this.showLoading();
        
        try {
            // Build GET request parameters
            const params = {
                departure: departureCode,
                arrival: arrivalCode
            };
            if (date) params.date = date;

            const flights = await this.flightsModel.searchFlights(params);
            this.currentResults = flights;
            this.displayResults(flights);
        } catch (error) {
            this.showError('Search failed: ' + error.message);
        }
    }

    displayResults(flights) {
        if (!flights || flights.length === 0) {
            this.showNoResults();
            return;
        }

        const resultsHtml = `
            <div class="results-header">
                <h3>${flights.length} flights found</h3>
            </div>
            <div class="flights-list">
                ${flights.map(flight => this.createFlightCard(flight)).join('')}
            </div>
        `;

        this.resultsContainer.innerHTML = resultsHtml;
        this.bindBookingButtons();
    }

    createFlightCard(flight) {
        const kayakLink = this.generateKayakLink(
            flight.departureAirport.iataCode,
            flight.arrivalAirport.iataCode,
            flight.departureTime
        );

        return `
            <div class="flight-card" data-flight-id="${flight._id}">
                <div class="flight-route">
                    ${flight.departureAirport.iataCode} → ${flight.arrivalAirport.iataCode}
                </div>
                <div class="flight-airports">
                    ${flight.departureAirport.name} → ${flight.arrivalAirport.name}
                </div>
                <div class="flight-details">
                    <span class="airline">${flight.airline}</span>
                    <span class="flight-number">${flight.flightNumber}</span>
                </div>
                <div class="flight-times">
                    Dep: ${this.formatTime(flight.departureTime)} - 
                    Arr: ${this.formatTime(flight.arrivalTime)}
                </div>
                <div class="flight-day">
                    ${flight.dayOfWeek}
                </div>
                <div class="flight-price">
                    Price: TBD
                </div>
                <button class="book-btn" data-kayak-url="${kayakLink}">
                    See Prices on Kayak
                </button>
            </div>
        `;
    }

    bindBookingButtons() {
        const bookButtons = document.querySelectorAll('.book-btn');
        bookButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const kayakUrl = e.target.dataset.kayakUrl;
                window.open(kayakUrl, '_blank');
            });
        });
    }

    generateKayakLink(dep, arr, departureTimeISO) {
        const departureDate = new Date(departureTimeISO).toISOString().split("T")[0];
        return `https://www.kayak.com/flights/${dep}-${arr}/${departureDate}`;
    }

    formatTime(isoString) {
        return new Date(isoString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    showLoading() {
        this.resultsContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Searching for flights...</p>
            </div>
        `;
    }

    showNoResults() {
        this.resultsContainer.innerHTML = `
            <div class="no-results">
                <p>No flights found for this route.</p>
                <p>Try selecting a different destination.</p>
            </div>
        `;
    }

    showError(message) {
        this.resultsContainer.innerHTML = `
            <div class="error">
                <p>⚠️ ${message}</p>
                <button onclick="location.reload()">Try Again</button>
            </div>
        `;
    }
}