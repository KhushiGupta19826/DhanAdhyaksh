import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HomePage } from '../HomePage';
import * as api from '../../services/api';

vi.mock('../../services/api');

describe('Dashboard Page (HomePage)', () => {
  const mockAccounts: api.Account[] = [
    {
      id: 1,
      name: 'Wallet',
      initialBalance: 200000,
      balance: 200000, // ₹2,000
      isActive: true,
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
    },
    {
      id: 2,
      name: 'Room',
      initialBalance: 100000,
      balance: 100000, // ₹1,000
      isActive: true,
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
    },
  ];

  const mockTransactions: api.Transaction[] = [
    {
      id: 1,
      accountId: 1,
      categoryId: null,
      type: 'INCOME',
      amount: 100000, // ₹1,000
      source: 'Mom',
      note: 'Allowance',
      transactionDate: '2026-09-14T00:00:00.000Z',
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
      account: { id: 1, name: 'Wallet' },
    },
  ];

  const mockTransfers: api.Transfer[] = [
    {
      id: 1,
      fromAccountId: 1,
      toAccountId: 2,
      amount: 50000, // ₹500
      note: 'Move cash',
      transferDate: '2026-09-15T00:00:00.000Z',
      createdAt: '2026-09-15T00:00:00.000Z',
      updatedAt: '2026-09-15T00:00:00.000Z',
      fromAccount: { id: 1, name: 'Wallet' },
      toAccount: { id: 2, name: 'Room' },
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', async () => {
    vi.mocked(api.getAccounts).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getTransactions).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getTransfers).mockReturnValue(new Promise(() => {}));

    render(<HomePage />);
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
  });

  it('renders Total Cash calculated from account balances (₹3,000)', async () => {
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(api.getTransfers).mockResolvedValue(mockTransfers);

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Cash Overview')).toBeInTheDocument();
    });

    // Total cash = ₹2,000 + ₹1,000 = ₹3,000 (appears in Total Cash & Available Cash)
    const formattedSums = screen.getAllByText('₹3,000');
    expect(formattedSums.length).toBeGreaterThanOrEqual(1);

    expect(screen.getAllByText('Wallet').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Room').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('₹2,000')).toBeInTheDocument();
    expect(screen.getByText('₹1,000')).toBeInTheDocument();
  });

  it('renders quick action buttons (+ Receive, − Spend, ↔ Transfer)', async () => {
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(api.getTransfers).mockResolvedValue(mockTransfers);

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('+ Receive')).toBeInTheDocument();
      expect(screen.getByText('− Spend')).toBeInTheDocument();
      expect(screen.getByText('↔ Transfer')).toBeInTheDocument();
    });
  });

  it('renders recent activity combining transactions and transfers (Wallet → Room)', async () => {
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(api.getTransfers).mockResolvedValue(mockTransfers);

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    // Transfer item Wallet → Room
    expect(screen.getByText('→')).toBeInTheDocument();
    expect(screen.getByText('TRANSFER')).toBeInTheDocument();

    // Income item From: Mom
    expect(screen.getByText('From: Mom')).toBeInTheDocument();
    expect(screen.getByText('INCOME')).toBeInTheDocument();
  });

  it('renders API error state and handles Retry', async () => {
    vi.mocked(api.getAccounts).mockRejectedValue(new Error('Network error'));
    vi.mocked(api.getTransactions).mockResolvedValue([]);
    vi.mocked(api.getTransfers).mockResolvedValue([]);

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error')).toBeInTheDocument();

    // Setup success mock for retry
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getTransactions).mockResolvedValue([]);
    vi.mocked(api.getTransfers).mockResolvedValue([]);

    const retryBtn = screen.getByRole('button', { name: /retry connection/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getAllByText('₹3,000').length).toBeGreaterThanOrEqual(1);
    });
  });
});
