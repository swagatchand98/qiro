import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QIRO Glass Solutions | Quotation & Estimation System",
  description: "Professional glass quotation and estimation system for internal business use",
  icons: {
    icon: '/icon_bg_white.jpeg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-white font-sans">
        {children}
      </body>
    </html>
  );
}
