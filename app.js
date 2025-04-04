const express = require('express');
const fetch = require('node-fetch'); // node-fetch@2 için

const app = express();
const PORT = process.env.PORT || 3000;

// 🔥 TOKEN ve URL direkt yazıldı (güvenli değil ama test için sorun değil)
const UPSTASH_URL = "https://coherent-ant-56796.upstash.io";
const UPSTASH_TOKEN = "Ad3cAAIjcDEyMDkxNzAzY2YwN2U0MWRiYjEyNmM4M2U0ZDE4ZGIw0HAXXXXXXXXXXXX";

app.get('/', async (req, res) => {
  try {
    // Redis'e "hello = world" yaz
    await fetch(`${UPSTASH_URL}/set/hello/world`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`
      }
    });

    // Redis'ten "hello" al
    const response = await fetch(`${UPSTASH_URL}/get/hello`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`
      }
    });

    const result = await response.json();
    const value = result.result || "bulunamadı";

    res.send(`
      <h1>ZIKO</h1>
      <p style="font-size: 1.25rem;">redis oldu bu iş: <strong>${value}</strong></p>
    `);
  } catch (err) {
    console.error("Redis bağlantı hatası:", err);
    res.send(`
      <h1>ZIKO</h1>
      <p style="color:red; font-size: 1.25rem;">Hata: Redis'e bağlanılamadı</p>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
});
