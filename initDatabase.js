const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// ENSURE /DATA FOLDER EXISTS
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// DEFINE DATABASE PATH INSIDE /DATA FOLDER
const dbPath = path.join(dataDir, 'casecus.db');
const db = new sqlite3.Database(dbPath);


db.serialize(() => {
  // DROP EXISTING TABLES TO ENSURE A CLEAN RESET
  db.run("DROP TABLE IF EXISTS users");
  db.run("DROP TABLE IF EXISTS loginhistory");
  db.run("DROP TABLE IF EXISTS products");
  db.run("DROP TABLE IF EXISTS messages");
  db.run("DROP TABLE IF EXISTS purchases");

  // CREATE USERS TABLE
  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      full_name TEXT NOT NULL,
      password TEXT NOT NULL
    )
  `);

  // CREATE LOGIN HISTORY TABLE
  db.run(`
    CREATE TABLE loginhistory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      login_time TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // CREATE PRODUCTS TABLE
  db.run(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      price REAL NOT NULL,
      description TEXT,
      image TEXT
    )
  `);
  
  // CREATE TABLE CART  TABLE
  db.run(`
  CREATE TABLE cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    added_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )
`);

  // CREATE CONTACT MESSAGES TABLE
  db.run(`
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstname TEXT NOT NULL,
      surname TEXT NOT NULL,
      email TEXT NOT NULL,
      mobile TEXT,
      message TEXT NOT NULL,
      submitted_at TEXT NOT NULL
    )
  `);

  // CREATE PURCHASES TABLE TO TRACK ORDERS PER USER
  db.run(`
    CREATE TABLE purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price_at_purchase REAL NOT NULL,
      purchased_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // INSERT DEFAULT PRODUCTS
  db.run(`
    INSERT INTO products (name, category, price, description, image)
    VALUES (?, ?, ?, ?, ?)`,
    ['Matte Black Case', 'iPhone Case', 45.99, 'Abstract color-block style with soft matte', 'product1.png']
  );

  db.run(`
    INSERT INTO products (name, category, price, description, image)
    VALUES (?, ?, ?, ?, ?)`,
    ['Crystal Clear Case', 'iPhone Case', 49.99, 'Showing your phone\'s original design while staying protected', 'product2.png']
  );

  db.run(`
    INSERT INTO products (name, category, price, description, image)
    VALUES (?, ?, ?, ?, ?)`,
    ['Elegant Wallet Case', 'iPhone Case', 54.99, 'Stylish protection with built-in card storage convenience', 'product3.png']
  );

  console.log("Database initialized: all tables created and default products inserted.");
});

db.close();
