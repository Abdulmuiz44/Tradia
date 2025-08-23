// app/signup/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COUNTRIES = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Côte d'Ivoire",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo (Congo-Brazzaville)",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czechia (Czech Republic)",
  "Democratic Republic of the Congo",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini (fmr. Swaziland)",
  "Ethiopia",
  "Federated States of Micronesia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar (formerly Burma)",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States of America",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

export default function SignupPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState<string>("");

  // Try to auto-detect country from browser locale (best-effort)
  useEffect(() => {
    try {
      const lang = typeof navigator !== "undefined" ? navigator.language : null;
      if (lang && lang.includes("-")) {
        const code = lang.split("-")[1].toUpperCase(); // e.g. en-GB -> GB
        // Intl.DisplayNames can map region code to localized country name
        if ((Intl as any).DisplayNames) {
          const dn = new (Intl as any).DisplayNames(["en"], { type: "region" });
          const detected = dn.of(code);
          if (detected && COUNTRIES.includes(detected)) {
            setCountry(detected);
          }
        }
      }
    } catch {
      // ignore and leave country empty
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");

    const form = formRef.current;
    if (!form) return setError("Form not ready.");

    const fd = new FormData(form);
    const name = (fd.get("name") as string || "").trim();
    const email = (fd.get("email") as string || "").trim();
    const password = (fd.get("password") as string || "");
    const confirmPassword = (fd.get("confirmPassword") as string || "");
    const selectedCountry = country || (fd.get("country") as string || "");

    if (!name || !email || !password || !confirmPassword) {
      return setError("All required fields must be filled.");
    }
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (!agreed) return setError("You must agree to the terms.");
    if (!selectedCountry) return setError("Please select your country.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, country: selectedCountry }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Signup failed.");
        return;
      }

      setNotice("Account created. Check your email for a verification link.");
      router.push(`/check-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      console.error("Signup client error", err);
      setError("Something went wrong; try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 py-8">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 shadow-md rounded-2xl p-8 space-y-6">
        <h2 className="text-3xl font-bold text-center text-indigo-600 dark:text-indigo-400">
          Create Your Tradia Account
        </h2>

        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm text-center"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-md text-sm text-center"
          >
            {notice}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Full Name */}
          <input
            name="name"
            type="text"
            placeholder="Full Name"
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoComplete="name"
          />

          {/* Email */}
          <input
            name="email"
            type="email"
            placeholder="Email Address"
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoComplete="email"
          />

          {/* Country select */}
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            <span className="sr-only">Country</span>
            <select
              name="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              aria-label="Country"
            >
              <option value="">Select your country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          {/* Password */}
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoComplete="new-password"
          />

          {/* Confirm Password */}
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoComplete="new-password"
          />

          {/* Terms */}
          <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
            <input
              id="agree"
              name="agree"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600"
              aria-required="true"
            />
            <span>
              I agree to Tradia’s{" "}
              <Link href="/terms" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <div className="text-center text-gray-500 dark:text-gray-400">OR</div>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-600 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
