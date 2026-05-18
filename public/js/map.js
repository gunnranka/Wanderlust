// 🛠️ ADD-ON: Get coordinates and title from the hidden data attributes we added in show.ejs
const mapContainer = document.getElementById('map');
const lng = parseFloat(mapContainer.getAttribute('data-lng')) || 77.2090; 
const lat = parseFloat(mapContainer.getAttribute('data-lat')) || 28.6139;
const title = mapContainer.getAttribute('data-title') || "Listing Location";

// 🟢 UPDATED: Use the dynamic lat/lng instead of hardcoded Pune coordinates
const map = L.map('map').setView([lat, lng], 10);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 🟢 UPDATED: Marker now follows the listing's coordinates
L.marker([lat, lng])
    .addTo(map)
    .bindPopup(`<b>${title}</b><br>Exact location provided after booking.`)
    .openPopup();