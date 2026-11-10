import type { Metadata, Viewport } from "next";
import { AppRegistration } from "@/components/app-install";
import "./globals.css";
export const metadata: Metadata = {
  title: "ILLAM — My home build",
  description: "Track your construction money, payments and daily site work.",
  applicationName: "ILLAM",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ILLAM" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f5f1",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppRegistration />
        {children}
      </body>
    </html>
  );
}
