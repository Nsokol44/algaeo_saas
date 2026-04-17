import './globals.css';
import { FarmProvider } from '@/lib/FarmContext';

export const metadata = {
  title: 'Algaeo.io — Crop Intelligence Platform',
  description: 'AI-powered crop projection and soil intelligence for regenerative agriculture.',
  manifest: '/manifest.json',
  themeColor: '#0a0c0a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-bg text-text font-mono min-h-screen">
        <FarmProvider>{children}</FarmProvider>
      </body>
    </html>
  );
}
