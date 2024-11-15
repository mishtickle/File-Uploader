const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');

const router = express.Router();

// Views
router.get('/login', (req, res) => res.render('login'));
router.get('/register', (req, res) => res.render('register'));
router.get('/profile', authController.profile);

// Actions
router.post('/register', authController.register);
router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: false, // Set to true if using connect-flash
  })
);
router.post('/logout', authController.logout);

module.exports = router;
