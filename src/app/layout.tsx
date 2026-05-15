import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NZ Legislation MCP",
  description: "Remote MCP server wrapping the NZ Legislation API.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "2rem auto", padding: "0 1rem", lineHeight: 1.55 }}>
        {children}
      </body>
    </html>
  );
}
