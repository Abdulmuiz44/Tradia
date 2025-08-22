'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('Verifying...');

  useEffect(() => {
    if (!token) {
      setStatus('Invalid verification link.');
      return;
    }

    // Call API to verify token
    fetch(`/api/auth/verify-email?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Redirect to success page
          router.push('/verify-email/success');
        } else {
          setStatus(data.error || 'Verification failed.');
        }
      })
      .catch(() => setStatus('Verification failed.'));
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>{status}</p>
    </div>
  );
}
