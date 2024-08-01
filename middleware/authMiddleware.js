const checkAuth = (req, res, next) => {
    if (!req.session.userId) {
      return res.redirect('/auth/login');
    }
    next();
};
  
export { checkAuth };
  