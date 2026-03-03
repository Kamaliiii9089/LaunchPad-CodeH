/**
 * SAML 2.0 Integration Library
 * 
 * Supports enterprise SSO with SAML 2.0 identity providers:
 * - Azure AD
 * - Okta
 * - OneLogin
 * - Custom SAML IdPs
 * 
 * Note: This implementation requires 'samlify' package for production use.
 * Install with: npm install samlify
 */

import crypto from 'crypto';

// SAML Configuration Types
export interface SAMLConfig {
  id: string;
  entryPoint: string;
  issuer: string;
  callbackUrl: string;
  cert: string;
  privateKey?: string;
  signatureAlgorithm?: 'sha1' | 'sha256' | 'sha512';
  wantAssertionsSigned?: boolean;
  wantResponseSigned?: boolean;
  allowCreate?: boolean;
  identifierFormat?: string;
  attributeMapping?: SAMLAttributeMapping;
}

export interface SAMLAttributeMapping {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string;
}

export interface SAMLUserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string[];
  attributes: Record<string, any>;
  nameID: string;
  sessionIndex?: string;
}

export interface SAMLResponse {
  profile: SAMLUserProfile;
  loggedOut: boolean;
}

/**
 * Default SAML attribute mappings for common IdPs
 */
export const DEFAULT_ATTRIBUTE_MAPPINGS: Record<string, SAMLAttributeMapping> = {
  azure: {
    id: 'http://schemas.microsoft.com/identity/claims/objectidentifier',
    email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
    lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
    displayName: 'http://schemas.microsoft.com/identity/claims/displayname',
    groups: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups',
  },
  okta: {
    id: 'NameID',
    email: 'email',
    firstName: 'firstName',
    lastName: 'lastName',
    displayName: 'displayName',
    groups: 'groups',
  },
  onelogin: {
    id: 'User.id',
    email: 'User.email',
    firstName: 'User.FirstName',
    lastName: 'User.LastName',
    displayName: 'name',
    groups: 'memberOf',
  },
  generic: {
    id: 'uid',
    email: 'email',
    firstName: 'givenName',
    lastName: 'sn',
    displayName: 'cn',
    groups: 'groups',
  },
};

/**
 * Generate SAML metadata XML
 */
export function generateSAMLMetadata(config: SAMLConfig): string {
  const entityID = config.issuer;
  const acsUrl = config.callbackUrl;
  const cert = config.cert.replace(/-----BEGIN CERTIFICATE-----/, '')
    .replace(/-----END CERTIFICATE-----/, '')
    .replace(/\s/g, '');

  return `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                  entityID="${entityID}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    ${config.wantAssertionsSigned ? '<AuthnRequestsSigned>true</AuthnRequestsSigned>' : ''}
    ${config.wantResponseSigned ? '<WantAssertionsSigned>true</WantAssertionsSigned>' : ''}
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                        Location="${config.issuer}/logout"/>
    <NameIDFormat>${config.identifierFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'}</NameIDFormat>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                             Location="${acsUrl}"
                             index="1"/>
    <KeyDescriptor use="signing">
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>${cert}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </KeyDescriptor>
  </SPSSODescriptor>
</EntityDescriptor>`;
}

/**
 * Create SAML AuthnRequest
 */
export function createSAMLRequest(config: SAMLConfig): { id: string; xml: string; redirectUrl: string } {
  const id = `_${crypto.randomBytes(16).toString('hex')}`;
  const timestamp = new Date().toISOString();
  const issuer = config.issuer;
  const acsUrl = config.callbackUrl;
  const nameIDFormat = config.identifierFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress';

  const xml = `<?xml version="1.0"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="${id}"
                    Version="2.0"
                    IssueInstant="${timestamp}"
                    Destination="${config.entryPoint}"
                    AssertionConsumerServiceURL="${acsUrl}"
                    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${issuer}</saml:Issuer>
  <samlp:NameIDPolicy Format="${nameIDFormat}"
                     AllowCreate="${config.allowCreate !== false}"/>
</samlp:AuthnRequest>`;

  // Encode request for HTTP-Redirect binding
  const encodedRequest = Buffer.from(xml).toString('base64');
  const params = new URLSearchParams({
    SAMLRequest: encodedRequest,
  });

  const redirectUrl = `${config.entryPoint}?${params.toString()}`;

  return { id, xml, redirectUrl };
}

/**
 * Parse SAML Response (simplified version)
 * Note: In production, use 'samlify' for proper XML parsing and signature validation
 */
export async function parseSAMLResponse(
  samlResponse: string,
  config: SAMLConfig
): Promise<SAMLUserProfile> {
  // Decode base64 response
  const xml = Buffer.from(samlResponse, 'base64').toString('utf8');

  // This is a simplified parser. In production, use a proper SAML library like 'samlify'
  // that handles XML parsing, signature validation, and assertion decryption.

  // Extract NameID
  const nameIDMatch = xml.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
  const nameID = nameIDMatch ? nameIDMatch[1] : '';

  // Extract SessionIndex
  const sessionIndexMatch = xml.match(/SessionIndex="([^"]+)"/);
  const sessionIndex = sessionIndexMatch ? sessionIndexMatch[1] : undefined;

  // Extract attributes
  const attributes: Record<string, any> = {};
  const attributeRegex = /<saml:Attribute Name="([^"]+)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/g;
  let match;
  while ((match = attributeRegex.exec(xml)) !== null) {
    const [, name, value] = match;
    attributes[name] = value;
  }

  // Map attributes to user profile
  const mapping = config.attributeMapping || DEFAULT_ATTRIBUTE_MAPPINGS.generic;
  
  const profile: SAMLUserProfile = {
    id: attributes[mapping.id] || nameID,
    email: attributes[mapping.email] || nameID,
    firstName: mapping.firstName ? attributes[mapping.firstName] : undefined,
    lastName: mapping.lastName ? attributes[mapping.lastName] : undefined,
    displayName: mapping.displayName ? attributes[mapping.displayName] : undefined,
    groups: mapping.groups && attributes[mapping.groups] 
      ? (Array.isArray(attributes[mapping.groups]) ? attributes[mapping.groups] : [attributes[mapping.groups]])
      : undefined,
    attributes,
    nameID,
    sessionIndex,
  };

  return profile;
}

