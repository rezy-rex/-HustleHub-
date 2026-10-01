// OWNER: Lesedi — REMOVE BEFORE COMMIT
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GigsPage } from './GigsPage';
import { gigsApi, Gig } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return {
    ...actual,
    gigsApi: {
      list: vi.fn(),
    },
  };
});

describe('GigsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the expected number of gig cards with correct titles from mocked API', async () => {
    const mockGigs: Gig[] = [
      {
        id: 'gig-1',
        freelancerId: 'free-1',
        title: 'Full Stack React Application',
        description: 'Building custom React and Node apps',
        price: 350,
        category: 'Software Development',
        coverImage: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
        freelancerName: 'Sixolile',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'gig-2',
        freelancerId: 'free-2',
        title: 'Modern Brand Identity & Logo',
        description: 'Vector logo design for startups',
        price: 150,
        category: 'Graphic Design',
        coverImage: 'https://images.unsplash.com/photo-1626785774573-4b799315345d',
        freelancerName: 'Lesedi',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    vi.mocked(gigsApi.list).mockResolvedValueOnce({ gigs: mockGigs });

    render(
      <BrowserRouter>
        <GigsPage />
      </BrowserRouter>
    );

    // Verify loading state is initially displayed
    expect(screen.getByText(/loading gigs.../i)).toBeInTheDocument();

    // Verify both titles are rendered after API resolves
    await waitFor(() => {
      expect(screen.getByText('Full Stack React Application')).toBeInTheDocument();
      expect(screen.getByText('Modern Brand Identity & Logo')).toBeInTheDocument();
    });

    // Check count of gig cards rendered
    expect(screen.getByTestId('gig-card-gig-1')).toBeInTheDocument();
    expect(screen.getByTestId('gig-card-gig-2')).toBeInTheDocument();
    expect(screen.getByText('R 350')).toBeInTheDocument();
    expect(screen.getByText('R 150')).toBeInTheDocument();
  });
});
