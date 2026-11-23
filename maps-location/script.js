
// Create map centred on Tumakuru
var map = L.map('map').setView([13.32, 77.12], 13);
// Store the user's current location
var userLocation = null;


// Store all available route lines
var routeLayers = [];

// Store route information
var availableRoutes = [];

// Store the selected route
var selectedRouteIndex = 0;

// Load OpenStreetMap
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Railway crossing locations
var crossings = [
    {
        name: "Baddihalli",
        latitude: 13.320469,
        longitude: 77.136683
    },
    {
        name: "Maidala",
        latitude: 13.309191,
        longitude: 77.161319
    },
    {
        name: "Mallasandra",
        latitude: 13.336344,
        longitude: 77.021015
    },
    {
        name: "Pandithanahalli",
        latitude: 13.284971,
        longitude: 77.185381
    },
    {
        name: "Heggere",
        latitude: 13.341183,
        longitude: 77.049323
    }
];

// Add permanent markers
crossings.forEach(function (crossing) {

    var marker = L.marker([
        crossing.latitude,
        crossing.longitude
    ]).addTo(map);

    marker.bindPopup(
        "<b>" + crossing.name + "</b><br>" +
        "Latitude: " + crossing.latitude + "<br>" +
        "Longitude: " + crossing.longitude
    );

});

// Display all five locations within the map
var crossingLocations = crossings.map(function (crossing) {
    return [crossing.latitude, crossing.longitude];
});

map.fitBounds(crossingLocations, {
    padding: [30, 30]
});

// Variable to store the user's location marker
var userMarker;

// Function to get the user's current location
function getMyLocation() {

    // Check whether the browser supports geolocation
    if (navigator.geolocation) {

        navigator.geolocation.getCurrentPosition(

            function (position) {

                // Get latitude and longitude
                var latitude = position.coords.latitude;
                var longitude = position.coords.longitude;
                // Save location for route calculation
                userLocation = [latitude, longitude];

                // Remove the previous user marker
                if (userMarker) {
                    map.removeLayer(userMarker);
                }

                // Add marker for the user's location
                userMarker = L.marker([latitude, longitude])
                    .addTo(map);

                // Show user's location details
                userMarker.bindPopup(
                    "<b>Your Current Location</b><br>" +
                    "Latitude: " + latitude.toFixed(6) +
                    "<br>Longitude: " + longitude.toFixed(6)
                ).openPopup();

                // Move the map to the user's location
                map.setView([latitude, longitude], 15);

            },

            function (error) {
                alert("Unable to get your location. Please allow location access.");
            }

        );

    } else {
        alert("Geolocation is not supported by your browser.");
    }
}


async function findRoute() {

    // Check user's location
    if (!userLocation) {
        alert("Please click My Current Location first.");
        return;
    }

    // Get selected crossing
    var selectedIndex = document.getElementById("destination").value;

    if (selectedIndex === "") {
        alert("Please select a railway crossing.");
        return;
    }

    var destination = crossings[selectedIndex];

    // OSRM uses longitude,latitude format
    var start = userLocation[1] + "," + userLocation[0];

    var end = destination.longitude + "," + destination.latitude;

    // Request alternative routes
    var url = "https://router.project-osrm.org/route/v1/driving/"
        + start + ";" + end
        + "?overview=full&geometries=geojson&alternatives=true";

    try {

        var response = await fetch(url);
        var data = await response.json();

        if (data.code !== "Ok" || data.routes.length === 0) {
            alert("No routes found.");
            return;
        }

        // Remove previous routes
        routeLayers.forEach(function (layer) {
            map.removeLayer(layer);
        });

        routeLayers = [];
        availableRoutes = [];

        // Clear previous route information
        document.getElementById("routeOptions").innerHTML = "";

        // Store returned routes
        availableRoutes = data.routes;

        var colors = ["blue", "red", "green"];

        // Display every returned route
        data.routes.forEach(function (route, index) {

            var routeLayer = L.geoJSON(route.geometry, {
                style: {
                    color: colors[index % colors.length],
                    weight: 5,
                    opacity: 0.7
                }
            }).addTo(map);

            routeLayers.push(routeLayer);

            // Create route information card
            var distance = (route.distance / 1000).toFixed(2);

            var routeCard = document.createElement("div");

            routeCard.className = "route-option";

            routeCard.innerHTML =
                "<b>Route " + (index + 1) + "</b><br>" +
                "Distance: " + distance + " km<br>" +
                "<button type='button'>Select this route</button>";

            // Select route when button is clicked
            routeCard.querySelector("button").onclick = function () {
                selectRoute(index);
            };

            document.getElementById("routeOptions").appendChild(routeCard);

            // Click route line to select it
            routeLayer.on("click", function () {
                selectRoute(index);
            });

        });

        // Select first route initially
        selectRoute(0);

        // Zoom to show all routes
        var allRouteBounds = L.featureGroup(routeLayers).getBounds();

        map.fitBounds(allRouteBounds, {
            padding: [30, 30]
        });

    } catch (error) {

        console.log(error);

        alert("Unable to calculate alternative routes. Check your internet connection.");

    }
}


// Function to select a particular route
function selectRoute(index) {

    selectedRouteIndex = index;

    // Highlight the selected route
    routeLayers.forEach(function (layer, i) {

        layer.setStyle({
            color: i === index ? "green" : "gray",
            weight: i === index ? 7 : 4,
            opacity: i === index ? 1 : 0.45
        });

    });

    // Get selected route distance
    var distance = (
        availableRoutes[index].distance / 1000
    ).toFixed(2);

    // Display selected route
    document.getElementById("distance").innerText =
        "Selected Route " + (index + 1) +
        " - Distance: " + distance + " km";

    // Highlight selected route card
    var cards = document.querySelectorAll(".route-option");

    cards.forEach(function (card, i) {
        card.classList.toggle("selected", i === index);
    });

}


