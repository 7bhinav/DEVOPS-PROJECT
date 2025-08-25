const fetch = require('node-fetch');
(async ()=>{
  try{
    console.log('Health check');
    const h = await fetch('http://localhost:3000/health');
    if(h.status!==200) throw new Error('health failed');

    console.log('Login');
    const r = await fetch('http://localhost:3000/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'admin@example.com',password:'adminpass'})});
    const j = await r.json(); if(!j.token) throw new Error('login failed');

    console.log('Search hospitals');
    const s = await fetch('http://localhost:3000/hospitals/search?name=City');
    const sj = await s.json(); if(!Array.isArray(sj)) throw new Error('hosp search failed');

    console.log('Nearby');
    const b = await fetch('http://localhost:3000/hospitals/nearby?lat=20.5937&lon=78.9629&radius=2000');
    const bj = await b.json(); if(!Array.isArray(bj)) throw new Error('nearby failed');

    console.log('All CI checks passed'); process.exit(0);
  }catch(e){ console.error('CI tests failed',e); process.exit(2); }
})();
