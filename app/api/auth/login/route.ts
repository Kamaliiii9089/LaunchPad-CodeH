import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken, generateSuccessResponse, generateErrorResponse } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await connectDB();

    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return generateErrorResponse('Please provide email and password', 400);
    }

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
  } catch (error: any) {
    console.error('Login error:', error);
    return generateErrorResponse('Internal server error', 500);
  }
}
