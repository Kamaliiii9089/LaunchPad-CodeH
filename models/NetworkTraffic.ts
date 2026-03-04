import mongoose from 'mongoose';

const PacketSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  sourceIp: {
    type: String,
    required: true,
    index: true,
  },
  destinationIp: {
    type: String,
    required: true,
    index: true,
  },
  sourcePort: {
    type: Number,
    required: true,
  },
  destinationPort: {
    type: Number,
    required: true,
  },
  protocol: {
    type: String,
    required: true,
    enum: ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS', 'FTP', 'SSH', 'SMTP', 'Other'],
  },
  packetSize: {
    type: Number,
    required: true,
  },
  flags: {
    type: [String],
    default: [],
  },
  payload: {
    type: String,
    default: '',
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true,
  },
});

const AnomalySchema = new mongoose.Schema({
  detectedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  anomalyType: {
    type: String,
    required: true,
    enum: [
      'port_scan',
      'data_exfiltration',
      'ddos_attack',
      'unusual_traffic_volume',
      'suspicious_protocol',
      'malicious_payload',
      'brute_force',
      'dns_tunneling',
      'lateral_movement',
      'command_and_control',
    ],
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  sourceIp: {
    type: String,
    required: true,
    index: true,
  },
  destinationIp: {
    type: String,
  },
  affectedPorts: {
    type: [Number],
    default: [],
  },
  packetCount: {
    type: Number,
    default: 1,
  },
  bytesTransferred: {
    type: Number,
    default: 0,
  },
  description: {
    type: String,
    required: true,
  },
  detectionMethod: {
    type: String,
    enum: ['heuristic', 'signature', 'ml_model', 'behavioral'],
    default: 'heuristic',
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 75,
  },
  status: {
    type: String,
    enum: ['active', 'investigating', 'resolved', 'false_positive'],
    default: 'active',
  },
  relatedPackets: [PacketSchema],
  mitigationActions: {
    type: [String],
    default: [],
  },
  resolved: {
    type: Boolean,
    default: false,
  },
  resolvedAt: {
    type: Date,
  },
  notes: {
    type: String,
    default: '',
  },
});

const NetworkSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number, // milliseconds
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  captureInterface: {
    type: String,
    default: 'eth0',
  },
  captureFilter: {
    type: String,
    default: '', // BPF filter syntax
  },
  packetsCapture: {
    type: Number,
    default: 0,
  },
  bytesCapture: {
    type: Number,
    default: 0,
  },
  anomaliesDetected: {
    type: Number,
    default: 0,
  },
  protocols: {
    type: Map,
    of: Number,
    default: {},
  },
});

const NetworkTrafficStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  interval: {
    type: String,
    enum: ['minute', 'hour', 'day'],
    default: 'minute',
  },
  totalPackets: {
    type: Number,
    default: 0,
  },
  totalBytes: {
    type: Number,
    default: 0,
  },
  inboundPackets: {
    type: Number,
    default: 0,
  },
  outboundPackets: {
    type: Number,
    default: 0,
  },
  inboundBytes: {
    type: Number,
    default: 0,
  },
  outboundBytes: {
    type: Number,
    default: 0,
  },
  uniqueSourceIps: {
    type: Number,
    default: 0,
  },
  uniqueDestinationIps: {
    type: Number,
    default: 0,
  },
  protocolBreakdown: {
    type: Map,
    of: Number,
    default: {},
  },
  topSourceIps: {
    type: [{ ip: String, count: Number }],
    default: [],
  },
  topDestinationIps: {
    type: [{ ip: String, count: Number }],
    default: [],
  },
  suspiciousActivities: {
    type: Number,
    default: 0,
  },
});

// Indexes for performance
AnomalySchema.index({ detectedAt: -1, severity: 1 });
AnomalySchema.index({ sourceIp: 1, anomalyType: 1 });
AnomalySchema.index({ status: 1, severity: 1 });
NetworkTrafficStatsSchema.index({ userId: 1, timestamp: -1 });

export const Anomaly = mongoose.models.Anomaly || mongoose.model('Anomaly', AnomalySchema);
export const NetworkSession = mongoose.models.NetworkSession || mongoose.model('NetworkSession', NetworkSessionSchema);
export const NetworkTrafficStats = mongoose.models.NetworkTrafficStats || mongoose.model('NetworkTrafficStats', NetworkTrafficStatsSchema);
