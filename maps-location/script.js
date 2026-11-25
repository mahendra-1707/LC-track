
// Create map centred on Tumakuru
var map = null;
// Store the user's current location
var userLocation = null;

// Store all available route lines
var routeLayers = [];

// Store route information
var availableRoutes = [];

// Store the selected route
var selectedRouteIndex = 0;

// Prevent duplicate concurrent route requests
var isFindingRoute = false;

// Track pending initial fitBounds when container starts hidden
var needsInitialBounds = false;
var pendingCrossingFocus = null;

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

var crossingLocations = crossings.map(function (crossing) {
    return [crossing.latitude, crossing.longitude];
});

// Permanent crossing markers indexed alongside crossings[]
var crossingMarkers = [];

// Variable to store the user's location marker
var userMarker;

// Map frontend spelling variants, LC codes, or numeric indices to crossings[]
function resolveCrossingIndex(identifier) {
    if (identifier === null || identifier === undefined || identifier === "") {
        return -1;
    }

    var strVal = String(identifier).trim();
    var numVal = Number(strVal);
    if (strVal !== "" && !isNaN(numVal) && numVal >= 0 && numVal < crossings.length) {
        return Math.floor(numVal);
    }

    var normalized = strVal.toLowerCase();
    var aliases = {
        "baddihalli": 0,
        "lc 38": 0,
        "lc_38": 0,
        "maidala": 1,
        "mydala": 1,
        "lc 35": 1,
        "lc_35": 1,
        "mallasandra": 2,
        "lc 46": 2,
        "lc_46": 2,
        "pandithanahalli": 3,
        "lc 33": 3,
        "lc_33": 3,
        "heggere": 4,
        "heggare": 4,
        "lc 44": 4,
        "lc_44": 4
    };

    if (Object.prototype.hasOwnProperty.call(aliases, normalized)) {
        return aliases[normalized];
    }

    for (var i = 0; i < crossings.length; i++) {
        if (crossings[i].name.toLowerCase() === normalized) {
            return i;
        }
    }
    return -1;
}

function setMapStatus(message, statusType) {
    var statusEl = document.getElementById("mapStatus");
    if (!statusEl) return;

    statusEl.textContent = message || "";
    statusEl.className = "lc-map-status";
    if (statusType) {
        statusEl.classList.add("is-" + statusType);
    }
}

function isMapContainerVisible(el) {
    return !!(el && el.clientWidth > 0 && el.clientHeight > 0);
}

function initLCMap(options) {
    var mapEl = document.getElementById("map");
    if (!mapEl) {
        return null;
    }

    if (map) {
        map.invalidateSize();
        return map;
    }

    map = L.map("map").setView([13.32, 77.12], 13);

    // Load OpenStreetMap
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    // Add permanent markers
    crossingMarkers = [];
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

        crossingMarkers.push(marker);
    });

    // Display all five locations within the map if visible
    if (isMapContainerVisible(mapEl)) {
        map.fitBounds(crossingLocations, {
            padding: [30, 30]
        });
    } else {
        needsInitialBounds = true;
    }

    // Keep Leaflet sized properly across hidden toggles and viewport resizes
    if (typeof ResizeObserver !== "undefined") {
        var resizeObserver = new ResizeObserver(function () {
            if (!map || !isMapContainerVisible(mapEl)) return;
            map.invalidateSize();
            if (pendingCrossingFocus !== null) {
                var target = pendingCrossingFocus;
                pendingCrossingFocus = null;
                needsInitialBounds = false;
                focusCrossing(target);
            } else if (needsInitialBounds) {
                needsInitialBounds = false;
                map.fitBounds(crossingLocations, {
                    padding: [30, 30]
                });
            }
        });
        resizeObserver.observe(mapEl);
    }

    window.addEventListener("resize", function () {
        if (map && isMapContainerVisible(mapEl)) {
            map.invalidateSize();
        }
    });

    // Respect optional URL query param (?crossing=... or ?id=...)
    var params = new URLSearchParams(window.location.search);
    var requestedCrossing = (options && options.crossing) || params.get("crossing") || params.get("id");
    if (requestedCrossing !== null && requestedCrossing !== "") {
        var idx = resolveCrossingIndex(requestedCrossing);
        if (idx !== -1) {
            var destSelect = document.getElementById("destination");
            if (destSelect) {
                destSelect.value = String(idx);
            }
            if (isMapContainerVisible(mapEl)) {
                focusCrossing(idx);
            } else {
                pendingCrossingFocus = idx;
            }
        }
    }

    return map;
}

function focusCrossing(identifier, options) {
    if (!map) {
        initLCMap();
    }
    var idx = resolveCrossingIndex(identifier);
    if (idx === -1 || !map) return false;

    var destSelect = document.getElementById("destination");
    if (destSelect) {
        destSelect.value = String(idx);
    }

    var mapEl = document.getElementById("map");
    if (!isMapContainerVisible(mapEl)) {
        pendingCrossingFocus = idx;
        return true;
    }

    needsInitialBounds = false;
    map.invalidateSize();

    var crossing = crossings[idx];
    var zoomLevel = (options && options.zoom) || 15;
    map.setView([crossing.latitude, crossing.longitude], zoomLevel);

    if (crossingMarkers[idx] && (!options || options.openPopup !== false)) {
        crossingMarkers[idx].openPopup();
    }

    setMapStatus("Focused on " + crossing.name + " crossing. Click My Current Location and Find Route for directions.", "info");
    return true;
}

