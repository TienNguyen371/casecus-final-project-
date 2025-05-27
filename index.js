// Require the express web application framework (https://expressjs.com)
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const fs = require("fs");
const OpenAI = require("openai");

// Create a new web application by calling the express function
const app = express();
const port = 3000;

// Tell our application to serve all the files under the `public_html` directory
const dataDir = path.join(__dirname, "data");
const db = new sqlite3.Database(path.join(dataDir, "casecus.db"));

// Middleware
app.use(express.static(path.join(__dirname, "public_html")));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: "casecus-secret",
  resave: false,
  saveUninitialized: false
}));

//CART DATA AVAILABLE IN ALL EJS 
app.use((req, res, next) => {
  res.locals.toast = req.session.message || null;
  delete req.session.message;

  res.locals.session = req.session;
  res.locals.cartItems = [];

  if (req.session.user) {
    const userId = req.session.user.id;

    const sql = `
      SELECT p.name, p.price, c.quantity 
      FROM cart_items c 
      JOIN products p ON p.id = c.product_id 
      WHERE c.user_id = ?
    `;

    db.all(sql, [userId], (err, rows) => {
      if (err) {
        console.error("Cart fetch error:", err.message);
        return next();
      }

      res.locals.cartItems = rows || []; 
      next();
    });
  } else {
    next();
  }
});

// USER LOGIN
app.post("/login", async (req, res, next) => {
  console.time("LoginTotal");

  const { email, password } = req.body;

  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err) return next(err);
    if (!user) return res.render("invalid", { message: "Invalid email or password." });

    console.time("BcryptCompare");
    const match = await bcrypt.compare(password, user.password);
    console.timeEnd("BcryptCompare");

    if (!match) return res.render("invalid", { message: "Invalid email or password." });

    req.session.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.full_name
    };

    db.run(
      `INSERT INTO loginhistory (user_id, login_time) VALUES (?, ?)`,
      [user.id, new Date().toISOString()],
      (err) => {
        if (err) {
          console.error("Error inserting login history:", err);
          return next(err);
        }

        console.timeEnd("LoginTotal");
        res.redirect("/homepage.html");
      }
    );
  });
});

// SIGNUP
app.post("/signup-confirm", async (req, res, next) => {
  const { email, fullname, password, confirmPassword } = req.body;

  if (!email || !fullname || !password || !confirmPassword) {
    req.session.message = "All fields are required.";
    return res.redirect("/signup.html");
  }

  if (password !== confirmPassword) {
    req.session.message = "Passwords do not match.";
    return res.redirect("/signup.html");
  }

  const hashed = await bcrypt.hash(password, 10);
  const username = email.split("@")[0];

  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
    if (err) return next(err);
    if (row) {
      req.session.message = "Account already exists.";
      return res.redirect("/signup.html");
    }

    db.run(`INSERT INTO users (email, username, full_name, password) VALUES (?, ?, ?, ?)`,
      [email, username, fullname, hashed],
      err => {
        if (err) return next(err);
        req.session.message = "Account created successfully! You can now log in.";
        res.redirect("/signupsuccess.html");
      });
  });
});

// SEARCH PRODUCTS
app.get("/search", (req, res, next) => {
  const query = req.query.query?.trim().toLowerCase();
  if (!query) return res.render("search", { query: "", results: [] });

  const keywords = query.split(/\s+/);
  const conditions = keywords.map(k => `(LOWER(name) LIKE ? OR LOWER(description) LIKE ?)`).join(" AND ");
  const values = keywords.flatMap(k => [`%${k}%`, `%${k}%`]);

  db.all(`SELECT * FROM products WHERE ${conditions}`, values, (err, rows) => {
    if (err) return next(err);
    res.render("search", { query, results: rows });
  });
});

// ADD TO CART
app.post("/add-to-cart", (req, res, next) => {
  if (!req.session.user) return res.status(401).send("Please log in to add items to your cart.");

  const { product_id, quantity } = req.body;
  const userId = req.session.user.id;
  const qty = parseInt(quantity) || 1;

  db.get(`SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?`, [userId, product_id], (err, row) => {
    if (err) return next(err);
    if (row) {
      db.run(`UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?`,
        [qty, userId, product_id], err => {
          if (err) return next(err);
          req.session.message = `Updated cart quantity.`;
          res.redirect("/view-cart");
        });
    } else {
      db.run(`INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)`,
        [userId, product_id, qty], err => {
          if (err) return next(err);
          req.session.message = `Product added to cart.`;
          res.redirect("/view-cart");
        });
    }
  });
});

