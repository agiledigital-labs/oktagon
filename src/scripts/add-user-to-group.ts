import { Argv } from 'yargs';
import { RootCommand } from '..';
import { Response } from 'node-fetch';

import { UserService, OktaUserService, User } from './services/user-service';
import {
  Group,
  GroupService,
  OktaGroupService,
} from './services/group-service';
import { oktaManageClient } from './services/client-service';
import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';
import * as A from 'fp-ts/lib/Apply';

import * as NEA from 'fp-ts/NonEmptyArray';

const applicativeValidation = E.getApplicativeValidation(
  NEA.getSemigroup<string>()
);

// There is no suitable way to check and confirm that a user exists/does not exist within a particular group outside of
// searching for them in a large array of users. So to preserve a timewise nature. it is best to just let commands work
// even if it didn't do anything.

const addUserToGroup = (
  userService: UserService,
  groupService: GroupService,
  user: string,
  group: string
): TE.TaskEither<string, Response> => {
  const validateGroupExists = (
    maybeGroup: O.Option<Group>
  ): E.Either<NEA.NonEmptyArray<string>, Group> =>
    pipe(
      maybeGroup,
      // eslint-disable-next-line functional/functional-parameters
      E.fromOption(() =>
        NEA.of(`Group [${group}] does not exist, can not add user to group`)
      )
    );

  const validateUserExists = (
    maybeUser: O.Option<User>
  ): E.Either<NEA.NonEmptyArray<string>, User> =>
    pipe(
      maybeUser,
      // eslint-disable-next-line functional/functional-parameters
      E.fromOption(() =>
        NEA.of(`User [${user}] does not exist, can not add user to group`)
      )
    );

  return TE.flatten(
    pipe(
      user,
      userService.getUser,
      TE.chain((maybeUser) =>
        pipe(
          group,
          groupService.getGroup,
          TE.map((maybeGroup) =>
            pipe(
              A.sequenceT(applicativeValidation)(
                validateGroupExists(maybeGroup),
                validateUserExists(maybeUser)
              ),
              // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
              E.mapLeft((errors) => errors.join(',')),
              TE.fromEither,
              // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
              TE.chain(([group, user]) => {
                return groupService.addUserToGroup(group.id, user.id);
              })
            )
          )
        )
      ),
      // eslint-disable-next-line functional/functional-parameters
      TE.chainFirstIOK(() =>
        Console.info(`Added user [${user}] to group [${group}].`)
      )
    )
  );
};

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
        throw new Error(result.left);
      }
    }
  );
