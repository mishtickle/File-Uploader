require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { PrismaClient } = require('@prisma/client');
const PrismaSessionStore = require('@quixo3/prisma-session-store').PrismaSessionStore;
var fs = require('fs');
const path = require('path');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000, // Check expired sessions every 2 minutes
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
  })
);

// File uploads
const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      console.log('req.folder:', req.folder)
      const uploadPath = path.join(__dirname, 'uploads', req.folder);
  
      // Create the directory if it doesn't exist
      fs.mkdir(uploadPath, { recursive: true }, (err) => {
        if (err) {
          console.error('Error creating folder:', err);
          return cb(err);
        }
        cb(null, uploadPath);
      });
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    },
  });
  const upload = multer({ storage: storage });
  app.post('/upload', (req, res, next) => {
    console.log(req.folder);
    next();
  }, upload.single('file'), (req, res) => {
    console.log(req.file);
    res.send('File uploaded successfully');
  });;

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport config
require('./models/user');

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/', authRoutes);

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
