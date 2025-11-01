// src/components/ai/TradiaAIChat.test.tsx
/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TradiaAIChat from './TradiaAIChat';
import { UserContext } from '@/context/UserContext';
import { TradeContext } from '@/context/TradeContext';

// Mock the UserContext and TradeContext for testing
const mockUserProvider = ({ children, user }: any) => (
  <UserContext.Provider value={{ user, setUser: jest.fn() }}>
    {children}
  </UserContext.Provider>
);

const mockTradeProvider = ({ children, trades = [], addTrade = jest.fn() }: any) => (
  <TradeContext.Provider value={{ trades, addTrade, removeTrade: jest.fn(), updateTrade: jest.fn() }}>
    {children}
  </TradeContext.Provider>
);

// Helper to render TradiaAIChat with specific user and trade contexts
const renderTradiaAIChat = (userProps: any, tradeProps?: any) => {
  return render(
    <mockUserProvider user={userProps}>
      <mockTradeProvider {...tradeProps}>
        <TradiaAIChat />
      </mockTradeProvider>
    </mockUserProvider>
  );
};

describe('TradiaAIChat Access Control', () => {
  // Mock console.error to prevent test logs from cluttering output
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('renders correctly for a Free user', () => {
    const user = { email: 'free@example.com', plan: 'free' };
    renderTradiaAIChat(user);

    expect(screen.getByText(/Welcome to Tradia Coach/i)).toBeInTheDocument();
    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Grok Mode/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Grok Mode/i })).toHaveTextContent(/Grok Mode/);
    expect(screen.getByRole('button', { name: /Grok Mode/i })).toHaveTextContent(/Lock/);
  });

  test('renders correctly for a Pro user', () => {
    const user = { email: 'pro@example.com', plan: 'pro' };
    renderTradiaAIChat(user);

    expect(screen.getByText(/Hey! I am Tradia Coach/i)).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Grok Mode/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Grok Mode/i })).toHaveTextContent(/Grok Mode/);
    expect(screen.queryByText(/Lock/)).not.toBeInTheDocument();
  });

  test('renders correctly for an Elite/Admin user (abdulmuizproject@gmail.com)', () => {
    const user = { email: 'abdulmuizproject@gmail.com', plan: 'free' }; // Plan should be overridden by email
    renderTradiaAIChat(user);

    expect(screen.getByText(/Welcome, Admin! Full Access Granted/i)).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Grok Mode/i })).not.toBeDisabled();
    expect(screen.queryByText(/Lock/)).not.toBeInTheDocument();
  });

  test('allows Pro user to switch to Grok mode', () => {
    const user = { email: 'pro@example.com', plan: 'pro' };
    renderTradiaAIChat(user);

    const grokButton = screen.getByRole('button', { name: /Grok Mode/i });
    fireEvent.click(grokButton);

    expect(grokButton).toHaveTextContent(/Grok Mode/);
    expect(screen.getByText(/Grok mode is live/i)).toBeInTheDocument();
  });

  test('shows upgrade prompt if Free user tries to switch to Grok mode', () => {
    const user = { email: 'free@example.com', plan: 'free' };
    renderTradiaAIChat(user);

    const grokButton = screen.getByRole('button', { name: /Grok Mode/i });
    fireEvent.click(grokButton);

    expect(screen.getByText(/Tradia Grok is a PRO feature. Upgrade to unlock real-time Grok summaries/i)).toBeInTheDocument();
  });

  test('allows adding a new trade via modal', async () => {
    const user = userEvent.setup();
    const testUser = { email: 'pro@example.com', plan: 'pro' };
    const addTradeMock = jest.fn();
    renderTradiaAIChat(testUser, { addTrade: addTradeMock });

    const uploadButton = screen.getByRole('button', { name: /Upload\/Add Trade History/i });
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Add New Trade/i })).toBeInTheDocument();
    });

    const symbolInput = screen.getByLabelText(/Symbol/i);
    const pnlInput = screen.getByLabelText(/P&L/i);
    const addButton = screen.getByRole('button', { name: /Add Trade/i });

    await user.type(symbolInput, 'TSLA');
    await user.type(pnlInput, '150.00');
    await user.click(addButton);

    expect(addTradeMock).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'TSLA',
      pnl: 150.00,
    }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Add New Trade/i })).not.toBeInTheDocument();
    });
  });

  test('sends message to AI backend', async () => {
    const user = { email: 'pro@example.com', plan: 'pro' };
    renderTradiaAIChat(user);

    // Mock the fetch API
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ response: 'Mock AI response' }),
      } as Response)
    );

    const textarea = screen.getByPlaceholderText(/Message Tradia AI.../i);
    fireEvent.change(textarea, { target: { value: 'Hello AI' } });
    fireEvent.click(screen.getByRole('button', { name: /Send/i }));

    expect(textarea).toHaveValue('');
    expect(screen.getByText(/Hello AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Tradia AI is thinking.../i)).toBeInTheDocument();

    await screen.findByText(/Mock AI response/i);
    expect(screen.queryByText(/Tradia AI is thinking.../i)).not.toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/ai/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Hello AI',
          trade_history: [], // Assuming no trades in mockTradeProvider
          mode: 'coach', // Default mode
        }),
      })
    );
  });
});
