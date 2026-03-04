import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Anomaly, NetworkSession } from '@/models/NetworkTraffic';
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

// Anomaly detection heuristics
function detectPortScan(packets: any[]) {
  const portScans: { [key: string]: Set<number> } = {};
  
  packets.forEach((packet) => {
    if (!portScans[packet.sourceIp]) {
      portScans[packet.sourceIp] = new Set();
    }
    portScans[packet.sourceIp].add(packet.destinationPort);
  });

  const anomalies: any[] = [];
  Object.entries(portScans).forEach(([sourceIp, ports]) => {
    if (ports.size > 10) {
      anomalies.push({
        anomalyType: 'port_scan',
        severity: ports.size > 50 ? 'critical' : ports.size > 25 ? 'high' : 'medium',
        sourceIp,
        affectedPorts: Array.from(ports),
        description: `Port scanning detected from ${sourceIp}. Scanned ${ports.size} different ports.`,
        detectionMethod: 'heuristic',
        confidence: Math.min(95, 60 + ports.size),
        packetCount: ports.size,
      });
    }
  });

  return anomalies;
}

function detectDataExfiltration(packets: any[]) {
  const outboundTraffic: { [key: string]: number } = {};
  
  packets.forEach((packet) => {
    if (packet.direction === 'outbound') {
      outboundTraffic[packet.destinationIp] = (outboundTraffic[packet.destinationIp] || 0) + packet.packetSize;
    }
  });

  const anomalies: any[] = [];
  const threshold = 10 * 1024 * 1024; // 10 MB

  Object.entries(outboundTraffic).forEach(([destIp, bytes]) => {
    if (bytes > threshold) {
      anomalies.push({
        anomalyType: 'data_exfiltration',
        severity: bytes > 100 * 1024 * 1024 ? 'critical' : 'high',
        sourceIp: 'internal',
        destinationIp: destIp,
        bytesTransferred: bytes,
        description: `Potential data exfiltration detected. ${(bytes / 1024 / 1024).toFixed(2)} MB transferred to ${destIp}.`,
        detectionMethod: 'heuristic',
        confidence: 80,
      });
    }
  });

  return anomalies;
}

function detectUnusualTrafficVolume(packets: any[]) {
  const anomalies: any[] = [];
  const packetsByIp: { [key: string]: number } = {};
  
  packets.forEach((packet) => {
    packetsByIp[packet.sourceIp] = (packetsByIp[packet.sourceIp] || 0) + 1;
  });

  const avgPackets = packets.length / Object.keys(packetsByIp).length;
  
  Object.entries(packetsByIp).forEach(([ip, count]) => {
    if (count > avgPackets * 5) { // 5x average is suspicious
      anomalies.push({
        anomalyType: 'unusual_traffic_volume',
        severity: count > avgPackets * 10 ? 'high' : 'medium',
        sourceIp: ip,
        packetCount: count,
        description: `Unusual traffic volume from ${ip}. ${count} packets (${(count / avgPackets).toFixed(1)}x normal).`,
        detectionMethod: 'heuristic',
        confidence: 75,
      });
    }
  });

  return anomalies;
}

function detectSuspiciousProtocols(packets: any[]) {
  const anomalies: any[] = [];
  const suspiciousPorts = [1337, 31337, 4444, 5555, 6666, 8888, 9999]; // Common backdoor ports
  
  const suspiciousConnections = packets.filter((packet) => 
    suspiciousPorts.includes(packet.destinationPort)
  );

  if (suspiciousConnections.length > 0) {
    const uniqueIps = new Set(suspiciousConnections.map(p => p.sourceIp));
    
    anomalies.push({
      anomalyType: 'suspicious_protocol',
      severity: suspiciousConnections.length > 10 ? 'critical' : 'high',
      sourceIp: Array.from(uniqueIps)[0],
      affectedPorts: suspiciousPorts.filter(port => 
        suspiciousConnections.some(c => c.destinationPort === port)
      ),
      description: `Suspicious port usage detected. ${suspiciousConnections.length} connections to known backdoor ports.`,
      detectionMethod: 'signature',
      confidence: 85,
      packetCount: suspiciousConnections.length,
    });
  }

  return anomalies;
}

function detectDNSTunneling(packets: any[]) {
  const anomalies: any[] = [];
  const dnsQueries = packets.filter(p => p.protocol === 'DNS' && p.destinationPort === 53);
  
  if (dnsQueries.length > 100) { // Excessive DNS queries
    anomalies.push({
      anomalyType: 'dns_tunneling',
      severity: 'high',
      sourceIp: dnsQueries[0]?.sourceIp || 'unknown',
      description: `Potential DNS tunneling detected. ${dnsQueries.length} DNS queries in short timeframe.`,
      detectionMethod: 'behavioral',
      confidence: 70,
      packetCount: dnsQueries.length,
    });
  }

  return anomalies;
}

