// src/lib/paystack.js
import axios from 'axios';
export async function initPaystack(plan, interval) {
  const resp = await axios.post('/api/paystack-init', { plan, interval });
  const { authorization_url } = resp.data;
  window.location = authorization_url;
}
