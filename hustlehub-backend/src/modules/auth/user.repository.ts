import mongoose, { Schema } from 'mongoose';

export interface User {
  id: string;
  email: string;
  name?: string;
  passwordHash: string;
  role: 'client' | 'freelancer' | 'admin';
  createdAt: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
}

interface IUserDocument {
  _id: mongoose.Types.ObjectId;
  email: string;
  name?: string;
  passwordHash: string;
  role: 'client' | 'freelancer' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['client', 'freelancer', 'admin'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', userSchema);

function toUser(doc: IUserDocument): User {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name || doc.email.split('@')[0],
    passwordHash: doc.passwordHash,
    role: doc.role,
    createdAt: doc.createdAt.toISOString(),
  };
}

export const userRepository: UserRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase().trim() }).exec();
    return doc ? toUser(doc) : null;
  },

  async findById(id: string): Promise<User | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const doc = await UserModel.findById(id).exec();
    return doc ? toUser(doc) : null;
  },

  async create(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const doc = await UserModel.create({
      email: user.email.toLowerCase().trim(),
      name: user.name || user.email.split('@')[0],
      passwordHash: user.passwordHash,
      role: user.role,
    });
    return toUser(doc);
  },
};
//updated from part1
