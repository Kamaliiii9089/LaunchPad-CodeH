/**
 * LDAP / Active Directory Integration Library
 * 
 * Supports enterprise directory authentication:
 * - Active Directory
 * - OpenLDAP
 * - Generic LDAP servers
 * 
 * Note: This implementation requires 'ldapjs' package for production use.
 * Install with: npm install ldapjs @types/ldapjs
 */

// LDAP Configuration Types
export interface LDAPConfig {
  id: string;
  url: string;
  bindDN: string;
  bindCredentials: string;
  searchBase: string;
  searchFilter: string;
  searchAttributes?: string[];
  groupSearchBase?: string;
  groupSearchFilter?: string;
  groupDnProperty?: string;
  groupSearchAttributes?: string[];
  tlsOptions?: {
    rejectUnauthorized?: boolean;
    ca?: string[];
  };
  attributeMapping?: LDAPAttributeMapping;
}

export interface LDAPAttributeMapping {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string;
  memberOf?: string;
}

export interface LDAPUserProfile {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  dn: string;
  groups?: string[];
  attributes: Record<string, any>;
}

/**
 * Default LDAP attribute mappings
 */
export const DEFAULT_LDAP_MAPPINGS: Record<string, LDAPAttributeMapping> = {
  activedirectory: {
    id: 'objectGUID',
    username: 'sAMAccountName',
    email: 'mail',
    firstName: 'givenName',
    lastName: 'sn',
    displayName: 'displayName',
    memberOf: 'memberOf',
    groups: 'memberOf',
  },
  openldap: {
    id: 'uid',
    username: 'uid',
    email: 'mail',
    firstName: 'givenName',
    lastName: 'sn',
    displayName: 'cn',
    memberOf: 'memberOf',
    groups: 'memberOf',
  },
  generic: {
    id: 'uid',
    username: 'uid',
    email: 'mail',
    firstName: 'givenName',
    lastName: 'sn',
    displayName: 'displayName',
    memberOf: 'memberOf',
    groups: 'memberOf',
  },
};

/**
 * LDAP Client wrapper (placeholder interface)
 * In production, use ldapjs library
 */
interface LDAPClient {
  bind(dn: string, password: string): Promise<void>;
  search(base: string, options: any): Promise<any[]>;
  unbind(): Promise<void>;
}

/**
 * Create LDAP client (placeholder)
 * In production, implement with ldapjs
 */
export function createLDAPClient(config: LDAPConfig): LDAPClient {
  // This is a placeholder interface
  // In production implementation:
  // 
  // import ldap from 'ldapjs';
  // 
  // const client = ldap.createClient({
  //   url: config.url,
  //   tlsOptions: config.tlsOptions,
  // });
  // 
  // return promisified wrapper around client

  throw new Error('LDAP client not implemented. Install ldapjs: npm install ldapjs');
}

/**
 * Authenticate user against LDAP server
 */
export async function authenticateLDAP(
  config: LDAPConfig,
  username: string,
  password: string
): Promise<LDAPUserProfile> {
  // This is a placeholder implementation showing the flow
  // In production, use ldapjs library
  
  // 1. Connect to LDAP server
  const client = createLDAPClient(config);

  try {
    // 2. Bind with admin credentials
    await client.bind(config.bindDN, config.bindCredentials);

    // 3. Search for user
    const searchFilter = config.searchFilter.replace('{{username}}', username);
    const mapping = config.attributeMapping || DEFAULT_LDAP_MAPPINGS.generic;
    
    const searchAttributes = config.searchAttributes || [
      mapping.id,
      mapping.username,
      mapping.email,
      mapping.firstName || '',
      mapping.lastName || '',
      mapping.displayName || '',
      mapping.memberOf || '',
    ].filter(Boolean);

    const searchResults = await client.search(config.searchBase, {
      filter: searchFilter,
      scope: 'sub',
      attributes: searchAttributes,
    });

    if (!searchResults || searchResults.length === 0) {
      throw new Error('User not found in directory');
    }

    if (searchResults.length > 1) {
      throw new Error('Multiple users found - search filter too broad');
    }

    const userEntry = searchResults[0];
    const userDN = userEntry.dn;

    // 4. Authenticate user by binding with their credentials
    await client.unbind();
    await client.bind(userDN, password);

    // 5. Get user groups (if configured)
    let groups: string[] = [];
    if (config.groupSearchBase && config.groupSearchFilter) {
      await client.unbind();
      await client.bind(config.bindDN, config.bindCredentials);

      const groupFilter = config.groupSearchFilter.replace('{{dn}}', userDN);
      const groupResults = await client.search(config.groupSearchBase, {
        filter: groupFilter,
        scope: 'sub',
        attributes: config.groupSearchAttributes || ['cn', 'dn'],
      });

      groups = groupResults.map((group: any) => group.cn || group.dn);
    } else if (mapping.memberOf && userEntry[mapping.memberOf]) {
      // Extract groups from memberOf attribute
      const memberOf = userEntry[mapping.memberOf];
      groups = Array.isArray(memberOf) ? memberOf : [memberOf];
      // Extract CN from DN (e.g., CN=Admins,OU=Groups,DC=example,DC=com -> Admins)
      groups = groups.map((dn: string) => {
        const match = dn.match(/CN=([^,]+)/i);
        return match ? match[1] : dn;
      });
    }

    // 6. Map attributes to user profile
    const profile: LDAPUserProfile = {
      id: userEntry[mapping.id],
      username: userEntry[mapping.username],
      email: userEntry[mapping.email],
      firstName: mapping.firstName ? userEntry[mapping.firstName] : undefined,
      lastName: mapping.lastName ? userEntry[mapping.lastName] : undefined,
      displayName: mapping.displayName ? userEntry[mapping.displayName] : undefined,
      dn: userDN,
      groups,
      attributes: userEntry,
    };

    return profile;
  } finally {
    // Always cleanup connection
    try {
      await client.unbind();
    } catch (error) {
      // Ignore unbind errors
    }
  }
}

