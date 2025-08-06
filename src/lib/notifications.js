import { useState } from 'react';

export function useNotifications() {
  const [message, setMessage] = useState(null);
  const show = (msg) => setMessage(msg);
  const clear = () => setMessage(null);
  return { message, show, clear };
}
