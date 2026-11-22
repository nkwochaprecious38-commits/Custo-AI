import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FeedbackProvider } from '@/components/ui';

export const metadata: Metadata = {
  title: { default: 'Custo AI: Make Every Shopping Experience Personal', template: '%s | Custo AI' },
  icons: { icon: '/favicon.svg' },
  description: 'Custo AI is an AI powered e-commerce personalization platform for product recommendations, intelligent search, customer segmentation, merchandising and commerce analytics.',
};
export const viewport: Viewport = { themeColor: '#211C1F', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body><FeedbackProvider>{children}</FeedbackProvider></body>
    </html>
  );
}
