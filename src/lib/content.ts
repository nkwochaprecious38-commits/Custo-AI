export type Feature = { id: string; name: string; summary: string; detail: string; benefits: string[]; module: string };

export const FEATURE_GROUPS: { id: string; name: string; description: string; features: Feature[] }[] = [
  {
    id: 'recommendations', name: 'Recommendations and selling', description: 'Show each shopper the products most relevant to them at every step of the journey.',
    features: [
      { id: 'ai-product-recommendations', module: 'recommendations', name: 'AI Product Recommendations', summary: 'Relevant product suggestions based on browsing, purchase history and product relationships.', detail: 'Choose from ten recommendation strategies including recommended for you, similar products, trending and new arrivals. Each campaign has its own placement, audience and product rules so you stay in control of what appears.', benefits: ['Ten recommendation strategies', 'Placement and audience targeting', 'Inclusion and exclusion rules'] },
      { id: 'dynamic-product-bundles', module: 'recommendations', name: 'Dynamic Product Bundles', summary: 'Group products that are commonly purchased together into ready made bundles.', detail: 'Use order history to surface product combinations that shoppers already buy together, then present them as a bundle on product and cart pages.', benefits: ['Built from real order patterns', 'Works on product and cart pages', 'Respects inventory rules'] },
      { id: 'cross-selling', module: 'recommendations', name: 'Cross Selling', summary: 'Suggest complementary items that complete the purchase.', detail: 'Pair a jacket with a scarf or a camera with a memory card. Complementary and frequently bought together strategies help shoppers find what they would otherwise search for later.', benefits: ['Complementary product logic', 'Cart and checkout placements', 'Category level controls'] },
      { id: 'upselling', module: 'recommendations', name: 'Upselling', summary: 'Present higher value alternatives when they genuinely fit the shopper.', detail: 'Show premium versions of the product being viewed, filtered by category and price range, so upgrades feel helpful rather than pushy.', benefits: ['Similar product matching', 'Price range rules', 'Segment targeting'] },
      { id: 'post-purchase-recommendations', module: 'recommendations', name: 'Post Purchase Recommendations', summary: 'Keep customers engaged after checkout with timely follow up suggestions.', detail: 'Use replenishment and related product strategies on order confirmation pages and in emails to encourage the next visit.', benefits: ['Replenishment suggestions', 'Order confirmation placement', 'Email ready product feeds'] },
    ],
  },
  {
    id: 'discovery', name: 'Search and discovery', description: 'Help shoppers find the right product quickly, even when they do not know the exact name.',
    features: [
      { id: 'personalized-product-search', module: 'search', name: 'Personalized Product Search', summary: 'Fast, typo tolerant search with filters for category, brand, price and attributes.', detail: 'Autocomplete, suggestions and faceted filters help shoppers narrow results. Merchandising rules for search terms let you pin or boost the right products.', benefits: ['Autocomplete and suggestions', 'Faceted filters', 'Search term merchandising'] },
      { id: 'semantic-search', module: 'search', name: 'Semantic Search', summary: 'Understands the intent behind queries such as comfortable shoes for walking.', detail: 'Queries are expanded into related concepts so products described as cushioned or all day comfort appear even when the exact words are missing. With an AI key configured, queries are also interpreted by a language model.', benefits: ['Concept expansion', 'Synonym management', 'Optional AI query understanding'] },
      { id: 'product-discovery', module: 'search', name: 'Product Discovery', summary: 'Guide shoppers through collections, categories and related products.', detail: 'Combine recommendations, merchandising and personalized content so browsing feels curated for each visitor.', benefits: ['Curated collections', 'Related product paths', 'Segment aware ordering'] },
      { id: 'search-analytics', module: 'search', name: 'Search Analytics', summary: 'See what shoppers search for, what they click and where search fails.', detail: 'Track popular queries, search click through rate and zero result searches so you can add synonyms, fix gaps in the catalog and improve ranking.', benefits: ['Popular and trending queries', 'Zero result tracking', 'Search click through rate'] },
    ],
  },
  {
    id: 'customers', name: 'Customer intelligence', description: 'Understand who your shoppers are and what they respond to.',
    features: [
      { id: 'customer-segmentation', module: 'segments', name: 'Customer Segmentation', summary: 'Group shoppers by behavior, value and preferences with a visual rule builder.', detail: 'Build segments such as high value customers, first time visitors or abandoned cart visitors. Segments update as data arrives and can target recommendations, content and experiments.', benefits: ['Visual rule builder', 'Live audience size', 'Usable across every module'] },
      { id: 'behavioral-analytics', module: 'analytics', name: 'Behavioral Analytics', summary: 'Follow product views, clicks, add to cart events and purchases over time.', detail: 'Event level tracking from your storefront shows how shoppers interact with products, recommendations and content across devices.', benefits: ['Event level tracking', 'Device breakdown', 'Daily trends'] },
      { id: 'customer-journey-insights', module: 'analytics', name: 'Customer Journey Insights', summary: 'See how shoppers move from first visit to purchase.', detail: 'Funnel views from visit to product view, add to cart and purchase show where shoppers drop off and which segments convert best.', benefits: ['Conversion funnel', 'Segment comparison', 'Drop off analysis'] },
    ],
  },
  {
    id: 'merchandising', name: 'Merchandising', description: 'Combine automation with full control over what shoppers see first.',
    features: [
      { id: 'smart-category-merchandising', module: 'merchandising', name: 'Smart Category Merchandising', summary: 'Order category pages automatically while keeping manual control.', detail: 'Prioritize best sellers, highlight new arrivals and hide out of stock items. Preview the resulting order before you publish.', benefits: ['Automatic ordering', 'Live preview', 'Scheduling'] },
      { id: 'product-ranking-controls', module: 'merchandising', name: 'Product Ranking Controls', summary: 'Pin, boost, bury or exclude products for any category or search term.', detail: 'Rules are applied in priority order so your team always knows why a product appears where it does.', benefits: ['Pin and boost', 'Bury and exclude', 'Priority ordering'] },
    ],
  },
  {
    id: 'content', name: 'Content and campaigns', description: 'Personalize the storefront and plan campaigns with confidence.',
    features: [
      { id: 'content-personalization', module: 'content', name: 'Content Personalization', summary: 'Show different content to different segments across the storefront.', detail: 'Target homepage sections, landing page copy and category content to the audiences most likely to respond.', benefits: ['Segment targeting', 'Scheduling', 'Live preview'] },
      { id: 'personalized-banners', module: 'content', name: 'Personalized Banners', summary: 'Hero banners with headlines and calls to action tailored to each audience.', detail: 'Create banner variations for new visitors, loyal customers or shoppers of a specific category, then measure impressions and clicks.', benefits: ['Visual builder', 'Audience variations', 'Click tracking'] },
      { id: 'targeted-popups', module: 'content', name: 'Targeted Popups', summary: 'Show timely messages on entry, exit intent or after a delay.', detail: 'Use popups for quizzes, sign up offers or shipping messages, limited to the segments where they add value.', benefits: ['Exit intent placement', 'Segment limits', 'Draft and publish controls'] },
      { id: 'user-generated-content-management', module: 'content', name: 'User Generated Content Management', summary: 'Curate customer photos and reviews alongside products.', detail: 'Collect and approve customer generated media as content blocks so social proof appears next to the products it relates to. Moderation keeps only approved content live.', benefits: ['Approval workflow', 'Product linking', 'Content blocks'] },
      { id: 'campaign-management', module: 'campaigns', name: 'Campaign Management', summary: 'Plan, schedule and track commerce campaigns in one place.', detail: 'Group recommendation, content and merchandising activity under a campaign with dates, objectives and audiences.', benefits: ['Scheduling', 'Linked activities', 'Status tracking'] },
    ],
  },
  {
    id: 'optimization', name: 'Optimization and analytics', description: 'Measure what works and make decisions with evidence.',
    features: [
      { id: 'ab-testing', module: 'experiments', name: 'A/B Testing', summary: 'Compare layouts, banners, sorting and messages with controlled experiments.', detail: 'Split traffic between variations and track click through rate, conversion rate, add to cart rate, average order value and revenue per visitor. Results show statistical confidence and only declare a winner when the data supports it.', benefits: ['Traffic allocation', 'Five core metrics', 'Statistical significance checks'] },
      { id: 'conversion-optimization', module: 'analytics', name: 'Conversion Optimization', summary: 'Find products and pages where shoppers hesitate.', detail: 'Highlight products with high views but low add to cart activity and pages with strong traffic but weak conversion, so your team knows where to focus.', benefits: ['High view, low cart products', 'Funnel analysis', 'Actionable lists'] },
      { id: 'product-performance-analytics', module: 'analytics', name: 'Product Performance Analytics', summary: 'Views, clicks, add to cart events and purchases for every product.', detail: 'Compare products and categories over any date range and spot rising or declining engagement.', benefits: ['Per product metrics', 'Period comparison', 'Category breakdown'] },
      { id: 'ai-commerce-assistant', module: 'assistant', name: 'AI Commerce Assistant', summary: 'Ask questions about your store and get answers grounded in your data.', detail: 'The assistant reads your actual metrics, separates measured numbers from suggestions and never changes live settings without your approval.', benefits: ['Grounded in store data', 'Clear separation of facts and ideas', 'Approval before changes'] },
      { id: 'multi-store-management', module: 'stores', name: 'Multi Store Management', summary: 'Manage several storefronts and teams from one workspace.', detail: 'Connect multiple stores, invite team members with role based permissions and keep each organization data fully isolated.', benefits: ['Multiple stores per workspace', 'Role based access', 'Organization isolation'] },
    ],
  },
];

