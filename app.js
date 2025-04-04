const express = require('express');
const fetch = require('node-fetch'); // v2 uyumlu

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Hardcoded Upstash bilgileri (test için)
const UPSTASH_URL = "https://coherent-ant-56796.upstash.io";
const UPSTASH_TOKEN = "Ad3cAAIjcDEyMDkxNzAzY2YwN2U0MWRiYjEyNmM4M2U0ZDE4ZGIwOHAxMA";

app.get('/', async (req, res) => {
  try {
    // ✅ Redis'e SET işlemi
    const setResponse = await fetch(`${UPSTASH_URL}/set/hello/world`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`
      }
    });

    const setResult = await setResponse.json();
    console.log("SET yanıtı:", setResult);

    // ✅ Redis'ten GET işlemi
    const getResponse = await fetch(`${UPSTASH_URL}/get/hello`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`
      }
    });

    const getResult = await getResponse.json();
    const value = getResult.result || "bulunamadı";

    // ✅ Sayfaya yazdır
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ZIKO</title>
        <style>
          body { font-family: sans-serif; padding: 2rem; }
          h1 { font-size: 2rem; color: #333; }
          p { font-size: 1.25rem; margin-top: 1rem; }
        </style>
      </head>
      <body>
        <h1>ZIKO</h1>
        <p>redis oldu bu iş: <strong>${value}</strong></p>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("❌ Redis bağlantı hatası:", err);
    res.send(`
      <h1>ZIKO</h1>
      <p style="color:red; font-size: 1.25rem;">Hata: Redis'e bağlanılamadı</p>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
});
