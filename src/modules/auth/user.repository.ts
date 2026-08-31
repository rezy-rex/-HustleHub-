import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'client' | 'freelancer' | 'admin';
  createdAt: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
}

const DATA_FILE = path.resolve(process.cwd(), 'src/data/users.json');

async function readAll(): Promise<User[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as User[];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      await fs.writeFile(DATA_FILE, '[]', 'utf-8');
      return [];
    }
    throw err;
  }
}

async function writeAll(users: User[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

// File-based store for Part 1 (permitted by the brief). Swappable for a
// MongoDB-backed implementation in Part 2 without touching any code outside
// this file — every other module only depends on the UserRepository interface.
export const fileUserRepository: UserRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const users = await readAll();
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const users = await readAll();
    return users.find((u) => u.id === id) ?? null;
  },

  async create(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const users = await readAll();
    const newUser: User = {
      ...user,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    await writeAll(users);
    return newUser;
  },
};