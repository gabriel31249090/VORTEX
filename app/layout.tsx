import type { Metadata } from "next";

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
      </body>
    </html>
  );
}