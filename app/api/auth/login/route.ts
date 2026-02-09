import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken, generateSuccessResponse, generateErrorResponse } from '@/lib/auth';
import { FileDB } from '@/lib/filedb';

// Try MongoDB first, fallback to FileDB if connection fails
let useFileDB = false;

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return generateErrorResponse('Please provide email and password', 400);
    }

    // Try MongoDB first
    if (!useFileDB) {
      try {
        await connectDB();

        // Find user and select password field
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
          return generateErrorResponse('Invalid credentials', 401);
        }

        // Check password
        const isPasswordCorrect = await user.comparePassword(password);
        if (!isPasswordCorrect) {
          return generateErrorResponse('Invalid credentials', 401);
        }

        // Check if 2FA is enabled
        if (user.twoFactorEnabled) {
          // Return a special response indicating 2FA is required
          return Response.json({
            success: true,
            requires2FA: true,
            userId: user._id.toString(),
            message: 'Please enter your 2FA code',
          });
        }

        // Generate token
        const token = generateToken({
          id: user._id.toString(),
          email: user.email,
        });

        return Response.json({
          success: true,
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            twoFactorEnabled: user.twoFactorEnabled,
          },
        });
      } catch (dbError: any) {
        console.warn('MongoDB connection failed, using file-based database:', dbError.message);
        useFileDB = true; // Switch to file DB for subsequent requests
      }
    }

    // Fallback to FileDB
    const user = await FileDB.findUserByEmail(email);
    if (!user) {
      return generateErrorResponse('Invalid credentials', 401);
    }

    // Check password
    const isPasswordCorrect = await FileDB.verifyPassword(password, user.password);
    if (!isPasswordCorrect) {
      return generateErrorResponse('Invalid credentials', 401);
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
    });

    return Response.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        twoFactorEnabled: false, // FileDB doesn't support 2FA yet
      },
      message: 'Using file-based storage (MongoDB unavailable)',
    });
  } catch (error: any) {
    console.error('Login error:', error);
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
