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

export const metadata: Metadata = {
  title: "Oracle Pulse",
  description: "Oracle agents dashboard — Next.js, API routes, Claude",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        {/* Dev-only: prevent browser wallet extensions (MetaMask) from tripping Next's error overlay */}
        {process.env.NODE_ENV !== "production" ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `
(() => {
  const isExt = (s) => typeof s === "string" && s.includes('chrome-extension://');
  const isMmMsg = (m) => typeof m === 'string' && (
    m.includes('MetaMask') ||
    m.includes('metamask') ||
    m.includes('Failed to connect to MetaMask')
  );

  window.addEventListener('error', (e) => {
    try {
      const f = e.filename || '';
      const m = (e.message || '').toString();
      if (isExt(f) && isMmMsg(m)) {
        e.preventDefault();
        e.stopImmediatePropagation?.();
      }
    } catch {}
  }, true);

  window.addEventListener('unhandledrejection', (e) => {
    try {
      const r = e.reason;
      const msg = (r && (r.message || String(r))) || '';
      const stack = (r && r.stack) ? String(r.stack) : '';
      if (isMmMsg(String(msg)) || isMmMsg(stack) || stack.includes('chrome-extension://')) {
        e.preventDefault();
        e.stopImmediatePropagation?.();
      }
    } catch {}
  }, true);
})();
              `.trim(),
            }}
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
