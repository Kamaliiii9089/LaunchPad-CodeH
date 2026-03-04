import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ThreatIntelligence, ThreatFeed } from '@/models/ThreatIntelligence';
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

// Simulated VirusTotal API enrichment
async function enrichWithVirusTotal(value: string, type: string) {
  // In production, use actual VirusTotal API
  // const apiKey = process.env.VIRUSTOTAL_API_KEY;
  // const response = await fetch(`https://www.virustotal.com/api/v3/...`);
  
  // Simulated response
  const isHash = type === 'hash';
  const positives = Math.floor(Math.random() * 70);
  const total = 70;

  if (isHash) {
    return {
      sha256: value.length === 64 ? value : undefined,
      md5: value.length === 32 ? value : undefined,
      sha1: value.length === 40 ? value : undefined,
      detectionRatio: `${positives}/${total}`,
      positives,
      total,
      scanDate: new Date(),
      permalink: `https://www.virustotal.com/gui/file/${value}`,
      vendors: [
        { name: 'Kaspersky', detected: positives > 30, result: positives > 30 ? 'Trojan.Generic' : 'Clean' },
        { name: 'Microsoft', detected: positives > 40, result: positives > 40 ? 'Malware' : 'Clean' },
        { name: 'Avast', detected: positives > 35, result: positives > 35 ? 'Win32:Malware-gen' : 'Clean' },
        { name: 'BitDefender', detected: positives > 32, result: positives > 32 ? 'Gen:Variant.Trojan' : 'Clean' },
        { name: 'Sophos', detected: positives > 38, result: positives > 38 ? 'Malicious' : 'Clean' },
      ],
      fileType: 'PE32 executable',
      fileSize: Math.floor(Math.random() * 5000000) + 100000,
      tags: positives > 40 ? ['malware', 'trojan'] : ['suspicious'],
    };
  }

  return null;
}

// Simulated AbuseIPDB API enrichment
async function enrichWithAbuseIPDB(ipAddress: string) {
  // In production, use actual AbuseIPDB API
  // const apiKey = process.env.ABUSEIPDB_API_KEY;
  // const response = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ipAddress}`);
  
  // Simulated response
  const abuseScore = Math.floor(Math.random() * 100);
  const totalReports = Math.floor(Math.random() * 50);

  return {
    ipAddress,
    abuseConfidenceScore: abuseScore,
    usageType: ['Commercial', 'Data Center', 'Hosting', 'Residential'][Math.floor(Math.random() * 4)],
    isp: ['Cloudflare', 'Amazon AWS', 'DigitalOcean', 'Google Cloud', 'Unknown ISP'][Math.floor(Math.random() * 5)],
    domain: `example${Math.floor(Math.random() * 100)}.com`,
    countryCode: ['US', 'CN', 'RU', 'BR', 'DE', 'IN'][Math.floor(Math.random() * 6)],
    countryName: ['United States', 'China', 'Russia', 'Brazil', 'Germany', 'India'][Math.floor(Math.random() * 6)],
    isWhitelisted: abuseScore < 10,
    totalReports,
    numDistinctUsers: Math.floor(totalReports / 2),
    lastReportedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    reports: Array.from({ length: Math.min(totalReports, 5) }, (_, i) => ({
      reportedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      comment: ['Port scanning detected', 'Brute force attack', 'SSH attack', 'DDoS attack', 'Spam'][i % 5],
      categories: [14, 15, 18, 21],
      reporterId: Math.floor(Math.random() * 10000),
    })),
  };
}

// Simulated MITRE ATT&CK enrichment
async function enrichWithMITRE(iocValue: string, iocType: string) {
  // In production, query MITRE ATT&CK database or API
  // const response = await fetch(`https://attack.mitre.org/api/...`);
  
  // Simulated MITRE techniques based on IOC type
  const techniques = [
    {
      techniqueId: 'T1190',
      techniqueName: 'Exploit Public-Facing Application',
      tactic: 'Initial Access',
      description: 'Adversaries may attempt to take advantage of a weakness in an Internet-facing computer or program using software, data, or commands in order to cause unintended or unanticipated behavior.',
      platforms: ['Linux', 'Windows', 'macOS', 'Network'],
      dataSources: ['Application Log', 'Network Traffic'],
      detectionMethods: ['Monitor application logs', 'Network intrusion detection'],
      mitigations: [
        { id: 'M1048', name: 'Application Isolation and Sandboxing', description: 'Restrict execution of code to a virtual environment' },
        { id: 'M1030', name: 'Network Segmentation', description: 'Architect sections of the network to isolate critical systems' },
      ],
      references: [
        { source: 'MITRE ATT&CK', url: 'https://attack.mitre.org/techniques/T1190/' },
      ],
      matched: true,
      matchedEvents: [{ eventId: '1', timestamp: new Date(), confidence: 85 }],
    },
    {
      techniqueId: 'T1071',
      techniqueName: 'Application Layer Protocol',
      tactic: 'Command and Control',
      description: 'Adversaries may communicate using OSI application layer protocols to avoid detection/network filtering by blending in with existing traffic.',
      platforms: ['Linux', 'Windows', 'macOS'],
      dataSources: ['Network Traffic', 'Packet Capture'],
      detectionMethods: ['Analyze network data', 'Monitor for malicious traffic patterns'],
      mitigations: [
        { id: 'M1031', name: 'Network Intrusion Prevention', description: 'Use intrusion detection signatures to block traffic' },
      ],
      references: [
        { source: 'MITRE ATT&CK', url: 'https://attack.mitre.org/techniques/T1071/' },
      ],
      subtechniques: [
        { id: 'T1071.001', name: 'Web Protocols' },
        { id: 'T1071.004', name: 'DNS' },
      ],
      matched: iocType === 'ip' || iocType === 'domain',
      matchedEvents: iocType === 'ip' ? [{ eventId: '2', timestamp: new Date(), confidence: 75 }] : [],
    },
    {
      techniqueId: 'T1059',
      techniqueName: 'Command and Scripting Interpreter',
      tactic: 'Execution',
      description: 'Adversaries may abuse command and script interpreters to execute commands, scripts, or binaries.',
      platforms: ['Linux', 'Windows', 'macOS'],
      dataSources: ['Process', 'Command'],
      detectionMethods: ['Monitor process execution', 'Analyze command line arguments'],
      mitigations: [
        { id: 'M1038', name: 'Execution Prevention', description: 'Block execution of suspicious scripts' },
        { id: 'M1042', name: 'Disable or Remove Feature or Program', description: 'Remove unnecessary interpreters' },
      ],
      references: [
        { source: 'MITRE ATT&CK', url: 'https://attack.mitre.org/techniques/T1059/' },
      ],
      matched: iocType === 'hash',
      matchedEvents: [],
    },
  ];

  return techniques.filter(t => Math.random() > 0.3); // Return random subset
}

