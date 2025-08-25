require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { sequelize, User, Booking, Hospital } = require('./models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

function authMiddleware(req, res, next){
  try{
    let token = null;
    if(req.headers.authorization) token = req.headers.authorization.split(' ')[1];
    else if(req.headers.cookie){ const m = req.headers.cookie.split('token=')[1]; if(m) token = m.split(';')[0]; }
    if(!token) return res.status(401).json({error:'No token'});
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  }catch(e){ res.status(401).json({error:'Invalid token'}); }
}

// SSE auth: prefer cookie token for EventSource (headers may not be set)
function sseAuth(req){
  try{
    let t = null;
    if(req.headers.cookie){ const m = req.headers.cookie.split('token=')[1]; if(m) t = m.split(';')[0]; }
    if(!t && req.headers.authorization) t = req.headers.authorization.split(' ')[1];
    if(!t) return null;
    return jwt.verify(t, JWT_SECRET);
  }catch(e){ return null; }
}

app.post('/auth/register', async (req,res)=>{
  const {name,email,password,role='user'} = req.body;
  if(!name||!email||!password) return res.status(400).json({error:'invalid'});
  const hash = await bcrypt.hash(password,10);
  const user = await User.create({name,email,password:hash,role});
  res.json({id:user.id,name:user.name,email:user.email,role:user.role});
});

app.post('/auth/login', async (req,res)=>{
  const {email,password} = req.body;
  const user = await User.findOne({where:{email}});
  if(!user) return res.status(401).json({error:'invalid'});
  const ok = await bcrypt.compare(password,user.password);
  if(!ok) return res.status(401).json({error:'invalid'});
  const token = jwt.sign({id:user.id,email:user.email,role:user.role}, JWT_SECRET, {expiresIn:'8h'});
  // set token as HttpOnly cookie for EventSource and improved security
  res.cookie('token', token, {httpOnly:true, sameSite:'lax', maxAge:8*60*60*1000});
  res.json({token});
});

app.get('/auth/me', async (req,res)=>{
  try{
    let t = null;
    if(req.headers.authorization) t = req.headers.authorization.split(' ')[1];
    else if(req.headers.cookie){ const m = req.headers.cookie.split('token=')[1]; if(m) t = m.split(';')[0]; }
    if(!t) return res.status(401).json({error:'no token'});
    const payload = jwt.verify(t, JWT_SECRET);
    res.json({id:payload.id,email:payload.email,role:payload.role});
  }catch(e){ res.status(401).json({error:'invalid'}); }
});

app.post('/auth/logout', (req,res)=>{
  res.clearCookie('token');
  res.json({ok:true});
});

// Auth-protected booking (admin/users with account)
app.post('/booking', authMiddleware, async (req,res)=>{
  const data = req.body;
  const etaMinutes = data.eta_minutes || 0;
  const booking = await Booking.create({...data, status:'Pending', eta_minutes:etaMinutes, userId: req.user.id});
  res.json(booking);
});

// Public booking endpoint for unauthenticated users (simple flow)
app.post('/booking-public', async (req,res)=>{
  try{
    const data = req.body;
    const etaMinutes = data.eta_minutes || 0;
    // userId null for guest bookings
    const booking = await Booking.create({...data, status:'Pending', eta_minutes:etaMinutes, userId: null});
    res.json(booking);
  }catch(e){
    console.error('Public booking failed',e);
    res.status(500).json({error:'booking failed'});
  }
});

app.get('/booking/:id', authMiddleware, async (req,res)=>{
  const b = await Booking.findByPk(req.params.id);
  if(!b) return res.status(404).json({error:'not found'});
  res.json(b);
});

app.get('/bookings', authMiddleware, async (req,res)=>{
  if(req.user.role!=='admin') return res.status(403).json({error:'forbidden'});
  const all = await Booking.findAll({order:[['createdAt','DESC']]});
  res.json(all);
});

app.put('/booking/:id/status', authMiddleware, async (req,res)=>{
  if(req.user.role!=='admin') return res.status(403).json({error:'forbidden'});
  const b = await Booking.findByPk(req.params.id);
  if(!b) return res.status(404).json({error:'not found'});
  b.status = req.body.status || b.status;
  await b.save();
  // publish SSE event to any connected clients for this user
  try{
    const payload = JSON.stringify({type:'booking:update', booking:{id:b.id,status:b.status}});
    // broadcast to all clients matching this userId
    for(const c of sseClients){
      if(c.userId === b.userId){ c.res.write(`data: ${payload}\n\n`); }
    }
  }catch(e){ /* swallow SSE errors */ }
  res.json(b);
});

// SSE clients list
const sseClients = [];

// Server-Sent Events endpoint: clients connect and receive events for their user
app.get('/events', (req,res)=>{
  const user = sseAuth(req);
  if(!user) return res.status(401).end('Unauthorized');
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.write('\n');
  const client = { userId: user.id, res };
  sseClients.push(client);
  req.on('close', ()=>{
    const idx = sseClients.indexOf(client);
    if(idx>=0) sseClients.splice(idx,1);
  });
});

// Hospitals: search (Nominatim) and nearby (Overpass)
app.get('/hospitals/search', async (req,res)=>{
  const q = req.query.name;
  if(!q) return res.json([]);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;
  const r = await axios.get(url, {headers:{'User-Agent':'ambulance-app'}});
  const items = r.data.map(x=>({name:x.display_name, lat:x.lat, lon:x.lon}));
  // Cache the first result in DB for faster subsequent loads
  if(items[0]){
    try{
      await Hospital.findOrCreate({
        where:{name: items[0].name, lat: items[0].lat, lon: items[0].lon},
        defaults:{address: items[0].name, is_active:true}
      });
    }catch(e){ /* swallow cache errors */ }
  }
  res.json(items);
});

app.get('/hospitals/nearby', async (req,res)=>{
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const radius = parseInt(req.query.radius) || 5000;
  if(!lat||!lon) return res.status(400).json({error:'lat/lon required'});
  const query = `[out:json];node["amenity"="hospital"](around:${radius},${lat},${lon});out;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const r = await axios.get(url, {headers:{'User-Agent':'ambulance-app'}});
  const items = (r.data.elements||[]).map(e=>({id:e.id,name:(e.tags&&e.tags.name)||'Hospital',lat:e.lat,lon:e.lon,raw:e}));
  // Try to reverse-geocode unnamed hospitals to get a better display name
  for(const h of items){
    if(!h.name || h.name==='Hospital'){
      try{
        const rev = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${h.lat}&lon=${h.lon}`,{headers:{'User-Agent':'ambulance-app'}});
        if(rev.data && rev.data.display_name) h.name = rev.data.display_name;
      }catch(e){ /* ignore */ }
    }
    // try to extract phone from OSM tags if present
    var phone = null;
    try{
      const tags = h.raw && h.raw.tags;
      if(tags){ phone = tags.phone || tags['contact:phone'] || tags['phone:mobile'] || tags['contact:mobile'] || null; }
    }catch(e){ phone = null; }
    await Hospital.findOrCreate({where:{name:h.name,lat:h.lat,lon:h.lon},defaults:{address:h.name||'',phone:phone,is_active:true}}).catch(()=>{});
  }
  res.json(items);
});

