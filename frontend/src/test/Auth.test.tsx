/**
 * Auth integration tests — frontend/src/test/Auth.test.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import * as api from '../services/api';

vi.mock('../services/api');

// ── Helpers ────────────────────────────────────────────────────────────────────
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

function setupAuthenticatedMocks() {
  vi.mocked(api.getStoredToken).mockReturnValue('valid-test-token');
  vi.mocked(api.getMeApi).mockResolvedValue({ authenticated: true, email: 'owner@test.com' });
  vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
  vi.mocked(api.getTransactions).mockResolvedValue([]);
  vi.mocked(api.getTransfers).mockResolvedValue([]);
  vi.mocked(api.getCategories).mockResolvedValue([]);
  vi.mocked(api.getGoals).mockResolvedValue([]);
  vi.mocked(api.registerSessionExpiryHandler).mockImplementation(() => { });
  vi.mocked(api.setAuthToken).mockImplementation(() => { });
  vi.mocked(api.clearAuthToken).mockImplementation(() => { });
}

function setupUnauthenticatedMocks() {
  vi.mocked(api.getStoredToken).mockReturnValue(null);
  vi.mocked(api.getMeApi).mockRejectedValue(new Error('Not authenticated'));
  vi.mocked(api.registerSessionExpiryHandler).mockImplementation(() => { });
  vi.mocked(api.setAuthToken).mockImplementation(() => { });
  vi.mocked(api.clearAuthToken).mockImplementation(() => { });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Auth: Login page renders when unauthenticated', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupUnauthenticatedMocks();
  });

  it('shows the login form when no stored token is found', async () => {
    render(<App />);

    // Auth state check is async — wait for the sign-in button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('does NOT render the main app navigation when unauthenticated', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /savings goals/i })).not.toBeInTheDocument();
  });
});

describe('Auth: Successful login navigates to app dashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupUnauthenticatedMocks();
  });

  it('shows the dashboard after successful login', async () => {
    vi.mocked(api.loginApi).mockResolvedValueOnce({ token: 'new-jwt-token', expiresIn: '7d' });
    // Boot skips getMeApi (no stored token), so only one mock needed: the post-login confirmation.
    vi.mocked(api.getMeApi).mockResolvedValueOnce({ authenticated: true, email: 'owner@test.com' });

    vi.mocked(api.getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(api.getTransactions).mockResolvedValue([]);
    vi.mocked(api.getTransfers).mockResolvedValue([]);
    vi.mocked(api.getCategories).mockResolvedValue([]);
    vi.mocked(api.getGoals).mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'owner@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'SecureP@ss123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Cash Overview')).toBeInTheDocument();
    });
  });
});

describe('Auth: Incorrect credentials show error', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupUnauthenticatedMocks();
  });

  it('displays an error message for wrong credentials', async () => {
    vi.mocked(api.loginApi).mockRejectedValueOnce(new Error('Invalid credentials'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'wrong@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });

    // Still on login page
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});

describe('Auth: Logout returns to login page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupAuthenticatedMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('shows the login form after logout', async () => {
    vi.mocked(api.logoutApi).mockResolvedValue(undefined);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Cash Overview')).toBeInTheDocument();
    });

    const logoutBtn = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });
});

describe('Auth: Session restoration after page reload', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows the dashboard when a valid stored token is found on boot', async () => {
    setupAuthenticatedMocks();

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Cash Overview')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
  });

  it('shows the login page when stored token is expired (getMeApi throws)', async () => {
    vi.mocked(api.getStoredToken).mockReturnValue('expired-token');
    vi.mocked(api.getMeApi).mockRejectedValue(new Error('Not authenticated'));
    vi.mocked(api.registerSessionExpiryHandler).mockImplementation(() => { });
    vi.mocked(api.clearAuthToken).mockImplementation(() => { });
    vi.mocked(api.setAuthToken).mockImplementation(() => { });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });
});

describe('Auth: Client-side form validation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupUnauthenticatedMocks();
  });

  it('shows validation errors when form is submitted empty', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });
});
