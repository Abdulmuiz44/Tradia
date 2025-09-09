"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#061226] text-gray-100">
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-gray-400 mb-8">Please read these terms carefully before using Tradia.</p>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Acceptance of Terms</h2>
              <p className="text-gray-300">By creating an account or using Tradia, you agree to these terms and our Privacy Policy.</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Use of Service</h2>
              <ul className="list-disc pl-5 text-gray-300 space-y-1">
                <li>Do not misuse or attempt to disrupt the service.</li>
                <li>You are responsible for the data you upload and for complying with applicable laws.</li>
                <li>Tradia provides analytics; we do not offer financial advice.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Subscriptions & Trials</h2>
              <p className="text-gray-300">Paid plans include a 3-day free trial (where applicable). You can cancel anytime before the trial ends to avoid charges.</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Limitation of Liability</h2>
              <p className="text-gray-300">Tradia is provided “as is”. To the fullest extent permitted by law, we are not liable for losses arising from use of the service.</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Contact</h2>
              <p className="text-gray-300">Questions about these terms? Email <a className="text-indigo-300 underline" href="mailto:support@tradia.app">support@tradia.app</a>.</p>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    </>
  );
}

