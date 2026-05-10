const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nestlechain',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper function to create the DB if it doesn't exist
const createDBIfNotExists = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'nestlechain'}\`;`);
  await connection.end();
};

module.exports = {
  query: async (text, params) => {
    const [rows, fields] = await pool.query(text, params);
    return { rows, fields }; // Mimic pg behavior where rows is an array of results
  },
  pool,
  createDBIfNotExists
};