/**
 * Test LDAP connection
 */
export async function testLDAPConnection(config: LDAPConfig): Promise<{ success: boolean; message: string }> {
  try {
    const client = createLDAPClient(config);
    
    // Try to bind with admin credentials
    await client.bind(config.bindDN, config.bindCredentials);
    await client.unbind();

    return {
      success: true,
      message: 'Successfully connected to LDAP server',
    };
  } catch (error: any) {
    return {
      success: false,
      message: `LDAP connection failed: ${error.message}`,
    };
  }
}

/**
 * Search for users in LDAP directory
 */
export async function searchLDAPUsers(
  config: LDAPConfig,
  searchTerm: string,
  limit: number = 10
): Promise<LDAPUserProfile[]> {
  const client = createLDAPClient(config);

  try {
    await client.bind(config.bindDN, config.bindCredentials);

    const mapping = config.attributeMapping || DEFAULT_LDAP_MAPPINGS.generic;
    
    // Build search filter for multiple attributes
    const searchFilter = `(|
      (${mapping.username}=*${searchTerm}*)
      (${mapping.email}=*${searchTerm}*)
      (${mapping.displayName || 'cn'}=*${searchTerm}*)
    )`;

    const searchAttributes = [
      mapping.id,
      mapping.username,
      mapping.email,
      mapping.firstName || '',
      mapping.lastName || '',
      mapping.displayName || '',
      mapping.memberOf || '',
    ].filter(Boolean);

    const results = await client.search(config.searchBase, {
      filter: searchFilter,
      scope: 'sub',
      attributes: searchAttributes,
      sizeLimit: limit,
    });

    return results.map((entry: any) => ({
      id: entry[mapping.id],
      username: entry[mapping.username],
      email: entry[mapping.email],
      firstName: mapping.firstName ? entry[mapping.firstName] : undefined,
      lastName: mapping.lastName ? entry[mapping.lastName] : undefined,
      displayName: mapping.displayName ? entry[mapping.displayName] : undefined,
      dn: entry.dn,
      groups: [],
      attributes: entry,
    }));
  } finally {
    try {
      await client.unbind();
    } catch (error) {
      // Ignore unbind errors
    }
  }
}

/**
 * Get LDAP groups for a user
 */
export async function getLDAPUserGroups(
  config: LDAPConfig,
  userDN: string
): Promise<string[]> {
  const client = createLDAPClient(config);

  try {
    await client.bind(config.bindDN, config.bindCredentials);

    if (!config.groupSearchBase || !config.groupSearchFilter) {
      return [];
    }

    const groupFilter = config.groupSearchFilter.replace('{{dn}}', userDN);
    const results = await client.search(config.groupSearchBase, {
      filter: groupFilter,
      scope: 'sub',
      attributes: config.groupSearchAttributes || ['cn'],
    });

    return results.map((group: any) => group.cn);
  } finally {
    try {
      await client.unbind();
    } catch (error) {
      // Ignore unbind errors
    }
  }
}

/**
 * Sync LDAP users to application database
 */
