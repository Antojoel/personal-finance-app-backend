const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");
const cors = require("cors"); // Import cors

const dotenv = require("dotenv");
dotenv.config();

const app = express();
const port = 3000;

app.use(cors()); // Allow CORS from all origins
app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

let connection;

async function initDatabase() {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("Connected to MySQL database");

    // Create table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        description TEXT,
        amount DECIMAL(10, 2),
        type VARCHAR(10),
        date DATETIME
      )
    `);
    console.log("Transactions table created or already exists");
  } catch (err) {
    console.error("Error initializing database:", err);
    process.exit(1);
  }
}

app.get("/api/transactions", async (req, res) => {
  try {
    const [rows] = await connection.execute("SELECT * FROM transactions");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/transactions", async (req, res) => {
  const { description, amount, type } = req.body;
  const date = new Date().toISOString().slice(0, 19).replace("T", " ");

  try {
    const [result] = await connection.execute(
      "INSERT INTO transactions (description, amount, type, date) VALUES (?, ?, ?, ?)",
      [description, amount, type, date]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    console.error("Error inserting transaction:", err);
    res.status(500).json({ error: err.message });
  }
});

initDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
});

// Ensure the database connection is closed when the app is terminated
process.on("SIGINT", async () => {
  if (connection) {
    await connection.end();
    console.log("MySQL connection closed");
  }
  process.exit(0);
});
