const express = require('express');
const fetch = require('node-fetch'); // node-fetch v2

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Hardcoded Upstash bilgileri (test için)
const UPSTASH_URL = "https://coherent-ant-56796.upstash.io";
const UPSTASH_TOKEN = "Ad3cAAIjcDEyMDkxNzAzY2YwN2U0MWRiYjEyNmM4M2U0ZDE4ZGIwOHAxMA";

// CORS middleware (frontend'ten fetch yaparken sorun çıkmasın diye)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// ✅ Basit API endpoint: /api/hello
app.get('/api/hello', async (req, res) => {
  try {
    // Redis'e hello = world yaz
    await fetch(`${UPSTASH_URL}/set/hello/world`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`
      }
    });

    // Redis'ten hello key'ini çek
    const getResponse = await fetch(`${UPSTASH_URL}/get/hello`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`
      }
    });

    const getResult = await getResponse.json();
    const value = getResult.result || "bulunamadı";

    res.json({ message: `redis oldu bu iş: ${value}` });
  } catch (err) {
    console.error("Redis bağlantı hatası:", err);
    res.status(500).json({ error: "Redis'e bağlanılamadı" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
});
