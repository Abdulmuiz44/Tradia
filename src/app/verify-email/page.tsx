export default function VerifyEmailPage() {
  return (
    <div className="flex items-center justify-center h-screen px-4">
      <div className="max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow">
        <h2 className="text-2xl font-bold text-center">📧 Verify Your Email</h2>
        <p className="mt-4 text-center text-sm text-gray-700 dark:text-gray-300">
          We’ve sent a confirmation link to your email address.
          Please check your inbox before accessing your dashboard.
        </p>
      </div>
    </div>
  );
}
