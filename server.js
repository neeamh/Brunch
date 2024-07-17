import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import methodOverride from "method-override";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

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

app.get("/", (req, res) => {
  const postsArray = Array.from(allPosts.entries());
  const postsWithImages = postsArray.filter(([id, post]) => post.img);
  const firstThreeEntries = postsWithImages.slice(Math.max(postsWithImages.length - 3, 0));
  res.render('home', { firstThree: firstThreeEntries });
});
app.get("/posts", (req, res) => {
  res.render('posts', { allPages: Array.from(allPosts.values()) });
});

app.get("/create", (req, res) => {
  res.render('create');
});

app.get("/posts/:id", (req, res) => {
  const post = allPosts.get(parseInt(req.params.id));
  if (post) {
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
    const updatedPost = {
      id: id,
      title: req.body.title,
      body: req.body.body,
      img: req.file ? '/uploads/' + req.file.filename : allPosts.get(id).img,
      updatedAt: new Date().toLocaleString()
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
    updatedAt: new Date().toLocaleString()
  };
  allPosts.set(id_counter, newPost);
  next();
}

app.post("/submit", upload.single('img'), newPost, (req, res) => {
  res.redirect("/posts");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});