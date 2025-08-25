const fetch = require('node-fetch');
(async ()=>{
  try{
    console.log('Testing /auth/login');
    const r = await fetch('http://localhost:3000/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'admin@example.com',password:'adminpass'})});
    const j = await r.json();
    if(!j.token) throw new Error('login failed');
    console.log('Login OK');

    console.log('Testing /hospitals/search');
    const s = await fetch('http://localhost:3000/hospitals/search?name=City');
    const sj = await s.json();
    if(!Array.isArray(sj)) throw new Error('hospitals/search failed');
    console.log('Hospitals search OK');

    console.log('All tests passed');
    process.exit(0);
  }catch(e){
    console.error('Test failed',e);
    process.exit(2);
  }
})();
