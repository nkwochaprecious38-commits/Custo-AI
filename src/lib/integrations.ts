export type ProviderField = { key: string; label: string; type?: 'text' | 'password' | 'url'; placeholder?: string; help?: string; secret?: boolean };
export type Provider = {
  id: string; name: string; category: 'Commerce platform' | 'Analytics' | 'Marketing automation' | 'Customer data platform';
  description: string; connectable: boolean; fields: ProviderField[]; steps: string[]; docs?: string;
};

/** Providers marked connectable have a tested server side connector. Others show setup guidance only. */
export const PROVIDERS: Provider[] = [
  {
    id: 'shopify', name: 'Shopify', category: 'Commerce platform', connectable: true,
    description: 'Import products and inventory from a Shopify store using the Admin API.',
    fields: [
      { key: 'shop', label: 'Store domain', placeholder: 'your-store.myshopify.com' },
      { key: 'access_token', label: 'Admin API access token', type: 'password', secret: true, placeholder: 'shpat_...' },
    ],
    steps: ['In Shopify admin, open Settings, then Apps and sales channels, then Develop apps.', 'Create an app and grant the read_products and read_inventory Admin API scopes.', 'Install the app and copy the Admin API access token.', 'Paste the store domain and token here, then select Test and connect.'],
  },
  {
    id: 'shopify_plus', name: 'Shopify Plus', category: 'Commerce platform', connectable: true,
    description: 'Same Admin API connector for Shopify Plus stores and expansion stores.',
    fields: [
      { key: 'shop', label: 'Store domain', placeholder: 'your-store.myshopify.com' },
      { key: 'access_token', label: 'Admin API access token', type: 'password', secret: true, placeholder: 'shpat_...' },
    ],
    steps: ['Create a custom app in the Shopify Plus organization or store admin.', 'Grant read_products and read_inventory scopes and install the app.', 'Copy the Admin API access token and connect each storefront separately.'],
  },
  {
    id: 'woocommerce', name: 'WooCommerce', category: 'Commerce platform', connectable: true,
    description: 'Import products from WooCommerce using the REST API.',
    fields: [
      { key: 'url', label: 'Store URL', type: 'url', placeholder: 'https://yourstore.com' },
      { key: 'consumer_key', label: 'Consumer key', placeholder: 'ck_...' },
      { key: 'consumer_secret', label: 'Consumer secret', type: 'password', secret: true, placeholder: 'cs_...' },
    ],
    steps: ['In WordPress, open WooCommerce, then Settings, then Advanced, then REST API.', 'Add a key with Read permission.', 'Copy the consumer key and consumer secret and paste them here.', 'Your store must be served over HTTPS.'],
  },
  {
    id: 'bigcommerce', name: 'BigCommerce', category: 'Commerce platform', connectable: true,
    description: 'Import catalog products using the BigCommerce Catalog API.',
    fields: [
      { key: 'store_hash', label: 'Store hash', placeholder: 'abc123' },
      { key: 'access_token', label: 'API access token', type: 'password', secret: true },
    ],
    steps: ['In BigCommerce, open Settings, then API accounts, then Create API account.', 'Grant Products read only scope.', 'Copy the store hash from the API path and the access token.'],
  },
  {
    id: 'adobe_commerce', name: 'Adobe Commerce', category: 'Commerce platform', connectable: false,
    description: 'Direct connector not yet available. Use CSV import and the tracking API in the meantime.', fields: [],
    steps: ['Export products to CSV from the Adobe Commerce admin and import them in Product Catalog.', 'Add the Custo AI tracking snippet to your storefront theme to send events.'],
  },
  {
    id: 'shopware', name: 'Shopware', category: 'Commerce platform', connectable: false,
    description: 'Direct connector not yet available. Use CSV import and the tracking API in the meantime.', fields: [],
    steps: ['Export your product catalog to CSV and import it in Product Catalog.', 'Install the tracking snippet in your storefront theme.'],
  },
  {
    id: 'salesforce_commerce', name: 'Salesforce Commerce Cloud', category: 'Commerce platform', connectable: false,
    description: 'Direct connector not yet available. Use CSV import and the tracking API in the meantime.', fields: [],
    steps: ['Export a catalog feed to CSV and import it in Product Catalog.', 'Send storefront events to the Custo AI tracking API from your cartridge or tag manager.'],
  },
  {
    id: 'google_analytics', name: 'Google Analytics', category: 'Analytics', connectable: false,
    description: 'Planned connector for importing GA4 traffic data. Not available yet.', fields: [],
    steps: ['Until this connector is available, send storefront events directly with the tracking snippet.'],
  },
  {
    id: 'marketing_automation', name: 'Marketing automation platforms', category: 'Marketing automation', connectable: false,
    description: 'Planned connectors for syncing segments to email and SMS tools. Not available yet.', fields: [],
    steps: ['Segments can be reviewed in Customer Segments. Export support is planned.'],
  },
  {
    id: 'cdp', name: 'Customer data platforms', category: 'Customer data platform', connectable: false,
    description: 'Planned connectors for receiving events from customer data platforms. Not available yet.', fields: [],
    steps: ['Forward events from your CDP to the Custo AI tracking API endpoint as a custom destination.'],
  },
];