// VIEW CART
app.get("/view-cart", (req, res, next) => {
  if (!req.session.user) return res.status(401).send("Please log in to view your cart.");
  const userId = req.session.user.id;

  const sql = `
    SELECT p.id AS product_id, p.name, p.description, p.price, p.image, c.quantity
    FROM cart_items c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `;

  db.all(sql, [userId], (err, rows) => {
    if (err) return next(err);
    const message = req.session.message || null;
    delete req.session.message;
    res.render("cart", { title: "Your Cart", items: rows, message });
  });
});

// DECREASE FROM CART
app.post("/decrease-from-cart", (req, res, next) => {
  if (!req.session.user) return res.status(401).send("Login required");
  const userId = req.session.user.id;
  const { product_id } = req.body;

  db.get(`SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?`, [userId, product_id], (err, row) => {
    if (err) return next(err);
    if (!row) return res.redirect("/view-cart");

    if (row.quantity <= 1) {
      db.run(`DELETE FROM cart_items WHERE user_id = ? AND product_id = ?`, [userId, product_id], err => {
        if (err) return next(err);
        req.session.message = `Item removed from your cart.`;
        res.redirect("/view-cart");
      });
    } else {
      db.run(`UPDATE cart_items SET quantity = quantity - 1 WHERE user_id = ? AND product_id = ?`,
        [userId, product_id], err => {
          if (err) return next(err);
          req.session.message = `Reduced quantity by 1.`;
          res.redirect("/view-cart");
        });
    }
  });
});

// LOG OUT
app.get("/logout", (req, res, next) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Logout Error:", err);
      return next(err);
    }
    res.redirect("/homepage.html");
  });
});

// CHATBOT
const openai = new OpenAI({
  apiKey: 'process.env.OPENAI_API_KEY',
});

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: userMessage }],
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error("OpenAI Error:", error.response?.status, error.response?.data || error.message);
    res.status(500).json({ reply: "Something went wrong. Please try again later." });
  }
});

// CONTACT FORM
app.post("/submit-contact", (req, res, next) => {
  const { firstname, surname, email, mobile, message } = req.body;
  const submitted_at = new Date().toISOString();

  db.run(`INSERT INTO messages (firstname, surname, email, mobile, message, submitted_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [firstname, surname, email, mobile, message, submitted_at], err => {
      if (err) return next(err);
      res.redirect("/messagesuccess.html");
    });
});

// ROUTES TO EJS PAGES
app.get("/homepage.html", (req, res) => res.render("homepage"));
app.get("/product1", (req, res) => res.render("product1"));
app.get("/product2", (req, res) => res.render("product2"));
app.get("/product3", (req, res) => res.render("product3"));
app.get("/productpage.html", (req, res) => res.render("productpage"));
app.get("/contactpage.html", (req, res) => res.render("contactpage"));
app.get("/newsandevent.html", (req, res) => res.render("newsandevent"));

// Dynamic Slug-based Routing
const productRouteMap = {
  "matteblackcase": "product1",
  "crystalclearcase": "product2",
  "elegantwalletcase": "product3"
};

app.get("/:productslug", (req, res) => {
  const page = productRouteMap[req.params.productslug.toLowerCase()];
  if (page) {
    res.render(page);
  } else {
    res.status(404).render("404", { message: "Product page not found" });
  }
});

// ERROR
app.use((req, res) => res.status(404).render("404", { title: "Page Not Found" }));
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).render("500", { title: "Server Error" });
});

// Tell our application to listen to requests at port 3000 on the localhost
app.listen(port, () => {
  // When the application starts, print to the console that our app is
  // running at http://localhost:3000. Print another message indicating
  // how to shut the server down.
  console.log(`Web server running at: http://localhost:${port}`)
  console.log(`Type Ctrl+C to shut down the web server`)

});