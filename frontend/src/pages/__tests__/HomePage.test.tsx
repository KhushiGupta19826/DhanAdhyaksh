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

  const mockCategories: api.Category[] = [
    { id: 1, name: 'Food' },
    { id: 2, name: 'Travel' },
  ];

  const mockGoals: api.Goal[] = [
    {
      id: 1,
      name: 'Trip',
      targetAmount: 500000, // ₹5,000
      targetDate: null,
      isCompleted: false,
      allocatedAmount: 50000, // ₹500
      remainingAmount: 450000,
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
      allocations: [
        {
          id: 1,
          goalId: 1,
          accountId: 1,
          amount: 50000,
          createdAt: '2026-09-14T00:00:00.000Z',
        },
      ],
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
    vi.mocked(api.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(api.getGoals).mockResolvedValue(mockGoals);
  });

  it('renders loading state initially', async () => {
    vi.mocked(api.getAccounts).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getTransactions).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getTransfers).mockReturnValue(new Promise(() => {}));

    render(<HomePage />);
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
  });

  it('renders Total Cash, Available Cash, and Reserved Cash truthfully', async () => {
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(api.getTransfers).mockResolvedValue(mockTransfers);
    vi.mocked(api.getGoals).mockResolvedValue(mockGoals);

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Cash Overview')).toBeInTheDocument();
    });

    // Total cash = ₹2,000 + ₹1,000 = ₹3,000
    expect(screen.getByText('₹3,000')).toBeInTheDocument();
    // Reserved = ₹500 (also appears in transfer activity)
    expect(screen.getAllByText('₹500').length).toBeGreaterThanOrEqual(1);
    // Available = ₹3,000 - ₹500 = ₹2,500
    expect(screen.getByText('₹2,500')).toBeInTheDocument();

    expect(screen.getAllByText('Wallet').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Room').length).toBeGreaterThanOrEqual(1);
  });

  it('opens Receive Modal and creates income successfully', async () => {
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(api.getTransfers).mockResolvedValue(mockTransfers);
    vi.mocked(api.createTransaction).mockResolvedValue({
      id: 2,
      accountId: 1,
      categoryId: null,
      type: 'INCOME',
      amount: 150000,
      source: 'Salary',
      note: 'Monthly salary',
      transactionDate: '2026-09-14',
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('+ Receive')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Receive'));

    expect(screen.getByTestId('quick-action-modal')).toBeInTheDocument();
    expect(screen.getByText('Receive Money')).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1500' } });
    fireEvent.change(screen.getByPlaceholderText(/salary/i), { target: { value: 'Salary' } });
    fireEvent.change(screen.getByPlaceholderText('Optional details'), { target: { value: 'Monthly salary' } });

    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(api.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          type: 'INCOME',
          amount: 150000,
          source: 'Salary',
          note: 'Monthly salary',
        })
      );
    });
  });

  it('opens Spend Modal and creates expense successfully', async () => {
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(api.getTransfers).mockResolvedValue(mockTransfers);
    vi.mocked(api.createTransaction).mockResolvedValue({
      id: 3,
      accountId: 1,
      categoryId: 1,
      type: 'EXPENSE',
      amount: 25000,
      source: null,
      note: 'Lunch',
      transactionDate: '2026-09-14',
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('− Spend')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('− Spend'));

    expect(screen.getByTestId('quick-action-modal')).toBeInTheDocument();
    expect(screen.getByText('Record Expense')).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '250' } });
    const selects = screen.getAllByRole('combobox');
    // selects[0] is Account, selects[1] is Category
    fireEvent.change(selects[1], { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(api.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          type: 'EXPENSE',
          amount: 25000,
        })
      );
    });
  });

  it('opens Transfer Modal and submits transfer successfully', async () => {
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(api.getTransfers).mockResolvedValue(mockTransfers);
    vi.mocked(api.createTransfer).mockResolvedValue({
      id: 2,
      fromAccountId: 1,
      toAccountId: 2,
      amount: 30000,
      note: 'Deposit to room',
      transferDate: '2026-09-14',
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('↔ Transfer')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('↔ Transfer'));

    expect(screen.getByTestId('quick-action-modal')).toBeInTheDocument();
    expect(screen.getByText('Transfer Cash')).toBeInTheDocument();

    // Fill amount
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '300' } });

    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(api.createTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          fromAccountId: 1,
          toAccountId: 2,
          amount: 30000,
        })
      );
    });
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

  it('opens Add Account Modal and creates account successfully', async () => {
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(api.getTransfers).mockResolvedValue(mockTransfers);
    vi.mocked(api.createAccount).mockResolvedValue({
      id: 3,
      name: 'Almirah',
      initialBalance: 500000,
      balance: 500000,
      isActive: true,
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('+ Add Account')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Add Account'));

    expect(screen.getByTestId('quick-action-modal')).toBeInTheDocument();
    expect(screen.getByText('Add Account')).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('e.g. Almirah, Bag, Room'), { target: { value: 'Almirah' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '5000' } });

    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(api.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Almirah',
          initialBalance: 500000,
        })
      );
    });
  });

  it('performs background refresh without unmounting dashboard', async () => {
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(api.getTransfers).mockResolvedValue(mockTransfers);
    
    // Create an alert spy for the background refresh error test
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Cash Overview')).toBeInTheDocument();
    });

    // Dashboard is mounted, skeleton is NOT visible
    expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();

    // Setup network error for the background refresh
    vi.mocked(api.getAccounts).mockRejectedValueOnce(new Error('Background fetch failed'));

    // Trigger background refresh
    const refreshBtn = screen.getByRole('button', { name: /refresh dashboard/i });
    fireEvent.click(refreshBtn);

    // Skeleton should still NOT be visible (non-destructive refresh)
    expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    
    // Existing data should still be visible
    expect(screen.getByText('Cash Overview')).toBeInTheDocument();

    // Verify error was handled via alert (as per Component 3 implementation)
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Background fetch failed'));
    });

    alertSpy.mockRestore();
  });
});
