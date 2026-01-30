'use client';

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 text-white">
      <div className="container mx-auto px-4 py-20">
        <div className={`max-w-3xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            Your Digital Guardian
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 text-blue-100">
            BreachBuddy is a next-generation security dashboard that provides unified control 
            over your digital footprint. Monitor threats, manage passwords, and protect your identity 
            all in one place.
          </p>

          <div className="flex flex-col md:flex-row justify-center gap-4 mb-12">
            <Link
              href="/signup"
              className="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition-colors text-lg"
            >
              Get Started Free
            </Link>
            <Link
              href="/features"
              className="px-8 py-4 bg-blue-400 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors text-lg"
            >
              Learn More
            </Link>
          </div>

          <p className="text-blue-200 mb-12">
            🎉 14-day free trial. No credit card required.
          </p>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-700 bg-opacity-50 p-6 rounded-lg">
              <div className="text-3xl font-bold mb-2">50K+</div>
              <p className="text-blue-200">Active Users</p>
            </div>
            <div className="bg-blue-700 bg-opacity-50 p-6 rounded-lg">
              <div className="text-3xl font-bold mb-2">1M+</div>
              <p className="text-blue-200">Threats Blocked</p>
            </div>
            <div className="bg-blue-700 bg-opacity-50 p-6 rounded-lg">
              <div className="text-3xl font-bold mb-2">4.9★</div>
              <p className="text-blue-200">User Rating</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
