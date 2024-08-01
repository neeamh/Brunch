import express from 'express';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import dotenv from 'dotenv';
import db from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import stockRoutes from './routes/stockRoutes.js';

dotenv.config();

const app = express();

const PgSession = connectPgSimple(session);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(methodOverride('_method'));

app.use(session({
  store: new PgSession({ pool: db }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use((req, res, next) => {
  res.locals.user = req.session.userId ? { id: req.session.userId, username: req.session.username } : null;
  next();
});

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use('/auth', authRoutes);
app.use('/posts', postRoutes);
app.use('/', stockRoutes);

app.get('*', (req, res) => {
  res.status(404).send('Page not found');
});

export default app;
