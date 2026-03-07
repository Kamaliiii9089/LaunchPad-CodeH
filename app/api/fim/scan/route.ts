import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import FileIntegrity from '@/models/FileIntegrity';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    await connectDB();

    const files = await FileIntegrity.find({ 
      userId: decoded.userId,
      monitoringEnabled: true 
    });

    let changesDetected = 0;
    const modifiedFiles = [];

    for (const file of files) {
      // Simulate file check - in reality, you would read the actual file
      // 20% chance of detecting a change for demo purposes
      const hasChanged = Math.random() < 0.2;
      
      if (hasChanged) {
        const newHash = crypto.createHash('sha256')
          .update(file.filePath + Date.now() + Math.random())
          .digest('hex');
        
        const previousHash = file.currentHash;
        file.currentHash = newHash;
        
        if (newHash !== file.baselineHash) {
          file.status = 'modified';
          file.changeHistory.push({
            action: 'modified',
            previousHash,
            newHash,
            details: 'Unauthorized modification detected',
          });
          changesDetected++;
          modifiedFiles.push(file);
        }
      }
      
      file.lastChecked = new Date();
      await file.save();
    }

    return NextResponse.json({
      success: true,
      scanned: files.length,
      changesDetected,
      modifiedFiles,
      message: `Scan complete. ${changesDetected} unauthorized changes detected.`
    });
  } catch (error: any) {
    console.error('FIM scan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
