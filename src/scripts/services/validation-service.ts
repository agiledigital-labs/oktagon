import * as NEA from 'fp-ts/NonEmptyArray';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import { User } from './user-service';
import { Group } from './group-service';
import * as O from 'fp-ts/lib/Option';
import fetch, { Response } from 'node-fetch';
import * as TE from 'fp-ts/lib/TaskEither';

export const validateUserExists = (
  maybeUser: O.Option<User>,
  user: string
): E.Either<NEA.NonEmptyArray<string>, User> =>
  pipe(
    maybeUser,
    E.fromOption(() => NEA.of(`User [${user}] does not exist.`))
  );

export const validateGroupExists = (
  maybeGroup: O.Option<Group>,
  group: string
): E.Either<NEA.NonEmptyArray<string>, Group> =>
  pipe(
    maybeGroup,
    E.fromOption(() => NEA.of(`Group [${group}] does not exist.`))
  );

/**
 * Pings the okta server to see if it is up and running.
 * @param clientId - the client id of the okta application.
 * @param organisationUrl - the url of the okta organisation.
 * @returns a TaskEither that resolves to a string if the okta server is up and running, otherwise an error message.
 */
export const pingOktaServer = (
  clientId: string,
  organisationUrl: string
): TE.TaskEither<Error, Response> =>
  TE.tryCatch(
    async () => {
      return await fetch(
        `${organisationUrl}/oauth2/default/.well-known/oauth-authorization-server?client_id=${clientId}`
      );
    },
    (error: unknown) => {
      // eslint-disable-next-line functional/no-conditional-statement
      if (error instanceof Error) {
        return error;
      }
      return new Error('Failed to ping okta server.', {
        cause: error,
      });
    }
  );
