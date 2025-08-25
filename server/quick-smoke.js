const fetch = require('node-fetch');
(async ()=>{
  try{
    const login = await fetch('http://localhost:3000/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'admin@example.com',password:'adminpass'})});
    const j = await login.json(); console.log('token?', !!j.token);
    const token = j.token;
    const payload = {patient_name:'Smoke Test',contact_number:'9999',preferred_hospital:'Test Hosp',pickup_lat:20.6,pickup_lon:78.9,hospital_lat:20.6,hospital_lon:78.95,eta_minutes:5};
    const b = await fetch('http://localhost:3000/booking',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token},body:JSON.stringify(payload)});
    const bj = await b.json(); console.log('created id', bj.id);
    const get = await fetch('http://localhost:3000/booking/'+bj.id,{headers:{'authorization':'Bearer '+token}});
    const gj = await get.json(); console.log('fetched booking id', gj.id, 'status', gj.status);
    process.exit(0);
  }catch(e){ console.error(e); process.exit(2); }
})();
