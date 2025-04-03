const express = require('express');
const router = express.Router();

// Anasayfa için EJS view render ediliyor
router.get('/', (req, res) => {
  res.render('index');
});

module.exports = router;
