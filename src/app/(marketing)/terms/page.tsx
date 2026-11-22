import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Terms of Service' };

export default function Page() {
  return (
    <div className="container-site max-w-3xl py-16">
      <h1 className="font-display text-4xl font-extrabold">Terms of Service</h1>
      <p className="mt-4 rounded-xl bg-[#fbf0dc] p-4 text-sm text-[#7a4f0d]">This is a placeholder document. Replace it with your reviewed legal text before launch.</p>
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-muted">
        <p>By creating a Custo AI workspace you agree to use the service lawfully and only with data you are permitted to process.</p><p>You are responsible for obtaining any consent required from your shoppers before personal data is collected or used for personalization.</p><p>Paid plans are purchased through the checkout provider shown on the pricing page and are subject to the terms presented there.</p>
      </div>
    </div>
  );
}
