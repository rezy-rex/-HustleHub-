import mongoose, { Schema } from 'mongoose';

export interface User {
  id: string;
  email: string;
  name?: string;
  passwordHash: string;
  role: 'client' | 'freelancer' | 'admin';
  createdAt: string;
  tokenVersion: number;
  failedLoginAttempts: number;
  lockUntil: string | null;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: Omit<User, 'id' | 'createdAt' | 'tokenVersion' | 'failedLoginAttempts' | 'lockUntil'>): Promise<User>;
  registerFailedLogin(id: string, maxFailures: number, lockMinutes: number): Promise<User | null>;
  resetLoginFailures(id: string): Promise<void>;
  bumpTokenVersion(id: string): Promise<number | null>;
}

interface IUserDocument {
  _id: mongoose.Types.ObjectId;
  email: string;
  name?: string;
  passwordHash: string;
  role: 'client' | 'freelancer' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  tokenVersion?: number;
  failedLoginAttempts?: number;
  lockUntil?: Date | null;
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
    tokenVersion: {
      type: Number,
      default: 0,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
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
    tokenVersion: doc.tokenVersion ?? 0,
    failedLoginAttempts: doc.failedLoginAttempts ?? 0,
    lockUntil: doc.lockUntil ? new Date(doc.lockUntil).toISOString() : null,
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

  async create(user: Omit<User, 'id' | 'createdAt' | 'tokenVersion' | 'failedLoginAttempts' | 'lockUntil'>): Promise<User> {
    const doc = await UserModel.create({
      email: user.email.toLowerCase().trim(),
      name: user.name || user.email.split('@')[0],
      passwordHash: user.passwordHash,
      role: user.role,
      tokenVersion: 0,
      failedLoginAttempts: 0,
      lockUntil: null,
    });
    return toUser(doc);
  },

  async registerFailedLogin(id: string, maxFailures: number, lockMinutes: number): Promise<User | null> {
    const incremented = await UserModel.findOneAndUpdate(
      { _id: id },
      { $inc: { failedLoginAttempts: 1 } },
      { new: true }
    ).exec();

    if (!incremented) return null;

    const failedLoginAttempts = incremented.failedLoginAttempts ?? 0;
    if (failedLoginAttempts < maxFailures) return toUser(incremented);

    const lockUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
    const locked = await UserModel.findOneAndUpdate(
      { _id: id },
      { $set: { lockUntil } },
      { new: true }
    ).exec();

    return locked ? toUser(locked) : toUser(incremented);
  },

  async resetLoginFailures(id: string): Promise<void> {
    await UserModel.updateOne(
      { _id: id },
      { $set: { failedLoginAttempts: 0, lockUntil: null } }
    ).exec();
  },

  async bumpTokenVersion(id: string): Promise<number | null> {
    const doc = await UserModel.findOneAndUpdate(
      { _id: id },
      { $inc: { tokenVersion: 1 } },
      { new: true }
    ).exec();
    return doc ? (doc.tokenVersion ?? 0) : null;
  },
};
//updated from part1
