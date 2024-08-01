import bcrypt from 'bcrypt';
import db from '../config/database.js';

const register = async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).send('Passwords do not match');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
    const result = await db.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashedPassword]
    );
    req.session.userId = result.rows[0].id;
    req.session.username = username;
    res.redirect('/');
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Error registering user');
  }
};

const login = async (req, res) => {
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
        req.session.profilePic = user.profile_pic ? `data:${user.img_mime_type};base64,${user.profile_pic.toString('base64')}` : null;
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
};

const logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/');
    }

    res.clearCookie('connect.sid');
    res.redirect('/');
  });
};

const getProfile = async (req, res) => {
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
};

const editProfile = async (req, res) => {
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
    res.redirect('/auth/profile');
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).send('Error updating user profile');
  }
};

export { register, login, logout, getProfile, editProfile };
