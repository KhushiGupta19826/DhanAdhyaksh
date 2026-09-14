import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoalsPage } from '../GoalsPage';
import * as api from '../../services/api';

vi.mock('../../services/api');

describe('Goals Page (GoalsPage)', () => {
  const mockAccounts: api.Account[] = [
    {
      id: 1,
      name: 'Wallet',
      initialBalance: 500000,
      balance: 500000, // ₹5,000
      isActive: true,
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
    },
    {
      id: 2,
      name: 'Room',
      initialBalance: 200000,
      balance: 200000, // ₹2,000
      isActive: true,
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
    },
  ];

  const mockGoals: api.Goal[] = [
    {
      id: 1,
      name: 'Goa Trip',
      targetAmount: 1000000, // ₹10,000
      targetDate: '2026-12-25T00:00:00.000Z',
      isCompleted: false,
      allocatedAmount: 400000, // ₹4,000
      remainingAmount: 600000, // ₹6,000
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
      allocations: [
        {
          id: 1,
          goalId: 1,
          accountId: 1,
          amount: 400000,
          createdAt: '2026-09-14T00:00:00.000Z',
          account: { id: 1, name: 'Wallet' },
        },
      ],
    },
    {
      id: 2,
      name: 'Headphones',
      targetAmount: 300000, // ₹3,000
      targetDate: null,
      isCompleted: true,
      allocatedAmount: 300000, // ₹3,000
      remainingAmount: 0,
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
      allocations: [
        {
          id: 2,
          goalId: 2,
          accountId: 1,
          amount: 300000,
          createdAt: '2026-09-14T00:00:00.000Z',
          account: { id: 1, name: 'Wallet' },
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getGoals).mockResolvedValue(mockGoals);
  });

  it('renders loading state initially', async () => {
    vi.mocked(api.getGoals).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getAccounts).mockReturnValue(new Promise(() => {}));

    render(<GoalsPage />);
    expect(screen.getByTestId('loading-goals')).toBeInTheDocument();
  });

  it('renders goals list and summary card with correct financial totals', async () => {
    render(<GoalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Savings Goals')).toBeInTheDocument();
    });

    // Total reserved = ₹4,000 + ₹3,000 = ₹7,000
    expect(screen.getByText('₹7,000')).toBeInTheDocument();
    // 1/2 Completed
    expect(screen.getByText('1/2 Completed')).toBeInTheDocument();

    // Goa Trip card
    expect(screen.getByText('Goa Trip')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('₹6,000 remaining')).toBeInTheDocument();

    // Headphones completed card
    expect(screen.getByText('Headphones')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('opens Create Goal modal and creates a new goal', async () => {
    vi.mocked(api.createGoal).mockResolvedValue({
      id: 3,
      name: 'New Laptop',
      targetAmount: 6000000,
      targetDate: null,
      isCompleted: false,
      allocatedAmount: 0,
      remainingAmount: 6000000,
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
      allocations: [],
    });

    render(<GoalsPage />);

    await waitFor(() => {
      expect(screen.getByText('New Goal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Goal'));

    expect(screen.getByText('Create Savings Goal')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/goa trip/i), {
      target: { value: 'New Laptop' },
    });
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '60000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create goal/i }));

    await waitFor(() => {
      expect(api.createGoal).toHaveBeenCalledWith({
        name: 'New Laptop',
        targetAmount: 6000000,
        targetDate: null,
      });
    });
  });

  it('opens Allocate Money modal and reserves cash for goal', async () => {
    vi.mocked(api.allocateGoal).mockResolvedValue({
      ...mockGoals[0],
      allocatedAmount: 500000,
      remainingAmount: 500000,
    });

    render(<GoalsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Allocate Money').length).toBeGreaterThanOrEqual(1);
    });

    const allocateButtons = screen.getAllByText('Allocate Money');
    fireEvent.click(allocateButtons[0]);

    expect(screen.getByText('Allocate Cash')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '1000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /reserve cash/i }));

    await waitFor(() => {
      expect(api.allocateGoal).toHaveBeenCalledWith(1, {
        accountId: 1,
        amount: 100000,
      });
    });
  });

  it('opens Delete Goal confirmation modal and confirms deletion', async () => {
    vi.mocked(api.deleteGoal).mockResolvedValue();

    render(<GoalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Goa Trip')).toBeInTheDocument();
    });

    const deleteBtn = screen.getAllByTitle('Delete Goal')[0];
    fireEvent.click(deleteBtn);

    expect(screen.getByText('Delete "Goa Trip"?')).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(api.deleteGoal).toHaveBeenCalledWith(1);
    });
  });

  it('renders empty state when no goals exist', async () => {
    vi.mocked(api.getGoals).mockResolvedValue([]);

    render(<GoalsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-goals')).toBeInTheDocument();
    });

    expect(screen.getByText('No savings goals yet')).toBeInTheDocument();
  });

  it('renders error state and handles Retry', async () => {
    vi.mocked(api.getGoals).mockRejectedValue(new Error('Failed to fetch'));

    render(<GoalsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('error-goals')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();

    vi.mocked(api.getGoals).mockResolvedValue(mockGoals);

    const retryBtn = screen.getByRole('button', { name: /retry connection/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Goa Trip')).toBeInTheDocument();
    });
  });
});
