export default function VerificationFailedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="bg-white shadow-md rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Verification Failed</h2>
        <p className="text-gray-600 mb-6">Invalid or expired token. Please try signing up again.</p>
        <a href="/signup" className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
          Go to Signup
        </a>
      </div>
    </div>
  );
}
