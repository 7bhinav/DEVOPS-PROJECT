document.addEventListener('DOMContentLoaded', function(){
  var map = L.map('map').setView([20.5937,78.9629], 5); // India center as default
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  var pickupMarker = null;
  var destMarker = null;
  var clickCount = 0;

  function formatLatLng(latlng){
    return latlng.lat.toFixed(6)+', '+latlng.lng.toFixed(6);
  }

  map.on('click', function(e){
    clickCount++;
    if(clickCount===1){
      if(pickupMarker) map.removeLayer(pickupMarker);
      pickupMarker = L.marker(e.latlng, {title:'Pickup'}).addTo(map).bindPopup('Pickup Location').openPopup();
      document.getElementById('pickupCoord').textContent = formatLatLng(e.latlng);
    } else {
      if(destMarker) map.removeLayer(destMarker);
      destMarker = L.marker(e.latlng, {title:'Destination', icon: L.icon({iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', iconSize:[25,41], iconAnchor:[12,41]})}).addTo(map).bindPopup('Destination Hospital').openPopup();
      document.getElementById('destCoord').textContent = formatLatLng(e.latlng);
      clickCount = 0; // reset so users can re-select
    }
  });

  document.getElementById('bookingForm').addEventListener('submit', function(e){
    e.preventDefault();
    var name = document.getElementById('patientName').value.trim();
    var contact = document.getElementById('contactNumber').value.trim();
    var emergency = document.getElementById('emergencyType').value;
    var hospital = document.getElementById('preferredHospital').value.trim();

    if(!name || !contact){
      document.getElementById('result').textContent = 'Please enter patient name and contact number.';
      document.getElementById('result').style.background='#fff3f3';
      return;
    }
    if(!pickupMarker || !destMarker){
      document.getElementById('result').textContent = 'Please select pickup and destination on the map.';
      document.getElementById('result').style.background='#fff3f3';
      return;
    }

    // For demo purposes we just show a success message
    document.getElementById('result').textContent = 'Ambulance is on the way!';
    document.getElementById('result').style.background='#e8fcef';

    // Reset form after short delay
    setTimeout(function(){
      document.getElementById('bookingForm').reset();
      document.getElementById('pickupCoord').textContent='n/a';
      document.getElementById('destCoord').textContent='n/a';
      if(pickupMarker) map.removeLayer(pickupMarker);
      if(destMarker) map.removeLayer(destMarker);
      pickupMarker=null; destMarker=null; clickCount=0;
    }, 2500);
  });
});
