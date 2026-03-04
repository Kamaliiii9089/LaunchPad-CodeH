import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import FileIntegrity from '@/models/FileIntegrity';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    const query: any = { userId: decoded.userId };
    if (status) query.status = status;
    if (category) query.category = category;

    const files = await FileIntegrity.find(query).sort({ lastChecked: -1 });

    // Get statistics
    const stats = {
      total: files.length,
      intact: files.filter(f => f.status === 'intact').length,
      modified: files.filter(f => f.status === 'modified').length,
      deleted: files.filter(f => f.status === 'deleted').length,
      critical: files.filter(f => f.severity === 'critical').length,
      lastScan: files.length > 0 ? files[0].lastChecked : null,
    };

    return NextResponse.json({ files, stats });
  } catch (error: any) {
    console.error('FIM GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    await dbConnect();

    const body = await request.json();
    const { filePath, fileName, fileSize, category, severity, alertOnChange } = body;

    // In a real implementation, you would read the actual file
    // For now, we'll simulate with a hash based on the filename
    const hash = crypto.createHash('sha256').update(filePath + Date.now()).digest('hex');

    const fileIntegrity = new FileIntegrity({
      userId: decoded.userId,
      filePath,
      fileName,
      fileSize,
      category: category || 'custom',
      severity: severity || 'medium',
      baselineHash: hash,
      currentHash: hash,
      status: 'intact',
      alertOnChange: alertOnChange !== false,
      changeHistory: [{
        action: 'created',
        newHash: hash,
        details: 'Baseline created',
      }],
      metadata: {
        lastModified: new Date(),
      },
    });

    await fileIntegrity.save();

    return NextResponse.json({ 
      success: true, 
      file: fileIntegrity,
      message: 'File baseline created successfully'
    });
  } catch (error: any) {
    console.error('FIM POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    await dbConnect();

    const body = await request.json();
    const { id, action } = body;

    const file = await FileIntegrity.findOne({ _id: id, userId: decoded.userId });
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (action === 'accept') {
      // Accept the change and update baseline
      file.baselineHash = file.currentHash;
      file.status = 'intact';
      file.changeHistory.push({
        action: 'modified',
        previousHash: file.baselineHash,
        newHash: file.currentHash,
        details: 'Change accepted by user',
      });
    } else if (action === 'toggle-monitoring') {
      file.monitoringEnabled = !file.monitoringEnabled;
    }

    file.lastChecked = new Date();
    await file.save();

    return NextResponse.json({ 
      success: true, 
      file,
      message: 'File updated successfully'
    });
  } catch (error: any) {
    console.error('FIM PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    await FileIntegrity.findOneAndDelete({ _id: id, userId: decoded.userId });

    return NextResponse.json({ 
      success: true,
      message: 'File monitoring removed successfully'
    });
  } catch (error: any) {
    console.error('FIM DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
