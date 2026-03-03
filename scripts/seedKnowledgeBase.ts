import mongoose from 'mongoose';
import { connectDB } from '../lib/mongodb';
import KnowledgeBaseArticle from '../models/KnowledgeBaseArticle';

const sampleArticles = [
  {
    title: 'How to Respond to a Brute Force Attack',
    slug: 'respond-to-brute-force-attack',
    category: 'incident-response',
    content: `When facing a brute force attack, immediate action is critical to protect your systems and data. Follow these comprehensive steps to effectively respond to and mitigate the attack.`,
    summary: 'Learn how to identify, respond to, and prevent brute force attacks on your systems.',
    tags: ['brute-force', 'authentication', 'security', 'incident-response'],
    threatTypes: ['Brute Force Attack'],
    steps: [
      {
        order: 1,
        title: 'Identify the Attack Source',
        description: 'Check your logs to identify the IP addresses attempting the brute force attack.',
        code: 'grep "Failed password" /var/log/auth.log | awk \'{print $11}\' | sort | uniq -c | sort -nr',
        warning: 'Make sure to preserve logs for investigation and potential legal action.',
      },
      {
        order: 2,
        title: 'Block Malicious IPs',
        description: 'Use your firewall to immediately block the attacking IP addresses.',
        code: 'sudo iptables -A INPUT -s <attacking-ip> -j DROP',
      },
      {
        order: 3,
        title: 'Enable Rate Limiting',
        description: 'Configure rate limiting on your authentication endpoints to slow down attacks.',
        code: 'fail2ban-client set sshd banip <attacking-ip>',
      },
      {
        order: 4,
        title: 'Force Password Resets',
        description: 'If any accounts show successful logins from suspicious IPs, force immediate password resets.',
      },
      {
        order: 5,
        title: 'Enable Two-Factor Authentication',
        description: 'Require 2FA for all user accounts to prevent future brute force attempts.',
      },
    ],
    published: true,
    featured: true,
  },
  {
    title: 'Malware Detection and Removal Procedures',
    slug: 'malware-detection-removal',
    category: 'procedures',
    content: `Comprehensive guide for detecting, isolating, and removing malware from infected systems. This procedure ensures minimal data loss and system downtime.`,
    summary: 'Step-by-step procedures for identifying and removing malware infections.',
    tags: ['malware', 'antivirus', 'cleanup', 'security'],
    threatTypes: ['Malware Detected', 'Trojan Horse', 'Ransomware Detected'],
    steps: [
      {
        order: 1,
        title: 'Isolate the Infected System',
        description: 'Immediately disconnect the infected system from the network to prevent spread.',
        warning: 'Do not shut down the system as this may destroy evidence in memory.',
      },
      {
        order: 2,
        title: 'Run Full System Scan',
        description: 'Use multiple antivirus tools for comprehensive detection.',
        code: 'sudo clamscan -r --bell -i /',
      },
      {
        order: 3,
        title: 'Analyze Suspicious Processes',
        description: 'Identify and terminate malicious processes.',
        code: 'top -n 1 -b | head -20',
      },
      {
        order: 4,
        title: 'Remove Malware',
        description: 'Delete infected files and clean the registry.',
      },
      {
        order: 5,
        title: 'Update Security Software',
        description: 'Ensure all security software is up-to-date before reconnecting.',
      },
    ],
    published: true,
    featured: true,
  },
  {
    title: 'DDoS Attack Mitigation Best Practices',
    slug: 'ddos-mitigation-best-practices',
    category: 'best-practices',
    content: `Distributed Denial of Service (DDoS) attacks can cripple your online services. Learn how to detect, mitigate, and prevent these attacks effectively.`,
    summary: 'Essential practices for defending against and recovering from DDoS attacks.',
    tags: ['ddos', 'network-security', 'availability', 'mitigation'],
    threatTypes: ['DDoS Attack'],
    steps: [
      {
        order: 1,
        title: 'Monitor Traffic Patterns',
        description: 'Set up real-time monitoring to detect unusual traffic spikes.',
      },
      {
        order: 2,
        title: 'Enable Rate Limiting',
        description: 'Configure your web server or load balancer to limit requests per IP.',
        code: 'limit_req_zone $binary_remote_addr zone=one:10m rate=1r/s;',
      },
      {
        order: 3,
        title: 'Use CDN and DDoS Protection',
        description: 'Leverage services like Cloudflare or AWS Shield for traffic filtering.',
      },
      {
        order: 4,
        title: 'Configure Geo-blocking',
        description: 'Block traffic from regions where you don\'t do business.',
      },
      {
        order: 5,
        title: 'Scale Infrastructure',
        description: 'Use auto-scaling to handle legitimate traffic during an attack.',
      },
    ],
    published: true,
    featured: true,
  },
  {
    title: 'SQL Injection Prevention Guide',
    slug: 'sql-injection-prevention',
    category: 'best-practices',
    content: `SQL injection remains one of the most critical web application vulnerabilities. This guide covers prevention techniques and secure coding practices.`,
    summary: 'Protect your applications from SQL injection attacks with these proven techniques.',
    tags: ['sql-injection', 'web-security', 'application-security', 'owasp'],
    threatTypes: ['SQL Injection Attempt'],
    steps: [
      {
        order: 1,
        title: 'Use Parameterized Queries',
        description: 'Always use prepared statements instead of string concatenation.',
        code: 'cursor.execute("SELECT * FROM users WHERE email = ?", (email,))',
      },
      {
        order: 2,
        title: 'Implement Input Validation',
        description: 'Validate and sanitize all user inputs.',
      },
      {
        order: 3,
        title: 'Use ORM Frameworks',
        description: 'Object-Relational Mapping frameworks provide built-in SQL injection protection.',
      },
      {
        order: 4,
        title: 'Apply Least Privilege',
        description: 'Database accounts should have minimal required permissions.',
      },
      {
        order: 5,
        title: 'Regular Security Testing',
        description: 'Perform regular penetration testing and code reviews.',
      },
    ],
    published: true,
  },
  {
    title: 'Phishing Email Identification and Response',
    slug: 'phishing-response-guide',
    category: 'troubleshooting',
    content: `Learn to identify phishing attempts and respond appropriately to protect your organization from social engineering attacks.`,
    summary: 'Comprehensive guide to recognizing and handling phishing attempts.',
    tags: ['phishing', 'email-security', 'social-engineering', 'awareness'],
    threatTypes: ['Phishing Email'],
    steps: [
      {
        order: 1,
        title: 'Check Sender Information',
        description: 'Verify the sender\'s email address matches the claimed organization.',
      },
      {
        order: 2,
        title: 'Analyze Links Carefully',
        description: 'Hover over links without clicking to see the actual URL.',
        warning: 'Never click links in suspicious emails.',
      },
      {
        order: 3,
        title: 'Look for Grammar Errors',
        description: 'Legitimate organizations typically have proper grammar and spelling.',
      },
      {
        order: 4,
        title: 'Report the Phishing Attempt',
        description: 'Forward the email to your security team and mark as phishing.',
      },
      {
        order: 5,
        title: 'Educate Users',
        description: 'Share examples with your team to raise awareness.',
      },
    ],
    published: true,
  },
  {
    title: 'Ransomware Prevention and Recovery',
    slug: 'ransomware-prevention-recovery',
    category: 'incident-response',
    content: `Ransomware attacks can encrypt critical data and demand payment. Learn how to prevent attacks and recover if one occurs.`,
    summary: 'Essential strategies for preventing ransomware and recovering from attacks.',
    tags: ['ransomware', 'backup', 'recovery', 'encryption'],
    threatTypes: ['Ransomware Detected'],
    steps: [
      {
        order: 1,
        title: 'Maintain Regular Backups',
        description: 'Keep offline backups of all critical data following the 3-2-1 rule.',
      },
      {
        order: 2,
        title: 'Isolate Infected Systems',
        description: 'Immediately disconnect affected systems from the network.',
        warning: 'Do not pay the ransom - there\'s no guarantee you\'ll get your data back.',
      },
      {
        order: 3,
        title: 'Identify the Ransomware Variant',
        description: 'Use tools like ID Ransomware to identify the specific variant.',
      },
      {
        order: 4,
        title: 'Check for Decryption Tools',
        description: 'Visit No More Ransom Project for available decryption tools.',
      },
      {
        order: 5,
        title: 'Restore from Backup',
        description: 'After removing the ransomware, restore data from clean backups.',
      },
    ],
    published: true,
    featured: true,
  },
  {
    title: 'Zero-Day Vulnerability Response Protocol',
    slug: 'zero-day-response-protocol',
    category: 'incident-response',
    content: `When a zero-day vulnerability is discovered, rapid response is critical. This protocol outlines immediate actions and long-term mitigation strategies.`,
    summary: 'Emergency response procedures for zero-day vulnerability exploitation.',
    tags: ['zero-day', 'vulnerability', 'patching', 'emergency'],
    threatTypes: ['Zero-Day Exploit'],
    steps: [
      {
        order: 1,
        title: 'Assess the Impact',
        description: 'Determine which systems are affected by the vulnerability.',
      },
      {
        order: 2,
        title: 'Implement Temporary Mitigations',
        description: 'Apply workarounds or disable affected features until patches are available.',
      },
      {
        order: 3,
        title: 'Monitor for Exploitation',
        description: 'Increase monitoring on affected systems for signs of exploitation.',
      },
      {
        order: 4,
        title: 'Apply Patches Immediately',
        description: 'As soon as patches become available, test and deploy them.',
      },
      {
        order: 5,
        title: 'Conduct Post-Incident Review',
        description: 'Review logs to determine if exploitation occurred before mitigation.',
      },
    ],
    published: true,
  },
  {
    title: 'Security Information and Event Management (SIEM) Best Practices',
    slug: 'siem-best-practices',
    category: 'tools',
    content: `Effective SIEM implementation and management is crucial for threat detection and incident response. Learn how to maximize the value of your SIEM solution.`,
    summary: 'Optimize your SIEM deployment for maximum security visibility and threat detection.',
    tags: ['siem', 'monitoring', 'log-management', 'threat-detection'],
    threatTypes: [],
    published: true,
  },
];

async function seedKnowledgeBase() {
  try {
    await connectDB();

    console.log('Clearing existing articles...');
    await KnowledgeBaseArticle.deleteMany({});

    console.log('Seeding knowledge base articles...');
    for (const article of sampleArticles) {
      await KnowledgeBaseArticle.create(article);
      console.log(`✓ Created: ${article.title}`);
    }

    console.log(`\n✨ Successfully seeded ${sampleArticles.length} knowledge base articles!`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding knowledge base:', error);
    process.exit(1);
  }
}

seedKnowledgeBase();
