import mysql from 'mysql2/promise';

// Uses client-side placeholder escaping (pool.query), which matches how PHP PDO's
// default emulated prepares behaved, so values reach MySQL exactly as before.
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  connectionLimit: 10,
  dateStrings: true, // return DATE/TIME columns as strings, like PHP did
});

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
