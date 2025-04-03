const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const UPSTASH_URL = process.env.UPSTASH_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REST_TOKEN;

app.get('/', async (req, res) => {
  try {
    // GET isteğiyle Redis'ten veri çek
    const response = await fetch(`${UPSTASH_URL}/get/hello`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`
      }
    });

    const data = await response.json();
    console.log("Upstash yanıtı:", data);

    const value = data?.result || "bulunamadı";

    res.send(`<h1>Upstash Test</h1><p>Redis değeri: <strong>${value}</strong></p>`);
  } catch (err) {
    console.error("Redis bağlantı hatası:", err);
    res.send(`<h1>Upstash Test</h1><p style="color:red">Hata: Redis'e bağlanılamadı</p>`);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
});
