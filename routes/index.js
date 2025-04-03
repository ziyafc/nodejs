const express = require('express');
const router = express.Router();

// Anasayfada index.ejs render ediliyor
router.get('/', (req, res) => {
  res.render('index');
});

module.exports = router;
