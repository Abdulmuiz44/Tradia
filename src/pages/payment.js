import { useContext } from 'react';
import { UserContext } from '../lib/userContext';
import { initPaystack } from '../lib/paystack';
import { initStripeCheckout } from '../lib/stripe';

const plans = {
  plus: { monthly: 9000, yearly: 90000, usd: 9, usdYearly: 90 },
  premium: { monthly: 19000, yearly: 190000, usd: 19, usdYearly: 190 },
  pro: { monthly: 39000, yearly: 390000, usd: 39, usdYearly: 390 }
};

export default function Payment() {
  const context = useContext(UserContext);

  // Defensive fix for destructuring error
  if (!context) {
    return <div className="p-4 text-red-500">Error: UserContext not available. Ensure <code>&lt;UserProvider&gt;</code> wraps your app.</div>;
  }

  const { setPlan } = context;

  const handlePayment = async (plan, interval, provider) => {
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(now.getMonth() + (interval === 'monthly' ? 1 : 12));
    setPlan({ plan, interval, provider, status: 'active', expiresAt });

    if (provider === 'paystack') {
      await initPaystack(plan, interval);
    } else {
      await initStripeCheckout(plan, interval);
    }
  };

  return (
    <div className="payment-page p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">Choose a Plan</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(plans).map(([plan, data]) => (
          <div key={plan} className="border rounded-lg p-4 shadow hover:shadow-lg transition">
            <h3 className="text-xl font-bold capitalize mb-2">{plan}</h3>
            <div className="flex flex-col gap-2">
              <button
                className="bg-green-600 text-white py-2 rounded"
                onClick={() => handlePayment(plan, 'monthly', 'paystack')}
              >
                ₦{data.monthly}/mo (Paystack)
              </button>
              <button
                className="bg-green-700 text-white py-2 rounded"
                onClick={() => handlePayment(plan, 'yearly', 'paystack')}
              >
                ₦{data.yearly}/yr (Paystack)
              </button>
              <button
                className="bg-blue-600 text-white py-2 rounded"
                onClick={() => handlePayment(plan, 'monthly', 'stripe')}
              >
                ${data.usd}/mo (Stripe)
              </button>
              <button
                className="bg-blue-700 text-white py-2 rounded"
                onClick={() => handlePayment(plan, 'yearly', 'stripe')}
              >
                ${data.usdYearly}/yr (Stripe)
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
