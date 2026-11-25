/**
 * Reusable Map Component for the LC Tracking System frontend.
 * Mounts the exact DOM structure expected by ../maps-location/script.js
 * so 100% of standalone map, marker, geolocation, and OSRM route logic is preserved.
 */
(function () {
    "use strict";

    function mountLCMapComponent(containerId, options) {
        var mountEl = document.getElementById(containerId || "lcMapMount");
        if (!mountEl) {
            return null;
        }

        var opts = options || {};
        var title = opts.title || "Tumakuru Level Crossing Map & Alternative Routes";
        var subtitle = opts.subtitle || "Click My Current Location, select a railway crossing, and click Find Route to compare driving routes.";
        var standaloneHref = opts.standaloneHref || "../maps-location/index.html";
        var fullMapHref = opts.fullMapHref || "";
        var widgetClass = opts.compact ? "lc-map-widget lc-map-compact" : "lc-map-widget";
        var fullMapLinkHtml = fullMapHref
            ? '<a href="' + fullMapHref + '" class="lc-map-standalone-link">Open Full Map ↗</a>'
            : "";

        mountEl.innerHTML =
            '<div class="' + widgetClass + '">' +
                '<div class="lc-map-toolbar">' +
                    '<div>' +
                        '<div class="lc-map-toolbar-title">' + title + '</div>' +
                        '<div class="lc-map-toolbar-sub">' + subtitle + '</div>' +
                    '</div>' +
                    '<div class="lc-map-toolbar-actions">' +
                        '<button type="button" class="lc-map-reset-btn" id="lcResetMapBtn">Show All Crossings</button>' +
                        fullMapLinkHtml +
                        '<a href="' + standaloneHref + '" target="_blank" rel="noopener noreferrer" class="lc-map-standalone-link">Open Standalone Map ↗</a>' +
                    '</div>' +
                '</div>' +
                '<div class="lc-map-controls-bar">' +
                    '<button id="locationBtn" type="button" onclick="getMyLocation()">📍 My Current Location</button>' +
                    '<div id="routeControls">' +
                        '<label for="destination">Select Railway Crossing:</label>' +
                        '<div class="lc-map-route-inputs">' +
                            '<select id="destination">' +
                                '<option value="">Choose a crossing</option>' +
                                '<option value="0">Baddihalli</option>' +
                                '<option value="1">Maidala</option>' +
                                '<option value="2">Mallasandra</option>' +
                                '<option value="3">Pandithanahalli</option>' +
                                '<option value="4">Heggere</option>' +
                            '</select>' +
                            '<button id="findRouteBtn" type="button" onclick="findRoute()">Find Route</button>' +
                        '</div>' +
                        '<p id="mapStatus" class="lc-map-status" role="status" aria-live="polite"></p>' +
                        '<p id="distance"></p>' +
                        '<div id="routeOptions"></div>' +
                    '</div>' +
                '</div>' +
                '<div id="map"></div>' +
            '</div>';

        var statusEl = document.getElementById("mapStatus");
        if (statusEl) {
            statusEl.textContent = opts.initialStatus ||
                "Click My Current Location, select a railway crossing, and click Find Route to view alternative routes.";
        }

        var resetBtn = document.getElementById("lcResetMapBtn");
        if (resetBtn) {
            resetBtn.addEventListener("click", function () {
                if (window.LCMap && typeof window.LCMap.resetMapView === "function") {
                    window.LCMap.resetMapView();
                }
            });
        }

        return mountEl;
    }

    window.LCMapComponent = {
        mount: mountLCMapComponent
    };
    window.mountLCMap = mountLCMapComponent;
})();
