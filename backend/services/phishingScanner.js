const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const SAFE_BROWSING_API_KEY = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
const SAFE_BROWSING_URL = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${SAFE_BROWSING_API_KEY}`;

// Import FalsePositive model for checking user feedback
let FalsePositive;
try {
  FalsePositive = require('../models/FalsePositive');
} catch (error) {
  console.warn('FalsePositive model not available:', error.message);
}

// Mock database of trusted domains for comparison (could be expanded)
const TRUSTED_DOMAINS = {
    'google': ['google.com', 'gmail.com', 'accounts.google.com'],
    'paypal': ['paypal.com', 'intl.paypal.com'],
    'apple': ['apple.com', 'icloud.com'],
    'amazon': ['amazon.com', 'amazon.co.uk', 'amazon.in'],
    'microsoft': ['microsoft.com', 'xbox.com', 'office.com', 'outlook.com'],
    'netflix': ['netflix.com'],
    'facebook': ['facebook.com', 'fb.com'],
};

// Heuristic keyword lists
const URGENCY_KEYWORDS = ['urgent', 'immediate', 'suspend', 'restrict', 'verify', 'lock', 'unauthorized', 'breach', 'action create', '24 hours', 'account limited'];
const SENSITIVE_KEYWORDS = ['password', 'card', 'bank', 'identity', 'social security', 'ssn', 'credit card', 'confirm details'];

/**
 * Check if email has been previously reported as false positive
 * @param {string} senderEmail - Email address of sender
 * @param {string} subject - Email subject
 * @param {string} userId - Optional user ID for user-specific checks
 * @returns {Object} False positive check result
 */
const checkFalsePositiveHistory = async (senderEmail, subject, userId = null) => {
    if (!FalsePositive) {
        return { isFalsePositive: false, confidence: 0, reports: [] };
    }

    try {
        const query = {
            'emailData.from.email': senderEmail.toLowerCase(),
            status: { $in: ['accepted', 'reviewed'] }
        };

        // Add user-specific check if userId provided
        if (userId) {
            query.userId = userId;
        }

        // Check for similar subject patterns
        if (subject) {
            query['emailData.subject'] = { 
                $regex: new RegExp(subject.substring(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') 
            };
        }

        const reports = await FalsePositive.find(query)
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        if (reports.length > 0) {
            // Calculate confidence based on number of reports and recency
            const recentReports = reports.filter(r => {
                const daysSince = (Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                return daysSince < 90; // Reports within last 90 days
            });

            const confidence = Math.min(recentReports.length * 25, 100);

            return {
                isFalsePositive: recentReports.length > 0,
                confidence,
                reports: recentReports,
                suggestion: confidence >= 75 
                    ? 'High confidence false positive - consider skipping alert' 
                    : 'Possible false positive - proceed with lower risk score'
            };
        }

        return { isFalsePositive: false, confidence: 0, reports: [] };
    } catch (error) {
        console.error('Error checking false positive history:', error);
        return { isFalsePositive: false, confidence: 0, reports: [] };
    }
};

/**
 * analyzeEmail
 * Analyzes an email for phishing indicators using heuristics and API checks.
 * 
 * @param {Object} emailData
 * @param {string} emailData.sender - "Name <email@domain.com>" or "email@domain.com"
 * @param {string} emailData.subject - Subject line
 * @param {string} emailData.snippet - Extracted body snippet
 * @param {string[]} emailData.links - Array of URLs found in the email
 * @param {string} emailData.userId - Optional user ID for false positive checking
 * @param {string} emailData.messageId - Optional message ID for reference
 * @returns {Object} Security analysis result
 */
const analyzeEmail = async ({ sender, subject, snippet, links = [], userId = null, messageId = null }) => {
    const indicators = [];
    let riskScore = 0;
    let riskLevel = 'low';

    // Extract domain from sender
    const senderMatch = sender.match(/<(.+?)>|(\S+@\S+)/);
    const senderEmail = senderMatch ? (senderMatch[1] || senderMatch[2]) : sender;
    const senderDomain = senderEmail.split('@')[1]?.toLowerCase();

    if (!senderDomain) {
        indicators.push('Invalid Sender Format');
        riskScore += 20;
    }

    // Check false positive history before full analysis
    let falsePositiveCheck = { isFalsePositive: false, confidence: 0, reports: [] };
    if (senderEmail && FalsePositive) {
        falsePositiveCheck = await checkFalsePositiveHistory(senderEmail, subject, userId);
        
        if (falsePositiveCheck.isFalsePositive && falsePositiveCheck.confidence >= 75) {
            // High confidence false positive - reduce risk significantly
            console.log(`📊 False positive detected for ${senderEmail} (confidence: ${falsePositiveCheck.confidence}%)`);
            return {
                riskScore: 0,
                riskLevel: 'low',
                isPhishing: false,
                phishingIndicators: [],
                safeBrowsingStatus: 'not_checked',
                lastAnalyzed: new Date(),
                falsePositiveOverride: true,
                falsePositiveData: {
                    confidence: falsePositiveCheck.confidence,
                    reportCount: falsePositiveCheck.reports.length,
                    message: 'Previously reported as false positive by users'
                }
            };
        } else if (falsePositiveCheck.isFalsePositive && falsePositiveCheck.confidence >= 50) {
            // Moderate confidence - reduce risk score by 40%
            console.log(`📊 Possible false positive for ${senderEmail} (confidence: ${falsePositiveCheck.confidence}%)`);
        }
    }

    // 1. Heuristic: Urgency Analysis
    const combinedText = `${subject} ${snippet}`.toLowerCase();
    let urgencyCount = 0;
    URGENCY_KEYWORDS.forEach(word => {
        if (combinedText.includes(word)) urgencyCount++;
    });

    if (urgencyCount > 0) {
        const points = Math.min(urgencyCount * 10, 30);
        riskScore += points;
        indicators.push(`Urgent Language Detected (${urgencyCount} matches)`);
    }

    // 2. Heuristic: Sensitive Info Request
    if (SENSITIVE_KEYWORDS.some(word => combinedText.includes(word))) {
        riskScore += 20;
        indicators.push('Request for Sensitive Information');
    }

    // 3. Heuristic: Domain Mismatch (Brand Impersonation)
    // Check if sender name contains a major brand but domain is not on trusted list
    for (const [brand, domains] of Object.entries(TRUSTED_DOMAINS)) {
        if (sender.toLowerCase().includes(brand)) {
            if (senderDomain && !domains.some(d => senderDomain.endsWith(d))) {
                riskScore += 50; // High penalty for imposters
                indicators.push(`Brand Impersonation: ${brand}`);
                riskLevel = 'high'; // Immediate flag
            }
        }
    }

    // 4. Google Safe Browsing Check (if API key exists and links present)
    let safeBrowsingStatus = 'unknown';
    if (links.length > 0 && SAFE_BROWSING_API_KEY) {
        try {
            const threatMatches = await checkUrlsWithSafeBrowsing(links);
            if (threatMatches.length > 0) {
                riskScore = 100;
                riskLevel = 'critical';
                indicators.push('Malicious URL Detected (Google Safe Browsing)');
                safeBrowsingStatus = 'unsafe';
            } else {
                safeBrowsingStatus = 'safe';
            }
        } catch (error) {
            console.error('Safe Browsing API Error:', error.message);
            // Don't fail the whole check, just log it
        }
    } else if (!SAFE_BROWSING_API_KEY) {
        // Mock behavior for testing without API key
        console.warn('Safe Browsing API Key missing - skipping URL check');
    }

    // Calculate Final Risk Level
    if (riskScore >= 80) riskLevel = 'critical';
    else if (riskScore >= 50 && riskLevel !== 'critical') riskLevel = 'high';
    else if (riskScore >= 20 && riskLevel !== 'critical' && riskLevel !== 'high') riskLevel = 'medium';

    // Apply false positive risk reduction if applicable
    if (falsePositiveCheck.isFalsePositive && falsePositiveCheck.confidence >= 50) {
        const reductionFactor = falsePositiveCheck.confidence / 100;
        riskScore = Math.max(0, riskScore * (1 - reductionFactor * 0.4));
        
        // Recalculate risk level after reduction
        if (riskScore >= 80) riskLevel = 'critical';
        else if (riskScore >= 50) riskLevel = 'high';
        else if (riskScore >= 20) riskLevel = 'medium';
        else riskLevel = 'low';
        
        indicators.push(`Risk adjusted due to false positive history (${falsePositiveCheck.reports.length} reports)`);
    }

    return {
        riskScore: Math.min(riskScore, 100),
        riskLevel,
        isPhishing: riskLevel === 'high' || riskLevel === 'critical',
        phishingIndicators: indicators,
        safeBrowsingStatus,
        lastAnalyzed: new Date(),
        falsePositiveData: falsePositiveCheck.confidence > 0 ? {
            confidence: falsePositiveCheck.confidence,
            reportCount: falsePositiveCheck.reports.length,
            adjusted: true
        } : undefined
    };
};

/**
 * checkUrlsWithSafeBrowsing
 * Calls Google Safe Browsing API V4
 */
const checkUrlsWithSafeBrowsing = async (urls) => {
    const requestBody = {
        client: {
            clientId: "breachbuddy",
            clientVersion: "1.0.0"
        },
        threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: urls.map(url => ({ url }))
        }
    };

    const response = await axios.post(SAFE_BROWSING_URL, requestBody);
    return response.data.matches || [];
};

module.exports = {
    analyzeEmail,
    checkFalsePositiveHistory
};
