// app/verify-email/success/page.tsx
export default function VerifySuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-8 bg-white rounded">
        <h1 className="text-2xl font-bold">Email Verified</h1>
        <p className="mt-2">Thanks — your email has been verified. You can now <a href="/login" className="text-indigo-600">Log In</a>.</p>
      </div>
    </div>
  );
}
