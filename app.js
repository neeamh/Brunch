import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import axios from 'axios';
import methodOverride from "method-override";
import dotenv from 'dotenv';
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
dotenv.config();

console.log(process.env)

const FINNHUB_API_KEY = process.env.API_KEY;
console.log('FINNHUB_API_KEY:', process.env.API_KEY); // Verify the API key

let allPosts = new Map();
let id_counter = 0;

app.use(bodyParser.urlencoded({ extended: true }));

// Set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', (__dirname, 'views'));
app.use(express.static(__dirname + "/public"));
app.use(methodOverride('_method'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

app.get("/", async (req, res) => {
  try {
    const response = await axios.get(`https://finnhub.io/api/v1/stock/symbol`, {
      params: {
        exchange: 'US',
        token: FINNHUB_API_KEY
      }
    });

    const popularSymbols = response.data.slice(0, 15).map(stock => stock.symbol); // Get top 10 stocks

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
    
    const firstThreeEntries = Array.from(allPosts.entries())
      .sort((a, b) => b[1].clickCount - a[1].clickCount) // sort by click count
      .slice(0, 3);
    const recentPosts = Array.from(allPosts.values()).slice(-10).reverse(); // get the last 10 posts

    res.render('home', { firstThree: firstThreeEntries, recentPosts, stockData });
  } catch (error) {
    console.error("Error fetching stock data:", error);
    res.status(500).send("Error fetching stock data");
  }
});


app.get("/posts", (req, res) => {
  const sortedPosts = Array.from(allPosts.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.render('posts', { allPages: sortedPosts });
});

app.get("/create", (req, res) => {
  res.render('create');
});

app.get("/posts/:id", (req, res) => {
  const post = allPosts.get(parseInt(req.params.id));
  if (post) {
    post.clickCount = (post.clickCount || 0) + 1;  // Increment click count
    allPosts.set(post.id, post);  // Save the updated post back to the map
    res.render('postDetail', { post });
  } else {
    res.status(404).send('Post not found');
  }
});

app.get("/edit/:id", (req, res) => {
  const post = allPosts.get(parseInt(req.params.id));
  if (post) {
    res.render('edit', { post });
  } else {
    res.status(404).send('Post not found');
  }
});

app.patch("/edit/:id", upload.single('img'), (req, res) => {
  const id = parseInt(req.params.id);
  if (allPosts.has(id)) {
    const existingPost = allPosts.get(id);
    const updatedPost = {
      id: id,
      title: req.body.title,
      body: req.body.body,
      img: req.file ? '/uploads/' + req.file.filename : existingPost.img,
      updatedAt: new Date().toLocaleString(),
      clickCount: existingPost.clickCount  // Preserve the click count
    };
    allPosts.set(id, updatedPost);
  }
  res.redirect("/posts");
});

app.delete("/delete/:id", (req, res) => {
  const id = parseInt(req.params.id);
  allPosts.delete(id);
  res.redirect("/posts");
});

function newPost(req, res, next) {
  if (!req.body.title || !req.body.body) {
    return res.redirect("/create");
  }
  id_counter++;
  const newPost = {
    id: id_counter,
    title: req.body.title,
    body: req.body.body,
    img: req.file ? '/uploads/' + req.file.filename : null,
    updatedAt: new Date().toLocaleString(),
    clickCount: 0  // Initialize click count
  };
  allPosts.set(id_counter, newPost);
  next();
}

app.post("/submit", upload.single('img'), newPost, (req, res) => {
  res.redirect("/posts");
});


// Function to initialize posts 
// SOLELY FOR TESTING PURPOSES
//ALL IMAGES ARE IN /public/uploads
//THIS FUNCTION IS CALLED IN THE SERVER.JS FILE
//REMEMBER TO DELETE    
//////////////////////////////////////////////
export function initializePosts() {
    const examplePosts = [
      {
        title: "Doflamingo",
        body: "This is an example post about Doflamingo.",
        img: "/uploads/test1.jpg"
      },
      {
        title: "One Piece",
        body: "This is an example post about One Piece.",
        img: "/uploads/test2.jpg"
      },
      {
        title: "Red Dress",
        body: "This is an example post about a Red Dress.",
        img: "/uploads/test3.JPG"
      },
      {
        title: "2048",
        body: "This is an example post about 2048.",
        img: "/uploads/test4.PNG"
      },
      {
        title: "Anime",
        body: "This is an example post about Anime.",
        img: "/uploads/test5.jpg"
      },
      {
        title: "Vegapunk",
        body: "This is an example post about Vegapunk.",
        img: "/uploads/test6.PNG"
      }
    ];
  
    examplePosts.forEach(post => {
      id_counter++;
      allPosts.set(id_counter, {
        id: id_counter,
        title: post.title,
        body: post.body,
        img: post.img,
        updatedAt: new Date().toLocaleString(),
        clickCount: 0 // Initialize click count
      });
    });
}
/////////////////////////////////////////////

export default app;