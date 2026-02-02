import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import {
  generateToken,
  generateSuccessResponse,
  generateErrorResponse,
} from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/mailer';

export async function POST(request: Request) {
  try {
    await connectDB();

    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return generateErrorResponse('Please provide all required fields', 400);
    }

    if (password.length < 6) {
      return generateErrorResponse('Password must be at least 6 characters', 400);
    }

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
  } catch (error) {
    console.error('Signup error:', error);
    return generateErrorResponse('Internal server error', 500);
  }
}
