// Clearly labeled sample data. Shown only until a store is connected or records are created.
export type DemoProduct = { id: string; name: string; sku: string; price: number; category: string; brand: string; inventory: number; status: string; tags: string; views: number; carts: number; image_url?: string | null; description?: string };

export const DEMO_PRODUCTS: DemoProduct[] = [
  { id: "d1", name: "Cloudwalk Cushioned Sneakers", sku: "FW-1001", price: 89, category: "Footwear", brand: "Northpath", inventory: 142, status: "active", tags: "shoes comfortable walking cushioned everyday", views: 9840, carts: 612 },
  { id: "d2", name: "Trailline Hiking Boots", sku: "FW-1002", price: 129, category: "Footwear", brand: "Northpath", inventory: 58, status: "active", tags: "boots hiking outdoor waterproof", views: 6120, carts: 301 },
  { id: "d3", name: "Linen Relaxed Shirt", sku: "AP-2001", price: 64, category: "Apparel", brand: "Maison Ora", inventory: 220, status: "active", tags: "shirt linen summer breathable", views: 7430, carts: 288 },
  { id: "d4", name: "Everyday Merino Sweater", sku: "AP-2002", price: 98, category: "Apparel", brand: "Maison Ora", inventory: 0, status: "active", tags: "sweater wool warm winter", views: 5210, carts: 340 },
  { id: "d5", name: "Hydra Barrier Moisturizer", sku: "BT-3001", price: 34, category: "Skincare", brand: "Verdelle", inventory: 310, status: "active", tags: "moisturizer dry skin hydration face cream", views: 8890, carts: 702 },
  { id: "d6", name: "Daily Mineral Sunscreen", sku: "BT-3002", price: 28, category: "Skincare", brand: "Verdelle", inventory: 180, status: "active", tags: "sunscreen spf sun protection daily", views: 6770, carts: 455 },
  { id: "d7", name: "Wireless Noise Cancelling Headphones", sku: "EL-4001", price: 189, category: "Electronics", brand: "Auralis", inventory: 76, status: "active", tags: "headphones audio wireless noise cancelling music", views: 12400, carts: 538 },
  { id: "d8", name: "Compact Bluetooth Speaker", sku: "EL-4002", price: 59, category: "Electronics", brand: "Auralis", inventory: 205, status: "active", tags: "speaker bluetooth portable music", views: 4980, carts: 262 },
  { id: "d9", name: "Stoneware Dinner Set", sku: "HM-5001", price: 112, category: "Home", brand: "Hearth & Co", inventory: 44, status: "active", tags: "dinner plates kitchen tableware ceramic", views: 3620, carts: 167 },
  { id: "d10", name: "Woven Throw Blanket", sku: "HM-5002", price: 72, category: "Home", brand: "Hearth & Co", inventory: 95, status: "active", tags: "blanket cozy living room warm throw", views: 4310, carts: 233 },
  { id: "d11", name: "Soy Wax Candle Trio", sku: "HM-5003", price: 38, category: "Home", brand: "Hearth & Co", inventory: 260, status: "draft", tags: "candle scent gift home fragrance", views: 2210, carts: 143 },
  { id: "d12", name: "Leather Weekender Bag", sku: "AC-6001", price: 215, category: "Accessories", brand: "Northpath", inventory: 31, status: "active", tags: "bag travel leather luggage weekend", views: 9100, carts: 190 },
];

export const DEMO_QUERIES = [
  { query: "sneakers", searches: 3120, ctr: 0.41, results: 48 },
  { query: "moisturizer for dry skin", searches: 2210, ctr: 0.37, results: 12 },
  { query: "wireless headphones", searches: 1980, ctr: 0.44, results: 9 },
  { query: "linen shirt", searches: 1460, ctr: 0.33, results: 14 },
  { query: "gift ideas", searches: 1210, ctr: 0.18, results: 22 },
  { query: "waterproof jacket", searches: 940, ctr: 0, results: 0 },
  { query: "vegan lip balm", searches: 710, ctr: 0, results: 0 },
  { query: "usb c charger", searches: 655, ctr: 0, results: 0 },
  { query: "wide fit trainers", searches: 402, ctr: 0, results: 0 },
];

export const DEMO_SEGMENTS = [
  { name: "First time visitors", members: 18240, conversion: 1.2, aov: 61 },
  { name: "Returning customers", members: 9410, conversion: 4.8, aov: 88 },
  { name: "High value customers", members: 1320, conversion: 8.9, aov: 164 },
  { name: "Discount focused shoppers", members: 4025, conversion: 3.1, aov: 47 },
  { name: "Abandoned cart visitors", members: 2870, conversion: 5.4, aov: 72 },
  { name: "Inactive customers", members: 6110, conversion: 0.6, aov: 55 },
];

export const DEMO_CAMPAIGNS = [
  { name: "Homepage recommended for you", type: "Recommendation", clicks: 5120, revenue: 18420, status: "active" },
  { name: "Cart frequently bought together", type: "Recommendation", clicks: 2210, revenue: 9780, status: "active" },
  { name: "Winter sale banner", type: "Content", clicks: 3480, revenue: 12150, status: "active" },
  { name: "Post purchase replenishment", type: "Recommendation", clicks: 940, revenue: 3620, status: "paused" },
];

export function seeded(seed: number) {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export type Point = { date: string; visitors: number; views: number; recClicks: number; carts: number; orders: number; revenue: number; prevVisitors: number; prevRevenue: number };

export function buildSeries(days: number, campaign: string, category: string): Point[] {
  const key = campaign.length * 31 + category.length * 17 + days;
  const rnd = seeded(key + 7);
  const campaignFactor = campaign === "all" ? 1 : 0.35 + (campaign.length % 5) * 0.08;
  const categoryFactor = category === "all" ? 1 : 0.4 + (category.length % 4) * 0.1;
  const f = campaignFactor * categoryFactor;
  const out: Point[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const wave = 1 + Math.sin((i / 7) * Math.PI * 2) * 0.12;
    const visitors = Math.round((2100 + rnd() * 500) * wave * f);
    const views = Math.round(visitors * (3.1 + rnd() * 0.5));
    const recClicks = Math.round(views * (0.07 + rnd() * 0.02));
    const carts = Math.round(visitors * (0.07 + rnd() * 0.015));
    const orders = Math.round(visitors * (0.022 + rnd() * 0.006));
    const revenue = Math.round(orders * (72 + rnd() * 18));
    out.push({ date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), visitors, views, recClicks, carts, orders, revenue,
      prevVisitors: Math.round(visitors * (0.86 + rnd() * 0.1)), prevRevenue: Math.round(revenue * (0.82 + rnd() * 0.12)) });
  }
  return out;
}
export const sum = (a: Point[], k: keyof Point) => a.reduce((t, p) => t + (p[k] as number), 0);
export const fmt = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e4 ? (n / 1e3).toFixed(1) + "k" : n.toLocaleString("en-US");
export const money = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
