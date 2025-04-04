// nodejs-main/api/price-master.js
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// ✅ Hardcoded Upstash Redis bilgileri (test için)
const REDIS_URL = "https://coherent-ant-56796.upstash.io";
const REDIS_TOKEN = "Ad3cAAIjcDEyMDkxNzAzY2YwN2U0MWRiYjEyNmM4M2U0ZDE4ZGIwOHAxMA";
const AUTH_HEADER = `Bearer ${REDIS_TOKEN}`;

// 🚧 Geçici örnek veri (gerçekte burası Supabase sorgusu olacak)
const generatePriceData = async () => {
  return [
    { sku: "EXAMPLE-001", title: "Test Product", price: 19.99 },
    { sku: "EXAMPLE-002", title: "Another Product", price: 12.49 }
  ];
};

// GET /api/price-master
router.get('/', async (req, res) => {
  try {
    const cacheRes = await fetch(`${REDIS_URL}/get/price_master_v1`, {
      headers: { Authorization: AUTH_HEADER }
    });
    const cacheData = await cacheRes.json();

    if (cacheData.result) {
      console.log("✅ Served from Redis");
      return res.json(JSON.parse(cacheData.result));
    }

    const data = await generatePriceData();

    await fetch(`${REDIS_URL}/set/price_master_v1`, {
      method: 'POST',
      headers: {
        Authorization: AUTH_HEADER,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        value: JSON.stringify(data),
        EX: 3600
      })
    });

    console.log("📦 Generated and cached new data");
    res.json(data);
  } catch (err) {
    console.error("❌ Cache Error:", err);
    res.status(500).json({ error: "Cache error", details: err.message });
  }
});

module.exports = router;
