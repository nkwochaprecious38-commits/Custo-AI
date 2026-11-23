import {
  Wand2, Search, Users, LayoutGrid, FileText, Megaphone, FlaskConical, BarChart3, Brain, ShoppingBag, Layers, Compass,
  Activity, ArrowUpDown, Package, TrendingUp, Repeat, MessageSquare, Image as ImageIcon, MousePointerClick, Camera, Target,
  LineChart, Route, Bot, Store, Plug, Database, Zap, Filter,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const PRICING_LINKS = {
  starter: "https://selar.com/47plan?currency=USD",
  professional: "https://selar.com/57plan?currency=USD",
  enterprise: "https://selar.com/97plan?currency=USD",
};

export type Feature = { slug: string; name: string; category: string; icon: LucideIcon; description: string; benefit: string };

export const FEATURE_CATEGORIES = [
  "Product Discovery", "Customer Intelligence", "Merchandising", "Cross Sell and Upsell", "Content and Campaigns", "Optimization and Analytics", "Operations",
] as const;

export const FEATURES: Feature[] = [
  { slug: "ai-product-recommendations", name: "AI Product Recommendations", category: "Product Discovery", icon: Wand2, description: "Create recommendation campaigns such as recommended for you, similar products, trending products and new arrivals, then choose where each one appears on your storefront.", benefit: "Shoppers see products that match their interests instead of a generic list." },
  { slug: "personalized-product-search", name: "Personalized Product Search", category: "Product Discovery", icon: Search, description: "Autocomplete, suggestions and filters for category, brand, price and attributes, with ranking you can adjust.", benefit: "Shoppers reach the right product in fewer steps." },
  { slug: "semantic-search", name: "Semantic Search", category: "Product Discovery", icon: Brain, description: "Understands the intent behind a query, so a search for comfortable shoes for walking can surface relevant products even when those words are not in the title.", benefit: "Fewer dead end searches caused by vocabulary mismatches." },
  { slug: "product-discovery", name: "Product Discovery", category: "Product Discovery", icon: Compass, description: "Combine recommendations, search and merchandising into guided browsing across category pages, collections and the homepage.", benefit: "A consistent discovery experience across the whole storefront." },
  { slug: "customer-segmentation", name: "Customer Segmentation", category: "Customer Intelligence", icon: Users, description: "Group shoppers by attributes and behavioral events, such as first time visitors, high value customers or abandoned cart visitors.", benefit: "Marketing and merchandising teams work from shared audience definitions." },
  { slug: "behavioral-analytics", name: "Behavioral Analytics", category: "Customer Intelligence", icon: Activity, description: "Review views, clicks, add to cart events and purchases to see how shoppers interact with products and campaigns.", benefit: "Decisions are based on observed shopping behavior." },
  { slug: "smart-category-merchandising", name: "Smart Category Merchandising", category: "Merchandising", icon: LayoutGrid, description: "Pin, promote, demote or exclude products and schedule rules, with a preview of the resulting order before anything is published.", benefit: "Teams control product visibility without manual re-sorting." },
  { slug: "product-ranking-controls", name: "Product Ranking Controls", category: "Merchandising", icon: ArrowUpDown, description: "Prioritize best sellers, new arrivals or seasonal products, and push unavailable items out of view.", benefit: "Ranking reflects business priorities and stock reality." },
  { slug: "dynamic-product-bundles", name: "Dynamic Product Bundles", category: "Cross Sell and Upsell", icon: Package, description: "Suggest complementary products that are frequently bought together, based on your catalog and order history.", benefit: "Helps shoppers find items that belong together." },
  { slug: "cross-selling", name: "Cross Selling", category: "Cross Sell and Upsell", icon: Layers, description: "Show related and complementary products on product pages and in the cart.", benefit: "Supports larger baskets with relevant additions." },
  { slug: "upselling", name: "Upselling", category: "Cross Sell and Upsell", icon: TrendingUp, description: "Present higher tier or better matched alternatives where they fit the shopper's interest.", benefit: "Offers a considered step up rather than a random one." },
  { slug: "post-purchase-recommendations", name: "Post Purchase Recommendations", category: "Cross Sell and Upsell", icon: Repeat, description: "Recommend follow up and replenishment products after an order is placed.", benefit: "Keeps the relationship going after checkout." },
  { slug: "content-personalization", name: "Content Personalization", category: "Content and Campaigns", icon: FileText, description: "Change homepage, category and landing page content depending on the customer segment.", benefit: "Messages stay relevant to the audience seeing them." },
  { slug: "personalized-banners", name: "Personalized Banners", category: "Content and Campaigns", icon: ImageIcon, description: "Build banners with audience targeting and schedules, and preview them before publishing.", benefit: "Promotions reach the shoppers they were written for." },
  { slug: "targeted-popups", name: "Targeted Popups", category: "Content and Campaigns", icon: MessageSquare, description: "Create promotional popups for selected segments with clear scheduling and consent aware targeting.", benefit: "Popups appear only to the audiences you choose." },
  { slug: "ugc-management", name: "User Generated Content Management", category: "Content and Campaigns", icon: Camera, description: "Collect, review and approve customer photos and reviews before they appear alongside products.", benefit: "Customer content is moderated before it reaches the storefront." },
  { slug: "campaign-management", name: "Campaign Management", category: "Content and Campaigns", icon: Megaphone, description: "Plan, schedule and track commerce campaigns from one list, with status and audience for each.", benefit: "One place to see what is live and what is planned." },
  { slug: "ab-testing", name: "A/B Testing", category: "Optimization and Analytics", icon: FlaskConical, description: "Compare variations of layouts, banners, sorting rules and calls to action. Observed results are shown separately from statistical conclusions.", benefit: "A winner is only named when the data supports it." },
  { slug: "conversion-optimization", name: "Conversion Optimization", category: "Optimization and Analytics", icon: MousePointerClick, description: "Find products with high views and low add to cart activity, and test changes to the pages that hold them.", benefit: "Focus effort where shoppers hesitate." },
  { slug: "product-performance-analytics", name: "Product Performance Analytics", category: "Optimization and Analytics", icon: BarChart3, description: "Views, clicks, add to cart events and purchases by product, category and brand.", benefit: "See which products pull their weight." },
  { slug: "search-analytics", name: "Search Analytics", category: "Optimization and Analytics", icon: LineChart, description: "Popular queries, zero result searches and search click through rate.", benefit: "Turn failed searches into catalog and synonym fixes." },
  { slug: "customer-journey-insights", name: "Customer Journey Insights", category: "Optimization and Analytics", icon: Route, description: "Follow how segments move from first visit to purchase across sessions.", benefit: "Understand where journeys stall." },
  { slug: "ai-commerce-assistant", name: "AI Commerce Assistant", category: "Operations", icon: Bot, description: "Ask questions about your store data and get answers that separate actual metrics from suggestions. Any change to live content needs your approval.", benefit: "Faster answers for teams that do not live in dashboards." },
  { slug: "multi-store-management", name: "Multi Store Management", category: "Operations", icon: Store, description: "Manage several storefronts and brands in one organization, with role based access for each team.", benefit: "Agencies and multi brand retailers keep clients and teams organized." },
];

export const PLATFORM_FEATURE_CARDS = [
  "ai-product-recommendations", "personalized-product-search", "customer-segmentation", "smart-category-merchandising",
  "content-personalization", "campaign-management", "ab-testing", "product-performance-analytics",
].map((slug, i) => {
  const f = FEATURES.find((x) => x.slug === slug)!;
  const names = ["AI Product Recommendations", "Personalized Search", "Customer Segmentation", "Smart Merchandising", "Content Personalization", "Campaign Optimization", "A/B Testing", "Commerce Analytics"];
  return { ...f, name: names[i] };
});

export const PROBLEMS = [
  ["Customers struggle to discover relevant products", "Large catalogs and generic navigation hide the products a shopper would actually want."],
  ["Generic shopping experiences reduce engagement", "Every visitor sees the same homepage, banners and rankings regardless of interest."],
  ["Retailers rely on manual merchandising", "Re-sorting categories by hand is slow and hard to keep current."],
  ["Recommendations are not always relevant", "Static rules and best seller lists ignore what an individual shopper has shown interest in."],
  ["Marketing teams struggle to understand behavior", "Shopping data sits in separate tools, so audiences are defined by guesswork."],
  ["Stores underuse available shopping data", "Views, searches and cart events are collected but rarely put to work."],
  ["It is hard to test which experience performs best", "Without structured experiments, changes ship on opinion rather than evidence."],
];

export const STEPS = [
  { title: "Connect", text: "Connect your online store and available commerce data through supported integrations or a product CSV." },
  { title: "Understand", text: "See customer behavior and product interactions, and group shoppers into segments." },
  { title: "Personalize", text: "Create personalized recommendations, merchandising rules and content for each audience." },
  { title: "Measure", text: "Track performance, run experiments and keep refining what works." },
];

export const AUDIENCES = [
  { name: "Online Retailers", text: "Manage large catalogs, rankings and campaigns from one workspace." , icon: ShoppingBag },
  { name: "Fashion Brands", text: "Guide shoppers by style, brand, size and browsing history.", icon: Target },
  { name: "Beauty Brands", text: "Personalize discovery by product type, preference and past interactions.", icon: Wand2 },
  { name: "Electronics Stores", text: "Help shoppers compare through search, attributes and relevant recommendations.", icon: Zap },
  { name: "DTC Businesses", text: "Understand the full customer journey on your own storefront.", icon: Store },
  { name: "Marketing Teams", text: "Build audiences and campaigns without waiting on engineering.", icon: Megaphone },
];

export const MODULES = [
  { name: "Customer Intelligence", icon: Users, text: "Understand customer behavior, preferences, shopping activity, product affinities and purchase patterns.", points: ["Behavioral event history", "Product affinities", "Purchase patterns", "Consent aware profiles"] },
  { name: "Product Experience", icon: Compass, text: "Help customers discover relevant products through intelligent recommendations, search and personalized product displays.", points: ["Recommendation campaigns", "Semantic and keyword search", "Personalized product displays"] },
  { name: "Merchandising Intelligence", icon: LayoutGrid, text: "Give e-commerce teams control over product rankings, promotions, categories, inventory priorities and product visibility.", points: ["Pin, promote, demote, exclude", "Scheduled rules", "Order preview before publishing"] },
  { name: "Content Experience", icon: FileText, text: "Personalize banners, promotional messages, landing page content and shopping experiences for different customer segments.", points: ["Segment targeted banners", "Landing and category content", "Targeted popups"] },
  { name: "Campaign Optimization", icon: Megaphone, text: "Create, schedule, test and optimize commerce campaigns using performance insights.", points: ["Campaign calendar", "A/B experiments", "Outcome tracking"] },
  { name: "Commerce Analytics", icon: BarChart3, text: "Monitor customer engagement, product performance, conversion trends and campaign outcomes.", points: ["Traffic and conversion", "Product and search reports", "Date and campaign comparison"] },
];

export const SOLUTIONS = [
  { name: "Fashion and Apparel", text: "Help shoppers discover products based on their interests, preferred styles, brands, sizes and browsing behavior.", challenge: "Seasonal catalogs change quickly and shoppers browse by style, so a single ranking rarely fits everyone.", approach: "Segment shoppers by style and brand affinity, personalize category order, and recommend products that match what they have viewed.", features: ["ai-product-recommendations", "customer-segmentation", "smart-category-merchandising"] },
  { name: "Beauty and Skincare", text: "Personalize product discovery based on product categories, customer preferences, product attributes and previous interactions.", challenge: "Shoppers look for products by concern, ingredient or routine, and repeat purchases matter.", approach: "Use product attributes in search and recommendations, and suggest replenishment items after purchase.", features: ["personalized-product-search", "post-purchase-recommendations", "content-personalization"] },
  { name: "Electronics and Technology", text: "Improve product discovery through intelligent search, relevant recommendations, product attributes and category merchandising.", challenge: "Specification heavy catalogs make it hard to compare, and shoppers search in plain language.", approach: "Combine semantic search with attribute filters and category rules that keep in stock products visible.", features: ["semantic-search", "personalized-product-search", "product-ranking-controls"] },
  { name: "Home and Lifestyle", text: "Help customers explore relevant products through personalized collections, recommendations and content experiences.", challenge: "Shoppers browse for inspiration and buy across many categories at once.", approach: "Build collections and bundles around shopper interests, and present them with segment specific content.", features: ["dynamic-product-bundles", "content-personalization", "cross-selling"] },
  { name: "Direct to Consumer Brands", text: "Understand customer journeys, personalize storefront experiences and improve product discovery across the shopping journey.", challenge: "Small teams own the whole funnel and need clear signals without a large analytics function.", approach: "Start from the overview dashboard, define a few segments, and test one change at a time.", features: ["customer-journey-insights", "ab-testing", "customer-segmentation"] },
  { name: "Large E-commerce Retailers", text: "Manage extensive product catalogs, customer segments, merchandising campaigns and performance insights from one platform.", challenge: "Many teams, many categories and many campaigns make coordination and permissions difficult.", approach: "Use role based access, scheduled merchandising and shared segment definitions across teams.", features: ["smart-category-merchandising", "campaign-management", "multi-store-management"] },
  { name: "E-commerce Agencies", text: "Support multiple client storefronts and commerce optimization workflows through structured account and campaign management.", challenge: "Each client has its own catalog, audience and reporting needs.", approach: "Keep each client in its own organization with separate members, stores and campaigns.", features: ["multi-store-management", "campaign-management", "product-performance-analytics"] },
];

export const PLATFORMS = ["Shopify", "Shopify Plus", "WooCommerce", "BigCommerce", "Adobe Commerce", "Shopware", "Salesforce Commerce Cloud", "Google Analytics", "Marketing Automation", "Customer Data Platforms"];
export const _unused = [Plug, Database, Filter];
