const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const prisma = new PrismaClient();

exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    res.redirect('/login');
  } catch (error) {
    res.status(500).send('Error registering user');
  }
};

exports.login = (req, res) => {
  res.redirect('/profile');
};

exports.index = (req ,res) => {
    res.render('index');
}

exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).send('Error logging out');
    }
    res.redirect('/login');
  });
};

exports.profile = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  res.render('profile', { user: req.user });
};
