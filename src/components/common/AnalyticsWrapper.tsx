import React from 'react';
import { Analytics } from '@vercel/analytics/react';

interface AnalyticsWrapperProps {
  children: React.ReactNode;
}

export const AnalyticsWrapper: React.FC<AnalyticsWrapperProps> = ({ children }) => {
  return (
    <>
      {children}
      <Analytics />
    </>
  );
};
