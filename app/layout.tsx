import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "StudyTree",
  description: "参考書の構造をそのまま保存して、構造ごと再現する学習アプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StudyTree",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