/**
 * Create SAML LogoutRequest
 */
export function createSAMLLogoutRequest(
  config: SAMLConfig,
  nameID: string,
  sessionIndex?: string
): { id: string; xml: string; redirectUrl: string } {
  const id = `_${crypto.randomBytes(16).toString('hex')}`;
  const timestamp = new Date().toISOString();
  const issuer = config.issuer;
  const logoutUrl = config.entryPoint.replace('/SSO', '/SLO'); // Common pattern

  const xml = `<?xml version="1.0"?>
<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                     xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                     ID="${id}"
                     Version="2.0"
                     IssueInstant="${timestamp}"
                     Destination="${logoutUrl}">
  <saml:Issuer>${issuer}</saml:Issuer>
  <saml:NameID>${nameID}</saml:NameID>
  ${sessionIndex ? `<samlp:SessionIndex>${sessionIndex}</samlp:SessionIndex>` : ''}
</samlp:LogoutRequest>`;

  const encodedRequest = Buffer.from(xml).toString('base64');
  const params = new URLSearchParams({
    SAMLRequest: encodedRequest,
  });

  const redirectUrl = `${logoutUrl}?${params.toString()}`;

  return { id, xml, redirectUrl };
}

/**
 * Validate SAML certificate
 */
export function validateSAMLCertificate(cert: string): boolean {
  try {
    // Check if certificate is valid PEM format
    if (!cert.includes('-----BEGIN CERTIFICATE-----')) {
      return false;
    }

    // Extract certificate content
    const certContent = cert
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/\s/g, '');

    // Validate base64 encoding
    const buffer = Buffer.from(certContent, 'base64');
    
    // Certificate should be at least 100 bytes
    return buffer.length > 100;
  } catch (error) {
    return false;
  }
}

/**
 * Get SAML provider templates for common IdPs
 */
export function getSAMLProviderTemplate(provider: 'azure' | 'okta' | 'onelogin' | 'generic'): Partial<SAMLConfig> {
  const templates: Record<string, Partial<SAMLConfig>> = {
    azure: {
      entryPoint: 'https://login.microsoftonline.com/{tenant-id}/saml2',
      issuer: 'https://sts.windows.net/{tenant-id}/',
      signatureAlgorithm: 'sha256',
      wantAssertionsSigned: true,
      wantResponseSigned: true,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      attributeMapping: DEFAULT_ATTRIBUTE_MAPPINGS.azure,
    },
    okta: {
      entryPoint: 'https://{your-domain}.okta.com/app/{app-id}/sso/saml',
      issuer: 'http://www.okta.com/{app-id}',
      signatureAlgorithm: 'sha256',
      wantAssertionsSigned: true,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      attributeMapping: DEFAULT_ATTRIBUTE_MAPPINGS.okta,
    },
    onelogin: {
      entryPoint: 'https://app.onelogin.com/trust/saml2/http-post/sso/{app-id}',
      issuer: 'https://app.onelogin.com/saml/metadata/{app-id}',
      signatureAlgorithm: 'sha256',
      wantAssertionsSigned: true,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      attributeMapping: DEFAULT_ATTRIBUTE_MAPPINGS.onelogin,
    },
    generic: {
      signatureAlgorithm: 'sha256',
      wantAssertionsSigned: true,
      wantResponseSigned: false,
      allowCreate: true,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      attributeMapping: DEFAULT_ATTRIBUTE_MAPPINGS.generic,
    },
  };

  return templates[provider] || templates.generic;
}

/**
 * Generate self-signed certificate for SAML (development only)
 */
export async function generateSelfSignedCertificate(): Promise<{ cert: string; privateKey: string }> {
  // This is a placeholder. In production, use proper certificate generation
  // or integrate with your organization's PKI infrastructure.
  
  // For development, you can use openssl command:
  // openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
  
  throw new Error('Certificate generation not implemented. Use openssl or your PKI infrastructure to generate certificates.');
}

/**
 * Create SAML configuration from IdP metadata URL
 */
export async function createConfigFromMetadata(metadataUrl: string): Promise<Partial<SAMLConfig>> {
  try {
    const response = await fetch(metadataUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    const xml = await response.text();

    // Extract entry point (SSO Location)
    const entryPointMatch = xml.match(/Location="([^"]+)"[^>]*urn:oasis:names:tc:SAML:2.0:bindings:HTTP-(Redirect|POST)/);
    const entryPoint = entryPointMatch ? entryPointMatch[1] : '';

    // Extract issuer (entityID)
    const issuerMatch = xml.match(/entityID="([^"]+)"/);
    const issuer = issuerMatch ? issuerMatch[1] : '';

    // Extract certificate
    const certMatch = xml.match(/<X509Certificate>([^<]+)<\/X509Certificate>/);
    const cert = certMatch ? `-----BEGIN CERTIFICATE-----\n${certMatch[1]}\n-----END CERTIFICATE-----` : '';

    return {
      entryPoint,
      issuer,
      cert,
    };
  } catch (error: any) {
    throw new Error(`Failed to parse SAML metadata: ${error.message}`);
  }
}
