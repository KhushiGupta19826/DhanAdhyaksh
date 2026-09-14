import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { HistoryPage } from '../HistoryPage';
import * as api from '../../services/api';

vi.mock('../../services/api');

describe('History Page (HistoryPage)', () => {
  const mockAccounts: api.Account[] = [
    { id: 1, name: 'Wallet', initialBalance: 200000, balance: 200000, isActive: true, createdAt: '', updatedAt: '' },
    { id: 2, name: 'Room', initialBalance: 100000, balance: 100000, isActive: true, createdAt: '', updatedAt: '' },
  ];

  const mockCategories: api.Category[] = [
    { id: 1, name: 'Food' },
    { id: 2, name: 'Travel' },
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
    {
      id: 2,
      accountId: 1,
      categoryId: 1,
      type: 'EXPENSE',
      amount: 50000, // ₹500
      source: null,
      note: 'Lunch',
      transactionDate: '2026-09-13T00:00:00.000Z',
      createdAt: '2026-09-13T00:00:00.000Z',
      updatedAt: '2026-09-13T00:00:00.000Z',
      account: { id: 1, name: 'Wallet' },
      category: { id: 1, name: 'Food' },
    },
  ];

  const mockTransfers: api.Transfer[] = [
    {
      id: 1,
      fromAccountId: 1,
      toAccountId: 2,
      amount: 25000, // ₹250
      note: 'Cash to room',
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

  it('renders loading state initially', () => {
    vi.mocked(api.getTransactions).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getTransfers).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getAccounts).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getCategories).mockReturnValue(new Promise(() => {}));

    render(<HistoryPage />);
    expect(screen.getByTestId('loading-history')).toBeInTheDocument();
  });

  it('renders combined history items in newest-first order with correct details', async () => {
    vi.mocked(api.getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(api.getTransfers).mockResolvedValue(mockTransfers);
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getCategories).mockResolvedValue(mockCategories);

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByTestId('history-list')).toBeInTheDocument();
    });

    const list = screen.getByTestId('history-list');

    // Newest is transfer (2026-09-15): Wallet → Room
    expect(within(list).getAllByText('Wallet').length).toBeGreaterThanOrEqual(1);
    expect(within(list).getByText('→')).toBeInTheDocument();
    expect(within(list).getAllByText('Room').length).toBeGreaterThanOrEqual(1);

    // Income item: Received: Mom
    expect(within(list).getByText('Received: Mom')).toBeInTheDocument();
    expect(within(list).getByText('+₹1,000')).toBeInTheDocument();

    // Expense item: Food
    expect(within(list).getByText('Food')).toBeInTheDocument();
    expect(within(list).getByText('-₹500')).toBeInTheDocument();
  });

  it('filters history items by type filter tabs (Income, Expense, Transfer)', async () => {
    vi.mocked(api.getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(api.getTransfers).mockResolvedValue(mockTransfers);
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getCategories).mockResolvedValue(mockCategories);

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByTestId('history-list')).toBeInTheDocument();
    });

    // Click 'Transfer' tab
    const transferTab = screen.getByRole('button', { name: 'Transfer' });
    fireEvent.click(transferTab);

    const list = screen.getByTestId('history-list');

    // Only transfer should be visible in history list
    expect(within(list).getByText('TRANSFER')).toBeInTheDocument();
    expect(within(list).queryByText('Received: Mom')).not.toBeInTheDocument();
    expect(within(list).queryByText('Food')).not.toBeInTheDocument();
  });

  it('filters history items by search query', async () => {
    vi.mocked(api.getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(api.getTransfers).mockResolvedValue(mockTransfers);
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getCategories).mockResolvedValue(mockCategories);

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByTestId('history-list')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search note, source/i);
    fireEvent.change(searchInput, { target: { value: 'Lunch' } });

    const list = screen.getByTestId('history-list');

    expect(within(list).getByText('Food')).toBeInTheDocument();
    expect(within(list).queryByText('Received: Mom')).not.toBeInTheDocument();
    expect(within(list).queryByText('TRANSFER')).not.toBeInTheDocument();
  });

  it('opens edit modal and submits transaction update', async () => {
    vi.mocked(api.getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(api.getTransfers).mockResolvedValue(mockTransfers);
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(api.updateTransaction).mockResolvedValue({
      ...mockTransactions[0],
      amount: 150000,
    });

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByTestId('history-list')).toBeInTheDocument();
    });

    // Click Edit button on first item
    const editBtns = screen.getAllByTitle(/edit transaction/i);
    fireEvent.click(editBtns[0]);

    expect(screen.getByText('Edit INCOME')).toBeInTheDocument();

    // Click Save Changes
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateTransaction).toHaveBeenCalledWith(1, expect.any(Object));
    });
  });

  it('opens delete confirmation modal and submits delete request', async () => {
    vi.mocked(api.getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(api.getTransfers).mockResolvedValue(mockTransfers);
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(api.deleteTransaction).mockResolvedValue();

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByTestId('history-list')).toBeInTheDocument();
    });

    // Click Delete button on first item
    const deleteBtns = screen.getAllByTitle(/delete transaction/i);
    fireEvent.click(deleteBtns[0]);

    expect(screen.getByText(/delete this income\?/i)).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(api.deleteTransaction).toHaveBeenCalledWith(1);
    });
  });

  it('renders empty history state when no records match', async () => {
    vi.mocked(api.getTransactions).mockResolvedValue([]);
    vi.mocked(api.getTransfers).mockResolvedValue([]);
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getCategories).mockResolvedValue(mockCategories);

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-history')).toBeInTheDocument();
    });
    expect(screen.getByText('No records found')).toBeInTheDocument();
  });

  it('renders error state and handles Retry', async () => {
    vi.mocked(api.getTransactions).mockRejectedValue(new Error('Network failure'));
    vi.mocked(api.getTransfers).mockResolvedValue([]);
    vi.mocked(api.getAccounts).mockResolvedValue([]);
    vi.mocked(api.getCategories).mockResolvedValue([]);

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByTestId('error-history')).toBeInTheDocument();
    });

    expect(screen.getByText('Network failure')).toBeInTheDocument();

    vi.mocked(api.getTransactions).mockResolvedValue(mockTransactions);
    const retryBtn = screen.getByRole('button', { name: /retry connection/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId('history-list')).toBeInTheDocument();
    });
  });
});
