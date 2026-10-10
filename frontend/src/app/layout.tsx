import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Are You Cooked? — Interview practice",
  description:
    "A little heat. A lot of growth. Practice Python technical interviews with a steak companion.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
