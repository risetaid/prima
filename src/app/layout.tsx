import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PRIMA - Palliative Remote Integrated Monitoring",
  description:
    "Sistem monitoring dan pengingat obat untuk pasien kanker paliatif",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PRIMA",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192" },
      { url: "/icon-512x512.png", sizes: "512x512" },
    ],
  },
};

export function generateViewport() {
  return {
    themeColor: "#3b82f6",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ClerkProvider
          publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          appearance={{
            baseTheme: undefined,
            variables: {
              colorPrimary: '#3b82f6',
              colorBackground: '#ffffff',
              colorInputBackground: '#ffffff',
              colorInputText: '#000000',
            },
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
              card: 'shadow-lg border-0',
              headerTitle: 'text-gray-900',
              headerSubtitle: 'text-gray-600',
            }
          }}
        >
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "white",
                color: "black",
                border: "1px solid #e5e7eb",
              },
            }}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js')
                      .then((registration) => {
                      })
                      .catch((registrationError) => {
                      });
                  });
                }
              `,
            }}
          />
        </ClerkProvider>
      </body>
    </html>
  );
}
