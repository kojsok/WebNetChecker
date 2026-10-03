import type { Metadata, Viewport } from "next";
import { Archivo_Black, JetBrains_Mono, Oswald } from "next/font/google";
import "./globals.css";

const display = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const condensed = Oswald({
  subsets: ["latin", "cyrillic"],
  variable: "--font-condensed",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WebNetChecker — проверка доступности сервисов",
    template: "%s · WebNetChecker",
  },
  description:
    "Дашборд мониторинга доступности доменов, сервисов и файлов. Параллельные HTTP-проверки, статусы ДОСТУПЕН/ЗАБЛОКИРОВАН, latency в реальном времени.",
  applicationName: "WebNetChecker",
  keywords: ["мониторинг", "доступность", "ping", "статус сервисов", "сетевой чекер"],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "WebNetChecker",
    title: "WebNetChecker — проверка доступности сервисов",
    description:
      "Параллельные HTTP-проверки доменов и сервисов. Статусы, latency, экспорт результатов.",
  },
  twitter: {
    card: "summary_large_image",
    title: "WebNetChecker",
    description: "Мониторинг доступности сервисов в реальном времени.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${display.variable} ${condensed.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}