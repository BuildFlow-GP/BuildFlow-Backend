const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    define: {
      freezeTableName: true, // prevent pluralization
      schema: 'buildflow'    // use your schema
    },
    logging: false, // Set to true for SQL debug
  }
);

module.exports = sequelize;