// Generate mock packets for analysis
function generateAnalysisPackets(includeAnomalies: boolean = false) {
  const protocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'DNS', 'SSH'];
  const packets: any[] = [];
  const normalCount = Math.floor(Math.random() * 300) + 100;
  
  // Generate normal traffic
  for (let i = 0; i < normalCount; i++) {
    packets.push({
      sourceIp: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
      destinationIp: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      sourcePort: Math.floor(Math.random() * 65535),
      destinationPort: [80, 443, 53, 22][Math.floor(Math.random() * 4)],
      protocol: protocols[Math.floor(Math.random() * protocols.length)],
      packetSize: Math.floor(Math.random() * 1500) + 64,
      direction: Math.random() > 0.5 ? 'inbound' : 'outbound',
    });
  }

  // Add anomalous traffic if requested
  if (includeAnomalies && Math.random() > 0.3) {
    const anomalyType = Math.floor(Math.random() * 4);
    const suspiciousIp = `45.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    
    if (anomalyType === 0) {
      // Port scan
      for (let port = 1; port < 50; port++) {
        packets.push({
          sourceIp: suspiciousIp,
          destinationIp: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
          sourcePort: Math.floor(Math.random() * 65535),
          destinationPort: port,
          protocol: 'TCP',
          packetSize: 64,
          direction: 'inbound',
        });
      }
    } else if (anomalyType === 1) {
      // Data exfiltration
      for (let i = 0; i < 100; i++) {
        packets.push({
          sourceIp: '192.168.1.50',
          destinationIp: suspiciousIp,
          sourcePort: Math.floor(Math.random() * 65535),
          destinationPort: 443,
          protocol: 'HTTPS',
          packetSize: Math.floor(Math.random() * 1400) + 100,
          direction: 'outbound',
        });
      }
    } else if (anomalyType === 2) {
      // Suspicious port
      for (let i = 0; i < 15; i++) {
        packets.push({
          sourceIp: suspiciousIp,
          destinationIp: '192.168.1.10',
          sourcePort: Math.floor(Math.random() * 65535),
          destinationPort: 4444, // Backdoor port
          protocol: 'TCP',
          packetSize: Math.floor(Math.random() * 500),
          direction: 'inbound',
        });
      }
    } else {
      // DNS tunneling
      for (let i = 0; i < 150; i++) {
        packets.push({
          sourceIp: '192.168.1.75',
          destinationIp: '8.8.8.8',
          sourcePort: Math.floor(Math.random() * 65535),
          destinationPort: 53,
          protocol: 'DNS',
          packetSize: Math.floor(Math.random() * 200) + 50,
          direction: 'outbound',
        });
      }
    }
  }

  return packets;
}

// POST - Analyze network traffic for anomalies
export async function POST(request: NextRequest) {
  try {
    const userId = verifyToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { sessionId } = body;

    const session = await NetworkSession.findOne({ sessionId, userId });
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Generate mock packets for analysis
    const packets = generateAnalysisPackets(true);

    // Run anomaly detection algorithms
    const portScanAnomalies = detectPortScan(packets);
    const exfiltrationAnomalies = detectDataExfiltration(packets);
    const volumeAnomalies = detectUnusualTrafficVolume(packets);
    const protocolAnomalies = detectSuspiciousProtocols(packets);
    const dnsTunnelingAnomalies = detectDNSTunneling(packets);

    const allAnomalies = [
      ...portScanAnomalies,
      ...exfiltrationAnomalies,
      ...volumeAnomalies,
      ...protocolAnomalies,
      ...dnsTunnelingAnomalies,
    ];

    // Save detected anomalies to database
    const savedAnomalies = [];
    for (const anomaly of allAnomalies) {
      const newAnomaly = new Anomaly(anomaly);
      await newAnomaly.save();
      savedAnomalies.push(newAnomaly);
    }

    // Update session anomaly count
    session.anomaliesDetected += savedAnomalies.length;
    await session.save();

    return NextResponse.json({
      success: true,
      analysis: {
        packetsAnalyzed: packets.length,
        anomaliesDetected: savedAnomalies.length,
        anomalies: savedAnomalies,
        breakdown: {
          portScans: portScanAnomalies.length,
          dataExfiltration: exfiltrationAnomalies.length,
          unusualVolume: volumeAnomalies.length,
          suspiciousProtocols: protocolAnomalies.length,
          dnsTunneling: dnsTunnelingAnomalies.length,
        },
      },
      message: 'Traffic analysis completed',
    });
  } catch (error: any) {
    console.error('Error analyzing traffic:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze traffic' },
      { status: 500 }
    );
  }
}
