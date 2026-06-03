import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XO",
  description: "A wood-styled multiplayer tic-tac-toe web client.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
