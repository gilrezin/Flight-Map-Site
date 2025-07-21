
class MapController {
    constructor() {
        this.mapContainer = document.getElementById('map-container');
        this.currentDeparture = null;
        this.airportMarkers = [];
        this.init();
    }

    init() {
        this.renderBaseMap();
        this.loadAllAirports();
        this.bindEvents();
    }

    bindEvents() {
        // Listen for SearchResultController to update markers
        document.addEventListener('updateMapMarkers', (e) => {
            console.log('Step 9: MapController received update request...');
            this.updateMarkersWithAvailableArrivals(e.detail);
        });

        // Handle airport clicks
        this.mapContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('airport-marker')) {
                const airportCode = e.target.dataset.iataCode;
                this.selectDepartureAirport(airportCode);
            }
        });
    }

    async loadAllAirports() {
        try {
            console.log('Loading all airports for map...');
            
            const response = await fetch('http://localhost:3000/api/airports?limit=100');
            const airports = await response.json();
            
            this.displayAirports(airports);
            console.log(`Loaded ${airports.length} airports on map`);
            
        } catch (error) {
            console.error('Failed to load airports:', error);
        }
    }

    displayAirports(airports) {
        // Clear existing markers
        this.clearMarkers();
        
        airports.forEach(airport => {
            this.addAirportMarker(airport);
        });
    }

    addAirportMarker(airport) {
        const marker = document.createElement('div');
        marker.className = 'airport-marker';
        marker.dataset.iataCode = airport.iataCode;
        marker.title = `${airport.name} (${airport.iataCode})`;
        
        // Convert coordinates to map position
        const x = this.longitudeToX(airport.location.coordinates[0]);
        const y = this.latitudeToY(airport.location.coordinates[1]);
        
        marker.style.position = 'absolute';
        marker.style.left = x + 'px';
        marker.style.top = y + 'px';
        marker.style.width = '8px';
        marker.style.height = '8px';
        marker.style.backgroundColor = '#007bff';
        marker.style.borderRadius = '50%';
        marker.style.cursor = 'pointer';
        
        this.mapContainer.appendChild(marker);
        this.airportMarkers.push(marker);
    }

    // MapController updates map markers with available arrival airports
    updateMarkersWithAvailableArrivals(data) {
        console.log('Step 9: Updating map markers with available arrivals...');
        console.log('Available arrival airports:', data.availableArrivals);
        
        const { departure, availableArrivals } = data;
        const availableCodes = availableArrivals.map(airport => airport.iataCode);
        
        // Reset all markers
        this.airportMarkers.forEach(marker => {
            marker.classList.remove('departure', 'available-destination', 'unavailable');
            
            const iataCode = marker.dataset.iataCode;
            
            if (iataCode === departure) {
                // Highlight departure airport
                marker.classList.add('departure');
                marker.style.backgroundColor = '#28a745'; // Green for departure
                marker.style.transform = 'scale(1.5)';
            } else if (availableCodes.includes(iataCode)) {
                // Highlight available destinations
                marker.classList.add('available-destination');
                marker.style.backgroundColor = '#ffc107'; // Yellow for available
                marker.style.transform = 'scale(1.2)';
            } else {
                // Dim unavailable airports
                marker.classList.add('unavailable');
                marker.style.backgroundColor = '#6c757d'; // Gray for unavailable
                marker.style.opacity = '0.3';
            }
        });
        
        console.log(`Step 9: Updated ${availableCodes.length} destination markers`);
    }

    selectDepartureAirport(iataCode) {
        console.log('User selected departure airport:', iataCode);
        
        // Update the search form
        const departureInput = document.getElementById('departure-input');
        if (departureInput) {
            departureInput.value = iataCode;
            
            // Trigger search automatically
            document.getElementById('search-form').dispatchEvent(new Event('submit'));
        }
    }

    longitudeToX(longitude) {
        const mapWidth = this.mapContainer.offsetWidth || 800;
        return ((longitude + 180) / 360) * mapWidth;
    }

    latitudeToY(latitude) {
        const mapHeight = this.mapContainer.offsetHeight || 400;
        return ((90 - latitude) / 180) * mapHeight;
    }

    renderBaseMap() {
        this.mapContainer.innerHTML = `
            <div class="map-background" style="
                width: 100%; 
                height: 400px; 
                background-color: #e3f2fd;
                position: relative;
                border: 1px solid #ccc;
                background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="100" height="50" fill="%23e3f2fd"/><text x="50" y="25" text-anchor="middle" fill="%23666">World Map</text></svg>');
                background-size: cover;
            ">
                <div style="position: absolute; top: 10px; left: 10px; background: rgba(255,255,255,0.9); padding: 10px; border-radius: 4px;">
                    <strong>Legend:</strong><br>
                    🟢 Departure | 🟡 Available | ⚫ Other
                </div>
            </div>
        `;
    }

    clearMarkers() {
        this.airportMarkers.forEach(marker => marker.remove());
        this.airportMarkers = [];
    }
}