import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VOXPACT — Live Transfer Portal",
  description: "Live transfer management portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900 font-sans">
        {children}
      </body>
    </html>
  );
}
