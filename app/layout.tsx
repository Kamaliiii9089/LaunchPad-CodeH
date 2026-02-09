import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/components/ToastContainer";
import { ThemeProvider } from "@/lib/ThemeContext";

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
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <ThemeProvider>
          <ToastProvider>
            <Navigation />
            {children}
            <Footer />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

