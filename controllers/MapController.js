

class MapController {
    constructor() {
        this.mapModel = new MapModel();
        this.mapContainer = document.getElementById('map-container');
        this.currentDeparture = null;
        this.markers = [];
        this.init();
    }

    init() {
        this.initializeMap();
        this.bindEvents();
        this.loadAllAirports();
    }

    bindEvents() {
        // Listen for departure airport selection from search
        document.addEventListener('departureSelected', (e) => {
            this.handleDepartureSelection(e.detail.airportCode);
        });

        // Handle clicks on airport markers
        this.mapContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('airport-marker')) {
                const airportCode = e.target.dataset.iataCode;
                this.selectDepartureAirport(airportCode);
            }
        });
    }

    async loadAllAirports() {
        try {
            const airports = await this.mapModel.getAllAirports();
            this.displayAirportsOnMap(airports);
        } catch (error) {
            console.error('Failed to load airports:', error);
        }
    }

    displayAirportsOnMap(airports) {
        airports.forEach(airport => {
            this.addAirportMarker(airport);
        });
    }

    addAirportMarker(airport) {
        const marker = document.createElement('div');
        marker.className = `airport-marker ${this.getAirportType(airport)}`;
        marker.dataset.iataCode = airport.iataCode;
        marker.title = `${airport.name} (${airport.iataCode})`;
        
        // Convert coordinates to map pixels (simplified)
        const x = this.longitudeToX(airport.location.coordinates[0]);
        const y = this.latitudeToY(airport.location.coordinates[1]);
        
        marker.style.left = x + 'px';
        marker.style.top = y + 'px';
        
        this.mapContainer.appendChild(marker);
        this.markers.push(marker);
    }

    async selectDepartureAirport(iataCode) {
        this.currentDeparture = iataCode;
        
        try {
            // Get destinations from this airport
            const destinations = await this.mapModel.getDestinationsFromAirport(iataCode);
            
            this.highlightDepartureAirport(iataCode);
            this.showAvailableDestinations(destinations);
            
            // Trigger event for other controllers
            document.dispatchEvent(new CustomEvent('departureSelected', {
                detail: { airportCode: iataCode }
            }));
            
        } catch (error) {
            this.showMapError('Failed to load destinations from ' + iataCode);
        }
    }

    showAvailableDestinations(destinations) {
        // Clear previous destination highlights
        this.clearDestinationHighlights();
        
        // Highlight available destinations
        destinations.forEach(dest => {
            this.highlightDestination(dest.iataCode);
        });
        
        // Add click handlers for destinations
        this.addDestinationClickHandlers(destinations);
    }

    highlightDestination(iataCode) {
        const marker = document.querySelector(`[data-iata-code="${iataCode}"]`);
        if (marker) {
            marker.classList.add('destination-available');
            marker.addEventListener('click', () => {
                this.selectDestination(iataCode);
            });
        }
    }

    selectDestination(arrivalCode) {
        if (this.currentDeparture) {
            // Trigger flight search
            document.dispatchEvent(new CustomEvent('destinationSelected', {
                detail: {
                    departure: this.currentDeparture,
                    arrival: arrivalCode
                }
            }));
        }
    }

    highlightDepartureAirport(iataCode) {
        // Clear previous highlights
        document.querySelectorAll('.departure-selected').forEach(el => {
            el.classList.remove('departure-selected');
        });
        
        // Highlight new departure
        const marker = document.querySelector(`[data-iata-code="${iataCode}"]`);
        if (marker) {
            marker.classList.add('departure-selected');
        }
    }

    clearDestinationHighlights() {
        document.querySelectorAll('.destination-available').forEach(el => {
            el.classList.remove('destination-available');
        });
    }

    getAirportType(airport) {
        // Determine airport type based on name/location
        if (airport.name.toLowerCase().includes('international')) {
            return 'international';
        }
        // Add more logic for major hubs vs regional
        return 'domestic';
    }

    // Simplified coordinate conversion (you'd use a real map library)
    longitudeToX(longitude) {
        return ((longitude + 180) / 360) * this.mapContainer.offsetWidth;
    }

    latitudeToY(latitude) {
        return ((90 - latitude) / 180) * this.mapContainer.offsetHeight;
    }

    initializeMap() {
        this.mapContainer.innerHTML = `
            <div class="world-map-background">
                <!-- Map background image or canvas -->
            </div>
        `;
    }

    showMapError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'map-error';
        errorDiv.textContent = message;
        this.mapContainer.appendChild(errorDiv);
        
        setTimeout(() => errorDiv.remove(), 5000);
    }
}