// OWNER: Lesedi — REMOVE BEFORE COMMIT

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'client' | 'freelancer' | 'admin';
  createdAt?: string;
}

export interface Gig {
  id: string;
  freelancerId: string;
  freelancerName?: string;
  category?: string;
  coverImage?: string;
  title: string;
  description: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export const GIG_CATEGORIES = [
  'All',
  'Graphic Design',
  'Copywriting',
  'Accounting',
  'Software Development',
] as const;

export const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  'Graphic Design': 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=800&q=80',
  'Copywriting': 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80',
  'Accounting': 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
  'Software Development': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
  'Other': 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80',
};

export interface Booking {
  id: string;
  gigId: string;
  gigSnapshot: {
    title: string;
    price: number;
  };
  clientId: string;
  clientName?: string;
  freelancerId: string;
  freelancerName?: string;
  status: 'confirmed';
  createdAt: string;
}

export interface Transaction {
  id: string;
  bookingId: string;
  clientId: string;
  freelancerId: string;
  amount: number;
  createdAt: string;
}

export interface MyTransactionsResponse {
  transactions: Transaction[];
  totalIncome: number;
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code: string = 'API_ERROR', status: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
  const isAuthEndpoint = endpoint.includes('/users/login') || endpoint.includes('/users/register');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!isAuthEndpoint) {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkErr: unknown) {
    const message = networkErr instanceof Error ? networkErr.message : 'Network request failed';
    throw new ApiError(message, 'NETWORK_ERROR', 0);
  }

  let json: ApiResponse<T> | null = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok || !json?.success) {
    const message = json?.error?.message || `Request failed with status ${res.status}`;
    const code = json?.error?.code || 'REQUEST_FAILED';
    throw new ApiError(message, code, res.status);
  }

  return json.data as T;
}

export const authApi = {
  async register(data: { email: string; password: string; role: 'client' | 'freelancer' }): Promise<{ user: User }> {
    return request<{ user: User }>('/users/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: { email: string; password: string }): Promise<{ token: string; user: User }> {
    return request<{ token: string; user: User }>('/users/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/users/me');
  },
};

export const gigsApi = {
  async list(): Promise<{ gigs: Gig[] }> {
    return request<{ gigs: Gig[] }>('/gigs');
  },

  async getById(id: string): Promise<{ gig: Gig }> {
    return request<{ gig: Gig }>(`/gigs/${id}`);
  },

  async listMine(): Promise<{ gigs: Gig[] }> {
    return request<{ gigs: Gig[] }>('/gigs/mine');
  },

  async create(data: {
    title: string;
    description: string;
    price: number;
    category?: string;
    coverImage?: string;
  }): Promise<{ gig: Gig }> {
    return request<{ gig: Gig }>('/gigs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      price: number;
      category?: string;
      coverImage?: string;
    }>
  ): Promise<{ gig: Gig }> {
    return request<{ gig: Gig }>(`/gigs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/gigs/${id}`, {
      method: 'DELETE',
    });
  },
};

export const bookingsApi = {
  async create(data: { gigId: string }): Promise<{ booking: Booking }> {
    return request<{ booking: Booking }>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async listMine(): Promise<{ bookings: Booking[] }> {
    return request<{ bookings: Booking[] }>('/bookings/mine');
  },

  async listReceived(): Promise<{ bookings: Booking[] }> {
    return request<{ bookings: Booking[] }>('/bookings/received');
  },
};

export const transactionsApi = {
  async listMine(): Promise<MyTransactionsResponse> {
    return request<MyTransactionsResponse>('/transactions/mine');
  },
};
