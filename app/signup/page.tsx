"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { trackUserJourney } from "@/lib/analytics";
import { FcGoogle } from "react-icons/fc";
import { Shield, Zap, TrendingUp, ChevronDown } from "lucide-react";

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
  const [hydrated, setHydrated] = useState(false);
  const [country, setCountry] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

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
        body: JSON.stringify({ name, email, password, country: selectedCountry }),
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
        setError(msg);
        setLoading(false);
        return;
      }

      trackUserJourney.signup("email");
      setNotice(data?.message || "Account created. Check your email for verification.");
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

  const features = [
    { icon: Shield, title: "Your Data, Protected", desc: "Bank-level encryption for all your trades" },
    { icon: Zap, title: "AI-Powered Analysis", desc: "Get instant insights on every trade" },
    { icon: TrendingUp, title: "Track Your Edge", desc: "Visualize your trading performance" },
  ];

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0a0d12] flex items-center justify-center py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-5xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-[#2a2f3a] shadow-2xl">

            {/* Left Panel - Branding */}
            <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#0D1117] relative overflow-hidden">
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-full h-full" style={{
                  backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
                                   radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.3) 0%, transparent 50%)`
                }} />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-12">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <Image src="/TRADIA-LOGO.png" alt="Tradia" width={24} height={24} className="w-6 h-6" />
                  </div>
                  <span className="text-xl font-bold text-white">Tradia</span>
                </div>

                <h1 className="text-3xl font-bold text-white mb-3">
                  Start your journey
                </h1>
                <p className="text-gray-400 text-lg mb-10">
                  Create your account to get AI-powered trading insights and improve your edge.
                </p>

                <div className="space-y-6">
                  {features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-[#2a2f3a] flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{feature.title}</div>
                        <div className="text-sm text-gray-500">{feature.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 pt-10 border-t border-[#2a2f3a] mt-10">
                <p className="text-gray-500 text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="text-blue-400 hover:text-blue-300 transition font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>

            {/* Right Panel - Form */}
            <div className="p-10 bg-[#0D1117]">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Create your account</h2>
                <p className="text-gray-500">Fill in your details to get started</p>
              </div>

              {error && (
                <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {notice && (
                <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                  {notice}
                </div>
              )}

              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Full name</label>
                  <input
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    className="w-full px-4 py-3 rounded-lg bg-[#161B22] border border-[#2a2f3a] text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    required
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Email address</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    className="w-full px-4 py-3 rounded-lg bg-[#161B22] border border-[#2a2f3a] text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    required
                    autoComplete="email"
                  />
                </div>

                {hydrated && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Country</label>
                    <div className="relative">
                      <select
                        name="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-[#161B22] border border-[#2a2f3a] text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition appearance-none cursor-pointer"
                        required
                      >
                        <option value="">Select your country</option>
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      className="w-full px-4 py-3 rounded-lg bg-[#161B22] border border-[#2a2f3a] text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition pr-16"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400 text-sm transition"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Confirm password</label>
                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    className="w-full px-4 py-3 rounded-lg bg-[#161B22] border border-[#2a2f3a] text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <input
                    id="agree"
                    name="agree"
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded bg-[#161B22] border-[#2a2f3a] text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <label htmlFor="agree" className="text-sm text-gray-400">
                    I agree to Tradia&apos;s{" "}
                    <Link href="/terms" className="text-blue-400 hover:text-blue-300" target="_blank">Terms</Link>
                    {" "}and{" "}
                    <Link href="/privacy" className="text-blue-400 hover:text-blue-300" target="_blank">Privacy Policy</Link>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-white hover:bg-gray-100 text-black rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </button>

                <div className="my-4 flex items-center gap-4">
                  <div className="flex-1 h-px bg-[#2a2f3a]" />
                  <span className="text-xs text-gray-600 uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-[#2a2f3a]" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogle}
                  className="w-full py-3.5 border border-[#2a2f3a] rounded-lg hover:bg-[#161B22] transition flex items-center justify-center gap-3 text-white font-medium"
                >
                  <FcGoogle size={20} />
                  <span>Continue with Google</span>
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500 lg:hidden">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-400 hover:text-blue-300 transition font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </>
  );
}

export default dynamic(() => Promise.resolve(SignupPage), { ssr: false });