export const ALL_FEATURES = FEATURE_GROUPS.flatMap((g) => g.features);

export const HOME_FEATURES = [
  { id: 'ai-product-recommendations', name: 'AI Product Recommendations', text: 'Suggest relevant products on every page using browsing behavior, purchase history and product relationships.' },
  { id: 'personalized-product-search', name: 'Personalized Search', text: 'Help shoppers find what they mean, not only what they type, with semantic search and smart filters.' },
  { id: 'customer-segmentation', name: 'Customer Segmentation', text: 'Group shoppers by value, behavior and preferences, then use those segments across the platform.' },
  { id: 'smart-category-merchandising', name: 'Smart Merchandising', text: 'Pin, boost and schedule products with a live preview of how every category will look.' },
  { id: 'content-personalization', name: 'Content Personalization', text: 'Tailor banners, messages and landing page content to the audiences most likely to respond.' },
  { id: 'campaign-management', name: 'Campaign Optimization', text: 'Plan and schedule campaigns, link the activity behind them and follow their results.' },
  { id: 'ab-testing', name: 'A/B Testing', text: 'Test layouts, messages and sorting rules with clear statistics before you roll out a change.' },
  { id: 'product-performance-analytics', name: 'Commerce Analytics', text: 'Follow traffic, engagement, conversion and revenue trends across products, segments and campaigns.' },
];

