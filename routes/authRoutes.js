import express from 'express';
import { register, login, logout, getProfile, editProfile } from '../controllers/authController.js';
import { checkAuth } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/register', (req, res) => res.render('register', { user: null }));
router.post('/register', register);
router.get('/login', (req, res) => res.render('login', { user: null }));
router.post('/login', login);
router.get('/logout', logout);
router.get('/profile', checkAuth, getProfile);
router.get('/edit-profile', checkAuth, (req,res) => res.render('edit-profile'));
router.post('/edit-profile', checkAuth, upload.single('profile_pic'), editProfile);

export default router;
