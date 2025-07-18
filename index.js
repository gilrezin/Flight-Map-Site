// function that submits a search request to the server with a given query
function mapRequest() {
    const departure = document.getElementById("departureSelector").querySelector("input[type='date']").value;
    const returnDate = document.getElementById("returnSelector").querySelector("input[type='date']").value;
    const airline = document.getElementById("airlineSelector").querySelector("select").value;
    const fromHour = document.getElementById("startHour").value;
    const toHour = document.getElementById("endHour").value;

    const params = new URLSearchParams({
        departure: departure,
        return: returnDate,
        airline: airline,
        fromHour: fromHour,
        toHour: toHour
    });

    // fetch(`/?${params.toString()}`)
    //     .then(response => response.json())
    //     .then(data => {
    //         // Handle the response data
    //         console.log(data);
    //         // You can update the UI with the search results here
    //     })
    //     .catch(error => {
    //         console.error('Error:', error);
    //     });

    // For now, just log the parameters to the console
    console.log(params.toString());
}

const queryElements = document.querySelectorAll("#departureSelector, #returnSelector, #airlineSelector, #hoursSelector");

// event listeners to trigger the mapRequest function when the form is modified
queryElements.forEach(element => {
    element.addEventListener("change", () => {
        //console.log("Search parameters updated.");
        mapRequest();
    });
})

var map = L.map('map').setView([40, -100], 5);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 8,
    minZoom: 3,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const circle = L.circle([47.44864, -122.30770], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 50000
}).addTo(map);