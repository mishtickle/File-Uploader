require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { PrismaClient } = require('@prisma/client');
const PrismaSessionStore = require('@quixo3/prisma-session-store').PrismaSessionStore;
const app = express();
const prisma = new PrismaClient();
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

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