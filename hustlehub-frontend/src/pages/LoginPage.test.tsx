// OWNER: Lesedi — REMOVE BEFORE COMMIT
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { AuthProvider } from '../context/AuthContext';
import { authApi } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return {
    ...actual,
    authApi: {
      login: vi.fn(),
      register: vi.fn(),
      getMe: vi.fn(),
    },
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('calls login API with the correct email and password on form submit', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      token: 'fake-jwt-token',
      user: {
        id: 'user-1',
        email: 'freelancer@test.com',
        role: 'freelancer',
      },
    });

    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'freelancer@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledTimes(1);
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'freelancer@test.com',
        password: 'password123',
      });
    });
  });
});
