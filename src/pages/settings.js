// src/pages/settings.js
import React, { useContext } from 'react';
import { UserContext } from '../lib/UserContext';
export default function Settings() {
  const { user, setPlan } = useContext(UserContext);
  return (
    <div>
      <h1>Manage Plan / Billing Info</h1>
      <p>Current Plan: {user.plan} ({user.interval})</p>
      {/* show change-plan buttons similar to payment page */}
    </div>
  );
}
