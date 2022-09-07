import * as okta from '@okta/okta-sdk-nodejs';

/**
 * Configuration required to create an Okta client.
 */
export type OktaConfiguration = {
  /** The identifier of the client application in Okta. */
  readonly clientId: string;
  /** JSON encoded private key for the application. */
  readonly privateKey: string;
  /** URL of the Okta organisation. */
  readonly organisationUrl: string;
};

/**
 * Creates a client that can read user information from Okta.
 * @param oktaConfiguration configuration to use when construction the client.
 * @returns the Okta client.
 */
export const oktaReadOnlyClient = (oktaConfiguration: OktaConfiguration) =>
  new okta.Client({
    ...oktaConfiguration,
    authorizationMode: 'PrivateKey',
    scopes: ['okta.users.read'],
  });

/**
 * Creates a client that can read and manage user information in Okta.
 * @param oktaConfiguration configuration to use when construction the client.
 * @returns the Okta client.
 */
export const oktaManageClient = (oktaConfiguration: OktaConfiguration) =>
  new okta.Client({
    ...oktaConfiguration,
    authorizationMode: 'PrivateKey',
    scopes: ['okta.users.manage'],
  });
