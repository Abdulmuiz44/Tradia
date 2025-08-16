export default function VerificationFailedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 px-4">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full text-center">
        <h2 className="text-3xl font-bold text-red-600 mb-4">
          ❌ Verification Failed
        </h2>
        <p className="text-gray-700 mb-6">
          The verification link is invalid or has expired. Please sign up again to get a new verification email.
        </p>
        <a
          href="/signup"
          className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg shadow hover:bg-red-700 transition"
        >
          Go to Signup
        </a>
      </div>
    </div>
  );
}
