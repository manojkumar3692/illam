import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ILLAM — A little closer to home",
  description:
    "Your home construction, thoughtfully managed. Funds, payments, materials and progress in one place.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
