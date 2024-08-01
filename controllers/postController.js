import db from '../config/database.js';

const getAllPosts = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT posts.*, users.username, users.profile_pic, users.img_mime_type
       FROM posts
       JOIN users ON posts.author_id = users.id
       ORDER BY posts.created_at DESC`
    );
    const posts = result.rows.map(post => {
      if (post.img) {
        post.img = Buffer.from(post.img).toString('base64');
      }
      if (post.profile_pic) {
        post.profile_pic = Buffer.from(post.profile_pic).toString('base64');
      }
      return post;
    });
    res.render('posts', { allPages: posts, userLikes: [] }); // Pass userLikes if needed
  } catch (error) {
    console.error('Error fetching posts', error.stack);
    res.status(500).send('Error fetching posts');
  }
};

const getPostById = async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10); // Ensure the post ID is an integer
    const result = await db.query(
      `SELECT posts.*, users.username, users.profile_pic, users.img_mime_type
       FROM posts
       JOIN users ON posts.author_id = users.id
       WHERE posts.id = $1`, [postId]);
    if (result.rows.length === 0) return res.status(404).send('Post not found');

    const post = result.rows[0];
    await db.query('UPDATE posts SET click_count = click_count + 1 WHERE id = $1', [postId]);
    if (post.img) {
      post.img = Buffer.from(post.img).toString('base64');
    }
    if (post.profile_pic) {
      post.profile_pic = Buffer.from(post.profile_pic).toString('base64');
    }
    res.render('postDetail', { post, userLikes: [] }); // Pass userLikes if needed
  } catch (error) {
    console.error('Error fetching post', error.stack);
    res.status(500).send('Error fetching post');
  }
};

const createPost = async (req, res) => {
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
  try {
    const result = await db.query('INSERT INTO posts (author_id, title, body, img, img_mime_type, created_at, updated_at, click_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [newPost.author_id, newPost.title, newPost.body, newPost.img, newPost.img_mime_type, newPost.created_at, newPost.updated_at, newPost.click_count]);
    newPost.id = result.rows[0].id;
    res.redirect("/posts");
  } catch (error) {
    console.error("Error creating new post:", error);
    res.status(500).send("Error creating new post");
  }
};

const editPost = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10); // Ensure the post ID is an integer
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
};

const deletePost = async (req, res) => {
  const id = parseInt(req.params.id, 10); // Ensure the post ID is an integer
  const result = await db.query('SELECT * FROM posts WHERE id = $1', [id]);
  if (result.rows.length === 0) return res.status(404).send('Post not found');

  const post = result.rows[0];
  if (post.author_id !== req.session.userId) {
    return res.status(403).send('You are not authorized to delete this post.');
  }

  await db.query('DELETE FROM posts WHERE id = $1', [id]);
  res.redirect("/posts");
};

export { getAllPosts, getPostById, createPost, editPost, deletePost };
