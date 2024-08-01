import axios from 'axios';
import db from '../config/database.js';

const getStockData = async (req, res) => {
  try {
    const response = await axios.get('https://finnhub.io/api/v1/stock/symbol', {
      params: {
        exchange: 'US',
        token: process.env.API_KEY
      }
    });

    const popularSymbols = response.data.slice(0, 15).map(stock => stock.symbol);

    const stockDataPromises = popularSymbols.map(symbol =>
      axios.get('https://finnhub.io/api/v1/quote', {
        params: {
          symbol: symbol,
          token: process.env.API_KEY
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
};

export { getStockData };
