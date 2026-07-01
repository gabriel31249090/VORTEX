import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import AdPopup from "./components/AdPopup";

export const metadata: Metadata = {
  title: "VORTEX",
  description: "A rede social sem limites",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body style={{ margin: 0, padding: 0, background: '#0a0a0f' }}>
        {children}
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