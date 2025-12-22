import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tala Recoveries - Andrea",
  description: "Talk to Andrea about your loan repayment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
