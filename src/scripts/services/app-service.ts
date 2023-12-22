import * as okta from '@okta/okta-sdk-nodejs';
import { type Resource } from '@okta/okta-sdk-nodejs/src/types/resource';
import * as TE from 'fp-ts/TaskEither';
import * as RA from 'fp-ts/ReadonlyArray';
import { type LazyArg, constant } from 'fp-ts/function';

/**
 * Subset of App information provided by Okta. See `okta.Application` for
 * further information on its derived type.
 *
 * @see {@link https://developer.okta.com/docs/reference/api/apps/ Apps}.
 */
export type App = {
  /**
   * The internal Okta identifier.
   */
  readonly id: string;
  /**
   * App name.
   */
  readonly name: string;
  /**
   * Label of the app.
   */
  readonly label: string;
  /**
   * App status.
   */
  readonly status: string;
  /**
   * Date the app was last updated.
   */
  readonly lastUpdated: string;
  /**
   * Date the app was created.
   */
  readonly created: string;
};

/**
 * Converts an Okta Application into a simplified version that has only
 * the information needed by the tool.
 *
 * @param oktaGroup The Okta Application to convert.
 * @returns The converted App.
 */
export const oktaApplicationAsApp: (
  oktaApplication: okta.Application
) => App = ({ id, name, label, status, lastUpdated, created }) => ({
  id,
  name,
  label,
  status,
  lastUpdated,
  created,
});

/**
 * Converts an `okta.Collection` of resources into an array of custom resources.
 *
 * @template A The Okta resource type to convert.
 * @template B The custom resource type to return.
 * @param oktaResourceAsCustomResource A function that converts an Okta resource
 * into a simplified, custom resource (e.g.,
 * {@link oktaApplicationAsApp `oktaApplicationAsApp`}).
 * @param oktaCollection The Okta collection of resources to convert.
 * @returns A `Promise` that resolves to an array of custom resources.
 */
const convertOktaCollectionToArray: <A extends Resource, B>(
  oktaResourceAsCustomResource: (a: A) => B
  // eslint-disable-next-line functional/prefer-readonly-type
) => (oktaCollection: okta.Collection<A>) => Promise<readonly B[]> =
  <A extends Resource, B>(oktaResourceAsCustomResource: (a: A) => B) =>
  (oktaCollection: okta.Collection<A>) => {
    /* We need to populate resources with all of the client data so it can be
    returned. */
    // eslint-disable-next-line functional/prefer-readonly-type
    const resources: B[] = [];

    return oktaCollection
      .each((oktaResource) =>
        /* Okta's custom collection does not allow for any form of mapping, so
        array mutation is needed. */
        // eslint-disable-next-line functional/immutable-data
        resources.push(oktaResourceAsCustomResource(oktaResource))
      )
      .then(constant(resources))
      .then(RA.fromArray);
  };

type ListApps = LazyArg<TE.TaskEither<Error, readonly App[]>>;

type ListUserApps = (userId: string) => TE.TaskEither<Error, readonly App[]>;

export type OktaAppService = {
  readonly listApps: ListApps;
  readonly listUserApps: ListUserApps;
};

export const createOktaAppService: (client: okta.Client) => OktaAppService = (
  client
) => ({
  /**
   * Returns a `TaskEither` that resolves to a list of all apps or rejects
   * with an error.
   *
   * @returns A `TaskEither` that resolves to an array of apps or rejects with
   * an error.
   */
  listApps: constant(
    TE.tryCatch(
      () =>
        convertOktaCollectionToArray(oktaApplicationAsApp)(
          client.listApplications()
        ),
      (error) => new Error('Failed to list apps.', { cause: error })
    )
  ),

  /**
   * Returns a `TaskEither` that resolves to a list of apps that the user with
   * the given user ID has been assigned or rejects with an error.
   *
   * @param userId The user ID of the user whose apps are to be listed.
   * @returns A `TaskEither` that resolves to an array of apps or rejects with
   * an error.
   */
  listUserApps: (userId) =>
    TE.tryCatch(
      async () =>
        await convertOktaCollectionToArray(oktaApplicationAsApp)(
          client.listApplications({ filter: `user.id eq "${userId}"` })
        ),
      (error) => new Error('Failed to list user apps.', { cause: error })
    ),
});
