import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import * as api from '../services/api';

vi.mock('../services/api');

describe('Application Root & Navigation (App)', () => {
  const mockAccounts: api.Account[] = [
    {
      id: 1,
      name: 'Wallet',
      initialBalance: 200000,
      balance: 200000,
      isActive: true,
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getTransactions).mockResolvedValue([]);
    vi.mocked(api.getTransfers).mockResolvedValue([]);
    vi.mocked(api.getCategories).mockResolvedValue([]);
    vi.mocked(api.getGoals).mockResolvedValue([]);
  });

  it('renders Header and default Home dashboard', async () => {
    render(<App />);

    expect(screen.getByText('DhanAdhyaksh')).toBeInTheDocument();
    expect(screen.getByText('Physical Cash Tracker')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Cash Overview')).toBeInTheDocument();
    });
  });

  it('switches between Home, History, and Goals via Bottom Navigation', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Cash Overview')).toBeInTheDocument();
    });

    // Navigate to History
    const historyTab = screen.getByRole('button', { name: /history/i });
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText('Financial History')).toBeInTheDocument();
    });

    // Navigate to Goals
    const goalsTab = screen.getByRole('button', { name: /savings goals/i });
    fireEvent.click(goalsTab);

    await waitFor(() => {
      expect(screen.getByText('Savings Goals')).toBeInTheDocument();
    });

    // Navigate back to Home
    const homeTab = screen.getByRole('button', { name: /home dashboard/i });
    fireEvent.click(homeTab);

    await waitFor(() => {
      expect(screen.getByText('Cash Overview')).toBeInTheDocument();
    });
  });
});
