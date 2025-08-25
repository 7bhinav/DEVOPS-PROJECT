const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
// Allow overriding the sqlite file location to avoid OneDrive/permission issues on Windows
const storagePath = process.env.DB_PATH || path.join(__dirname,'database.sqlite');
console.log('Using SQLite DB at', storagePath);
const sequelize = new Sequelize({dialect:'sqlite', storage: storagePath});

const User = sequelize.define('User',{name:DataTypes.STRING,email:{type:DataTypes.STRING,unique:true},password:DataTypes.STRING,role:{type:DataTypes.STRING,defaultValue:'user'}});

const Booking = sequelize.define('Booking',{
  patient_name:DataTypes.STRING,
  contact_number:DataTypes.STRING,
  emergency_type:DataTypes.STRING,
  preferred_hospital:DataTypes.STRING,
  pickup_lat:DataTypes.FLOAT,
  pickup_lon:DataTypes.FLOAT,
  hospital_lat:DataTypes.FLOAT,
  hospital_lon:DataTypes.FLOAT,
  userId: DataTypes.INTEGER,
  hospital_phone: DataTypes.STRING,
  status:{type:DataTypes.STRING,defaultValue:'Pending'},
  eta_minutes:DataTypes.INTEGER
});

const Hospital = sequelize.define('Hospital',{
  name:DataTypes.STRING,
  address:DataTypes.STRING,
  phone:DataTypes.STRING,
  lat:DataTypes.FLOAT,
  lon:DataTypes.FLOAT,
  is_active:{type:DataTypes.BOOLEAN,defaultValue:true}
});

module.exports = {sequelize, User, Booking, Hospital};
