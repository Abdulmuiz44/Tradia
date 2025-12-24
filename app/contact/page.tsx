"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic mailto fallback; replace with API route if needed
    const subject = encodeURIComponent("Tradia Contact");
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:support@tradia.app?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white text-gray-900 dark:bg-[#0f1319] dark:text-gray-100 transition-colors">
        <section className="max-w-3xl mx-auto px-6 py-16">
          <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
          <p className="text-gray-400 mb-8">We’d love to help. Send us a message and we’ll get back to you.</p>

          <form onSubmit={handleSubmit} className="space-y-4 bg-white/5 border border-white/10 p-6 rounded-xl">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 focus:outline-none focus:border-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 focus:outline-none focus:border-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 focus:outline-none focus:border-indigo-500" required />
            </div>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold">
              Send Message
            </button>
            {sent && (
              <div className="text-sm text-green-400 mt-2">Opening your email client… If it doesn’t open, email support@tradia.app</div>
            )}
          </form>
        </section>
        <Footer />
      </main>
    </>
  );
}
