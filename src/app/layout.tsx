import type { Metadata, Viewport } from "next";
import { ServiceWorker } from "@/components/ServiceWorker";
import splashImages from "@/content/splash.json";
import "./globals.css";

export const metadata: Metadata = {
  title: "8-Week Plan",
  description: "Meals, workouts and progress for the 8-week plan",
  applicationName: "8-Week Plan",
  appleWebApp: { capable: true, title: "8-Week", statusBarStyle: "default", startupImage: splashImages },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script adds "no-splash" before first paint on reloads within a session, so the
    // splash only shows on a cold start. That changes <html>'s class before hydration.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(sessionStorage.getItem("fit8w:splash")==="1")document.documentElement.classList.add("no-splash")}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
