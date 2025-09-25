import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { TimeFormatInitializer } from "@/components/ui/time-format-initializer";
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
      { url: "/icons/ios/32.png", sizes: "32x32" },
      { url: "/icons/ios/192.png", sizes: "192x192" },
      { url: "/icons/ios/512.png", sizes: "512x512" },
      { url: "/icons/ios/1024.png", sizes: "1024x1024" },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'PRIMA',
    'application-name': 'PRIMA',
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml',
    'format-detection': 'telephone=no',
    'theme-color': '#3b82f6'
  }
};

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
      { media: "(prefers-color-scheme: dark)", color: "#1d4ed8" }
    ],
    viewportFit: "cover"
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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ClerkProvider
          publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          appearance={{
            baseTheme: undefined,
            variables: {
              colorPrimary: "#3b82f6",
              colorBackground: "#ffffff",
              colorInputBackground: "#ffffff",
              colorInputText: "#000000",
            },
            elements: {
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
              card: "shadow-lg border-0",
              headerTitle: "text-gray-900",
              headerSubtitle: "text-gray-600",
            },
          }}
        >
          <AuthProvider>
            <TimeFormatInitializer />
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
          </AuthProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
