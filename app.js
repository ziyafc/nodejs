const express = require('express');
const path = require('path');
const indexRouter = require('./routes/index');
const { createClient } = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;

// EJS view engine ayarı
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Statik dosyalar
app.use(express.static(path.join(__dirname, 'public')));

// Redis bağlantı middleware'i
app.use(async (req, res, next) => {
  const client = createClient({ url: process.env.REDIS_URL });
  try {
    await client.connect();
    await client.set('hello', 'world');
    const value = await client.get('hello');
    res.locals.redisStatus = "redis oldu bu iş";
    await client.quit();
  } catch (err) {
    res.locals.redisStatus = "olmadı mk";
  }
  next();
});

// Router kullanımı
app.use('/', indexRouter);

// 404 handler
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// Railway için 0.0.0.0 üzerinde dinleme
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
