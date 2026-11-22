import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Privacy Policy' };

export default function Page() {
  return (
    <div className="container-site max-w-3xl py-16">
      <h1 className="font-display text-4xl font-extrabold">Privacy Policy</h1>
      <p className="mt-4 rounded-xl bg-[#fbf0dc] p-4 text-sm text-[#7a4f0d]">This is a placeholder document. Replace it with your reviewed legal text before launch.</p>
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-muted">
        <p>Custo AI processes account information (name, work email, company and store URL) to provide the service.</p><p>Store data you connect, such as products, orders and storefront events, is isolated to your organization and only accessible to members you invite.</p><p>Shopper events are only recorded when your storefront indicates that the shopper has given consent.</p>
      </div>
    </div>
  );
}
