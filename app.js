
const express = require('express');
const fetch = require('node-fetch'); // v2 ile uyumlu

const app = express();
const PORT = process.env.PORT || 3000;

// Açık token ve URL test için burada tanımlı (güvenli değil, sadece test)
const UPSTASH_URL = "https://coherent-ant-56796.upstash.io";
const UPSTASH_TOKEN = "Ad3cAAIjcDEyMDkxNzAzY2YwN2U0MWRiYjEyNmM4M2U0ZDE4ZGIw0HAXXXXXXXXXXXXX";

app.get('/', async (req, res) => {
  try {
    const response = await fetch(`${UPSTASH_URL}/get/hello`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`
      }
    });

    const result = await response.json();
    console.log("Upstash yanıtı:", result);

    const value = result.result || "bulunamadı";
    res.send(`<h1>Upstash Test (v2)</h1><p>Redis değeri: <strong>${value}</strong></p>`);
  } catch (err) {
    console.error("Redis bağlantı hatası:", err);
    res.send(`<h1>Upstash Test (v2)</h1><p style="color:red">Hata: Redis'e bağlanılamadı</p>`);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
});
