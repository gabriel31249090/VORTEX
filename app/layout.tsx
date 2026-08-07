import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import AdPopup from "./components/AdPopup";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import PageTransition from "@/components/PageTransition";
import "./globals.css";
import "./styles/interactions.css";

const SITE_URL = "https://vortex.app"; // TODO: trocar pelo domínio real quando definido

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VORTEX — A rede social sem limites",
    template: "%s · VORTEX",
  },
  description: "Rede social moderna combinando o melhor do Reddit e Instagram. Comunidades, feed, posts, comentários e curtidas.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VORTEX",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "VORTEX",
    title: "VORTEX — A rede social sem limites",
    description: "Rede social moderna combinando o melhor do Reddit e Instagram. Comunidades, feed, posts, comentários e curtidas.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VORTEX — A rede social sem limites",
    description: "Rede social moderna combinando o melhor do Reddit e Instagram.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body style={{ margin: 0, padding: 0, background: '#0a0a0f' }}>
        <ServiceWorkerRegister />
        <PageTransition>{children}</PageTransition>
        <AdPopup />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#111118',
              color: '#f0f0f8',
              border: '1px solid rgba(200,242,60,0.2)',
              fontFamily: "'Syne', sans-serif",
              fontSize: '14px',
              borderRadius: '12px',
            },
            success: {
              iconTheme: {
                primary: '#c8f23c',
                secondary: '#000',
              },
            },
            error: {
              iconTheme: {
                primary: '#ff4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}