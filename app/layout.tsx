import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const defaultTitle = "보석이 생일빵 때리기";
const defaultDescription =
  "평소 갖고있던 앙금을 오늘 풀자";

/**
 * 카카오·트위터 등 크롤러가 og:image 절대 URL로 가져가도록.
 * - NEXT_PUBLIC_SITE_URL: 직접 넣는 값(커스텀 도메인 권장). 없으면 아래 순서로 폴백.
 * - VERCEL_*: Vercel 배포 시 플랫폼이 자동 주입 — .env에 적을 필요 없음.
 */
function resolveMetadataBase(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) {
    try {
      return new URL(explicit.endsWith("/") ? explicit.slice(0, -1) : explicit);
    } catch {
      /* ignore */
    }
  }
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) {
    try {
      const u = vercelProd.startsWith("http")
        ? vercelProd
        : `https://${vercelProd}`;
      return new URL(u.endsWith("/") ? u.slice(0, -1) : u);
    } catch {
      /* ignore */
    }
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL("http://localhost:417");
}

const ogImagePath = "/jewel/4.png";

const metadataBase = resolveMetadataBase();
/** 메타 태그에는 항상 절대 URL (상대경로는 일부 스크래퍼에서 이미지 누락) */
const ogImageAbsolute = new URL(ogImagePath, metadataBase).href;

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: defaultTitle,
    template: `%s · ${defaultTitle}`,
  },
  description: defaultDescription,
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    locale: "ko_KR",
    type: "website",
    url: metadataBase,
    siteName: defaultTitle,
    images: [
      {
        url: ogImageAbsolute,
        alt: "생일 케이크를 든 보석이",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [ogImageAbsolute],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