export const PLATFORM_MODULES = [
  { id: 'customer-intelligence', name: 'Customer Intelligence', text: 'Understand customer behavior, preferences, shopping activity, product affinities and purchase patterns.', points: ['Behavioral event tracking with consent controls', 'Customer profiles with order and visit history', 'Segments built from attributes and behavior'] },
  { id: 'product-experience', name: 'Product Experience', text: 'Help customers discover relevant products through intelligent recommendations, search and personalized product displays.', points: ['Ten recommendation strategies', 'Semantic search with synonyms and filters', 'Placement controls for every page type'] },
  { id: 'merchandising-intelligence', name: 'Merchandising Intelligence', text: 'Give e-commerce teams control over product rankings, promotions, categories, inventory priorities and product visibility.', points: ['Pin, boost, bury and exclude rules', 'Inventory aware ordering', 'Previews and scheduling before publishing'] },
  { id: 'content-experience', name: 'Content Experience', text: 'Personalize banners, promotional messages, landing page content and shopping experiences for different customer segments.', points: ['Visual campaign builder', 'Segment targeting and priority', 'Draft, schedule and publish workflow'] },
  { id: 'campaign-optimization', name: 'Campaign Optimization', text: 'Create, schedule, test and optimize commerce campaigns using performance insights.', points: ['Campaign calendar and status tracking', 'A/B experiments with significance checks', 'Linked recommendation and content activity'] },
  { id: 'commerce-analytics', name: 'Commerce Analytics', text: 'Monitor customer engagement, product performance, conversion trends and campaign outcomes.', points: ['Date range comparison', 'Product, search and segment reports', 'AI assistant grounded in your data'] },
];

