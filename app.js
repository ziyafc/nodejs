// app.js
const express = require('express');
const fetch = require('node-fetch'); // node-fetch v2
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ==========================
// 1) Konfigürasyonlar
// ==========================
const PORT = process.env.PORT || 3000;

// Upstash Redis (test için sabit):
const UPSTASH_URL = "https://coherent-ant-56796.upstash.io";
const UPSTASH_TOKEN = "Ad3cAAIjcDEyMDkxNzAzY2YwN2U0MWRiYjEyNmM4M2U0ZDE4ZGIwOHAxMA";
const AUTH_HEADER = `Bearer ${UPSTASH_TOKEN}`;

// Supabase (service role key – sadece backend'te kullanın):
const SUPABASE_URL = "https://hfqnvwcecosxcwixrruu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcW52d2NlY29zeGN3aXhycnV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODU3MTY0NiwiZXhwIjoyMDU0MTQ3NjQ2fQ.T_vuzvJ7bqADK9U7_3KzjuhuWRF4Bx3t0wPnLOfVZTM";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ==========================
// 2) Express Uygulaması
// ==========================
const app = express();

// ✅ CORS middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// ==========================
// 3) /api/hello — test amaçlı endpoint
// ==========================
app.get('/api/hello', async (req, res) => {
  try {
    // Redis'e "hello = world" yaz
    await fetch(`${UPSTASH_URL}/set/hello/world`, {
      method: 'POST',
      headers: { Authorization: AUTH_HEADER }
    });

    // Redis'ten "hello" key'ini oku
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

// ==========================
// 4) /api/price-master — Redis cache'li basit örnek endpoint
// ==========================
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

    // Redis'e cachele (1 saat TTL)
    await fetch(`${UPSTASH_URL}/set/price_master_v1`, {
      method: 'POST',
      headers: {
        Authorization: AUTH_HEADER,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        value: JSON.stringify(priceData),
        EX: 3600
      })
    });

    console.log("📦 Price Master cached in Redis");
    res.json(priceData);
  } catch (err) {
    console.error("❌ Price Master cache error:", err);
    res.status(500).json({ error: "Price Master verisi getirilemedi" });
  }
});

// ==========================
// 5) /api/publisher-sales — Redis + Supabase
// ==========================
app.get('/api/publisher-sales', async (req, res) => {
  try {
    // A) Redis'te var mı?
    const cacheRes = await fetch(`${UPSTASH_URL}/get/publisher_sales_v1`, {
      headers: { Authorization: AUTH_HEADER }
    });
    const cacheData = await cacheRes.json();

    if (cacheData.result) {
      console.log("✅ [publisher-sales] Cache bulundu, Redis'ten dönüyoruz");
      const cached = JSON.parse(cacheData.result);
      return res.json({ fromCache: true, data: cached });
    }

    console.log("❌ [publisher-sales] Cache yok, Supabase sorgusu yapıyoruz...");

    // B) Supabase'ten data çek
    // Örnek: "orders" tablosunda publisher_id, total_amount var
    // Nested join => publisher:publisher_id(name) => organizations tablosundan name çekilir
    let { data, error } = await supabase
      .from('orders')
      .select('publisher_id, total_amount, publisher:publisher_id(name)');

    if (error) throw error;

    // C) Basit aggregator -> publisher bazlı total_orders, total_sales
    const aggregator = {};
    data.forEach((row) => {
      const pubName = row.publisher?.name || "Unknown Publisher";
      if (!aggregator[pubName]) {
        aggregator[pubName] = {
          publisher_name: pubName,
          total_orders: 0,
          total_sales: 0
        };
      }
      aggregator[pubName].total_orders += 1;
      aggregator[pubName].total_sales += (row.total_amount || 0);
    });
    const resultArray = Object.values(aggregator);

    // D) Redis'e kaydet (TTL=3600)
    await fetch(`${UPSTASH_URL}/set/publisher_sales_v1`, {
      method: 'POST',
      headers: {
        Authorization: AUTH_HEADER,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        value: JSON.stringify(resultArray),
        EX: 3600
      })
    });

    // E) Sonucu dön
    console.log("✅ [publisher-sales] Supabase'ten alındı, Redis'e kaydedildi");
    res.json({ fromCache: false, data: resultArray });

  } catch (err) {
    console.error("❌ /api/publisher-sales hata:", err);
    res.status(500).json({ error: "Publisher sales verisi getirilemedi" });
  }
});

// ==========================
// 6) Sunucuyu başlat
// ==========================
app.listen(PORT, () => {
  console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
});
