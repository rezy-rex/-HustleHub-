import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from './Navbar';
import { AuthProvider } from '../context/AuthContext';
import { authApi } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return { ...actual, authApi: { login: vi.fn(), register: vi.fn(), getMe: vi.fn(), logout: vi.fn() } };
});

describe('Navbar logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('role', 'freelancer');
    localStorage.setItem('user', JSON.stringify({ id: '1', email: 'freelancer@test.com', role: 'freelancer' }));
    vi.mocked(authApi.getMe).mockResolvedValue({ user: { id: '1', email: 'freelancer@test.com', role: 'freelancer' } });
  });

  it('calls logout and clears the token even when the API rejects', async () => {
    vi.mocked(authApi.logout).mockRejectedValueOnce(new Error('server unavailable'));
    render(<AuthProvider><MemoryRouter><Navbar /></MemoryRouter></AuthProvider>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => {
      expect(authApi.logout).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('token')).toBeNull();
    });
  });
});
