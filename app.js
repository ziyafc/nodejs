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

// Global Redis bağlantısı ve durum mesajı
let redisStatusMessage = "olmadı mk"; // Varsayılan hata mesajı

const client = createClient({ url: process.env.REDIS_URL });
client.connect().then(async () => {
  try {
    await client.set('hello', 'world');
    const value = await client.get('hello');
    redisStatusMessage = "redis oldu bu iş";
    console.log("Global Redis bağlantısı başarılı:", value);
  } catch (err) {
    console.error("Global Redis işlemi hatası:", err);
  }
}).catch(err => {
  console.error("Global Redis bağlantı hatası:", err);
});

// Tüm isteklere redisStatus'u ekleyen middleware
app.use((req, res, next) => {
  res.locals.redisStatus = redisStatusMessage;
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
