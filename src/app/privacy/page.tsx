"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#061226] text-gray-100">
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Your privacy matters. This page explains how Tradia handles your data.</p>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Overview</h2>
              <p className="text-gray-300">We collect the minimum information needed to provide trade analytics and account features. We never sell your data.</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Data We Collect</h2>
              <ul className="list-disc pl-5 text-gray-300 space-y-1">
                <li>Account details: name, email, and profile preferences</li>
                <li>Trading data you upload (e.g., CSV; future direct connections)</li>
                <li>Usage analytics to improve product reliability and UX</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">How We Use Data</h2>
              <ul className="list-disc pl-5 text-gray-300 space-y-1">
                <li>Provide charts, metrics, and AI analysis</li>
                <li>Maintain secure sessions and prevent abuse</li>
                <li>Communicate product updates (opt-out any time)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Security</h2>
              <p className="text-gray-300">We use encryption in transit and at rest where supported. Access to production systems is restricted and audited.</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Contact</h2>
              <p className="text-gray-300">Questions or requests? Email <a className="text-indigo-300 underline" href="mailto:support@tradia.app">support@tradia.app</a>.</p>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    </>
  );
}
