import { Argv } from 'yargs';
import { RootCommand } from '..';

import {
  validateUserExists,
  validateGroupExists,
} from './services/validation-service';
import { UserService, OktaUserService } from './services/user-service';
import { GroupService, OktaGroupService } from './services/group-service';
import { oktaManageClient } from './services/client-service';
import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';
import * as Ap from 'fp-ts/lib/Apply';
import * as NEA from 'fp-ts/NonEmptyArray';

const applicativeValidation = E.getApplicativeValidation(
  NEA.getSemigroup<string>()
);

// There is no suitable way to check and confirm that a user exists/does not exist within a particular group outside of
// searching for them in a large array of users. So to preserve a timewise nature. it is best to just let commands work
// even if it didn't do anything.

export const addUserToGroup = (
  userService: UserService,
  groupService: GroupService,
  user: string,
  group: string
): TE.TaskEither<Error, string> =>
  pipe(
    Ap.sequenceT(TE.ApplyPar)(
      userService.getUser(user),
      groupService.getGroup(group)
    ),
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    TE.chainEitherK(([maybeUser, maybeGroup]) =>
      pipe(
        Ap.sequenceT(applicativeValidation)(
          validateGroupExists(maybeGroup, group),
          validateUserExists(maybeUser, user)
        ),
        E.mapLeft(
          // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
          (errors) =>
            new Error('Can not add user to group.', {
              cause: errors.join(' '),
            })
        )
      )
    ),
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    TE.chain(([group, user]) => groupService.addUserToGroup(user.id, group.id)),
    TE.chainFirstIOK((response) => Console.info(response))
  );

export default (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  rootCommand: RootCommand
): Argv<{
  readonly clientId: string;
  readonly privateKey: string;
  readonly organisationUrl: string;
  readonly user: string;
  readonly group: string;
}> =>
  rootCommand.command(
    'add-user-to-group [user] [group]',
    'Adds an existing user to an existing group. Will perform the operation even if the user already exists in the group.',
    // eslint-disable-next-line functional/no-return-void, @typescript-eslint/prefer-readonly-parameter-types
    (yargs) => {
      // eslint-disable-next-line functional/no-expression-statement
      yargs
        .option('user-id', {
          type: 'string',
          alias: ['user-login', 'user-email', 'user'],
          // eslint-disable-next-line quotes
          describe: "The user's ID, login, or email address",
          demandOption: true,
        })
        .option('group', {
          type: 'string',
          // eslint-disable-next-line quotes
          describe: "The group's ID",
          demandOption: true,
        });
    },
    async (args: {
      readonly clientId: string;
      readonly privateKey: string;
      readonly organisationUrl: string;
      readonly user: string;
      readonly group: string;
    }) => {
      const client = oktaManageClient({ ...args }, ['users', 'groups']);
      const userService = new OktaUserService(client);
      const groupService = new OktaGroupService(client);

      const result = await addUserToGroup(
        userService,
        groupService,
        args.user,
        args.group
      )();

      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw result.left;
      }
    }
  );
