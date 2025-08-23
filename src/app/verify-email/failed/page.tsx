// app/verify-email/failed/page.tsx
export default function VerifyFailed() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-8 bg-white rounded">
        <h1 className="text-2xl font-bold text-red-600">Verification Failed</h1>
        <p className="mt-2">The verification link is invalid or expired. Try signing up again or contact support.</p>
      </div>
    </div>
  );
}
