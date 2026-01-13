import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class APIDiscoveryService {
  constructor() {
    this.shodanApiKey = process.env.SHODAN_API_KEY;
    this.sublist3rPath = process.env.SUBLIST3R_PATH || 'sublist3r';
    this.amassPath = process.env.AMASS_PATH || 'amass';
  }

  /**
   * Main method to discover all APIs for a domain
   */
  async discoverAPIs(domain) {
    const results = {
      subdomains: [],
      endpoints: [],
      tools: {
        sublist3r: { used: false, duration: 0, results: 0 },
        amass: { used: false, duration: 0, results: 0 },
        shodan: { used: false, queriesUsed: 0, results: 0 }
      },
      errors: []
    };

    try {
      // Step 1: Subdomain enumeration
      console.log(`🔍 Starting subdomain discovery for ${domain}`);
      
      // Try Sublist3r first (faster)
      const sublist3rResults = await this.runSublist3r(domain);
      results.subdomains.push(...sublist3rResults.subdomains);
      results.tools.sublist3r = sublist3rResults.toolInfo;

      // Use Amass for more comprehensive results (if available)
      if (process.env.AMASS_ENABLED === 'true') {
        const amassResults = await this.runAmass(domain);
        // Merge unique subdomains
        const uniqueAmassSubdomains = amassResults.subdomains.filter(
          subdomain => !results.subdomains.some(s => s.subdomain === subdomain.subdomain)
        );
        results.subdomains.push(...uniqueAmassSubdomains);
        results.tools.amass = amassResults.toolInfo;
      }

      // Step 2: Endpoint detection
      console.log(`🔍 Discovering endpoints for ${results.subdomains.length} subdomains`);
      for (const subdomainObj of results.subdomains) {
        try {
          const endpoints = await this.discoverEndpoints(subdomainObj.subdomain);
          results.endpoints.push(...endpoints);
        } catch (error) {
          results.errors.push({
            message: `Endpoint discovery failed for ${subdomainObj.subdomain}: ${error.message}`,
            tool: 'endpoint-discovery'
          });
        }
      }

      // Step 3: Shodan integration for exposure check
      if (this.shodanApiKey) {
        console.log('🔍 Checking exposure with Shodan');
        await this.enrichWithShodan(results.subdomains);
        results.tools.shodan.used = true;
        results.tools.shodan.queriesUsed = results.subdomains.length;
      }

      console.log(`✅ Discovery completed: ${results.subdomains.length} subdomains, ${results.endpoints.length} endpoints`);
      return results;

    } catch (error) {
      results.errors.push({
        message: `API discovery failed: ${error.message}`,
        tool: 'discovery-service'
      });
      return results;
    }
  }

  /**
   * Run Sublist3r for subdomain enumeration
   */
  async runSublist3r(domain) {
    const startTime = Date.now();
    const results = { subdomains: [], toolInfo: { used: false, duration: 0, results: 0 } };

    try {
      // Create temporary output file (Windows compatible)
      const tempDir = process.platform === 'win32' ? process.env.TEMP || 'C:\\Windows\\Temp' : '/tmp';
      const tempFile = path.join(tempDir, `sublist3r_${domain}_${Date.now()}.txt`);
      
      // Handle the full Python command path from environment variable
      // SUBLIST3R_PATH = "C:\Users\HP\Sublist3r\.venv\Scripts\python.exe C:\Users\HP\Sublist3r\sublist3r.py"
      const command = `${this.sublist3rPath} -d ${domain} -o "${tempFile}"`;
      console.log(`Running: ${command}`);
      
      await execAsync(command, { timeout: 300000 }); // 5 minute timeout
      
      // Read results from file
      try {
        const content = await fs.readFile(tempFile, 'utf8');
        const subdomains = content.split('\n')
          .map(line => line.trim())
          .filter(line => line && line.includes('.'))
          .map(subdomain => ({
            subdomain: subdomain.toLowerCase(),
            lastSeen: new Date(),
            isActive: true
          }));

        results.subdomains = subdomains;
        results.toolInfo = {
          used: true,
          duration: Date.now() - startTime,
          results: subdomains.length
        };

        // Cleanup temp file
        await fs.unlink(tempFile).catch(() => {});
        
      } catch (fileError) {
        console.warn('Could not read Sublist3r output file:', fileError.message);
      }

    } catch (error) {
      console.error('Sublist3r execution failed:', error.message);
      // Fallback: try to enumerate subdomains using DNS
      results.subdomains = await this.fallbackSubdomainDiscovery(domain);
      results.toolInfo.used = false;
    }

    return results;
  }

  /**
   * Run Amass for comprehensive subdomain enumeration
   */
  async runAmass(domain) {
    const startTime = Date.now();
    const results = { subdomains: [], toolInfo: { used: false, duration: 0, results: 0 } };

    try {
      const command = `${this.amassPath} enum -passive -d ${domain}`;
      console.log(`Running: ${command}`);
      
      const { stdout } = await execAsync(command, { timeout: 600000 }); // 10 minute timeout
      
      const subdomains = stdout.split('\n')
        .map(line => line.trim())
        .filter(line => line && line.includes('.'))
        .map(subdomain => ({
          subdomain: subdomain.toLowerCase(),
          lastSeen: new Date(),
          isActive: true
        }));

      results.subdomains = subdomains;
      results.toolInfo = {
        used: true,
        duration: Date.now() - startTime,
        results: subdomains.length
      };

    } catch (error) {
      console.error('Amass execution failed:', error.message);
      results.toolInfo.used = false;
    }

    return results;
  }

  /**
   * Fallback subdomain discovery using common patterns
   */
  async fallbackSubdomainDiscovery(domain) {
    const commonSubdomains = [
      'api', 'www', 'app', 'admin', 'test', 'dev', 'staging', 'prod',
      'api-v1', 'api-v2', 'v1', 'v2', 'rest', 'graphql', 'gateway',
      'mobile', 'web', 'backend', 'internal', 'external', 'public'
    ];

    const discoveredSubdomains = [];

    for (const sub of commonSubdomains) {
      const subdomain = `${sub}.${domain}`;
      try {
        // Quick HTTP check
        const response = await axios.get(`http://${subdomain}`, {
          timeout: 5000,
          validateStatus: () => true, // Accept any status code
          maxRedirects: 5
        });

        if (response.status < 500) {
          discoveredSubdomains.push({
            subdomain: subdomain.toLowerCase(),
            lastSeen: new Date(),
            isActive: true
          });
        }
      } catch (error) {
        // Try HTTPS
        try {
          await axios.get(`https://${subdomain}`, {
            timeout: 5000,
            validateStatus: () => true,
            maxRedirects: 5
          });

          discoveredSubdomains.push({
            subdomain: subdomain.toLowerCase(),
            lastSeen: new Date(),
            isActive: true
          });
        } catch (httpsError) {
          // Subdomain doesn't exist or isn't accessible
        }
      }
    }

    return discoveredSubdomains;
  }

  /**
   * Discover API endpoints for a subdomain
   */
  async discoverEndpoints(subdomain) {
    const endpoints = [];
    const commonPaths = [
      '/api', '/api/v1', '/api/v2', '/api/v3',
      '/rest', '/rest/v1', '/rest/v2',
      '/graphql', '/graphql/v1',
      '/swagger', '/swagger-ui', '/api-docs',
      '/openapi.json', '/swagger.json',
      '/health', '/status', '/ping',
      '/users', '/user', '/auth', '/login',
      '/admin', '/dashboard',
      '/v1', '/v2', '/v3'
    ];

    const protocols = ['https', 'http'];

    for (const protocol of protocols) {
      for (const path of commonPaths) {
        try {
          const url = `${protocol}://${subdomain}${path}`;
          const response = await axios.get(url, {
            timeout: 10000,
            validateStatus: () => true,
            maxRedirects: 3,
            headers: {
              'User-Agent': 'API-Attack-Surface-Mapper/1.0'
            }
          });

          if (response.status < 500 && response.status !== 404) {
            endpoints.push({
              url,
              method: 'GET',
              subdomain,
              path,
              responseCode: response.status,
              responseTime: response.headers['x-response-time'] || null,
              contentType: response.headers['content-type'] || 'unknown',
              isPublic: response.status < 400,
              requiresAuth: response.status === 401 || response.status === 403,
              lastChecked: new Date(),
              isActive: true,
              headers: {
                server: response.headers.server,
                'x-powered-by': response.headers['x-powered-by'],
                'access-control-allow-origin': response.headers['access-control-allow-origin']
              }
            });

            // If we found an API endpoint, try to discover more paths
            if (path.includes('api') || path.includes('rest') || path.includes('graphql')) {
              await this.discoverAdditionalEndpoints(protocol, subdomain, path, endpoints);
            }
          }

        } catch (error) {
          // Endpoint not accessible or error occurred
          continue;
        }
      }
    }

    return endpoints;
  }

  /**
   * Discover additional endpoints from common API patterns
   */
  async discoverAdditionalEndpoints(protocol, subdomain, basePath, endpoints) {
    const commonResources = [
      'users', 'user', 'accounts', 'account',
      'orders', 'order', 'products', 'product',
      'customers', 'customer', 'payments', 'payment',
      'invoices', 'invoice', 'reports', 'report',
      'files', 'file', 'uploads', 'upload',
      'settings', 'config', 'configuration'
    ];

    const methods = ['GET', 'POST', 'PUT', 'DELETE'];

    for (const resource of commonResources.slice(0, 5)) { // Limit to avoid too many requests
      for (const method of methods) {
        try {
          const url = `${protocol}://${subdomain}${basePath}/${resource}`;
          
          const response = await axios({
            method: method.toLowerCase(),
            url,
            timeout: 5000,
            validateStatus: () => true,
            maxRedirects: 2
          });

          if (response.status < 500 && response.status !== 404) {
            endpoints.push({
              url,
              method,
              subdomain,
              path: `${basePath}/${resource}`,
              responseCode: response.status,
              responseTime: null,
              contentType: response.headers['content-type'] || 'unknown',
              isPublic: response.status < 400,
              requiresAuth: response.status === 401 || response.status === 403,
              lastChecked: new Date(),
              isActive: true
            });
          }
        } catch (error) {
          // Continue with next endpoint
          continue;
        }
      }
    }
  }

  /**
   * Enrich subdomain data with Shodan information
   */
  async enrichWithShodan(subdomains) {
    if (!this.shodanApiKey) return;

    for (const subdomainObj of subdomains) {
      try {
        const response = await axios.get(`https://api.shodan.io/shodan/host/search`, {
          params: {
            key: this.shodanApiKey,
            query: `hostname:${subdomainObj.subdomain}`
          },
          timeout: 10000
        });

        if (response.data.matches && response.data.matches.length > 0) {
          const match = response.data.matches[0];
          subdomainObj.ipAddress = match.ip_str;
          subdomainObj.ports = match.ports || [];
          subdomainObj.technologies = match.tags || [];
          subdomainObj.shodanData = {
            country: match.location?.country_name,
            city: match.location?.city,
            isp: match.isp,
            org: match.org,
            lastUpdate: match.timestamp
          };
        }

        // Small delay to respect API limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.warn(`Shodan lookup failed for ${subdomainObj.subdomain}:`, error.message);
        continue;
      }
    }
  }
}

export default new APIDiscoveryService();
