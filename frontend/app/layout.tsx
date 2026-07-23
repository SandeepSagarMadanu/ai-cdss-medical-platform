import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Clinical Decision Support Platform (CDSS)",
  description: "AI-assisted clinical decision support system. Automated medical imaging diagnostics, literature retrieval RAG, and explainable findings reporting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-background min-h-screen text-slate-100 selection:bg-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}
