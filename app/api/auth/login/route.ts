import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken, generateSuccessResponse, generateErrorResponse } from '@/lib/auth';
import { processFingerprint, calculateDeviceTrustScore, requiresAdditionalVerification } from '@/lib/deviceFingerprint';

export async function POST(request: Request) {
  try {
    await connectDB();

    const { email, password, deviceFingerprint } = await request.json();

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

    // Process device fingerprint if provided
    let deviceInfo = null;
    let requiresDeviceVerification = false;
    
    if (deviceFingerprint) {
      // Get client IP
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
      
      // Process fingerprint
      const fingerprint = processFingerprint(deviceFingerprint, ip);
      
      // Find or create device record
      let existingDevice = (user.trustedDevices || []).find(
        (device: any) => device.deviceId === fingerprint.deviceId
      );

      if (existingDevice) {
        // Update existing device
        const trustScore = calculateDeviceTrustScore({
          firstSeen: existingDevice.firstSeen,
          lastUsed: existingDevice.lastUsed,
          loginCount: existingDevice.loginCount || 0,
          failedAttempts: existingDevice.failedAttempts || 0,
          securityScore: fingerprint.securityScore,
        });

        existingDevice.lastUsed = new Date();
        existingDevice.trustScore = trustScore;
        existingDevice.securityScore = fingerprint.securityScore;
        existingDevice.ip = ip;
        existingDevice.loginCount = (existingDevice.loginCount || 0) + 1;
        existingDevice.suspiciousFlags = fingerprint.suspiciousFlags;

        deviceInfo = {
          deviceId: fingerprint.deviceId,
          isNewDevice: false,
          isTrusted: existingDevice.isTrusted,
          trustScore,
          securityScore: fingerprint.securityScore,
          suspiciousFlags: fingerprint.suspiciousFlags,
        };
      } else {
        // New device
        const deviceName = `${fingerprint.browser.name} on ${fingerprint.os.name}`;
        
        const newDevice = {
          deviceId: fingerprint.deviceId,
          deviceName,
          deviceType: fingerprint.device.type,
          browser: `${fingerprint.browser.name} ${fingerprint.browser.version}`,
          os: `${fingerprint.os.name} ${fingerprint.os.version}`,
          firstSeen: new Date(),
          lastUsed: new Date(),
          trustScore: 50,
          isTrusted: false,
          ip,
          location: fingerprint.location?.city || fingerprint.location?.country,
          securityScore: fingerprint.securityScore,
          suspiciousFlags: fingerprint.suspiciousFlags,
          loginCount: 1,
          failedAttempts: 0,
        };

        user.trustedDevices = user.trustedDevices || [];
        user.trustedDevices.push(newDevice);

        deviceInfo = {
          deviceId: fingerprint.deviceId,
          isNewDevice: true,
          isTrusted: false,
          trustScore: 50,
          securityScore: fingerprint.securityScore,
          suspiciousFlags: fingerprint.suspiciousFlags,
        };
      }

      await user.save();

      // Check if additional verification is needed
      requiresDeviceVerification = requiresAdditionalVerification(fingerprint) || 
                                   (deviceInfo.isNewDevice && !deviceInfo.isTrusted);
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Return a special response indicating 2FA is required
      return Response.json({
        success: true,
        requires2FA: true,
        userId: user._id.toString(),
        message: 'Please enter your 2FA code',
        deviceInfo,
        requiresDeviceVerification,
      });
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
      deviceInfo,
      requiresDeviceVerification,
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
