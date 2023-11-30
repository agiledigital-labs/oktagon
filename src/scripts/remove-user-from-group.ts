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
import * as A from 'fp-ts/lib/Apply';
import * as NEA from 'fp-ts/NonEmptyArray';
import { ReadonlyURL } from 'readonly-types';

const applicativeValidation = E.getApplicativeValidation(
  NEA.getSemigroup<string>()
);

// There is no suitable way to check and confirm that a user exists/does not exist within a particular group outside of
// searching for them in a large array of users. So to preserve a timewise nature. it is best to just let commands work
// even if it didn't do anything.

const removeUserFromGroup = (
  userService: UserService,
  groupService: GroupService,
  user: string,
  group: string
): TE.TaskEither<Error, string> =>
  pipe(
    user,
    userService.getUser,
    TE.chain((maybeUser) =>
      pipe(
        group,
        groupService.getGroup,
        TE.chain((maybeGroup) =>
          pipe(
            A.sequenceT(applicativeValidation)(
              validateGroupExists(maybeGroup, group),
              validateUserExists(maybeUser, user)
            ),
            E.mapLeft(
              // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
              (errors) =>
                new Error('Can not remove user from group.', {
                  cause: errors.join('. '),
                })
            ),
            TE.fromEither,
            // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
            TE.chain(([group, user]) =>
              groupService.removeUserFromGroup(user.id, group.id)
            )
          )
        )
      )
    ),
    TE.chainFirstIOK((response) => Console.info(response))
  );
export default (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  rootCommand: RootCommand
): Argv<{
  readonly clientId: string;
  readonly privateKey: string;
  readonly orgUrl: ReadonlyURL;
  readonly user: string;
  readonly group: string;
}> =>
  rootCommand.command(
    'remove-user-from-group [user] [group]',
    'Removes an existing user from an existing group. Will perform the operation even if the user already does not exist in the group.',
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
    // Note: do not use spread operator on args as it is not type safe
    async (args: {
      readonly clientId: string;
      readonly privateKey: string;
      readonly orgUrl: ReadonlyURL;
      readonly user: string;
      readonly group: string;
    }) => {
      const client = oktaManageClient(
        {
          clientId: args.clientId,
          privateKey: args.privateKey,
          orgUrl: args.orgUrl,
        },
        ['users', 'groups']
      );
      const userService = new OktaUserService(client);
      const groupService = new OktaGroupService(client);

      const result = await removeUserFromGroup(
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