// Return cached hospitals from DB
app.get('/hospitals', async (req,res)=>{
  const all = await Hospital.findAll({order:[['name','ASC']]});
  res.json(all);
});

// Admin: add hospital manually
app.post('/hospitals', authMiddleware, async (req,res)=>{
  if(req.user.role!=='admin') return res.status(403).json({error:'forbidden'});
  const {name,address,lat,lon,is_active=true} = req.body;
  if(!name||!lat||!lon) return res.status(400).json({error:'missing fields'});
  const h = await Hospital.create({name,address,lat,lon,is_active});
  res.json(h);
});

// Admin: update hospital
app.put('/hospitals/:id', authMiddleware, async (req,res)=>{
  if(req.user.role!=='admin') return res.status(403).json({error:'forbidden'});
  const h = await Hospital.findByPk(req.params.id);
  if(!h) return res.status(404).json({error:'not found'});
  const {name,address,lat,lon,is_active} = req.body;
  if(name!==undefined) h.name = name;
  if(address!==undefined) h.address = address;
  if(lat!==undefined) h.lat = lat;
  if(lon!==undefined) h.lon = lon;
  if(is_active!==undefined) h.is_active = is_active;
  await h.save();
  res.json(h);
});

// Serve static frontend for simplicity
app.use('/', express.static(__dirname+'/../'));

const port = process.env.PORT || 3000;
// health check
app.get('/health', (req,res)=>res.json({status:'ok'}));

// route proxy to OSRM for better ETA and route geometry
app.get('/route', async (req,res)=>{
  try{
    const fromLat = parseFloat(req.query.fromLat);
    const fromLon = parseFloat(req.query.fromLon);
    const toLat = parseFloat(req.query.toLat);
    const toLon = parseFloat(req.query.toLon);
    if(isNaN(fromLat)||isNaN(fromLon)||isNaN(toLat)||isNaN(toLon)) return res.status(400).json({error:'bad coords'});
    // use public OSRM demo server
    const url = `http://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`; 
    const r = await axios.get(url,{timeout:5000});
    const route = (r.data.routes && r.data.routes[0]) || null;
    if(!route) return res.status(500).json({error:'no route'});
    res.json({duration: route.duration, distance: route.distance, geometry: route.geometry});
  }catch(e){ res.status(500).json({error:'route failed'}); }
});

// delete hospital (admin)
app.delete('/hospitals/:id', authMiddleware, async (req,res)=>{
  if(req.user.role!=='admin') return res.status(403).json({error:'forbidden'});
  const h = await Hospital.findByPk(req.params.id);
  if(!h) return res.status(404).json({error:'not found'});
  await h.destroy();
  res.json({ok:true});
});

// auto-seed minimal data on first run (if no users)
// Use alter:true to update the database schema for simple migrations (adds missing columns)
sequelize.sync({ alter: true }).then(async ()=>{
  try{
    const userCount = await User.count();
    if(userCount===0){
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('adminpass',10);
      await User.create({name:'Admin',email:'admin@example.com',password:hash,role:'admin'});
      await Hospital.bulkCreate([
        {name:'City Hospital',address:'Central',lat:20.5937,lon:78.9629,is_active:true},
        {name:'General Hospital',address:'North',lat:20.6,lon:78.97,is_active:true}
      ]);
      console.log('Auto-seeded initial data');
    }
  }catch(e){ console.error('Seeding failed',e); }
  app.listen(port, ()=>console.log('Server running on',port));
});
