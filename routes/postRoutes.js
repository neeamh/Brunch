import express from 'express';
import { getAllPosts, getPostById, createPost, editPost, deletePost } from '../controllers/postController.js';
import { checkAuth } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import db from '../config/database.js';  // Import the db module

const router = express.Router();

router.get('/', getAllPosts);
router.get('/create', checkAuth, (req, res) => res.render('create'));
router.post('/submit', checkAuth, upload.single('img'), createPost);
router.get('/:id', getPostById);
router.get('/edit/:id', checkAuth, async (req, res) => {
  const postId = parseInt(req.params.id, 10); // Ensure the post ID is an integer
  const result = await db.query('SELECT * FROM posts WHERE id = $1', [postId]);
  if (result.rows.length === 0) return res.status(404).send('Post not found');
  res.render('edit', { post: result.rows[0] });
});
router.patch('/edit/:id', checkAuth, upload.single('img'), editPost);
router.delete('/delete/:id', checkAuth, deletePost);

export default router;