// Calculate risk score based on enrichment data
function calculateRiskScore(enrichments: any) {
  let score = 0;

  // VirusTotal scoring
  if (enrichments.virusTotal) {
    const vt = enrichments.virusTotal;
    if (vt.positives && vt.total) {
      const detectionRate = (vt.positives / vt.total) * 100;
      score += Math.min(detectionRate, 40); // Max 40 points from VT
    }
  }

  // AbuseIPDB scoring
  if (enrichments.abuseIPDB) {
    const abuse = enrichments.abuseIPDB;
    score += Math.min(abuse.abuseConfidenceScore * 0.3, 30); // Max 30 points from AbuseIPDB
  }

  // MITRE ATT&CK scoring
  if (enrichments.mitre && enrichments.mitre.length > 0) {
    score += Math.min(enrichments.mitre.length * 10, 30); // Max 30 points from MITRE
  }

  return Math.min(Math.round(score), 100);
}

// Determine threat category
function determineThreatCategory(enrichments: any, iocType: string) {
  if (enrichments.virusTotal && enrichments.virusTotal.positives > 30) {
    return 'malware';
  }
  if (enrichments.abuseIPDB && enrichments.abuseIPDB.abuseConfidenceScore > 75) {
    return 'botnet';
  }
  if (enrichments.mitre && enrichments.mitre.some((t: any) => t.tactic === 'Command and Control')) {
    return 'c2';
  }
  if (iocType === 'url') {
    return 'phishing';
  }
  return 'suspicious';
}

// POST - Enrich IOC with threat intelligence
export async function POST(request: NextRequest) {
  try {
    const userId = verifyToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { iocId } = body;

    const ioc = await ThreatIntelligence.findOne({ _id: iocId, userId });
    if (!ioc) {
      return NextResponse.json({ error: 'IOC not found' }, { status: 404 });
    }

    // Enrich with external sources
    const enrichments: any = {};

    // VirusTotal enrichment for hashes
    if (ioc.ioc.type === 'hash') {
      enrichments.virusTotal = await enrichWithVirusTotal(ioc.ioc.value, ioc.ioc.type);
    }

    // AbuseIPDB enrichment for IPs
    if (ioc.ioc.type === 'ip') {
      enrichments.abuseIPDB = await enrichWithAbuseIPDB(ioc.ioc.value);
    }

    // MITRE ATT&CK enrichment for all types
    enrichments.mitre = await enrichWithMITRE(ioc.ioc.value, ioc.ioc.type);

    // Calculate risk score
    const riskScore = calculateRiskScore(enrichments);

    // Determine threat category
    const threatCategory = determineThreatCategory(enrichments, ioc.ioc.type);

    // Update IOC with enrichments
    ioc.enrichments = enrichments;
    ioc.riskScore = riskScore;
    ioc.threatCategory = threatCategory;
    ioc.enrichedAt = new Date();

    // Update feed statistics
    await ThreatFeed.updateOne(
      { userId, feedType: 'virustotal' },
      { $inc: { 'statistics.totalQueries': 1, 'statistics.successfulQueries': 1 } }
    );
    await ThreatFeed.updateOne(
      { userId, feedType: 'abuseipdb' },
      { $inc: { 'statistics.totalQueries': 1, 'statistics.successfulQueries': 1 } }
    );

    await ioc.save();

    return NextResponse.json({
      success: true,
      ioc,
      message: 'IOC enriched successfully',
    });
  } catch (error: any) {
    console.error('Error enriching IOC:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enrich IOC' },
      { status: 500 }
    );
  }
}
