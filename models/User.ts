import mongoose, { Document, Schema } from 'mongoose';
import bcryptjs from 'bcryptjs';

export interface ITrustedDevice {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  lastUsed: Date;
  firstSeen: Date;
  trustScore: number;
  isTrusted: boolean;
  trustedAt?: Date;
  ip?: string;
  location?: string;
  securityScore: number;
  suspiciousFlags: string[];
  loginCount: number;
  failedAttempts: number;
}

export interface IActiveSession {
  sessionId: string;
  deviceId: string;
  createdAt: Date;
  expiresAt: Date;
  ip?: string;
  lastActivity: Date;
}

export interface IBackupCode {
  code: string;
  used: boolean;
  usedAt?: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  backupCodes?: IBackupCode[];
  trustedDevices?: ITrustedDevice[];
  activeSessions?: IActiveSession[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    backupCodes: {
      type: [{
        code: String,
        used: { type: Boolean, default: false },
        usedAt: Date,
      }],
      select: false,
    },
    trustedDevices: {
      type: [{
        deviceId: { type: String, required: true },
        deviceName: { type: String, required: true },
        deviceType: {
          type: String,
          enum: ['desktop', 'mobile', 'tablet', 'unknown'],
          default: 'unknown',
        },
        browser: String,
        os: String,
        lastUsed: { type: Date, default: Date.now },
        firstSeen: { type: Date, default: Date.now },
        trustScore: { type: Number, default: 50 },
        isTrusted: { type: Boolean, default: false },
        trustedAt: Date,
        ip: String,
        location: String,
        securityScore: { type: Number, default: 50 },
        suspiciousFlags: [String],
        loginCount: { type: Number, default: 0 },
        failedAttempts: { type: Number, default: 0 },
      }],
      default: [],
    },
    activeSessions: {
      type: [{
        sessionId: { type: String, required: true },
        deviceId: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
        ip: String,
        lastActivity: { type: Date, default: Date.now },
      }],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(this.password, salt);
    this.password = hashedPassword;
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  return await bcryptjs.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
