import axios from 'axios';

class AIAnalysisService {
  constructor() {
    this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
    this.model = process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-2-7b-chat-hf';
    this.apiUrl = `https://api-inference.huggingface.co/models/${this.model}`;
  }

  /**
   * Generate AI-powered risk analysis from vulnerability data
   */
  async analyzeVulnerabilities(vulnerabilities, domainData, scanData) {
    try {
      if (!this.huggingfaceApiKey) {
        console.warn('Hugging Face API key not configured, using fallback analysis');
        return this.getFallbackAnalysis(vulnerabilities);
      }

      console.log(`🤖 Starting Hugging Face AI analysis for ${vulnerabilities.length} vulnerabilities`);

      // Prepare the data for analysis
      const analysisData = this.prepareAnalysisData(vulnerabilities, domainData, scanData);
      
      // Generate the analysis
      const analysis = await this.generateAnalysis(analysisData);
      
      console.log('✅ Hugging Face AI analysis completed');
      return analysis;

    } catch (error) {
      console.error('Hugging Face AI analysis failed:', error.message);
      return this.getFallbackAnalysis(vulnerabilities);
    }
  }

  /**
   * Prepare vulnerability data for AI analysis
   */
  prepareAnalysisData(vulnerabilities, domainData, scanData) {
    // Group vulnerabilities by severity
    const severityGroups = {
      critical: vulnerabilities.filter(v => v.severity === 'critical'),
      high: vulnerabilities.filter(v => v.severity === 'high'),
      medium: vulnerabilities.filter(v => v.severity === 'medium'),
      low: vulnerabilities.filter(v => v.severity === 'low')
    };

    // Count vulnerability types
    const typeGroups = {};
    vulnerabilities.forEach(vuln => {
      typeGroups[vuln.type] = (typeGroups[vuln.type] || 0) + 1;
    });

    return {
      domain: domainData.domain,
      totalSubdomains: scanData.results?.discoveredSubdomains || 0,
      totalEndpoints: scanData.results?.discoveredEndpoints || 0,
      severityBreakdown: {
        critical: severityGroups.critical.length,
        high: severityGroups.high.length,
        medium: severityGroups.medium.length,
        low: severityGroups.low.length
      },
      vulnerabilityTypes: typeGroups,
      topVulnerabilities: [
        ...severityGroups.critical.slice(0, 3),
        ...severityGroups.high.slice(0, 3)
      ].map(v => ({
        type: v.type,
        title: v.title,
        severity: v.severity,
        description: v.description
      })),
      endpoints: scanData.discoveredData?.endpoints?.slice(0, 10) || []
    };
  }

  /**
   * Generate comprehensive AI analysis using Hugging Face
   */
  async generateAnalysis(data) {
    const prompt = this.createAnalysisPrompt(data);
    
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          inputs: prompt,
          parameters: {
            max_length: 2000,
            temperature: 0.3,
            return_full_text: false,
            do_sample: true
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.huggingfaceApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000 // 30 second timeout
        }
      );

      let aiResponse = '';
      if (Array.isArray(response.data)) {
        aiResponse = response.data[0]?.generated_text || response.data[0]?.summary_text || '';
      } else if (response.data.generated_text) {
        aiResponse = response.data.generated_text;
      } else if (response.data.summary_text) {
        aiResponse = response.data.summary_text;
      }

      if (!aiResponse) {
        console.warn('Empty response from Hugging Face API');
        return this.getFallbackAnalysis(data.vulnerabilities || []);
      }
      
