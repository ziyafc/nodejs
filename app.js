// app.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// -------------------------------------
// 1) Konfig
// -------------------------------------
const PORT = process.env.PORT || 3000;

// Upstash Redis (örnek)
const UPSTASH_URL = "https://coherent-ant-56796.upstash.io";
const UPSTASH_TOKEN = "Ad3cAAIjcDEyMDkxNzAzY2YwN2U0MWRiYjEyNmM4M2U0ZDE4ZGIwOHAxMA";

// Supabase (service_role önerilir)
const SUPABASE_URL = "https://hfqnvwcecosxcwixrruu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcW52d2NlY29zeGN3aXhycnV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODU3MTY0NiwiZXhwIjoyMDU0MTQ3NjQ2fQ.T_vuzvJ7bqADK9U7_3KzjuhuWRF4Bx3t0wPnLOfVZTM"; // kısaltılmış
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// -------------------------------------
// 2) Express Kurulumu
// -------------------------------------
const app = express();
app.use(cors({ origin: '*' })); // Farklı domainlerden erişim

// Basit test endpoint
app.get('/', (req, res) => {
  res.send('Hello from Node.js + Redis + Supabase - PriceGrid Cache!');
});

// -------------------------------------
// 3) Fiyat Hesaplama Fonksiyonu
// (Frontend’de "calculatePrices" vardı, buraya taşıdık.)
// -------------------------------------
function calculatePrices(srp, vatRate, revShare, discountRate) {
  const effectiveSrp = discountRate ? srp * (1 - discountRate / 100) : srp;
  const srpWithoutVat = effectiveSrp / (1 + vatRate / 100);
  const wsp = srpWithoutVat * (revShare / 100);
  return {
    discounted_srp: discountRate ? effectiveSrp : null,
    srp_without_vat: srpWithoutVat,
    wsp
  };
}

// -------------------------------------
// 4) /api/price-grid endpoint
// Tüm PriceGrid verisini supabase’ten çekip Redis’e cacheler
// -------------------------------------
app.get('/api/price-grid', async (req, res) => {
  try {
    // 1) Redis check
    const redisGet = await fetch(`${UPSTASH_URL}/get/price_grid_v1`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const cacheJson = await redisGet.json();
    if (cacheJson.result) {
      console.log("✅ [price-grid] Data from Redis cache");
      const cached = JSON.parse(cacheJson.result);
      return res.json({ fromCache: true, ...cached });
    }

    console.log("❌ [price-grid] No cache, fetching from Supabase...");

    // 2) Supabase queries
    // a) SKUs
    const { data: skusData, error: skusError } = await supabase
      .from('skus')
      .select(`
        id,
        code,
        organization_id,
        product:products (
          id,
          title,
          rev_share_override,
          promotion_products (
            discount,
            promotion:promotions (
              status,
              start_date,
              end_date,
              start_time,
              end_time
            )
          )
        ),
        organization:organizations (
          name,
          rev_share
        ),
        sku_currencies (
          currency_code,
          srp,
          is_default
        )
      `)
      .eq('is_active', true);

    if (skusError) throw skusError;

    // b) geo_settings
    const { data: geoSettings } = await supabase
      .from('geo_settings')
      .select('code, tax_rate')
      .eq('is_active', true);

    // c) publishers (org_type=publisher)
    const { data: pubData, error: pubErr } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('org_type', 'publisher')
      .order('name');

    if (pubErr) throw pubErr;

    // 3) Currencies set
    const uniqueCurrencies = new Set();
    (skusData || []).forEach((sku) => {
      sku.sku_currencies?.forEach((c) => uniqueCurrencies.add(c.currency_code));
    });
    const sortedCurrencies = Array.from(uniqueCurrencies).sort();

    // 4) Price Calculation
    const now = new Date();
    const processedData = [];

    for (const sku of skusData || []) {
      // active promo
      const activePromo = sku.product?.promotion_products?.find((pp) => {
        const p = pp.promotion;
        if (!p) return false;
        if (!['approved', 'live'].includes(p.status)) return false;
        const startDt = new Date(`${p.start_date}T${p.start_time}`);
        const endDt = new Date(`${p.end_date}T${p.end_time}`);
        return now >= startDt && now <= endDt;
      });

      // publisher vat rates
      const { data: vatRates } = await supabase
        .from('publisher_vat_rates')
        .select('country_code, vat_rate')
        .eq('organization_id', sku.organization_id);

      const vatRateLookup = {};
      geoSettings?.forEach((geo) => {
        vatRateLookup[geo.code] = geo.tax_rate;
      });
      vatRates?.forEach((r) => {
        vatRateLookup[r.country_code] = r.vat_rate;
      });

      // build currencyPrices
      const currencyPrices = {};
      for (const currency of sku.sku_currencies || []) {
        const vatRate = vatRateLookup[currency.currency_code] || 0;
        const revShare = sku.product.rev_share_override || sku.organization.rev_share || 70;
        const discountRate = activePromo?.discount || 0;

        const prices = calculatePrices(currency.srp, vatRate, revShare, discountRate);
        currencyPrices[currency.currency_code] = {
          srp: currency.srp,
          discounted_srp: prices.discounted_srp,
          vat_rate: vatRate,
          srp_without_vat: prices.srp_without_vat,
          wsp: prices.wsp
        };
      }

      processedData.push({
        sku_id: sku.id,
        sku_code: sku.code,
        product_title: sku.product.title,
        organization_name: sku.organization.name,
        rev_share: sku.organization.rev_share,
        rev_share_override: sku.product.rev_share_override,
        active_promo: activePromo ? 'Y' : 'N',
        discount_rate: activePromo ? activePromo.discount : null,
        // 🔥 Aşağıdaki satır: property adı "currency_prices", değeri "currencyPrices"
        currency_prices: currencyPrices
      });
    }

    // 5) Tüm veriyi tek objede toplayalım
    const responseObj = {
      priceData: processedData,
      publishers: pubData || [],
      currencies: sortedCurrencies
    };

    // 6) Redis'e kaydet (1 saat TTL)
    const bodyToCache = JSON.stringify(responseObj);
    await fetch(`${UPSTASH_URL}/set/price_grid_v1`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: bodyToCache,
        EX: 3600
      })
    });

    // 7) Yanıt
    console.log("✅ [price-grid] Fetched from Supabase, cached in Redis");
    return res.json({ fromCache: false, ...responseObj });

  } catch (err) {
    console.error("❌ /api/price-grid error:", err);
    return res.status(500).json({ error: err.message || 'PriceGrid data error' });
  }
});

// -------------------------------------
// 5) Sunucu Başlat
// -------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Node server running on http://localhost:${PORT}`);
});
