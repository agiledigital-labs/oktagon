import { Argv } from 'yargs';
import { RootCommand } from '..';

import { UserService, OktaUserService, User } from './services/user-service';
import { oktaManageClient } from './services/client-service';
import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import * as O from 'fp-ts/lib/Option';
import { flow, pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';
import { ReadonlyURL } from 'readonly-types';

/**
 * Deletes a user belonging to an Okta organisation/client
 * @param service the service used to communicate with the client
 * @param userId the ID of the user to be deleted
 * @param force whether to delete the user regardless of if they are deprovisioned or not
 * @returns the deleted user
 */
export const deleteUser = (
  service: UserService,
  userId: string,
  force: boolean
): TE.TaskEither<Error, User> =>
  pipe(
    userId,
    service.getUser,
    TE.chain(
      flow(
        O.fold(
          () =>
            TE.left(
              new Error(`User [${userId}] does not exist. Can not delete.`)
            ),
          (user) =>
            user.deactivated
              ? service.deleteUser(userId)
              : force
              ? pipe(
                  service.deactivateUser(userId),
                  TE.chain((user: User) => service.deleteUser(user.id))
                )
              : TE.left(
                  new Error(
                    `User [${userId}] has not been deprovisioned. Deprovision before deleting.`
                  )
                )
        )
      )
    ),
    TE.chainFirstIOK((user) =>
      Console.info(`Deleted [${user.id}] [${user.email}].`)
    )
  );

export default (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  rootCommand: RootCommand
): Argv<{
  readonly clientId: string;
  readonly privateKey: string;
  readonly orgUrl: ReadonlyURL;
  readonly userId: string;
  readonly force: boolean;
}> =>
  rootCommand.command(
    'delete-user [user-id]',
    'Deletes the specified user. Only works if user status is deprovisioned or if the --force argument is included.',
    // eslint-disable-next-line functional/no-return-void, @typescript-eslint/prefer-readonly-parameter-types
    (yargs) => {
      // eslint-disable-next-line functional/no-expression-statement
      yargs
        .positional('user-id', {
          describe: 'the identifier of the user to delete',
          type: 'string',
          demandOption: true,
        })
        .boolean('force')
        .describe('force', 'force delete the user regardless of their status');
    },
    async (args: {
      readonly clientId: string;
      readonly privateKey: string;
      readonly orgUrl: ReadonlyURL;
      readonly userId: string;
      readonly force: boolean;
    }) => {
      const client = oktaManageClient({
        clientId: args.clientId,
        privateKey: args.privateKey,
        orgUrl: args.orgUrl,
      });
      const service = new OktaUserService(client);

      const result = await deleteUser(service, args.userId, args.force)();

      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw result.left;
      }
    }
  );
