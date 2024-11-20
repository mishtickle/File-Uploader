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
router.get('/', authController.index)
router.post('/logout', authController.logout);
router.get('/folder/:name', authController.getFolder)
router.get('/createFolder', authController.createFolder);
router.post('/updateFolder', authController.updateFolder);
router.post('/deleteFolder', authController.deleteFolder);
router.post('/upload', authController.upload);
router.post('/deleteFile', authController.deleteFile);

module.exports = router;