function resetMapView() {
    if (!map) return;
    var mapEl = document.getElementById("map");
    if (!isMapContainerVisible(mapEl)) {
        needsInitialBounds = true;
        return;
    }
    needsInitialBounds = false;
    map.invalidateSize();
    map.fitBounds(crossingLocations, {
        padding: [30, 30]
    });
    setMapStatus("Showing all 5 Tumakuru railway crossings.", "info");
}

// Function to get the user's current location
function getMyLocation() {
    if (!map) {
        initLCMap();
    }

    var locationBtn = document.getElementById("locationBtn");

    // Check whether the browser supports geolocation
    if (navigator.geolocation) {
        if (locationBtn) {
            locationBtn.disabled = true;
        }
        setMapStatus("Detecting your current location...", "loading");

        navigator.geolocation.getCurrentPosition(
            function (position) {
                if (locationBtn) {
                    locationBtn.disabled = false;
                }

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
                map.invalidateSize();
                map.setView([latitude, longitude], 15);
                setMapStatus(
                    "Current location set (" + latitude.toFixed(4) + ", " + longitude.toFixed(4) + "). Choose a railway crossing and click Find Route.",
                    "success"
                );
            },
            function (error) {
                if (locationBtn) {
                    locationBtn.disabled = false;
                }
                setMapStatus("Unable to get your location. Please allow location access.", "error");
                alert("Unable to get your location. Please allow location access.");
            }
        );
    } else {
        setMapStatus("Geolocation is not supported by your browser.", "error");
        alert("Geolocation is not supported by your browser.");
    }
}

async function findRoute() {
    if (isFindingRoute) {
        return;
    }
    if (!map) {
        initLCMap();
    }

    // Check user's location
    if (!userLocation) {
        setMapStatus("Please click My Current Location first.", "error");
        alert("Please click My Current Location first.");
        return;
    }

    // Get selected crossing
    var selectedIndex = document.getElementById("destination").value;

    if (selectedIndex === "") {
        setMapStatus("Please select a railway crossing.", "error");
        alert("Please select a railway crossing.");
        return;
    }

    var destination = crossings[selectedIndex];
    if (!destination) {
        setMapStatus("Please select a valid railway crossing.", "error");
        alert("Please select a railway crossing.");
        return;
    }

    // OSRM uses longitude,latitude format
    var start = userLocation[1] + "," + userLocation[0];
    var end = destination.longitude + "," + destination.latitude;

    // Request alternative routes
    var url = "https://router.project-osrm.org/route/v1/driving/"
        + start + ";" + end
        + "?overview=full&geometries=geojson&alternatives=true";

    var findBtn = document.getElementById("findRouteBtn");
    isFindingRoute = true;
    if (findBtn) {
        findBtn.disabled = true;
        findBtn.textContent = "Finding Route...";
    }
    setMapStatus("Finding alternative driving routes to " + destination.name + "...", "loading");

    try {
        var response = await fetch(url);
        if (!response.ok) {
            throw new Error("Routing request failed with status " + response.status);
        }
        var data = await response.json();

        if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
            setMapStatus("No routes found to " + destination.name + ".", "error");
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
            routeCard.querySelector("button").onclick = function (event) {
                event.stopPropagation();
                selectRoute(index);
            };

            // Also allow clicking the card container to select route
            routeCard.onclick = function () {
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
        map.invalidateSize();
        var allRouteBounds = L.featureGroup(routeLayers).getBounds();

        map.fitBounds(allRouteBounds, {
            padding: [30, 30]
        });

        setMapStatus(
            "Found " + data.routes.length + " route(s) to " + destination.name + ". Click a route line or card to highlight it.",
            "success"
        );
    } catch (error) {
        console.log(error);
        setMapStatus("Unable to calculate alternative routes. Check your internet connection.", "error");
        alert("Unable to calculate alternative routes. Check your internet connection.");
    } finally {
        isFindingRoute = false;
        if (findBtn) {
            findBtn.disabled = false;
            findBtn.textContent = "Find Route";
        }
    }
}

// Function to select a particular route
function selectRoute(index) {
    if (!availableRoutes[index]) return;

    selectedRouteIndex = index;

    // Highlight the selected route
    routeLayers.forEach(function (layer, i) {
        layer.setStyle({
            color: i === index ? "green" : "gray",
            weight: i === index ? 7 : 4,
            opacity: i === index ? 1 : 0.45
        });
    });

    if (routeLayers[index]) {
        routeLayers[index].bringToFront();
    }

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

// Public bridge for integrated frontend pages
window.LCMap = {
    init: initLCMap,
    getMap: function () { return map; },
    getCrossings: function () { return crossings; },
    getMarkers: function () { return crossingMarkers; },
    getUserLocation: function () { return userLocation; },
    getAvailableRoutes: function () { return availableRoutes; },
    getSelectedRouteIndex: function () { return selectedRouteIndex; },
    resolveCrossingIndex: resolveCrossingIndex,
    focusCrossing: focusCrossing,
    resetMapView: resetMapView,
    invalidateSize: function () {
        if (map) {
            map.invalidateSize();
        }
    },
    getMyLocation: getMyLocation,
    findRoute: findRoute,
    selectRoute: selectRoute
};

// Auto-initialize when #map is already present in DOM (standalone & integrated pages)
if (document.getElementById("map")) {
    initLCMap();
} else {
    document.addEventListener("DOMContentLoaded", function () {
        if (document.getElementById("map") && !map) {
            initLCMap();
        }
    });
}
