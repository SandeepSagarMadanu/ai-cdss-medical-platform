import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Clinical Decision Support Platform (CDSS)",
  description: "AI-assisted clinical decision support system. Automated medical imaging diagnostics, literature retrieval RAG, and explainable findings reporting.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI CDSS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#090d16",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-background min-h-screen text-slate-100 selection:bg-primary selection:text-white overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
