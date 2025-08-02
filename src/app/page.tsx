// /src/app/page.tsx

'use client';

import Link from 'next/link';
import {
  AiOutlineArrowRight,
  AiOutlineBarChart,
  AiOutlineLock,
  AiOutlineThunderbolt,
  AiOutlineGlobal
} from 'react-icons/ai';

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Home() {
  const features = [
    {
      icon: <AiOutlineBarChart className="w-8 h-8" />,
      title: "Smart Performance Tracking",
      description: "Track your trades with real-time metrics, charts, and behavior insights."
    },
    {
      icon: <AiOutlineLock className="w-8 h-8" />,
      title: "Secure & Private",
      description: "Your trading data is encrypted and accessible only to you."
    },
    {
      icon: <AiOutlineThunderbolt className="w-8 h-8" />,
      title: "Lightning-Fast Feedback",
      description: "AI-powered insights on your trading behavior in seconds."
    },
    {
      icon: <AiOutlineGlobal className="w-8 h-8" />,
      title: "Trade Anywhere",
      description: "Responsive design works perfectly on mobile, tablet, and desktop."
    }
  ];

  return (
    <>
      <Navbar />

      <main className="bg-white dark:bg-black text-gray-900 dark:text-white">
        {/* HERO SECTION */}
        <section className="min-h-screen flex flex-col justify-center items-center text-center px-6 sm:px-12 md:px-20 py-16">
          <h1 className="text-4xl sm:text-6xl font-bold mb-6 leading-tight">
            Your <span className="text-indigo-600">AI Trading Assistant</span><br />
            to Trade Smarter, Not Harder
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mb-10">
            Tradia helps retail traders like you track performance, identify patterns, and get smarter with every trade — from anywhere, anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/auth/signup"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 shadow-md flex items-center justify-center gap-2"
            >
              Start Free Trial <AiOutlineArrowRight />
            </Link>
            <Link
              href="/demo"
              className="border-2 border-indigo-600 text-indigo-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-indigo-50 transition-all duration-300"
            >
              Try Demo
            </Link>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="py-20 px-6 sm:px-12 md:px-20 bg-gray-50 dark:bg-gray-900">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">What Tradia Offers</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Designed for serious traders who want clarity, control, and AI-driven feedback.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300"
              >
                <div className="text-indigo-600 dark:text-indigo-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CALL TO ACTION SECTION */}
        <section className="py-20 px-6 sm:px-12 md:px-20">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-12 text-center text-white shadow-xl">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Ready to Trade Smarter?
            </h2>
            <p className="max-w-xl mx-auto mb-8 text-indigo-100">
              Join the community of traders using Tradia to unlock consistent improvement and real growth.
            </p>
            <Link
              href="/auth/signup"
              className="bg-white text-indigo-600 px-4 py-2 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Get Started for Free
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
