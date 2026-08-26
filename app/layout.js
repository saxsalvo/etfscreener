import "./globals.css";

export const metadata = {
  title: "ETF Performance Screener",
  description: "Performance, AUM, TER e stagionalita ETF",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