export async function syncLDAPUsers(
  config: LDAPConfig,
  onUserFound: (user: LDAPUserProfile) => Promise<void>
): Promise<{ synced: number; errors: number }> {
  const client = createLDAPClient(config);
  let synced = 0;
  let errors = 0;

  try {
    await client.bind(config.bindDN, config.bindCredentials);

    const mapping = config.attributeMapping || DEFAULT_LDAP_MAPPINGS.generic;
    const searchAttributes = [
      mapping.id,
      mapping.username,
      mapping.email,
      mapping.firstName || '',
      mapping.lastName || '',
      mapping.displayName || '',
      mapping.memberOf || '',
    ].filter(Boolean);

    // Search for all users
    const results = await client.search(config.searchBase, {
      filter: config.searchFilter.replace('{{username}}', '*'),
      scope: 'sub',
      attributes: searchAttributes,
    });

    for (const entry of results) {
      try {
        const profile: LDAPUserProfile = {
          id: entry[mapping.id],
          username: entry[mapping.username],
          email: entry[mapping.email],
          firstName: mapping.firstName ? entry[mapping.firstName] : undefined,
          lastName: mapping.lastName ? entry[mapping.lastName] : undefined,
          displayName: mapping.displayName ? entry[mapping.displayName] : undefined,
          dn: entry.dn,
          groups: [],
          attributes: entry,
        };

        await onUserFound(profile);
        synced++;
      } catch (error) {
        errors++;
        console.error(`Failed to sync user ${entry.dn}:`, error);
      }
    }

    return { synced, errors };
  } finally {
    try {
      await client.unbind();
    } catch (error) {
      // Ignore unbind errors
    }
  }
}

/**
 * Get LDAP provider templates
 */
export function getLDAPProviderTemplate(provider: 'activedirectory' | 'openldap' | 'generic'): Partial<LDAPConfig> {
  const templates: Record<string, Partial<LDAPConfig>> = {
    activedirectory: {
      url: 'ldaps://your-domain-controller.example.com:636',
      bindDN: 'CN=LDAP Service Account,OU=Service Accounts,DC=example,DC=com',
      searchBase: 'OU=Users,DC=example,DC=com',
      searchFilter: '(&(objectClass=user)(sAMAccountName={{username}}))',
      groupSearchBase: 'OU=Groups,DC=example,DC=com',
      groupSearchFilter: '(&(objectClass=group)(member={{dn}}))',
      groupSearchAttributes: ['cn', 'distinguishedName'],
      attributeMapping: DEFAULT_LDAP_MAPPINGS.activedirectory,
      tlsOptions: {
        rejectUnauthorized: true,
      },
    },
    openldap: {
      url: 'ldaps://ldap.example.com:636',
      bindDN: 'cn=admin,dc=example,dc=com',
      searchBase: 'ou=people,dc=example,dc=com',
      searchFilter: '(&(objectClass=inetOrgPerson)(uid={{username}}))',
      groupSearchBase: 'ou=groups,dc=example,dc=com',
      groupSearchFilter: '(&(objectClass=groupOfNames)(member={{dn}}))',
      groupSearchAttributes: ['cn'],
      attributeMapping: DEFAULT_LDAP_MAPPINGS.openldap,
      tlsOptions: {
        rejectUnauthorized: true,
      },
    },
    generic: {
      url: 'ldaps://ldap.example.com:636',
      bindDN: 'cn=admin,dc=example,dc=com',
      searchBase: 'dc=example,dc=com',
      searchFilter: '(uid={{username}})',
      attributeMapping: DEFAULT_LDAP_MAPPINGS.generic,
      tlsOptions: {
        rejectUnauthorized: true,
      },
    },
  };

  return templates[provider] || templates.generic;
}

/**
 * Validate LDAP configuration
 */
export function validateLDAPConfig(config: Partial<LDAPConfig>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.url) {
    errors.push('LDAP URL is required');
  } else if (!config.url.startsWith('ldap://') && !config.url.startsWith('ldaps://')) {
    errors.push('LDAP URL must start with ldap:// or ldaps://');
  }

  if (!config.bindDN) {
    errors.push('Bind DN is required');
  }

  if (!config.bindCredentials) {
    errors.push('Bind credentials are required');
  }

  if (!config.searchBase) {
    errors.push('Search base is required');
  }

  if (!config.searchFilter) {
    errors.push('Search filter is required');
  } else if (!config.searchFilter.includes('{{username}}')) {
    errors.push('Search filter must include {{username}} placeholder');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
