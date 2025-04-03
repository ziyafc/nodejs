const express = require('express');
const fetch = require('node-fetch'); // npm install node-fetch

const app = express();
const PORT = process.env.PORT || 3000;

const UPSTASH_URL = process.env.UPSTASH_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REST_TOKEN;

app.get('/', async (req, res) => {
  try {
    // Redis'e değer set et
    await fetch(`${UPSTASH_URL}/set/hello/world`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`
      }
    });

    // Redis'ten değer al
    const response = await fetch(`${UPSTASH_URL}/get/hello`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`
      }
    });

    const result = await response.json();
    const redisValue = result.result;

    res.send(`<h1>ZIKO</h1><p>redis oldu bu iş: ${redisValue}</p>`);
  } catch (err) {
    console.error(err);
    res.send(`<h1>ZIKO</h1><p>olmadı mk</p>`);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