      // Parse the AI response into structured data
      return this.parseAIResponse(aiResponse, data);
      
    } catch (error) {
      console.error('Hugging Face API error:', error.message);
      
      // Check if it's a rate limit or model loading issue
      if (error.response?.status === 503) {
        console.log('Model is loading, retrying in 20 seconds...');
        await new Promise(resolve => setTimeout(resolve, 20000));
        
        try {
          // Retry once
          const retryResponse = await axios.post(this.apiUrl, {
            inputs: prompt,
            parameters: { max_length: 1000, temperature: 0.3 }
          }, {
            headers: { 'Authorization': `Bearer ${this.huggingfaceApiKey}` },
            timeout: 30000
          });
          
          const retryResult = retryResponse.data[0]?.generated_text || '';
          if (retryResult) {
            return this.parseAIResponse(retryResult, data);
          }
        } catch (retryError) {
          console.error('Retry failed:', retryError.message);
        }
      }
      
      return this.getFallbackAnalysis(data.vulnerabilities || []);
    }
  }

  /**
   * Create comprehensive analysis prompt for Hugging Face models
   */
  createAnalysisPrompt(data) {
    return `<s>[INST] You are a cybersecurity expert. Analyze this API security scan and provide a structured report.

Domain: ${data.domain}
Subdomains: ${data.totalSubdomains}
Endpoints: ${data.totalEndpoints}
Vulnerabilities: Critical(${data.severityBreakdown.critical}), High(${data.severityBreakdown.high}), Medium(${data.severityBreakdown.medium}), Low(${data.severityBreakdown.low})

Top Issues:
${data.topVulnerabilities.slice(0, 3).map(v => `- ${v.title} (${v.severity})`).join('\n')}

Provide:
1. EXECUTIVE SUMMARY (2-3 sentences for executives)
2. RISK SCORE (0-10 scale with brief reason)
3. TOP 3 RECOMMENDATIONS (actionable items)
4. TECHNICAL NOTES (key technical details)

Keep executive summary simple and non-technical. [/INST]

3. TOP 3 RECOMMENDATIONS (prioritized action items)
4. TECHNICAL NOTES (for security teams)

Format response clearly with sections. [/INST]`;
  }

  /**
   * Parse Hugging Face AI response into structured format
   */
  parseAIResponse(aiResponse, data) {
    try {
      // Clean up the response
      let cleanResponse = aiResponse.trim();
      
      // Extract sections using improved regex patterns for various response formats
      let executiveSummary = '';
      let riskScore = 5;
      let recommendations = [];
      let technicalDetails = '';

      // Try to extract executive summary
      const execMatch = cleanResponse.match(/(?:EXECUTIVE SUMMARY|Executive Summary)[:\s]*(.*?)(?:\n.*?(?:RISK SCORE|Risk Score|RECOMMENDATIONS|TOP|TECHNICAL)|$)/si);
      if (execMatch) {
        executiveSummary = execMatch[1].trim().replace(/^\d+\.\s*/, '');
      }

      // Try to extract risk score
      const riskMatch = cleanResponse.match(/(?:RISK SCORE|Risk Score)[:\s]*(\d+(?:\.\d+)?)/i);
      if (riskMatch) {
        riskScore = Math.min(10, Math.max(0, parseFloat(riskMatch[1])));
      }

      // Try to extract recommendations
      const recMatch = cleanResponse.match(/(?:RECOMMENDATIONS|TOP \d+ RECOMMENDATIONS)[:\s]*(.*?)(?:\n.*?(?:TECHNICAL|NOTES|$))/si);
      if (recMatch) {
        const recText = recMatch[1].trim();
        recommendations = recText
          .split(/\n/)
          .map(line => line.trim())
          .filter(line => line && (line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line)))
          .map(line => line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, ''))
          .filter(rec => rec.length > 10)
          .slice(0, 5);
      }

      // Try to extract technical details
      const techMatch = cleanResponse.match(/(?:TECHNICAL NOTES|TECHNICAL DETAILS|Technical)[:\s]*(.*?)$/si);
      if (techMatch) {
        technicalDetails = techMatch[1].trim();
      }

      // Fallback parsing if structured sections aren't found
      if (!executiveSummary && !riskScore && recommendations.length === 0) {
        // Split response into sentences and try to extract meaningful parts
        const sentences = cleanResponse.split(/[.!?]+/).filter(s => s.trim().length > 20);
        
        if (sentences.length > 0) {
          executiveSummary = sentences.slice(0, 2).join('. ').trim() + '.';
        }
        
        // Look for numeric scores anywhere in the text
        const numberMatch = cleanResponse.match(/(?:score|rating|risk)[:\s]*(\d+)/i);
        if (numberMatch) {
          riskScore = Math.min(10, Math.max(0, parseInt(numberMatch[1])));
        }
        
        // Extract any actionable items
        const actionableItems = sentences.filter(s => 
          /(?:should|must|need to|recommend|implement|fix|update|address)/i.test(s)
        ).slice(0, 3);
        
        recommendations = actionableItems.length > 0 ? actionableItems : this.getDefaultRecommendations(data);
      }

      // Ensure we have meaningful content
      if (!executiveSummary) {
        executiveSummary = this.generateBasicSummary(data);
      }
      
      if (recommendations.length === 0) {
        recommendations = this.getDefaultRecommendations(data);
      }

      return {
        enabled: true,
        summary: cleanResponse.substring(0, 1000), // Truncate if too long
        executiveSummary,
        riskScore: Math.round(riskScore * 10) / 10,
        topRecommendations: recommendations.slice(0, 5),
        technicalDetails: technicalDetails || 'AI analysis provided above.',
        generatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        enabled: true,
        summary: aiResponse.substring(0, 500),
        executiveSummary: this.generateBasicSummary(data),
        riskScore: 5,
        topRecommendations: this.getDefaultRecommendations(data),
        technicalDetails: 'AI analysis completed with basic parsing.',
        generatedAt: new Date()
      };
    }
  }

  /**
   * Generate a basic summary when AI parsing fails
   */
  generateBasicSummary(data) {
    const total = Object.values(data.severityBreakdown).reduce((a, b) => a + b, 0);
    const critical = data.severityBreakdown.critical || 0;
    const high = data.severityBreakdown.high || 0;
    
    let riskLevel = 'low';
    if (critical > 0) riskLevel = 'critical';
    else if (high > 2) riskLevel = 'high';
    else if (high > 0 || total > 5) riskLevel = 'medium';
    
    return `Security scan of ${data.domain} found ${total} vulnerabilities with ${riskLevel} risk level. ${critical} critical and ${high} high-severity issues require immediate attention.`;
  }

  /**
   * Get fallback analysis when AI is not available
   */
  getFallbackAnalysis(vulnerabilities) {
    const severityGroups = {
      critical: vulnerabilities.filter(v => v.severity === 'critical'),
      high: vulnerabilities.filter(v => v.severity === 'high'),
      medium: vulnerabilities.filter(v => v.severity === 'medium'),
      low: vulnerabilities.filter(v => v.severity === 'low')
    };

    const totalVulns = vulnerabilities.length;
    const criticalCount = severityGroups.critical.length;
    const highCount = severityGroups.high.length;

    // Calculate basic risk score
    const riskScore = Math.min(10, 
      (criticalCount * 4 + highCount * 3 + severityGroups.medium.length * 2 + severityGroups.low.length) / 
      Math.max(1, totalVulns) * 2.5
    );

    // Determine business risk level
    let businessRisk = 'Low';
    if (criticalCount > 0 || highCount > 2) businessRisk = 'High';
    else if (highCount > 0 || severityGroups.medium.length > 3) businessRisk = 'Medium';

    return {
      enabled: false,
      summary: `Security scan completed. Found ${totalVulns} vulnerabilities across your API infrastructure.`,
      executiveSummary: `Your API infrastructure has a ${businessRisk.toLowerCase()} security risk level with ${criticalCount} critical and ${highCount} high-severity vulnerabilities that need immediate attention.`,
      riskScore: Math.round(riskScore * 10) / 10,
      topRecommendations: this.getDefaultRecommendations({ severityGroups, totalVulns }),
      technicalDetails: `Detailed vulnerability breakdown: ${criticalCount} critical, ${highCount} high, ${severityGroups.medium.length} medium, ${severityGroups.low.length} low severity issues found.`,
      generatedAt: new Date()
    };
  }

  /**
   * Get default recommendations based on vulnerability data
   */
  getDefaultRecommendations(data) {
    const recommendations = [];
    
    if (data.severityGroups) {
      if (data.severityGroups.critical.length > 0) {
        recommendations.push('Address all critical vulnerabilities immediately (within 24-48 hours)');
      }
      
      if (data.severityGroups.high.length > 0) {
        recommendations.push('Fix high-severity vulnerabilities within 1 week');
      }
      
      recommendations.push('Implement regular automated security scanning');
      recommendations.push('Set up monitoring and alerting for new vulnerabilities');
      recommendations.push('Review and update API authentication mechanisms');
    } else {
      // Default recommendations when data is limited
      recommendations.push('Implement HTTPS/TLS encryption for all API endpoints');
      recommendations.push('Add proper authentication and authorization');
      recommendations.push('Set up regular security monitoring');
      recommendations.push('Review API documentation exposure');
      recommendations.push('Implement rate limiting and access controls');
    }

    return recommendations;
  }

  /**
   * Generate executive-friendly vulnerability summary
   */
  generateExecutiveSummary(vulnerabilities, domainInfo) {
    const totalVulns = vulnerabilities.length;
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highVulns = vulnerabilities.filter(v => v.severity === 'high').length;

    let riskLevel = 'Low';
    let urgency = 'routine maintenance';

    if (criticalVulns > 0) {
      riskLevel = 'Critical';
      urgency = 'immediate action required';
    } else if (highVulns > 2) {
      riskLevel = 'High';
      urgency = 'urgent attention needed';
    } else if (highVulns > 0 || totalVulns > 5) {
      riskLevel = 'Medium';
      urgency = 'should be addressed soon';
    }

    return {
      riskLevel,
      totalVulnerabilities: totalVulns,
      criticalIssues: criticalVulns,
      highPriorityIssues: highVulns,
      urgencyLevel: urgency,
      businessImpact: this.getBusinessImpact(riskLevel),
      timeline: this.getRecommendedTimeline(riskLevel)
    };
  }

  /**
   * Get business impact description
   */
  getBusinessImpact(riskLevel) {
    const impacts = {
      'Critical': 'Immediate risk of data breach, system compromise, or service disruption',
      'High': 'Significant risk of unauthorized access or data exposure',
      'Medium': 'Moderate risk that could be exploited by determined attackers',
      'Low': 'Minor security concerns that should be addressed during regular maintenance'
    };

    return impacts[riskLevel] || impacts['Low'];
  }

  /**
   * Get recommended timeline for fixes
   */
  getRecommendedTimeline(riskLevel) {
    const timelines = {
      'Critical': 'Fix within 24-48 hours',
      'High': 'Fix within 1 week',
      'Medium': 'Fix within 1 month',
      'Low': 'Address during next maintenance cycle'
    };

    return timelines[riskLevel] || timelines['Low'];
  }
}

export default new AIAnalysisService();
