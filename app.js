import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import axios from 'axios';
import methodOverride from "method-override";
import dotenv from 'dotenv';
import pg from 'pg';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
const app = express();
const port = 8080;

// Database connection
const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: false
});
db.connect();

const PgSession = connectPgSimple(session);

const FINNHUB_API_KEY = process.env.API_KEY;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(methodOverride('_method'));
app.use(session({
  store: new PgSession({
    pool: db
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set secure: true for HTTPS
}));
app.use((req, res, next) => {
  res.locals.user = req.session.userId ? { id: req.session.userId, username: req.session.username } : null;
  next();
});
app.set('view engine', 'ejs');
app.set('views', 'views');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const checkAuth = (req, res, next) => {
  if (!req.session.userId) {
    res.redirect('/login');
  } else {
    next();
  }
};


app.get("/", async (req, res) => {
  try {
    const response = await axios.get(`https://finnhub.io/api/v1/stock/symbol`, {
      params: {
        exchange: 'US',
        token: FINNHUB_API_KEY
      }
    });

    const popularSymbols = response.data.slice(0, 15).map(stock => stock.symbol);

    const stockDataPromises = popularSymbols.map(symbol =>
      axios.get(`https://finnhub.io/api/v1/quote`, {
        params: {
          symbol: symbol,
          token: FINNHUB_API_KEY
        }
      })
    );

    const stockDataResponses = await Promise.all(stockDataPromises);

    const stockData = stockDataResponses.map((response, index) => ({
      symbol: popularSymbols[index],
      price: response.data.c,
      change: response.data.d
    }));

    const firstThreeEntries = await db.query('SELECT posts.*, users.username, users.profile_pic, users.img_mime_type FROM posts JOIN users ON posts.author_id = users.id ORDER BY click_count DESC LIMIT 3');
    const recentPosts = await db.query('SELECT posts.*, users.username, users.profile_pic, users.img_mime_type FROM posts JOIN users ON posts.author_id = users.id ORDER BY created_at DESC LIMIT 10');

    const firstThree = firstThreeEntries.rows.map(post => {
      if (post.img) {
        post.img = Buffer.from(post.img).toString('base64');
      }
      if (post.profile_pic) {
        post.profile_pic = Buffer.from(post.profile_pic).toString('base64');
      }
      return post;
    });

    const recent = recentPosts.rows.map(post => {
      if (post.img) {
        post.img = Buffer.from(post.img).toString('base64');
      }
      if (post.profile_pic) {
        post.profile_pic = Buffer.from(post.profile_pic).toString('base64');
      }
      return post;
    });

    res.render('home', {
      firstThree: firstThree,
      recentPosts: recent,
      stockData,
      user: req.session.userId ? { id: req.session.userId, username: req.session.username, profile_pic: req.session.profile_pic } : null
    });
  } catch (error) {
    console.error("Error fetching stock data:", error);
    res.status(500).send("Error fetching stock data");
  }
});

app.get("/posts", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT posts.*, users.username, users.profile_pic, users.img_mime_type 
      FROM posts 
      JOIN users ON posts.author_id = users.id 
      ORDER BY posts.created_at DESC
    `);
    const posts = result.rows.map(post => {
      if (post.img) {
        post.img = Buffer.from(post.img).toString('base64');
      }
      if (post.profile_pic) {
        post.profile_pic = Buffer.from(post.profile_pic).toString('base64');
      }
      return post;
    });
    res.render('posts', { allPages: posts, user: req.session.userId ? { id: req.session.userId, username: req.session.username } : null });
  } catch (error) {
    console.error('Error fetching posts', error.stack);
    res.status(500).send('Error fetching posts');
  }
});


app.get("/create", checkAuth, (req, res) => {
  res.render('create');
});

app.get("/posts/:id", async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).send('Post not found');

    const post = result.rows[0];
    await db.query('UPDATE posts SET click_count = click_count + 1 WHERE id = $1', [req.params.id]);
    if (post.img) {
      post.img = Buffer.from(post.img).toString('base64');
    }
    res.render('postDetail', { post, user: req.session.userId ? { id: req.session.userId, username: req.session.username } : null });
  } catch (error) {
    console.error('Error fetching post', error.stack);
    res.status(500).send('Error fetching post');
  }
});


app.get("/edit/:id", checkAuth, async (req, res) => {
  const result = await db.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).send('Post not found');
  
  const post = result.rows[0];
  if (post.author_id !== req.session.userId) {
    return res.status(403).send('You are not authorized to edit this post.');
  }
  
  res.render('edit', { post });
});

app.patch("/edit/:id", checkAuth, upload.single('img'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existingPost = await db.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (existingPost.rows.length === 0) return res.status(404).send('Post not found');
    
    if (existingPost.rows[0].author_id !== req.session.userId) {
      return res.status(403).send('You are not authorized to edit this post.');
    }

    const img = req.file ? req.file.buffer : existingPost.rows[0].img;
    const imgMimeType = req.file ? req.file.mimetype : existingPost.rows[0].img_mime_type;

    await db.query(
      'UPDATE posts SET title = $1, body = $2, img = $3, img_mime_type = $4, updated_at = $5 WHERE id = $6',
      [req.body.title, req.body.body, img, imgMimeType, new Date(), id]
    );
    res.redirect("/posts");
  } catch (error) {
    console.error('Error updating post', error.stack);
    res.status(500).send('Error updating post');
  }
});


app.delete("/delete/:id", checkAuth, async (req, res) => {
  const result = await db.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).send('Post not found');

  const post = result.rows[0];
  if (post.author_id !== req.session.userId) {
    return res.status(403).send('You are not authorized to delete this post.');
  }

  await db.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
  res.redirect("/posts");
});


function newPost(req, res, next) {
  if (!req.body.title || !req.body.body) {
    return res.redirect("/create");
  }
  const newPost = {
    author_id: req.session.userId,
    title: req.body.title,
    body: req.body.body,
    img: req.file ? req.file.buffer : null,
    img_mime_type: req.file ? req.file.mimetype : null,
    created_at: new Date(),
    updated_at: new Date(),
    click_count: 0
  };
  db.query('INSERT INTO posts (author_id, title, body, img, img_mime_type, created_at, updated_at, click_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
    [newPost.author_id, newPost.title, newPost.body, newPost.img, newPost.img_mime_type, newPost.created_at, newPost.updated_at, newPost.click_count])
    .then(result => {
      newPost.id = result.rows[0].id;
      next();
    })
    .catch(error => {
      console.error("Error creating new post:", error);
      res.status(500).send("Error creating new post");
    });
}

app.post("/submit", checkAuth, upload.single('img'), newPost, (req, res) => {
  res.redirect("/posts");
});


// User registration
app.get('/register', (req, res) => {
  res.render('register', { user: null });
});

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultProfilePicPath = path.join(__dirname, 'public/assets/default-profile.png');
    const defaultProfilePic = fs.readFileSync(defaultProfilePicPath);

    const result = await db.query(
      'INSERT INTO users (username, email, password, profile_pic, img_mime_type) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [username, email, hashedPassword, defaultProfilePic, 'image/png']
    );

    req.session.userId = result.rows[0].id;
    req.session.username = username;
    res.redirect('/');
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Error registering user');
  }
});


// User login
app.get('/login', (req, res) => {
  res.render('login', { user: null });
});
// User login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query(
      'SELECT id, username, password, profile_pic, img_mime_type FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.profilePic = user.profile_pic ? `data:${user.profile_pic_mime_type};base64,${user.profile_pic.toString('base64')}` : null;
        res.redirect('/');
      } else {
        res.status(401).send('Invalid username or password');
      }
    } else {
      res.status(401).send('Invalid username or password');
    }
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).send('Error logging in user');
  }
});

// Display profile page
app.get('/profile', checkAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userResult = await db.query('SELECT username, email, profile_pic, img_mime_type FROM users WHERE id = $1', [userId]);
    const postsResult = await db.query('SELECT * FROM posts WHERE author_id = $1 ORDER BY created_at DESC', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).send('User not found');
    }

    const user = userResult.rows[0];
    const posts = postsResult.rows.map(post => {
      if (post.img) {
        post.img = Buffer.from(post.img).toString('base64');
      }
      return post;
    });

    if (user.profile_pic) {
      user.profile_pic = Buffer.from(user.profile_pic).toString('base64');
    }

    res.render('profile', {
      user: user,
      posts: posts
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).send('Error fetching user profile');
  }
});

// Display edit profile page
app.get('/edit-profile', checkAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT username, email FROM users WHERE id = $1', [req.session.userId]);
    if (result.rows.length === 0) return res.status(404).send('User not found');
    res.render('edit-profile', { user: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user profile for editing:', error);
    res.status(500).send('Error fetching user profile for editing');
  }
});

// Handle profile update
app.post('/edit-profile', checkAuth, upload.single('profile_pic'), async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const userId = req.session.userId;
    let updateQuery = 'UPDATE users SET username = $1, email = $2';
    const values = [username, email];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = $3';
      values.push(hashedPassword);
    }

    if (req.file) {
      const imgIndex = values.length + 1;
      updateQuery += `, profile_pic = $${imgIndex}`;
      values.push(req.file.buffer);
    }

    updateQuery += ' WHERE id = $' + (values.length + 1);
    values.push(userId);

    await db.query(updateQuery, values);
    req.session.username = username;
    res.redirect('/profile');
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).send('Error updating user profile');
  }
});


// User logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/');
    }

    res.clearCookie('connect.sid'); // Assuming 'connect.sid' is the cookie name used by express-session
    res.redirect('/');
  });
});

export default app;
