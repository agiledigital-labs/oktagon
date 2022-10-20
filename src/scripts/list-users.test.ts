/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable functional/no-return-void */
/* eslint-disable functional/no-expression-statement */
/* eslint-disable functional/functional-parameters */
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { UserService } from './services/user-service';
import { users, usersInGroup } from './list-users';
import { GroupService } from './services/group-service';

import * as test from './__fixtures__/data-providers';

describe('Listing all users', () => {
  // Note that listing multiple or no users is outside the scope of the test, as that functionality comes from a dependency
  it('passes when attempting to list users without error', async () => {
    // Given a user service that can retreive a list containing a single user
    const userService: UserService = {
      ...test.baseUserService(),
      listUsers: () => TE.right([test.user]),
    };

    // When we attempt to list the users from the client
    const result = await users(userService)();

    // Then we should have a right
    expect(result).toBeRight();

    // And if it is a right, we should get a string as a result
    const actual = E.toUnion(result);

    // And we expect that the resulting string contains the ID, Email, Name, and Status of the User
    expect(actual).toContain('user_id');
    expect(actual).toContain('test@localhost');
    expect(actual).toContain('test user');
    expect(actual).toContain('ACTIVE');
  });

  it('fails when attempting to list users with error', async () => {
    // Given a user service that fails to retrieve a list of users
    const userService: UserService = {
      ...test.baseUserService(),
      listUsers: () => TE.left('expected error'),
    };

    // When we attempt to list the users from the client
    const result = await users(userService)();

    // Then we should have a left
    expect(result).toEqualLeft('expected error');
  });
});

describe('Listing users within groups', () => {
  it('passes when attempting to list users in an existing group without error', async () => {
    // Given a user service that can retreive a list containing a single user
    const userService: UserService = {
      ...test.baseUserService(),
      // eslint-disable-next-line unused-imports/no-unused-vars-ts, @typescript-eslint/no-unused-vars
      listUsersInGroup: (_group) => TE.right([test.user]),
    };

    // And a group service that can find a group
    const groupService: GroupService = {
      ...test.baseGroupService(),
      // eslint-disable-next-line unused-imports/no-unused-vars-ts, @typescript-eslint/no-unused-vars
      getGroup: jest.fn((_group) => TE.right(O.some(test.group))),
    };

    // When we attempt to list the users from the client
    const result = await usersInGroup(
      userService,
      groupService,
      test.group.id
    )();

    // Then we should have a right
    expect(result).toBeRight();

    // And if it is a right, we should get a string as a result
    const actual = E.toUnion(result);

    // And we expect that the resulting string contains the ID, Email, Name, and Status of the User
    expect(actual).toContain('user_id');
    expect(actual).toContain('test@localhost');
    expect(actual).toContain('test user');
    expect(actual).toContain('ACTIVE');

    // And we also expect getGroup to have been called
    expect(groupService.getGroup).toBeCalledWith(test.group.id);
  });

  it('fails when attempting to list users within an existing group with error', async () => {
    // Given a user service that fails to retrieve a list of users
    const userService: UserService = {
      ...test.baseUserService(),
      listUsersInGroup: () => TE.left('expected error'),
    };

    // And a group service that succsessfully retreives a group
    const groupService: GroupService = {
      ...test.baseGroupService(),
      // eslint-disable-next-line unused-imports/no-unused-vars-ts, @typescript-eslint/no-unused-vars
      getGroup: jest.fn((_group) => TE.right(O.some(test.group))),
    };

    // When we attempt to list the users from the client
    const result = await usersInGroup(
      userService,
      groupService,
      test.group.id
    )();

    // Then we should have a left
    expect(result).toEqualLeft('expected error');

    // But getGroup was called
    expect(groupService.getGroup).toBeCalledWith(test.group.id);
  });

  it('fails when attempting to list users given getGroup fails', async () => {
    // Given a user service that succsessfully retrieves a list of users (which should be impossible if the group doesn't exist)
    const userService: UserService = {
      ...test.baseUserService(),
      // eslint-disable-next-line unused-imports/no-unused-vars-ts, @typescript-eslint/no-unused-vars
      listUsersInGroup: jest.fn((_group) => TE.right([test.user])),
    };

    // And a group service that fails to find the group
    const groupService: GroupService = {
      ...test.baseGroupService(),
      // eslint-disable-next-line unused-imports/no-unused-vars-ts, @typescript-eslint/no-unused-vars
      getGroup: (_group) => TE.left('expected error'),
    };

    // When we attempt to list the users from the client
    const result = await usersInGroup(
      userService,
      groupService,
      test.group.id
    )();

    // Then we should have a left
    expect(result).toEqualLeft('expected error');

    // And listUsersInGroup was never called
    expect(userService.listUsersInGroup).not.toHaveBeenCalled();
  });

  it('fails when attempting to list users from a non-existent group', async () => {
    // Given a user service that succsessfully retrieves a list of users (which should be impossible if the group doesn't exist)
    const userService: UserService = {
      ...test.baseUserService(),
      // eslint-disable-next-line unused-imports/no-unused-vars-ts, @typescript-eslint/no-unused-vars
      listUsersInGroup: jest.fn((_group) => TE.right([test.user])),
    };

    // And a getGroup function that fails to find the group, this time returning none instead of an error
    const groupService: GroupService = {
      ...test.baseGroupService(),
      // eslint-disable-next-line unused-imports/no-unused-vars-ts, @typescript-eslint/no-unused-vars
      getGroup: (_group) => TE.right(O.none),
    };

    // When we attempt to list the users from the client
    const result = await usersInGroup(
      userService,
      groupService,
      test.group.id
    )();

    // Then we should have a left
    expect(result).toEqualLeft('The group [group_id] does not exist');

    // And listUsersInGroup was never called
    expect(userService.listUsersInGroup).not.toHaveBeenCalled();
  });
});
