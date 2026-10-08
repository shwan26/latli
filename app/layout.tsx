import type { Metadata } from "next";
import Script from "next/script";
import {
  Geist,
  Geist_Mono,
  IBM_Plex_Sans,
  Noto_Sans_Myanmar,
  Roboto,
} from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { I18nProvider } from "@/lib/i18n/provider";
import { getI18n } from "@/lib/i18n/server";

const robotoHeading = Roboto({subsets:['latin'],variable:'--font-heading'});

const ibmPlexSans = IBM_Plex_Sans({subsets:['latin'],variable:'--font-sans'});

// Burmese text needs a font with Myanmar letters. Used when the page is in MM.
const notoMyanmar = Noto_Sans_Myanmar({
  subsets: ["myanmar"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-myanmar",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();

  return {
    title: t("Latli | Retailer Process Management"),
    description: t(
      "Manage retailer orders, payments, customer history, and delivery handoff in one focused workspace"
    ),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { lang } = await getI18n();

  return (
    <html
      lang={lang}
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", ibmPlexSans.variable, robotoHeading.variable, notoMyanmar.variable)}
    >
      <head>
        {/* Plain tags so the AdSense crawler sees them in the server-rendered HTML. */}
        <meta name="google-adsense-account" content="ca-pub-4715321127483793" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4715321127483793"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProvider initialLang={lang}>{children}</I18nProvider>
      </body>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-5R839METG7"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-5R839METG7');
        `}
      </Script>
    </html>
  );
}
