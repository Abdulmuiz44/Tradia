"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { trackUserJourney } from "@/lib/analytics";
import { FcGoogle } from "react-icons/fc";

// Client-only Navbar/Footer
const Navbar = dynamic(() => import("@/components/Navbar"), { ssr: false });
const Footer = dynamic(() => import("@/components/Footer"), { ssr: false });

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Côte d'Ivoire", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia",
  "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Federated States of Micronesia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

function SignupPage(): React.ReactElement {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);

  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  // hydration guard
  const [hydrated, setHydrated] = useState(false);
  const [country, setCountry] = useState<string>("");

  useEffect(() => {
    setHydrated(true);

    try {
      const lang = typeof navigator !== "undefined" ? navigator.language : null;
      if (!lang) return;

      const parts = lang.split("-");
      if (parts.length < 2) return;
      const code = parts[1].toUpperCase();

      if (typeof Intl !== "undefined" && (Intl as any).DisplayNames) {
        const dn = new (Intl as any).DisplayNames(["en"], { type: "region" });
        const detected = dn.of(code);
        if (detected && COUNTRIES.includes(detected)) {
          setCountry(detected);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Avoid hydration mismatch: render nothing until first client paint
  if (!hydrated) return <div />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");

    const form = formRef.current;
    if (!form) {
      setError("Form not ready.");
      return;
    }

    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");
    const selectedCountry = country || String(fd.get("country") ?? "");

    if (!name || !email || !password || !confirmPassword) {
      setError("All required fields must be filled.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("You must agree to the terms.");
      return;
    }
    if (!selectedCountry) {
      setError("Please select your country.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          country: selectedCountry,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        const msg = data?.error || data?.message || `Signup failed (status ${res.status})`;
        const raw = data?.raw ? ` — details: ${JSON.stringify(data.raw)}` : "";
        setError(`${msg}${raw}`);
        setLoading(false);
        return;
      }

      // Track successful signup for analytics insights
      trackUserJourney.signup("email");

      setNotice(data?.message || "Account created. Check your email for a verification link.");
      router.push(`/check-email?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong; try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    }
  };

  return (
    <>
      <Navbar />

      <div role="main" className="min-h-screen bg-white dark:bg-[#061226] text-black dark:text-gray-100 flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-3xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Aside */}
            <aside className="hidden md:flex flex-col justify-between rounded-2xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gradient-to-br dark:from-black/20 dark:to-white/5 p-8 dark:backdrop-blur-sm">
              <div>
                <h1 className="text-2xl font-extrabold leading-tight text-black dark:text-white">Welcome to Tradia</h1>
                <p className="mt-3 text-gray-700 dark:text-gray-300">
                  Create your account to upload trades, get AI reviews and start improving your edge.
                </p>

                <ul className="mt-6 space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-md bg-indigo-100 dark:bg-indigo-700/10 flex items-center justify-center text-indigo-700 dark:text-indigo-300">✓</span>
                    <div>
                      <div className="font-medium text-black dark:text-white">Secure & private</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">All data encrypted and for your eyes only.</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-md bg-indigo-100 dark:bg-indigo-700/10 flex items-center justify-center text-indigo-700 dark:text-indigo-300">⚡</span>
                    <div>
                      <div className="font-medium text-black dark:text-white">Fast insights</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Upload CSV or add trades manually and get instant feedback.</div>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link href="/login" className="text-indigo-700 dark:text-indigo-300 hover:underline">Sign in</Link>
                {" — "}or view plans{" "}
                <Link href="/payment" className="text-indigo-700 dark:text-indigo-300 hover:underline">here</Link>.
              </div>
            </aside>

            {/* Form */}
            <section className="rounded-2xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gradient-to-br dark:from-black/20 dark:to-white/5 p-8 dark:backdrop-blur-sm shadow-lg dark:shadow-2xl">
              <h2 className="text-3xl font-bold text-black dark:text-white">Create Your Tradia Account</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Fill in the details to get started — verification required.</p>

              {error && (
                <div role="alert" className="mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {notice && (
                <div role="status" className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 p-3 rounded-md text-sm">
                  {notice}
                </div>
              )}

              <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <label className="block">
                  <span className="text-sm font-medium text-black dark:text-gray-300">Full name</span>
                  <input
                    name="name"
                    type="text"
                    placeholder="Your full name"
                    className="mt-2 w-full p-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-transparent text-black dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                    autoComplete="name"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-black dark:text-gray-300">Email</span>
                  <input
                    name="email"
                    type="email"
                    placeholder="name@domain.com"
                    className="mt-2 w-full p-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-transparent text-black dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                    autoComplete="email"
                  />
                </label>

                {/* Country - only render after hydration */}
                {hydrated && (
                  <label className="block">
                    <span className="text-sm font-medium text-black dark:text-gray-300">Country</span>
                    <select
                      name="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="mt-2 w-full p-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-transparent text-black dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      required
                      aria-label="Country"
                    >
                      <option value="">Select your country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="block">
                  <span className="text-sm font-medium text-black dark:text-gray-300">Password</span>
                  <input
                    name="password"
                    type="password"
                    placeholder="Create a password"
                    className="mt-2 w-full p-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-transparent text-black dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                    autoComplete="new-password"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-black dark:text-gray-300">Confirm password</span>
                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm password"
                    className="mt-2 w-full p-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-transparent text-black dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                    autoComplete="new-password"
                  />
                </label>

                <label className="flex items-start gap-3 text-sm text-black dark:text-gray-300">
                  <input
                    id="agree"
                    name="agree"
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-400 dark:border-white/10 bg-white dark:bg-transparent checked:bg-indigo-600 dark:checked:bg-indigo-500 checked:border-indigo-600 dark:checked:border-indigo-500"
                    aria-required="true"
                  />
                  <span>
                    I agree to Tradia&apos;s{" "}
                    <Link href="/terms" className="text-indigo-700 dark:text-indigo-300 hover:underline" target="_blank" rel="noopener noreferrer">
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-indigo-700 dark:text-indigo-300 hover:underline" target="_blank" rel="noopener noreferrer">
                      Privacy Policy
                    </Link>.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="w-full py-3 bg-white hover:bg-gray-200 text-black rounded-lg font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed border border-gray-300"
                >
                  {loading ? "Creating Account..." : "Sign Up"}
                </button>

                <div className="my-4 flex items-center">
                  <div className="flex-1 h-px bg-gray-300 dark:bg-white/10" />
                  <div className="px-3 text-xs text-gray-600 dark:text-gray-400">OR</div>
                  <div className="flex-1 h-px bg-gray-300 dark:bg-white/10" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogle}
                  className="w-full flex items-center justify-center gap-3 py-3 border-2 border-black dark:border-white rounded-lg hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition text-black dark:text-white font-semibold"
                  aria-label="Continue with Google"
                >
                  <FcGoogle size={20} />
                  <span>Continue with Google</span>
                </button>
              </form>

              <div className="text-center text-gray-600 dark:text-gray-400 mt-4">OR</div>

              <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link href="/login" className="text-indigo-700 dark:text-indigo-300 hover:underline">Login here</Link>
              </p>
            </section>
          </div>
        </motion.div>
      </div>

      <Footer />
    </>
  );
}

export default dynamic(() => Promise.resolve(SignupPage), { ssr: false });
