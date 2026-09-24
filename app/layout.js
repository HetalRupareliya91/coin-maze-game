import { Baloo_2, Inter } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-body" });

export const metadata = {
  title: "Coin Maze",
  description: "A small coin-collecting maze game built with Next.js and canvas.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${baloo.variable} ${inter.variable}`}>{children}</body>
    </html>
  );
}
