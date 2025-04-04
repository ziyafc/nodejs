const express = require('express');
const fetch = require('node-fetch'); // node-fetch v2
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Hardcoded Upstash Redis bilgileri
const UPSTASH_URL = "https://coherent-ant-56796.upstash.io";
const UPSTASH_TOKEN = "Ad3cAAIjcDEyMDkxNzAzY2YwN2U0MWRiYjEyNmM4M2U0ZDE4ZGIwOHAxMA";

// 🔐 Hazır Bearer token
const AUTH_HEADER = `Bearer ${UPSTASH_TOKEN}`;

// ✅ CORS middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// ✅ /api/hello — test amaçlı endpoint
app.get('/api/hello', async (req, res) => {
  try {
    await fetch(`${UPSTASH_URL}/set/hello/world`, {
      method: 'POST',
      headers: { Authorization: AUTH_HEADER }
    });

    const getResponse = await fetch(`${UPSTASH_URL}/get/hello`, {
      headers: { Authorization: AUTH_HEADER }
    });

    const getResult = await getResponse.json();
    const value = getResult.result || "bulunamadı";

    res.json({ message: `redis oldu bu iş: ${value}` });
  } catch (err) {
    console.error("Redis bağlantı hatası:", err);
    res.status(500).json({ error: "Redis'e bağlanılamadı" });
  }
});

// ✅ /api/price-master — Redis cache'li örnek endpoint
app.get('/api/price-master', async (req, res) => {
  try {
    // Redis’te var mı kontrol et
    const cacheRes = await fetch(`${UPSTASH_URL}/get/price_master_v1`, {
      headers: { Authorization: AUTH_HEADER }
    });
    const cacheData = await cacheRes.json();

    if (cacheData.result) {
      console.log("✅ Price Master served from Redis");
      return res.json(JSON.parse(cacheData.result));
    }

    // Geçici örnek veri
    const priceData = [
      { sku: "PM-001", title: "Sample Product", price: 11.99 },
      { sku: "PM-002", title: "Other Product", price: 8.49 }
    ];

    // Redis'e cachele
    await fetch(`${UPSTASH_URL}/set/price_master_v1`, {
      method: 'POST',
      headers: {
        Authorization: AUTH_HEADER,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        value: JSON.stringify(priceData),
        EX: 3600 // 1 saat TTL
      })
    });

    console.log("📦 Price Master cached in Redis");
    res.json(priceData);
  } catch (err) {
    console.error("❌ Price Master cache error:", err);
    res.status(500).json({ error: "Price Master verisi getirilemedi" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
});
