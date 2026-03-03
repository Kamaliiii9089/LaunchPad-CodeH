'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import ThemeToggle from "./ThemeToggle";

interface User {
  id: string;
  name: string;
  email: string;
}

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    setMounted(true);
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        setUser(null);
      }
    }
  }, []);

  if (!mounted) {
    return (
      <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              BreachBuddy
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: "Contact" },
  ];

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            BreachBuddy
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex space-x-4 items-center">
            <ThemeToggle />
            {user ? (
              <>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-sm text-right">
                    <p className="font-semibold text-gray-800 dark:text-white">{user.name}</p>
                    <p className="text-gray-500 dark:text-gray-300 text-xs">{user.email}</p>
                  </div>
                </div>
                <Link href="/dashboard" className="btn-secondary px-4 py-2">
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary px-4 py-2">
                  Login
                </Link>
                <Link href="/signup" className="btn-primary px-4 py-2">
                  Sign Up
                </Link>
              </>
            )}
          </div>


          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <button
              className="flex flex-col space-y-1"
              onClick={() => setIsOpen(!isOpen)}
            >
              <div className="w-6 h-0.5 bg-gray-800 dark:bg-gray-200"></div>
              <div className="w-6 h-0.5 bg-gray-800 dark:bg-gray-200"></div>
              <div className="w-6 h-0.5 bg-gray-800 dark:bg-gray-200"></div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col space-y-2 mt-4 pt-4 border-t dark:border-gray-700">
              {user ? (
                <>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{user.name}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{user.email}</p>
                  </div>
                  <Link href="/dashboard" className="btn-secondary text-center px-4 py-2">
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="btn-primary text-center px-4 py-2 bg-red-600 hover:bg-red-700"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-secondary text-center px-4 py-2">
                    Login
                  </Link>
                  <Link href="/signup" className="btn-primary text-center px-4 py-2">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav >
  );
}
