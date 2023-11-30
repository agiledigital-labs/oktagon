import * as okta from '@okta/okta-sdk-nodejs';
import { ReadonlyURL } from 'readonly-types';

/**
 * Configuration required to create an Okta client.
 */
export type OktaConfiguration = {
  /** The identifier of the client application in Okta. */
  readonly clientId: string;
  /** JSON encoded private key for the application. */
  readonly privateKey: string;
  /** URL of the Okta organisation. */
  readonly orgUrl: ReadonlyURL;
};

/**
 * Creates a client that can read user information from Okta.
 * @param oktaConfiguration configuration to use when construction the client.
 * @param scopes read scopes to be used with the client
 * @returns the Okta client.
 */
export const oktaReadOnlyClient = (
  oktaConfiguration: OktaConfiguration,
  scopes: readonly string[] = ['users']
) =>
  new okta.Client({
    ...oktaConfiguration,
    orgUrl: oktaConfiguration.orgUrl.href,
    authorizationMode: 'PrivateKey',
    scopes: scopes.map((scope) => 'okta.' + scope + '.read'),
  });

/**
 * Creates a client that can read and manage user information in Okta.
 * @param oktaConfiguration configuration to use when construction the client.
 * @param scopes manage scopes to be used with the client
 * @returns the Okta client.
 */
export const oktaManageClient = (
  oktaConfiguration: OktaConfiguration,
  scopes: readonly string[] = ['users']
): okta.Client =>
  new okta.Client({
    ...oktaConfiguration,
    orgUrl: oktaConfiguration.orgUrl.href,
    authorizationMode: 'PrivateKey',
    scopes: scopes.map((scope) => 'okta.' + scope + '.manage'),
  });
