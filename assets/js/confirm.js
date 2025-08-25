document.addEventListener('DOMContentLoaded', function(){
  var params = new URLSearchParams(location.search);
  var id = params.get('id');
  var patient = params.get('patient') || 'Guest';
  var ambulance = params.get('ambulance') || 'BLS';
  var hospital = params.get('hospital') || 'Selected Hospital';
  var hospitalPhone = params.get('hospital_phone') || '';
  var fare = params.get('fare') || '';

  var summary = document.getElementById('summary');
  var phoneHtml = hospitalPhone ? ('<p><strong>Hospital Phone:</strong> <a href="tel:' + hospitalPhone + '">' + hospitalPhone + '</a></p>') : ('<p><strong>Hospital Phone:</strong> <span id="confirmPhone">unknown</span> <button id="confirmFindPhone" class="btn ghost">Find phone</button></p>');
  summary.innerHTML = '<h3>Booking #' + (id||'N/A') + '</h3>' +
    '<p><strong>Patient:</strong> ' + patient + '</p>' +
    '<p><strong>Ambulance:</strong> ' + ambulance + '</p>' +
    '<p><strong>Hospital:</strong> ' + hospital + '</p>' + phoneHtml;

  if(fare){
    var bill = document.getElementById('bill');
    bill.innerHTML = '<h3>Bill</h3><p>Fare estimate: ' + fare + '</p>' + bill.innerHTML;
  }

  // Mock billing: base fare + distance estimate
  var base = 1500; // currency units
  var distanceCharge = 300; // placeholder
  var tax = Math.round((base + distanceCharge) * 0.12);
  var total = base + distanceCharge + tax;

  var bill = document.getElementById('bill');
  bill.innerHTML = '<h3>Bill</h3>' +
    '<p>Base fare: ' + base + '</p>' +
    '<p>Distance/Time charge: ' + distanceCharge + '</p>' +
    '<p>Tax (12%): ' + tax + '</p>' +
    '<hr><p><strong>Total: ' + total + '</strong></p>';

  // wire confirm find phone button
  var btn = document.getElementById('confirmFindPhone');
  if(btn){
    btn.addEventListener('click', function(){
      btn.textContent = 'Searching...'; btn.disabled = true;
      // try server-side search first
      fetch('/hospitals/search?name='+encodeURIComponent(hospital)).then(function(r){ return r.json(); }).then(function(list){
        if(list && list.length>0){
          // attempt nearby phone extraction
          var loc = list[0];
          fetch('/hospitals/nearby?lat='+loc.lat+'&lon='+loc.lon+'&radius=2000').then(function(r2){ return r2.json(); }).then(function(items){
            for(var i=0;i<items.length;i++){ var it = items[i]; if(it && it.raw && it.raw.tags){ var t = it.raw.tags.phone || it.raw.tags['contact:phone'] || it.raw.tags['phone:mobile'] || it.raw.tags['contact:mobile']; if(t){ document.getElementById('confirmPhone').textContent = t; btn.remove(); return; } } }
            btn.textContent='Find phone'; btn.disabled=false; alert('Phone not found');
          }).catch(function(){ btn.textContent='Find phone'; btn.disabled=false; alert('Search failed'); });
        } else { btn.textContent='Find phone'; btn.disabled=false; alert('No results'); }
      }).catch(function(){ btn.textContent='Find phone'; btn.disabled=false; alert('Search failed'); });
    });
  }
});
