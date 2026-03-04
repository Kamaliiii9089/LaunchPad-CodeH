import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { NetworkSession, NetworkTrafficStats } from '@/models/NetworkTraffic';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

// Simulate packet capture with realistic network data
function generateMockPackets(count: number) {
  const protocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'DNS', 'SSH', 'FTP'];
  const commonPorts = [80, 443, 22, 21, 53, 25, 110, 143, 3306, 5432, 8080];
  const directions = ['inbound', 'outbound'];
  
  const packets = [];
  for (let i = 0; i < count; i++) {
    const protocol = protocols[Math.floor(Math.random() * protocols.length)];
    const sourceIp = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const destIp = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const destPort = commonPorts[Math.floor(Math.random() * commonPorts.length)];
    
    packets.push({
      timestamp: new Date(Date.now() - Math.random() * 60000),
      sourceIp,
      destinationIp: destIp,
      sourcePort: Math.floor(Math.random() * 65535),
      destinationPort: destPort,
      protocol,
      packetSize: Math.floor(Math.random() * 1500) + 64,
      flags: ['SYN', 'ACK'].filter(() => Math.random() > 0.5),
      direction: directions[Math.floor(Math.random() * directions.length)],
    });
  }
  
  return packets;
}

// POST - Start packet capture and analyze traffic
export async function POST(request: NextRequest) {
  try {
    const userId = verifyToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { sessionId, duration = 10 } = body; // duration in seconds

    const session = await NetworkSession.findOne({ sessionId, userId, isActive: true });
    if (!session) {
      return NextResponse.json(
        { error: 'Active session not found' },
        { status: 404 }
      );
    }

    // Simulate packet capture
    const packetCount = Math.floor(Math.random() * 500) + 100;
    const packets = generateMockPackets(packetCount);

    // Calculate statistics
    const protocolBreakdown: { [key: string]: number } = {};
    let totalBytes = 0;
    let inboundPackets = 0;
    let outboundPackets = 0;
    let inboundBytes = 0;
    let outboundBytes = 0;
    const sourceIps = new Set<string>();
    const destIps = new Set<string>();

    packets.forEach((packet) => {
      protocolBreakdown[packet.protocol] = (protocolBreakdown[packet.protocol] || 0) + 1;
      totalBytes += packet.packetSize;
      
      if (packet.direction === 'inbound') {
        inboundPackets++;
        inboundBytes += packet.packetSize;
      } else {
        outboundPackets++;
        outboundBytes += packet.packetSize;
      }
      
      sourceIps.add(packet.sourceIp);
      destIps.add(packet.destinationIp);
    });

    // Update session statistics
    session.packetsCapture += packetCount;
    session.bytesCapture += totalBytes;
    session.protocols = new Map(Object.entries(protocolBreakdown));
    await session.save();

    // Create traffic stats entry
    const stats = new NetworkTrafficStats({
      userId,
      interval: 'minute',
      totalPackets: packetCount,
      totalBytes,
      inboundPackets,
      outboundPackets,
      inboundBytes,
      outboundBytes,
      uniqueSourceIps: sourceIps.size,
      uniqueDestinationIps: destIps.size,
      protocolBreakdown: new Map(Object.entries(protocolBreakdown)),
    });
    await stats.save();

    return NextResponse.json({
      success: true,
      capture: {
        packetsCaptured: packetCount,
        bytesCapture: totalBytes,
        duration,
        protocolBreakdown,
        inboundPackets,
        outboundPackets,
        uniqueSourceIps: sourceIps.size,
        uniqueDestinationIps: destIps.size,
      },
      message: 'Packet capture completed',
    });
  } catch (error: any) {
    console.error('Error capturing packets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to capture packets' },
      { status: 500 }
    );
  }
}
