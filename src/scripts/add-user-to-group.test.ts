/* eslint-disable functional/no-return-void */
/* eslint-disable functional/no-expression-statement */
/* eslint-disable functional/functional-parameters */
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { UserService } from './services/user-service';
import { addUserToGroup } from './add-user-to-group';
import { GroupService } from './services/group-service';

import * as test from './data-providers';

describe('Adding a user to a group', () => {
  it('passes when calling addUserToGroup with an existing user and group', async () => {
    // Given a user service can retrieve a user.
    const userService: UserService = {
      ...test.baseUserService(),
      getUser: () => TE.right(O.some(test.user)),
    };

    // And a group service that can retrieve a group and add a user to it.
    const groupService: GroupService = {
      ...test.baseGroupService(),
      getGroup: () => TE.right(O.some(test.group)),
      addUserToGroup: jest.fn(() => TE.right('group created')),
    };

    // When we add the user to the group.
    const result = await addUserToGroup(
      userService,
      groupService,
      'userId',
      'groupId'
    )();

    // Then we should have a right.
    expect(result).toEqualRight('group created');

    // And the user should have been added to the expected group
    expect(groupService.addUserToGroup).toBeCalledWith(
      test.user.id,
      test.group.id
    );
  });

  it('fails if the user does not exist', async () => {
    // Given a user service that can not locate the user.
    const userService = {
      ...test.baseUserService(),
      getUser: () => TE.right(O.none),
    };

    // And a group service that can find the group.
    const groupService = {
      ...test.baseGroupService(),
      getGroup: () => TE.right(O.some(test.group)),
    };

    // When the user is added to the group
    const result = await addUserToGroup(
      userService,
      groupService,
      'userId',
      'groupId'
    )();

    // Then the request should have failed because the user does not exist
    expect(result).toEqualLeft(
      'User [userId] does not exist. Cannot add user to group.'
    );

    // And no attempt was made to add the user to the group.
    expect(groupService.addUserToGroup).not.toHaveBeenCalled();
  });

  it('fails if retrieving the user does fails', async () => {
    // Given a user service that fails when finding the user.
    const userService = {
      ...test.baseUserService(),
      getUser: () => TE.left('failed to get user'),
    };

    // And a group service that can find the group.
    const groupService = {
      ...test.baseGroupService(),
      getGroup: () => TE.right(O.some(test.group)),
    };

    // When the user is added to the group
    const result = await addUserToGroup(
      userService,
      groupService,
      'userId',
      'groupId'
    )();

    // Then the request should have failed because the call to get the user failed.
    expect(result).toEqualLeft('failed to get user');

    // And no attempt was made to add the user to the group.
    expect(groupService.addUserToGroup).not.toHaveBeenCalled();
  });

  it('fails if the group does not exist', async () => {
    // Given a user service that can locate the user.
    const userService = {
      ...test.baseUserService(),
      getUser: () => TE.right(O.some(test.user)),
    };

    // And a group service that can find not the group.
    const groupService = {
      ...test.baseGroupService(),
      getGroup: () => TE.right(O.none),
    };

    // When the user is added to the group
    const result = await addUserToGroup(
      userService,
      groupService,
      'userId',
      'groupId'
    )();

    // Then the request should have failed because the group does not exist
    expect(result).toEqualLeft(
      'Group [groupId] does not exist. Cannot add user to group.'
    );

    // And no attempt was made to add the user to the group.
    expect(groupService.addUserToGroup).not.toHaveBeenCalled();
  });

  it('fails if getting the group fails', async () => {
    // Given a user service that can locate the user.
    const userService = {
      ...test.baseUserService(),
      getUser: () => TE.right(O.some(test.user)),
    };

    // And a group service fails when finding the gruop.
    const groupService = {
      ...test.baseGroupService(),
      getGroup: () => TE.left('failed to get group'),
    };

    // When the user is added to the group
    const result = await addUserToGroup(
      userService,
      groupService,
      'userId',
      'groupId'
    )();

    // Then the request should have failed because the call to get the group failed.
    expect(result).toEqualLeft('failed to get group');

    // And no attempt was made to add the user to the group.
    expect(groupService.addUserToGroup).not.toHaveBeenCalled();
  });

  it('fails if both the group and the user do not exist', async () => {
    // Given a user service that can not locate the user.
    const userService = {
      ...test.baseUserService(),
      getUser: () => TE.right(O.none),
    };

    // And a group service that can find not the group.
    const groupService = {
      ...test.baseGroupService(),
      getGroup: () => TE.right(O.none),
    };

    // When the user is added to the group
    const result = await addUserToGroup(
      userService,
      groupService,
      'userId',
      'groupId'
    )();

    // Then the request should have failed because the group does not exist
    expect(result).toEqualLeft(
      'Group [groupId] does not exist. User [userId] does not exist. Cannot add user to group.'
    );

    // And no attempt was made to add the user to the group.
    expect(groupService.addUserToGroup).not.toHaveBeenCalled();
  });

  it('reports an error when adding to the group failed', async () => {
    // Given a user service that can locate the user.
    const userService = {
      ...test.baseUserService(),
      getUser: () => TE.right(O.some(test.user)),
    };

    // And a group service that can find the group, but not add the user to it..
    const groupService = {
      ...test.baseGroupService(),
      getGroup: () => TE.right(O.some(test.group)),
      addUserToGroup: jest.fn(() => TE.left('failed to add user to group')),
    };

    // When the user is added to the group
    const result = await addUserToGroup(
      userService,
      groupService,
      'userId',
      'groupId'
    )();

    // Then the request should have failed with the error from the group service.
    expect(result).toEqualLeft('failed to add user to group');

    // But an attempt was made to add the user to the group.
    expect(groupService.addUserToGroup).toBeCalledWith(
      test.user.id,
      test.group.id
    );
  });
});
