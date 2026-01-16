const { google } = require('googleapis');
const axios = require('axios');
const Email = require('../models/Email');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const googleAuthService = require('./googleAuth');
const phishingScanner = require('./phishingScanner');

class GmailService {
  constructor() {
    this.gmail = null;
  }

  async initializeGmail(userId) {
    try {
      const accessToken = await googleAuthService.getValidAccessToken(userId);

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({ access_token: accessToken });
      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      return true;
    } catch (error) {
      console.error('Failed to initialize Gmail API:', error);
      return false;
    }
  }

  async getEmails(userId, query = '', maxResults = 500, pageToken = null) {
    try {
      if (!await this.initializeGmail(userId)) {
        throw new Error('Failed to initialize Gmail API');
      }

      const requestParams = {
        userId: 'me',
        maxResults: maxResults
      };

      // Add query only if provided and not empty
      if (query && query.trim()) {
        requestParams.q = query;
      }

      // Add page token for pagination
      if (pageToken) {
        requestParams.pageToken = pageToken;
      }

      const response = await this.gmail.users.messages.list(requestParams);

      const messages = response.data.messages || [];
      const emails = [];

      for (const message of messages) {
        try {
          const emailData = await this.getEmailDetails(message.id);
          if (emailData) {
            emails.push(emailData);
          }
        } catch (error) {
          console.error(`Error fetching email ${message.id}:`, error);
        }
      }

      return {
        emails: emails,
        nextPageToken: response.data.nextPageToken || null,
        totalMessages: messages.length
      };
    } catch (error) {
      console.error('Error getting emails:', error);

      // Check for insufficient permissions (403) - includes metadata scope issues
      if (error.status === 403 || error.code === 403) {
        const errorMessage = error.message || '';
        const responseMessage = error.response?.data?.error?.message || '';
        const errorArray = error.errors?.[0]?.message || '';

        // Check for various permission-related errors
        const permissionErrors = [
          'Insufficient Permission',
          'insufficientPermissions',
          "Metadata scope does not support 'q' parameter",
          'PERMISSION_DENIED'
        ];

        const hasPermissionError = permissionErrors.some(errorText =>
          errorMessage.includes(errorText) ||
          responseMessage.includes(errorText) ||
          errorArray.includes(errorText)
        );

        if (hasPermissionError) {
          throw new Error('GMAIL_REAUTH_REQUIRED');
        }
      }

      // Check if it's an authentication error
      if (error.status === 401 || error.code === 401) {
        throw new Error('Gmail authentication failed. Please re-authorize the application.');
      }

      throw new Error('Failed to fetch emails from Gmail');
    }
  }

  async getEmailDetails(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      const headers = message.payload.headers;

      const getHeader = (name) => {
        const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return header ? header.value : '';
      };

      const fromHeader = getHeader('From');
      const fromMatch = fromHeader.match(/([^<]+)?<([^>]+)>/);

      let fromName = '';
      let fromEmail = '';

      if (fromMatch) {
        fromName = fromMatch[1] ? fromMatch[1].trim().replace(/"/g, '') : '';
        fromEmail = fromMatch[2];
      } else {
        fromEmail = fromHeader;
      }

      const body = this.extractEmailBody(message.payload);

      return {
        messageId: message.id,
        threadId: message.threadId,
        from: {
          name: fromName,
          email: fromEmail.toLowerCase()
        },
        subject: getHeader('Subject') || '(No Subject)',
        snippet: message.snippet || '',
        body: body,
        receivedDate: new Date(parseInt(message.internalDate)),
        labels: message.labelIds || []
      };
    } catch (error) {
      console.error('Error getting email details:', error);
      return null;
    }
  }

