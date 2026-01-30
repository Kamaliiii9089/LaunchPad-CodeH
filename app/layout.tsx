import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "BreachBuddy - Security Dashboard",
  description: "Next-generation security dashboard providing unified control over your digital footprint",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <Navigation />
        {children}
        <Footer />
      </body>
    </html>
  );
}
