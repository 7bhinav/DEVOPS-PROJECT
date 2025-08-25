const { sequelize, User, Hospital } = require('./models');
const bcrypt = require('bcrypt');

async function run(){
  await sequelize.sync({force:true});
  const hash = await bcrypt.hash('adminpass',10);
  await User.create({name:'Admin',email:'admin@example.com',password:hash,role:'admin'});
  await Hospital.bulkCreate([
    {name:'City Hospital',address:'Central',lat:20.5937,lon:78.9629,is_active:true},
    {name:'General Hospital',address:'North',lat:20.6,lon:78.97,is_active:true}
  ]);
  console.log('Seeded');
  process.exit(0);
}
run();