  extractEmailBody(payload) {
    let body = '';

    if (payload.body && payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString();
    } else if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          body += Buffer.from(part.body.data, 'base64').toString();
        } else if (part.parts) {
          body += this.extractEmailBody(part);
        }
      }
    }

    return body;
  }

  async scanForSubscriptions(userId, daysBack = 90) {
    try {
      console.log(`🔍 Starting SMART email scan for user ${userId} (${daysBack} days back)`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      // SMART APPROACH: Use targeted queries for faster results
      console.log('📧 Using targeted company extraction queries...');
      const emails = await this.getCompanyEmailsEfficiently(userId, cutoffDate);

      console.log(`✅ Found ${emails.length} company emails to process`);

      // Process emails in smaller batches for better performance
      const processedEmails = [];
      const uniqueCompanies = new Set();
      const batchSize = 20; // Process 20 emails at a time

      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(emails.length / batchSize)} (${batch.length} emails)`);

        for (const emailData of batch) {
          try {
            const email = await this.processAndStoreEmail(userId, emailData, whitelist, blacklist);
            if (email) {
              processedEmails.push(email);

              // Extract company info
              if (email.processingResults?.extractedService?.domain) {
                uniqueCompanies.add(email.processingResults.extractedService.domain);
              }
            }
          } catch (error) {
            console.error('Error processing email:', error.message);
          }
        }

        // Small delay between batches
        if (i + batchSize < emails.length) {
          await this.delay(500);
        }

        console.log(`📊 Progress: ${Math.min(i + batchSize, emails.length)}/${emails.length} emails | Found ${uniqueCompanies.size} companies`);
      }

      console.log(`✅ Smart scan complete! Processed ${processedEmails.length} emails from ${uniqueCompanies.size} unique companies`);
      return processedEmails;
    } catch (error) {
      console.error('Error scanning for subscriptions:', error);

      // Preserve specific reauth error
      if (error.message === 'GMAIL_REAUTH_REQUIRED') {
        throw error;
      }

      throw new Error('Failed to scan emails for subscriptions');
    }
  }

  // NEW METHOD: Efficient company email extraction
  async getCompanyEmailsEfficiently(userId, cutoffDate) {
    const allEmails = [];

    // Targeted queries that specifically look for company emails
    const companyQueries = [
      // No-reply addresses (most companies use these)
      'from:no-reply OR from:noreply OR from:"do-not-reply"',

      // Common service domains
      'from:amazonaws.com OR from:github.com OR from:google.com OR from:microsoft.com',
      'from:stripe.com OR from:paypal.com OR from:mongodb.com OR from:railway.app',
      'from:replit.com OR from:vercel.com OR from:netlify.com OR from:heroku.com',

      // Business email patterns
      'from:hello OR from:support OR from:team OR from:info OR from:updates',

      // Newsletter and notification patterns
      'newsletter OR notification OR "account created" OR billing OR invoice'
    ];

    for (let i = 0; i < companyQueries.length; i++) {
      const query = companyQueries[i];
      console.log(`📧 Query ${i + 1}/${companyQueries.length}: ${query.substring(0, 40)}...`);

      try {
        const result = await this.getEmails(userId, `${query} after:${this.formatDateForGmail(cutoffDate)}`, 100);
        const emails = result.emails || result; // Handle both old and new return formats

        allEmails.push(...emails);
        console.log(`✅ Found ${emails.length} emails`);

        // Short delay between queries
        await this.delay(300);

      } catch (error) {
        console.error(`❌ Error with query ${i + 1}:`, error.message);
      }
    }

    // Remove duplicates
    const uniqueEmails = this.removeDuplicateEmails(allEmails);
    console.log(`🔄 Found ${uniqueEmails.length} unique emails from ${allEmails.length} total`);

    return uniqueEmails;
  }

  // OLD METHOD - keeping for backwards compatibility but not used
  async getAllEmailsPaginated(userId, cutoffDate) {
    const allEmails = [];
    let pageToken = null;
    let pageCount = 0;
    const maxPages = 50; // Safety limit to prevent infinite loops

    try {
      do {
        pageCount++;
        console.log(`📄 Fetching page ${pageCount}...`);

        // Get emails without any query to get EVERYTHING
        const result = await this.getEmails(userId, '', 500, pageToken);
        const pageEmails = result.emails;

        // Filter by date if cutoff is specified
        const filteredEmails = pageEmails.filter(email => {
          return !cutoffDate || email.receivedDate >= cutoffDate;
        });

        allEmails.push(...filteredEmails);
        pageToken = result.nextPageToken;

        console.log(`📧 Page ${pageCount}: ${filteredEmails.length}/${pageEmails.length} emails (after date filter)`);
        console.log(`📊 Total emails collected: ${allEmails.length}`);

        // Add delay to respect rate limits (reduced from 1000ms)
        await this.delay(250);

        // Safety break
        if (pageCount >= maxPages) {
          console.log(`⚠️ Reached maximum page limit (${maxPages}). Stopping scan.`);
          break;
        }

      } while (pageToken);

      console.log(`🎯 Total emails collected from ${pageCount} pages: ${allEmails.length}`);
      return allEmails;

    } catch (error) {
      console.error('Error in getAllEmailsPaginated:', error);
      console.log(`📊 Returning ${allEmails.length} emails collected before error`);
      return allEmails;
    }
  }

  async processAndStoreEmail(userId, emailData, whitelist = [], blacklist = []) {
    try {
      // Check if email already exists
      const existingEmail = await Email.findOne({ messageId: emailData.messageId });
      if (existingEmail) {
        return existingEmail;
      }

      // Analyze email content
      const analysis = await this.analyzeEmailContent(emailData);

      // Create email record
      // Validate analysis data
      const cleanAnalysis = {
        ...analysis,
        confidence: isNaN(analysis.confidence) ? 0.2 : Math.max(0, Math.min(1, analysis.confidence)),
        category: analysis.category || 'other'
      };

      const email = new Email({
        userId,
        messageId: emailData.messageId,
        threadId: emailData.threadId,
        from: emailData.from,
        subject: emailData.subject || '(No Subject)',
        snippet: emailData.snippet || '',
        body: emailData.body || '',
        receivedDate: emailData.receivedDate,
        labels: emailData.labels || [],
        category: cleanAnalysis.category,
        processed: true,
        processingResults: {
          confidence: cleanAnalysis.confidence,
          extractedService: cleanAnalysis.service || {},
          keywords: cleanAnalysis.keywords || [],
          urls: cleanAnalysis.urls || { unsubscribe: [], revoke: [], manage: [] },
          aiAnalysis: cleanAnalysis.aiAnalysis || {},
          financials: cleanAnalysis.financials || {}
        }
      });

      await email.save();

      // Create or update subscription for ANY service (very low threshold to capture ALL companies)
      // Check whitelist/blacklist
      const isAllowed = !whitelist.some(item =>
        (analysis.service?.domain && analysis.service.domain.toLowerCase().includes(item.toLowerCase())) ||
        (emailData.from.email && emailData.from.email.toLowerCase().includes(item.toLowerCase()))
      );

      const isBlocked = blacklist.some(item =>
        (analysis.service?.domain && analysis.service.domain.toLowerCase().includes(item.toLowerCase())) ||
        (emailData.from.email && emailData.from.email.toLowerCase().includes(item.toLowerCase()))
      );

      // Create or update subscription if allowed
      if (analysis.service && analysis.service.domain) {
        if (!isAllowed) {
          console.log(`🛡️ Ignoring whitelisted service: ${analysis.service.domain}`);
        } else {
          // If blacklisted, boost confidence
          if (isBlocked) analysis.confidence = 1.0;

          if (analysis.confidence > 0.1) {
            await this.createOrUpdateSubscription(userId, analysis.service, email);
          }
        }
      }

      return email;
    } catch (error) {
      console.error('Error processing and storing email:', error);
      return null;
    }
  }

  async analyzeEmailContent(emailData) {
    try {
      const text = `${emailData.subject} ${emailData.snippet} ${emailData.body}`.toLowerCase();

      // Extract and consolidate domain from sender
      const originalDomain = emailData.from.email.split('@')[1];
      const consolidatedDomain = this.consolidateDomain(originalDomain);

      // Determine category based on keywords
      const category = this.categorizeEmail(text);

      // Extract service information using consolidated domain
      const serviceName = this.extractServiceName(emailData.from.email, emailData.subject, emailData.from.name);

      // Extract URLs
      const urls = this.extractUrls(emailData.body);

      // Get keywords
      const keywords = this.extractKeywords(text);

      // Extract Financials
      const financials = this.extractFinancials(text);

      return {
        category,
        confidence: this.calculateConfidence(text, category),
        service: {
          name: serviceName,
          domain: consolidatedDomain, // Use consolidated domain
          category: category
        },
        keywords,
        keywords,
        urls,
        financials,
        aiAnalysis: {} // AI analysis disabled for performance
      };
    } catch (error) {
      console.error('Error analyzing email content:', error);
      return {
        category: 'other',
        confidence: 0.1,
        service: null,
        keywords: [],
        urls: { unsubscribe: [], revoke: [], manage: [] },
        aiAnalysis: {}
      };
    }
  }

  categorizeEmail(text) {
    const categories = {
      subscription: ['subscription', 'subscribe', 'unsubscribe', 'newsletter', 'weekly', 'monthly'],
      verification: ['verify', 'verification', 'confirm', 'confirmation', 'activate', 'account created'],
      login: ['login', 'signin', 'sign in', 'logged in', 'access', 'security'],
      signup: ['signup', 'sign up', 'welcome', 'getting started', 'account setup'],
      billing: ['billing', 'invoice', 'payment', 'receipt', 'subscription', 'renewal', 'charge'],
      newsletter: ['newsletter', 'digest', 'update', 'news', 'weekly', 'monthly']
    };

    let maxScore = 0;
    let bestCategory = 'other';

    for (const [category, keywords] of Object.entries(categories)) {
      const score = keywords.reduce((sum, keyword) => {
        return sum + (text.includes(keyword) ? 1 : 0);
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }

    return bestCategory;
  }

  // Dynamic domain consolidation - intelligently groups subdomains to main domains
  consolidateDomain(domain) {
    if (!domain) return domain;

    const lowerDomain = domain.toLowerCase();

    // Skip personal email providers (don't consolidate these)
    const personalProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com'];
    if (personalProviders.includes(lowerDomain)) {
      return lowerDomain;
    }

    // Special cases for known patterns
    if (lowerDomain.includes('amazonaws.com') || lowerDomain.includes('.aws')) {
      return 'amazonaws.com'; // All AWS services -> amazonaws.com
    }
    if (lowerDomain.includes('googlemail.com') || lowerDomain.includes('accounts.google.com')) {
      return 'google.com'; // Google services -> google.com  
    }

    // Smart subdomain detection and consolidation
    const parts = lowerDomain.split('.');

    if (parts.length >= 3) {
      // For domains like mail.company.com, news.company.com -> company.com
      // Take the last two meaningful parts
      const potentialRoot = parts.slice(-2).join('.');

      // Common subdomain patterns that should be consolidated
      const commonSubdomains = [
        'mail', 'email', 'noreply', 'no-reply', 'donotreply', 'do-not-reply',
        'news', 'newsletter', 'updates', 'notifications', 'alerts', 'notify',
        'support', 'help', 'info', 'hello', 'team', 'accounts',
        'messages', 'communications', 'engage', 'marketing',
        'billing', 'invoices', 'payments', 'receipts',
        'security', 'admin', 'system', 'automated',
        'api', 'services', 'platform', 'app', 'apps',
        'www', 'web', 'portal', 'dashboard', 'console',
        'signup', 'login', 'auth', 'reply', 'email2'
      ];

      const subdomain = parts[0];

      // If it's a common subdomain pattern, use the root domain
      if (commonSubdomains.includes(subdomain)) {
        return potentialRoot;
      }

      // For AWS-style domains (service.region.amazonaws.com -> amazonaws.com)
      if (parts.length >= 4 && parts[parts.length - 2] === 'amazonaws') {
        return 'amazonaws.com';
      }

      // For other complex subdomains, check if subdomain looks generic
      if (subdomain.length <= 4 ||
        /^[a-z]{1,3}[0-9]*$/.test(subdomain) || // Short codes like 'us', 'eu', 'api1'
        /^(www|app|web|mail|email|e)$/.test(subdomain)) {
        return potentialRoot;
      }
    }

    return lowerDomain;
  }

  // Enhanced service name extraction with domain consolidation
  extractServiceName(emailAddress, subject, fromName) {
    // Get consolidated domain
    const originalDomain = emailAddress.split('@')[1];
    const consolidatedDomain = this.consolidateDomain(originalDomain);
    const domainParts = consolidatedDomain.split('.');

    // Try to extract from "from" name first (most reliable)
    if (fromName && fromName.length > 0 && !fromName.includes('@')) {
      // Clean up the from name
      let cleanName = fromName.replace(/['"<>]/g, '').trim();

      // Remove common words but keep meaningful content
      const removeWords = ['team', 'support', 'no-reply', 'noreply', 'info', 'hello', 'hi'];
      removeWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        cleanName = cleanName.replace(regex, '').trim();
      });

      if (cleanName && cleanName.length > 1) {
        return this.capitalizeServiceName(cleanName);
      }
    }

    // Extract from subject line if it contains company indicators
    if (subject) {
      // Look for patterns like "Welcome to [Company]", "[Company] Update", etc.
      const subjectPatterns = [
        /welcome to ([^,\.\!]+)/i,
        /from ([^,\.\!]+)/i,
        /^([^-]+) -/i,
        /\[([^\]]+)\]/i
      ];

      for (const pattern of subjectPatterns) {
        const match = subject.match(pattern);
        if (match && match[1] && match[1].trim().length > 1) {
          const extracted = match[1].trim();
          if (!extracted.toLowerCase().includes('email') &&
            !extracted.toLowerCase().includes('mail') &&
            extracted.length < 30) {
            return this.capitalizeServiceName(extracted);
          }
        }
      }
    }

    // Extract from domain (last resort)
    // Remove common email service domains and generic domains
    const excludeDomains = ['gmail', 'yahoo', 'hotmail', 'outlook', 'mail', 'email', 'com', 'net', 'org', 'co', 'io'];
    let serviceName = domainParts.find(part =>
      !excludeDomains.includes(part.toLowerCase()) &&
      part.length > 2
    );

    if (!serviceName && domainParts.length > 0) {
      serviceName = domainParts[0];
    }

    // Clean up and format service name
    if (serviceName) {
      return this.capitalizeServiceName(serviceName);
    }

    return 'Unknown Service';
  }

  capitalizeServiceName(name) {
    // Handle special cases
    const specialCases = {
      'aws': 'AWS',
      'api': 'API',
      'ai': 'AI',
      'ui': 'UI',
      'ux': 'UX',
      'sms': 'SMS',
      'cdn': 'CDN',
      'sdk': 'SDK',
      'crm': 'CRM'
    };

    const lowerName = name.toLowerCase();
    if (specialCases[lowerName]) {
      return specialCases[lowerName];
    }

    // Clean up service name
    let cleanName = name.replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Capitalize each word
    return cleanName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  extractUrls(text) {
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;
    const urls = text.match(urlRegex) || [];

    return {
      unsubscribe: urls.filter(url => url.toLowerCase().includes('unsubscribe')),
      revoke: urls.filter(url => url.toLowerCase().includes('revoke') || url.toLowerCase().includes('remove')),
      manage: urls.filter(url => url.toLowerCase().includes('manage') || url.toLowerCase().includes('preference'))
    };
  }

  extractKeywords(text) {
    const keywords = [];
    const commonKeywords = [
      'subscription', 'newsletter', 'unsubscribe', 'verify', 'login',
      'signup', 'billing', 'payment', 'account', 'service', 'welcome'
    ];

    for (const keyword of commonKeywords) {
      if (text.includes(keyword)) {
        keywords.push(keyword);
      }
    }

    return keywords;
  }

  extractFinancials(text) {
    const financials = {
      cost: 0,
      currency: 'USD',
      period: 'unknown',
      confidence: 0
    };

    const symbols = { '$': 'USD', '€': 'EUR', '£': 'GBP', '₹': 'INR' };
    const priceRegex = /([$€£₹])\s*(\d{1,5}(?:[.,]\d{2})?)/gi;

    // Limit text scan to first 2000 chars for relevance
    const scanText = text.substring(0, 2000);

    let match;
    const matches = [];

    while ((match = priceRegex.exec(scanText)) !== null) {
      matches.push({
        symbol: match[1],
        amount: parseFloat(match[2].replace(/,/g, '')), // simplified normalization
        index: match.index
      });
    }

    if (matches.length > 0) {
      // Heuristic: Highest amount is likely the total
      const bestMatch = matches.reduce((prev, current) => (prev.amount > current.amount) ? prev : current);

      if (bestMatch.amount > 0) {
        financials.cost = bestMatch.amount;
        financials.currency = symbols[bestMatch.symbol] || 'USD';
        financials.confidence = 0.8;
      }
    }

    // Period Detection
    if (/(month|mo\b|monthly)/i.test(scanText)) financials.period = 'monthly';
    else if (/(year|yr\b|annual|annually)/i.test(scanText)) financials.period = 'yearly';

    return financials;
  }

  calculateConfidence(text, category) {
    const categoryKeywords = {
      subscription: ['unsubscribe', 'subscription', 'newsletter'],
      verification: ['verify', 'confirm', 'activate'],
      login: ['login', 'signin', 'logged'],
      signup: ['signup', 'welcome', 'getting started'],
      billing: ['billing', 'payment', 'invoice'],
      newsletter: ['newsletter', 'digest', 'update'],
      promotional: ['sale', 'discount', 'offer', 'promo'],
      other: ['email', 'message', 'notification']
    };

    const keywords = categoryKeywords[category] || categoryKeywords['other'];

    // Prevent division by zero
    if (keywords.length === 0) {
      return 0.2; // Default low confidence for unknown categories
    }

    const matches = keywords.filter(keyword => text.includes(keyword)).length;
    const confidence = Math.min(matches / keywords.length * 0.8 + 0.2, 1.0);

    // Ensure we return a valid number between 0 and 1
    return isNaN(confidence) ? 0.2 : Math.max(0, Math.min(1, confidence));
  }

  async performAIAnalysis(text) {
    try {
      if (!process.env.HUGGING_FACE_API_KEY) {
        return { sentiment: 'neutral', classification: 'unknown' };
      }

      // Use Hugging Face API for text classification
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${process.env.HF_MODEL_NAME || 'facebook/bart-large-mnli'}`,
        {
          inputs: text.substring(0, 512), // Limit input length
          parameters: {
            candidate_labels: ["subscription", "newsletter", "verification", "login", "billing", "promotional"]
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return {
        classification: response.data.labels?.[0] || 'unknown',
        confidence: response.data.scores?.[0] || 0.5,
        sentiment: 'neutral' // Could add sentiment analysis here
      };
    } catch (error) {
      console.error('Hugging Face API error:', error);
      return { sentiment: 'neutral', classification: 'unknown' };
    }
  }

  async createOrUpdateSubscription(userId, serviceInfo, email) {
    try {
      const domain = serviceInfo.domain;
      const serviceName = serviceInfo.name;

      // Find existing subscription by domain ONLY (ensure unique companies)
      let subscription = await Subscription.findOne({
        userId,
        domain: domain,
        isActive: true
      });

      if (subscription) {
        // Update existing subscription
        subscription.lastEmailReceived = email.receivedDate;
        subscription.emailCount += 1;
        subscription.category = serviceInfo.category;

        // Update service name if the new one is better (longer, more descriptive)
        if (serviceName.length > subscription.serviceName.length &&
          !serviceName.toLowerCase().includes('unknown')) {
          subscription.serviceName = serviceName;
        }

        // Run Phishing Analysis
        const phishingAnalysis = await phishingScanner.analyzeEmail({
          sender: email.from.name ? `${email.from.name} <${email.from.email}>` : email.from.email,
          subject: email.subject,
          snippet: email.snippet,
          links: [
            ...(email.processingResults?.urls?.unsubscribe || []),
            ...(email.processingResults?.urls?.revoke || []),
            ...(email.processingResults?.urls?.manage || [])
          ]
        });

        // Update security analysis if risk is higher or analysis is missing
        if (!subscription.securityAnalysis ||
          !subscription.securityAnalysis.lastAnalyzed ||
          phishingAnalysis.riskScore > (subscription.securityAnalysis.riskScore || 0)) {
          subscription.securityAnalysis = phishingAnalysis;
        }

        console.log(`🔄 Updated subscription: ${subscription.serviceName} (${domain})`);
      } else {
        // Create new subscription - ensuring unique domain
        subscription = new Subscription({
          userId,
          serviceName: serviceName,
          serviceEmail: email.from.email,
          domain: domain,
          category: serviceInfo.category,
          status: 'active',
          isActive: true,
          firstDetected: email.receivedDate,
          lastEmailReceived: email.receivedDate,
          emailCount: 1,
          unsubscribeUrl: email.processingResults?.urls?.unsubscribe?.[0] || '',
          metadata: {
            confidence: email.processingResults?.confidence || 0.5,
            extractedFrom: {
              messageId: email.messageId,
              subject: email.subject,
              snippet: email.snippet
            }
          },
          securityAnalysis: await phishingScanner.analyzeEmail({
            sender: email.from.name ? `${email.from.name} <${email.from.email}>` : email.from.email,
            subject: email.subject,
            snippet: email.snippet,
            links: [
              ...(email.processingResults?.urls?.unsubscribe || []),
              ...(email.processingResults?.urls?.revoke || []),
              ...(email.processingResults?.urls?.manage || [])
            ]
          })
        });

        console.log(`📝 Creating new subscription: ${serviceName} (${domain})`);
      }

      await subscription.save();

      // Link email to subscription
      email.subscriptionId = subscription._id;
      await email.save();

      return subscription;
    } catch (error) {
      console.error('Error creating/updating subscription:', error);
      return null;
    }
  }

  // Utility function for adding delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formatDateForGmail(date) {
    return date.toISOString().split('T')[0];
  }

  removeDuplicateEmails(emails) {
    const seen = new Set();
    return emails.filter(email => {
      if (seen.has(email.messageId)) {
        return false;
      }
      seen.add(email.messageId);
      return true;
    });
  }
}

module.exports = new GmailService();