export const SOLUTIONS = [
  { id: 'fashion', name: 'Fashion and Apparel', challenge: 'Large seasonal catalogs, fast changing trends and many size and style options make it hard for shoppers to find items that suit them.', approach: 'Custo AI learns style, brand and size preferences from browsing behavior and recommends similar and complementary items, while merchandisers promote new collections and hide sizes that are sold out.', features: ['Similar product recommendations', 'Size and style attributes in search filters', 'Seasonal merchandising schedules', 'New arrival highlighting'] },
  { id: 'beauty', name: 'Beauty and Skincare', challenge: 'Shoppers need guidance on skin types, ingredients and routines, and repeat purchases depend on timely reminders.', approach: 'Product attributes such as skin type power search filters and recommendations, replenishment campaigns bring customers back, and targeted popups guide new visitors toward a routine.', features: ['Attribute based recommendations', 'Replenishment suggestions', 'Routine quiz popups', 'Beauty shopper segments'] },
  { id: 'electronics', name: 'Electronics and Technology', challenge: 'Technical specifications, accessories and compatibility questions make search and cross selling critical.', approach: 'Semantic search understands intent, attribute filters narrow specifications, and complementary recommendations surface the chargers, cases and accessories that complete the purchase.', features: ['Semantic search', 'Specification filters', 'Accessory cross selling', 'Category merchandising'] },
  { id: 'home', name: 'Home and Lifestyle', challenge: 'Shoppers often browse for inspiration rather than a specific product, and baskets combine items across rooms and categories.', approach: 'Personalized collections and content sections create inspiration journeys, while frequently bought together recommendations help shoppers complete a look.', features: ['Personalized collection sections', 'Frequently bought together', 'Content personalization', 'Bundles'] },
  { id: 'dtc', name: 'Direct to Consumer Brands', challenge: 'Focused catalogs and owned customer relationships mean every visit and every repeat purchase matters.', approach: 'Customer profiles and segments reveal how first time visitors differ from loyal customers so you can personalize the storefront and test what improves the journey.', features: ['Customer journey insights', 'Segment targeted banners', 'A/B testing', 'Post purchase recommendations'] },
  { id: 'enterprise', name: 'Large E-commerce Retailers', challenge: 'Extensive catalogs, many teams and multiple storefronts require structure, governance and reliable reporting.', approach: 'Manage catalogs, segments, merchandising rules and campaigns in one workspace with role based access, audit logs and performance reporting across stores.', features: ['Multi store management', 'Role based permissions', 'Audit logs', 'Commerce analytics'] },
  { id: 'agencies', name: 'E-commerce Agencies', challenge: 'Agencies support several client storefronts and need repeatable optimization workflows with clear separation of client data.', approach: 'Create a workspace per client, invite client stakeholders with the right roles and reuse proven campaign structures across accounts.', features: ['Separate client workspaces', 'Team invitations and roles', 'Campaign management', 'Shareable reports'] },
];
