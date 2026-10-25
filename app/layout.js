import './globals.css';

export const metadata = {
  title: 'Photoz — Photoz by IR-INFOTECH | Free Scrapbook Video Maker',
  description: 'Photoz by IR-INFOTECH (photoz.irinfotech.com) — Create stunning scrapbook memory slideshow videos. Keep your data with you: 100% local in-browser processing, no server-side transfer, without watermark.',
  keywords: 'Photoz, IR-INFOTECH, photo slideshow, memory video, scrapbook collage, no watermark, private video maker',
  openGraph: {
    title: 'Photoz by IR-INFOTECH',
    description: 'Keep your memories with you. Prepare photo and video collages in your own system without cloud uploads. 100% Free & No Watermark.',
    url: 'https://photoz.irinfotech.com',
    type: 'website',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ff6b00',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="alternate icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Gochi+Hand&family=Inter:wght@300;400;500;600;700&family=Permanent+Marker&family=Shadows+Into+Light&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
