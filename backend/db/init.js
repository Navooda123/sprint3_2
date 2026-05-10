const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

const initDb = async () => {
  try {
    const sqlPath = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Initializing database schema...');
    await pool.query(sql);
    console.log('Database schema initialized successfully.');
    
    // We will call the seed script separately
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  initDb();
}

module.exports = initDb;
