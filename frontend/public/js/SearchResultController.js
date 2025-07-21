class SearchResultController {
    constructor() {
        this.resultsContainer = document.getElementById('search-results');
        this.searchForm = document.getElementById('search-form');
        this.currentResults = [];
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Capture search parameters from form
        this.searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.captureSearchParameters();
        });

        // Listen for destination selection from MapController
        document.addEventListener('destinationSelected', (e) => {
            const { departure, arrival } = e.detail;
            this.searchFlights(departure, arrival);
        });
    }

    // SearchResultController captures search parameters
    captureSearchParameters() {
        const departure = document.getElementById('departure-input').value.trim().toUpperCase();
        const arrival = document.getElementById('arrival-input').value.trim().toUpperCase();
        const date = document.getElementById('date-input').value;

        console.log('Step 2: SearchResultController captured parameters:', {
            departure, arrival, date
        });

        if (!departure) {
            alert('Please enter a departure airport');
            return;
        }

        this.searchFlights(departure, arrival, date);
    }

    // SearchResultController builds GET request URL
    async searchFlights(departure, arrival = '', date = '') {
        console.log('Step 3: Building GET request URL...');
        
        // Build GET request URL: /api/flights?departure=SEA
        const params = new URLSearchParams();
        params.append('departure', departure);
        
        if (arrival) params.append('arrival', arrival);
        if (date) params.append('date', date);

        const requestUrl = `/api/flights?${params.toString()}`;
        console.log('Step 3: GET request URL built:', requestUrl);

        this.showLoading();

        try {
            // Make GET request to backend (handled by FlightsModel concept)
            console.log('Step 4: Making GET request to backend...');
            
            const response = await fetch(`http://localhost:3000${requestUrl}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // JSON flight data returned
            const flightData = await response.json();
            console.log('Step 6: JSON flight data returned:', flightData);

            this.currentResults = flightData;
            
            // Search Page displays names of available arrival airports
            this.displayResults(flightData);
            
            // Notify MapController to update markers
            this.notifyMapController(departure, flightData);

        } catch (error) {
            console.error('Error in flight search:', error);
            this.showError(`Search failed: ${error.message}`);
        }
    }

    // Search Page displays names of available arrival airports
    displayResults(flights) {
        console.log('Step 8: Displaying available arrival airports...');
        
        if (!flights || flights.length === 0) {
            this.showNoResults();
            return;
        }

        // Extract unique arrival airports for display
        const arrivalAirports = [...new Set(flights.map(flight => ({
            iataCode: flight.arrivalAirport.iataCode,
            name: flight.arrivalAirport.name
        })))];

        const resultsHtml = `
            <div class="search-results">
                <h3>Available Destinations (${arrivalAirports.length})</h3>
                <div class="airport-list">
                    ${arrivalAirports.map(airport => `
                        <div class="airport-item">
                            <strong>${airport.iataCode}</strong> - ${airport.name}
                        </div>
                    `).join('')}
                </div>
                
                <h3>Flight Options (${flights.length})</h3>
                <div class="flights-list">
                    ${flights.map(flight => this.createFlightCard(flight)).join('')}
                </div>
            </div>
        `;

        this.resultsContainer.innerHTML = resultsHtml;
        this.bindBookingButtons();
    }

    // Notify MapController to update markers
    notifyMapController(departure, flights) {
        console.log('Step 9: Notifying MapController to update map markers...');
        
        const arrivalAirports = [...new Set(flights.map(flight => ({
            iataCode: flight.arrivalAirport.iataCode,
            name: flight.arrivalAirport.name
        })))];

        // Trigger event for MapController
        document.dispatchEvent(new CustomEvent('updateMapMarkers', {
            detail: {
                departure: departure,
                availableArrivals: arrivalAirports
            }
        }));
    }

    createFlightCard(flight) {
        const kayakLink = this.generateKayakLink(
            flight.departureAirport.iataCode,
            flight.arrivalAirport.iataCode,
            flight.departureTime
        );

        return `
            <div class="flight-card">
                <div class="route">
                    ${flight.departureAirport.iataCode} → ${flight.arrivalAirport.iataCode}
                </div>
                <div class="airports">
                    ${flight.departureAirport.name}<br>
                    → ${flight.arrivalAirport.name}
                </div>
                <div class="flight-info">
                    ${flight.airline} ${flight.flightNumber}<br>
                    ${this.formatTime(flight.departureTime)} - ${this.formatTime(flight.arrivalTime)}<br>
                    ${flight.dayOfWeek}
                </div>
                <div class="price">Price: TBD</div>
                <button class="book-btn" data-kayak-url="${kayakLink}">
                    See Prices on Kayak
                </button>
            </div>
        `;
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

    bindBookingButtons() {
        document.querySelectorAll('.book-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const kayakUrl = e.target.dataset.kayakUrl;
                window.open(kayakUrl, '_blank');
            });
        });
    }

    showLoading() {
        this.resultsContainer.innerHTML = `
            <div class="loading">
                <p>Searching flights...</p>
            </div>
        `;
    }

    showNoResults() {
        this.resultsContainer.innerHTML = `
            <div class="no-results">
                <p>No flights found for this route.</p>
            </div>
        `;
    }

    showError(message) {
        this.resultsContainer.innerHTML = `
            <div class="error">
                <p>⚠️ ${message}</p>
            </div>
        `;
    }
}