import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import {
  generateToken,
  generateSuccessResponse,
  generateErrorResponse,
} from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/mailer';
import { FileDB } from '@/lib/filedb';

// Try MongoDB first, fallback to FileDB if connection fails
let useFileDB = false;

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return generateErrorResponse('Please provide all required fields', 400);
    }

    if (password.length < 6) {
      return generateErrorResponse('Password must be at least 6 characters', 400);
    }

    // Try MongoDB first
    if (!useFileDB) {
      try {
        await connectDB();

        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return generateErrorResponse('Email already registered', 409);
        }

        const user = await User.create({
          name,
          email,
          password,
        });

        sendWelcomeEmail(user.email, user.name).catch(console.error);

        const token = generateToken({
          id: user._id.toString(),
          email: user.email,
        });

        return generateSuccessResponse(
          {
            token,
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
            },
          },
          201
        );
      } catch (dbError: any) {
        console.warn('MongoDB connection failed, using file-based database:', dbError.message);
        useFileDB = true; // Switch to file DB for subsequent requests
      }
    }

    // Fallback to FileDB
    const existingUser = await FileDB.findUserByEmail(email);
    if (existingUser) {
      return generateErrorResponse('Email already registered', 409);
    }

    const user = await FileDB.createUser(name, email, password);

    sendWelcomeEmail(user.email, user.name).catch(console.error);

    const token = generateToken({
      id: user.id,
      email: user.email,
    });

    return generateSuccessResponse(
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        message: 'Using file-based storage (MongoDB unavailable)',
      },
      201
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    return generateErrorResponse(
      process.env.NODE_ENV === 'development'
        ? `Internal server error: ${error?.message}`
        : 'Internal server error',
      500
    );
  }
}
