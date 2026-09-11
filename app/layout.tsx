import type { Metadata, Viewport } from "next";
import { ThemeProvider, themeInitScript } from "@/components/layout/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal AI Agent — Tell me what you need. I'll help get it done.",
  description:
    "One place to research, organize, plan and eventually execute tasks across the tools you use.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#14161a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs before paint to avoid a flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
