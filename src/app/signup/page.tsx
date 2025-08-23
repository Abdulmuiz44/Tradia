// app/signup/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient'; // make sure this exists

const COUNTRIES = [
  /* ... your countries array (unchanged) ... */
  'Afghanistan',
  'Albania',
  'Algeria',
  // ... (keep the full list you already have)
  'Zimbabwe',
];

export default function SignupPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState<string>('');

  useEffect(() => {
    try {
      const lang = typeof navigator !== 'undefined' ? navigator.language : null;
      if (lang && lang.includes('-')) {
        const code = lang.split('-')[1].toUpperCase();
        if ((Intl as any).DisplayNames) {
          const dn = new (Intl as any).DisplayNames(['en'], { type: 'region' });
          const detected = dn.of(code);
          if (detected && COUNTRIES.includes(detected)) {
            setCountry(detected);
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    const form = formRef.current;
    if (!form) return setError('Form not ready.');

    const fd = new FormData(form);
    const name = (fd.get('name') as string || '').trim();
    const email = (fd.get('email') as string || '').trim();
    const password = (fd.get('password') as string || '');
    const confirmPassword = (fd.get('confirmPassword') as string || '');
    const selectedCountry = country || (fd.get('country') as string || '');

    if (!name || !email || !password || !confirmPassword) {
      return setError('All required fields must be filled.');
    }
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (!agreed) return setError('You must agree to the terms.');
    if (!selectedCountry) return setError('Please select your country.');

    setLoading(true);

    try {
      // 1) Trigger Supabase email confirmation (client-side)
      //    The callback page should handle exchanging the code -> session.
      const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback`;
      const { error: signupError } = await supabase.auth.signUp(
        {
          email,
          password,
          // If your supabase client supports nested options (older examples),
          // the client may accept this shape. If not, you can pass redirect as second arg:
          // supabase.auth.signUp({ email, password }, { emailRedirectTo: redirectTo })
          options: {
            emailRedirectTo: redirectTo,
          },
        }
      );

      if (signupError) {
        // If signUp fails (e.g., email already exists) stop and show message.
        setError(signupError.message || 'Unable to send confirmation email.');
        setLoading(false);
        return;
      }

      // 2) Save profile metadata on your server (so your profiles table gets name/country)
      //    NOTE: server should *not* re-create the auth user if you already used client signUp.
      //    It should insert or upsert a profile record keyed by email (or user id if you prefer).
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            country: selectedCountry,
            // do not need to send password (server should not recreate the auth user)
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          // Non-blocking: the signup email was already sent. But surface server error.
          console.warn('Profile insert failed:', data);
          // show a friendly notice but don't hide the email instruction
          setNotice('Verification email sent — but saving your profile failed on the server.');
        } else {
          setNotice('Account created. Check your email for a verification link.');
        }
      } catch (serverErr) {
        console.warn('Profile POST failed', serverErr);
        setNotice('Verification email sent — but saving your profile failed (server error).');
      }

      // Redirect to a "check your email" page (same as original flow)
      router.push(`/check-email?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      console.error('Signup client error', err);
      setError(err?.message ?? 'Something went wrong; try again.');
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
          <input
            name="name"
            type="text"
            placeholder="Full Name"
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoComplete="name"
          />

          <input
            name="email"
            type="email"
            placeholder="Email Address"
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoComplete="email"
          />

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

          <input
            name="password"
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoComplete="new-password"
          />

          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoComplete="new-password"
          />

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
              I agree to Tradia’s{' '}
              <Link href="/terms" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Terms & Conditions
              </Link>{' '}
              and{' '}
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
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="text-center text-gray-500 dark:text-gray-400">OR</div>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
