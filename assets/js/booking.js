document.addEventListener('DOMContentLoaded', function(){
  var map = L.map('map').setView([20.5937,78.9629], 5); // India center as default
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  var pickupMarker = null;
  var destMarker = null;
  var clickCount = 0;
  var geoWatchId = null;
  var trackingEnabled = false;
  var autoNearestDone = false;
  // Determine API base to reach backend (try window override, http-server dev, or default to same origin)
  var API_BASE = '';
  if(window.API_BASE) API_BASE = window.API_BASE;
  else if((location.hostname === '127.0.0.1' || location.hostname === 'localhost') && (location.port === '5000' || location.port === '')) API_BASE = 'http://localhost:3000';
  else API_BASE = '';

  function formatLatLng(latlng){
    return latlng.lat.toFixed(6)+', '+latlng.lng.toFixed(6);
  }

  function setPickupFromCoords(lat, lon){
    var ll = L.latLng(lat, lon);
    if(pickupMarker) map.removeLayer(pickupMarker);
    pickupMarker = L.marker(ll, {title:'Pickup'}).addTo(map).bindPopup('Pickup Location (detected)').openPopup();
    document.getElementById('pickupCoord').textContent = formatLatLng(ll);
    // center gently if user hasn't panned far
    try{ map.setView(ll, Math.max(map.getZoom(), 14)); }catch(e){}
    // if auto nearest is enabled, query nearby hospitals at this pickup and auto-select the first
    try{
      var autoChk = document.getElementById('autoNearest');
      if(autoChk && autoChk.checked && !autoNearestDone){
        autoSelectNearest(lat, lon).catch(function(){ /* ignore */ });
      }
    }catch(e){/* ignore */}
  // recalc fare if destination exists
  try{ if(destMarker) computeAndShowFare(); }catch(e){}
  }

  // helper: call nearby and auto-select the nearest (first) hospital and mark done
  function autoSelectNearest(lat, lon){
    // compute distances, pick nearest and set destination + store phone
    return new Promise(function(resolve, reject){
      var url = (API_BASE ? (API_BASE + '/hospitals/nearby?lat='+lat+'&lon='+lon) : ('/hospitals/nearby?lat='+lat+'&lon='+lon));
      fetch(url).then(function(r){ return r.json(); }).then(function(items){
        if(items && items.length>0){
          function haversine(lat1, lon1, lat2, lon2){
            function toRad(v){ return v * Math.PI / 180; }
            var R = 6371e3; // meters
            var phi1 = toRad(lat1), phi2 = toRad(lat2);
            var dphi = toRad(lat2-lat1), dlambda = toRad(lon2-lon1);
            var a = Math.sin(dphi/2)*Math.sin(dphi/2) + Math.cos(phi1)*Math.cos(phi2)*Math.sin(dlambda/2)*Math.sin(dlambda/2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
          }
          items.forEach(function(it){ it.__distance = haversine(lat, lon, it.lat, it.lon); });
          items.sort(function(a,b){ return a.__distance - b.__distance; });
          var h = items[0];
          if(destMarker) map.removeLayer(destMarker);
          var ll2 = L.latLng(h.lat,h.lon);
          destMarker = L.marker(ll2).addTo(map).bindPopup(h.name).openPopup();
          document.getElementById('destCoord').textContent = formatLatLng(ll2);
          var phInput = document.getElementById('preferredHospital');
          phInput.value = h.name;
          phInput.dataset.phone = h.phone || '';
          autoNearestDone = true;
          resolve(h);
        } else {
          reject(new Error('no items'));
        }
      }).catch(function(err){ reject(err); });
    });
  }

  function startGeolocation(){
    if(!navigator.geolocation) {
      console.log('Geolocation not supported');
      return;
    }
  // reset one-time auto-select so the initial permission lookup will trigger it
  autoNearestDone = false;
  // try a single quick location then watch
    navigator.geolocation.getCurrentPosition(function(pos){
      setPickupFromCoords(pos.coords.latitude, pos.coords.longitude);
    }, function(err){
      console.warn('Geolocation failed', err);
    }, {enableHighAccuracy:true, timeout:8000});

    // watch for movement and update marker in real-time
    try{
      geoWatchId = navigator.geolocation.watchPosition(function(pos){
        setPickupFromCoords(pos.coords.latitude, pos.coords.longitude);
      }, function(err){
        console.warn('Geolocation watch failed', err);
      }, {enableHighAccuracy:true, maximumAge:2000, timeout:10000});
      trackingEnabled = true;
    }catch(e){ console.warn('watchPosition not available', e); }
  }

  // stop watching when user navigates away (cleanup)
  window.addEventListener('beforeunload', function(){ if(geoWatchId!==null && navigator.geolocation) navigator.geolocation.clearWatch(geoWatchId); });

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

  // Update submit to include fare if available
  document.getElementById('bookingForm').addEventListener('submit', function(e){
    e.preventDefault();
    var name = document.getElementById('patientName').value.trim();
    var contact = document.getElementById('contactNumber').value.trim();
    var emergency = document.getElementById('emergencyType').value;
    var hospital = document.getElementById('preferredHospital').value.trim();
    var ambulanceType = document.getElementById('ambulanceType').value;

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


    // Build booking payload
    var payload = {
      patient_name: name,
      contact_number: contact,
      emergency_type: emergency,
      preferred_hospital: hospital || null,
      hospital_phone: (document.getElementById('preferredHospital').dataset && document.getElementById('preferredHospital').dataset.phone) ? document.getElementById('preferredHospital').dataset.phone : null,
      ambulance_type: ambulanceType,
      pickup_lat: pickupMarker.getLatLng().lat,
      pickup_lon: pickupMarker.getLatLng().lng,
      hospital_lat: destMarker.getLatLng().lat,
      hospital_lon: destMarker.getLatLng().lng
    };

    // Include fare if available
    var fareElem = document.getElementById('fareEstimate');
    if(fareElem.dataset.fare) payload.fare = fareElem.dataset.fare;

    document.getElementById('result').textContent = 'Sending booking...';

    var url = (API_BASE ? (API_BASE + '/booking-public') : '/booking-public');
    fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)})
      .then(function(r){ if(!r.ok) throw new Error('booking failed'); return r.json(); })
      .then(function(data){
        // redirect to confirmation page with id and brief info
        var q = new URLSearchParams({id: data.id, patient: name, ambulance: ambulanceType, hospital: hospital || 'Selected Hospital', hospital_phone: (document.getElementById('preferredHospital').dataset && document.getElementById('preferredHospital').dataset.phone) ? document.getElementById('preferredHospital').dataset.phone : '' }).toString();
        window.location.href = '/booking-confirmation.html?'+q;
      })
      .catch(function(err){
        document.getElementById('result').textContent = 'Booking failed: '+err.message;
        document.getElementById('result').style.background='#fff3f3';
      });
  });

  // Fetch nearby hospitals when map is clicked for destination
  function loadNearby(lat, lon){
    var list = document.getElementById('nearbyList');
    list.textContent = 'Loading nearby hospitals...';
    var url = (API_BASE ? (API_BASE + '/hospitals/nearby?lat='+lat+'&lon='+lon) : ('/hospitals/nearby?lat='+lat+'&lon='+lon));
    fetch(url)
      .then(function(r){ return r.json(); })
      .then(function(items){
        list.innerHTML = '';
        // compute distances relative to provided lat/lon and sort
        function haversine(lat1, lon1, lat2, lon2){
          function toRad(v){ return v * Math.PI / 180; }
          var R = 6371e3; // meters
          var phi1 = toRad(lat1), phi2 = toRad(lat2);
          var dphi = toRad(lat2-lat1), dlambda = toRad(lon2-lon1);
          var a = Math.sin(dphi/2)*Math.sin(dphi/2) + Math.cos(phi1)*Math.cos(phi2)*Math.sin(dlambda/2)*Math.sin(dlambda/2);
          var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
        }
        items.forEach(function(it){ it.__distance = haversine(lat, lon, it.lat, it.lon); });
        items.sort(function(a,b){ return a.__distance - b.__distance; });
        items.forEach(function(h){
          var el = document.createElement('div');
          el.className = 'nearby-item';
          var distKm = (h.__distance/1000).toFixed(2);
          var phoneText = h.phone ? (' — ' + h.phone) : '';
          el.textContent = h.name + ' ('+distKm+' km)'+ phoneText;
          el.addEventListener('click', function(){
            // set destination marker to this hospital and update input
            if(destMarker) map.removeLayer(destMarker);
            var ll = L.latLng(h.lat, h.lon);
            destMarker = L.marker(ll).addTo(map).bindPopup(h.name).openPopup();
            document.getElementById('destCoord').textContent = formatLatLng(ll);
            var phInput = document.getElementById('preferredHospital');
            phInput.value = h.name;
            phInput.dataset.phone = h.phone || '';
            // update fare now that destination changed
            try{ computeAndShowFare(); }catch(e){}
          });
          list.appendChild(el);
        });
      }).catch(function(){ list.textContent='No nearby hospitals found.'; });
  }

  // compute fare: try /route for accurate distance, fallback to Haversine; fare model: base + per_km*distance_km
  function computeAndShowFare(){
    if(!pickupMarker || !destMarker) return;
    var from = pickupMarker.getLatLng();
    var to = destMarker.getLatLng();
    var fareElem = document.getElementById('fareEstimate');
    fareElem.textContent = 'Estimating fare...';
    var routeUrl = (API_BASE ? (API_BASE + '/route?fromLat='+from.lat+'&fromLon='+from.lng+'&toLat='+to.lat+'&toLon='+to.lng) : ('/route?fromLat='+from.lat+'&fromLon='+from.lng+'&toLat='+to.lat+'&toLon='+to.lng));
    fetch(routeUrl).then(function(r){ if(!r.ok) throw new Error('no route'); return r.json(); }).then(function(rt){
      var meters = rt.distance || 0;
      var km = meters/1000;
      var fare = Math.round(1500 + (km * 100)); // base 1500 + 100 per km
      fareElem.textContent = 'Estimated fare: ' + fare + ' (approx ' + km.toFixed(2) + ' km)';
      fareElem.dataset.fare = fare;
    }).catch(function(){
      // fallback Haversine
      function haversine(lat1, lon1, lat2, lon2){
        function toRad(v){ return v * Math.PI / 180; }
        var R = 6371e3; // meters
        var phi1 = toRad(lat1), phi2 = toRad(lat2);
        var dphi = toRad(lat2-lat1), dlambda = toRad(lon2-lon1);
        var a = Math.sin(dphi/2)*Math.sin(dphi/2) + Math.cos(phi1)*Math.cos(phi2)*Math.sin(dlambda/2)*Math.sin(dlambda/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      }
      var meters = haversine(from.lat, from.lng, to.lat, to.lng);
      var km = meters/1000;
      var fare = Math.round(1500 + (km * 100));
      fareElem.textContent = 'Estimated fare: ' + fare + ' (approx ' + km.toFixed(2) + ' km)';
      fareElem.dataset.fare = fare;
    });
  }

  // When a destination marker is placed, observe the destCoord element and call loadNearby
  var destObserver = new MutationObserver(function(){
    var txt = document.getElementById('destCoord').textContent;
    if(txt && txt!=='n/a'){
      var parts = txt.split(',');
      var lat = parseFloat(parts[0]);
      var lon = parseFloat(parts[1]);
      if(!isNaN(lat) && !isNaN(lon)) loadNearby(lat, lon);
    }
  });
  destObserver.observe(document.getElementById('destCoord'), {childList:true, characterData:true, subtree:true});
  // wire geo toggle button
  var geoBtn = document.getElementById('geoToggle');
  var geoStatus = document.getElementById('geoStatus');
  if(geoBtn){
    geoBtn.addEventListener('click', function(){
      if(!trackingEnabled){
        startGeolocation();
        geoBtn.textContent = 'Stop tracking';
        geoStatus.textContent = 'Tracking...';
      } else {
        if(geoWatchId!==null && navigator.geolocation) navigator.geolocation.clearWatch(geoWatchId);
        geoWatchId = null; trackingEnabled = false;
        geoBtn.textContent = 'Detect my location';
        geoStatus.textContent = 'Not tracking';
      }
    });
  }

  // Add UI element to show selected hospital phone and a "Find phone" fallback
  (function setupPreferredPhoneUI(){
    var phInput = document.getElementById('preferredHospital');
    if(!phInput) return;
    var container = phInput.parentNode;
    var span = document.createElement('span');
    span.id = 'preferredPhone';
    span.style.marginLeft = '8px';
    span.style.fontWeight = '600';
    span.textContent = phInput.dataset && phInput.dataset.phone ? phInput.dataset.phone : 'unknown';
    var btn = document.createElement('button');
    btn.id = 'findPhoneBtn';
    btn.type = 'button';
    btn.className = 'btn ghost';
    btn.style.marginLeft = '8px';
    btn.textContent = 'Find phone';
    btn.addEventListener('click', function(){
      var name = phInput.value && phInput.value.trim();
      if(!name) return alert('Please enter hospital name first');
      btn.textContent = 'Searching...'; btn.disabled = true;
      findPhoneForHospital(name).then(function(found){
        if(found){ phInput.dataset.phone = found; document.getElementById('preferredPhone').textContent = found; }
        else { document.getElementById('preferredPhone').textContent = 'unknown'; alert('Phone not found'); }
      }).catch(function(){ alert('Search failed'); }).finally(function(){ btn.textContent='Find phone'; btn.disabled=false; });
    });
    container.appendChild(span);
    container.appendChild(btn);
  })();

  // find phone: call /hospitals/search (nominatim) then /hospitals/nearby to try to get phone tags
  function findPhoneForHospital(name){
    return new Promise(function(resolve,reject){
      var sUrl = (API_BASE ? (API_BASE + '/hospitals/search?name='+encodeURIComponent(name)) : ('/hospitals/search?name='+encodeURIComponent(name)));
      fetch(sUrl).then(function(r){ return r.json(); }).then(function(list){
        if(!list || list.length===0) return resolve(null);
        var loc = list[0];
        var nbUrl = (API_BASE ? (API_BASE + '/hospitals/nearby?lat='+loc.lat+'&lon='+loc.lon+'&radius=2000') : ('/hospitals/nearby?lat='+loc.lat+'&lon='+loc.lon+'&radius=2000'));
        fetch(nbUrl).then(function(r2){ return r2.json(); }).then(function(items){
          // try to find an item with phone tag
          for(var i=0;i<items.length;i++){ var it = items[i]; if(it && it.raw && it.raw.tags){ var t = it.raw.tags.phone || it.raw.tags['contact:phone'] || it.raw.tags['phone:mobile'] || it.raw.tags['contact:mobile']; if(t){ return resolve(t); } } }
          resolve(null);
        }).catch(function(){ resolve(null); });
      }).catch(function(err){ reject(err); });
    });
  }

  // when user toggles the autoNearest checkbox, allow a one-time run if pickup exists
  var autoChk = document.getElementById('autoNearest');
  if(autoChk){
    autoChk.addEventListener('change', function(){
      if(autoChk.checked){
        // allow one run and trigger immediately if we have a pickup
        autoNearestDone = false;
        if(pickupMarker){
          var p = pickupMarker.getLatLng();
          autoSelectNearest(p.lat, p.lng).catch(function(){});
        }
      } else {
        autoNearestDone = false;
      }
    });
  }
});
