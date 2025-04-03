
const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

app.use(express.static(path.join(__dirname, 'public')));

// Root route
app.get('/', async (req, res) => {
  const htmlPath = path.join(__dirname, 'views', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  try {
    // Redis'e değer yaz
    await fetch(`${UPSTASH_URL}/set/hello/world`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`
      }
    });

    // Redis'ten değer oku
    const response = await fetch(`${UPSTASH_URL}/get/hello`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`
      }
    });

    const result = await response.json();
    const redisValue = result.result || "boş";

    html = html.replace('{{REDIS_MESSAGE}}', `redis oldu bu iş: ${redisValue}`);
  } catch (err) {
    html = html.replace('{{REDIS_MESSAGE}}', `olmadı mk`);
  }

  res.send(html);
});

// 404 fallback
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
