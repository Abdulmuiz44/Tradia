import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PricingCard } from '../PricingCard';
import { PLAN_LIMITS } from '@/lib/planAccess';

describe('PricingCard', () => {
  const mockOnSelectPlan = jest.fn();

  beforeEach(() => {
    mockOnSelectPlan.mockClear();
  });

  it('renders free plan correctly', () => {
    render(
      <PricingCard
        plan="free"
        onSelectPlan={mockOnSelectPlan}
      />
    );

    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('forever')).toBeInTheDocument();
    expect(screen.getByText('5 AI chats per day')).toBeInTheDocument();
  });

  it('renders pro plan with popular badge', () => {
    render(
      <PricingCard
        plan="pro"
        isPopular={true}
        onSelectPlan={mockOnSelectPlan}
      />
    );

    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('$29')).toBeInTheDocument();
    expect(screen.getByText('50 AI chats per day')).toBeInTheDocument();
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('shows current plan status', () => {
    render(
      <PricingCard
        plan="pro"
        isCurrentPlan={true}
        onSelectPlan={mockOnSelectPlan}
      />
    );

    expect(screen.getByText('Current Plan')).toBeInTheDocument();
    expect(screen.getByText('Current Plan')).toBeDisabled();
  });

  it('calls onSelectPlan when button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <PricingCard
        plan="pro"
        onSelectPlan={mockOnSelectPlan}
      />
    );

    const button = screen.getByText('Choose Pro');
    await user.click(button);

    expect(mockOnSelectPlan).toHaveBeenCalledWith('pro');
  });

  it('displays correct features for each plan', () => {
    render(
      <PricingCard
        plan="plus"
        onSelectPlan={mockOnSelectPlan}
      />
    );

    expect(screen.getByText('200 AI chats per day')).toBeInTheDocument();
    expect(screen.getByText('1 year trade storage')).toBeInTheDocument();
    expect(screen.getByText('Priority support')).toBeInTheDocument();
  });

  it('renders elite plan with unlimited features', () => {
    render(
      <PricingCard
        plan="elite"
        onSelectPlan={mockOnSelectPlan}
      />
    );

    expect(screen.getByText('Elite')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Unlimited AI chats')).toBeInTheDocument();
    expect(screen.getByText('Unlimited trade storage')).toBeInTheDocument();
  });
});
