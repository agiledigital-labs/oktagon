/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable unused-imports/no-unused-vars-ts */
/* eslint-disable functional/no-return-void */
/* eslint-disable functional/functional-parameters */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

/* eslint-disable functional/no-expression-statement */
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { User, UserService } from '../scripts/services/user-service';
import { addUserToGroup } from '../scripts/add-user-to-group';
import { Group, GroupService } from '../scripts/services/group-service';
import { UserStatus } from '@okta/okta-sdk-nodejs';

const returnLeftTE = (_string: string) => TE.left('An error occured');

const user: User = {
  id: 'id',
  login: 'login',
  email: 'test@localhost',
  name: 'test user',
  status: UserStatus.ACTIVE,
};

const group: Group = {
  id: 'id',
  name: 'test group',
  type: 'group type',
};

const baseUserService: UserService = {
  getUser: returnLeftTE,
  createUser: (_x, _y, _z, _w) => returnLeftTE(''),
  deleteUser: returnLeftTE,
  deactivateUser: returnLeftTE,
  listUsers: () => returnLeftTE(''),
  isDeactivated: (_user: User) => true,
};

const baseGroupService: GroupService = {
  getGroup: returnLeftTE,
  listGroups: () => returnLeftTE(''),
  addUserToGroup: returnLeftTE,
  removeUserFromGroup: returnLeftTE,
};

const baseGetUser = (
  fail: boolean
): ((id: string) => TE.TaskEither<string, O.Option<User>>) =>
  fail ? returnLeftTE : (_id: string) => TE.right(O.some(user));

const baseGetGroup = (
  fail: boolean
): ((id: string) => TE.TaskEither<string, O.Option<Group>>) =>
  fail ? returnLeftTE : (_id: string) => TE.right(O.some(group));

const baseAddUserToGroup = (
  fail: boolean
): ((id1: string, id2: string) => TE.TaskEither<string, string>) =>
  fail ? returnLeftTE : (_groupId: string, _userId: string) => TE.right('blah');

const createUserService = (fail: boolean): UserService => {
  return {
    ...baseUserService,
    getUser: baseGetUser(fail),
  };
};

const createGroupService = (
  getFail: boolean,
  addFail: boolean
): GroupService => {
  return {
    ...baseGroupService,
    getGroup: baseGetGroup(getFail),
    addUserToGroup: baseAddUserToGroup(addFail),
  };
};

describe('Adding Users to Groups', () => {
  const convertToStatement = (str: string) =>
    // eslint-disable-next-line prettier/prettier
    str === 'true' ? 'isn\'t valid/doesn\'t exist' : 'is valid/exists';

  it('Expected pass when calling addUserToGroup with an existing and valid user and group', async () => {
    // Given a user service can retrieve a user.
    const userService: UserService = createUserService(false);

    // And a group service that can retrieve a group
    const groupService: GroupService = createGroupService(false, false);

    // When we add the user to the group.
    const result = await addUserToGroup(
      userService,
      groupService,
      'userId',
      'groupId'
    )();

    // Then we should have a right.
    expect(result).toBeRight();
  });

  test.each([
    [true, true, true],
    [true, false, true],
    [false, true, true],
    [true, true, false],
    [true, false, false],
    [false, true, false],
    [false, false, true],
  ])(
    `Expected fail when calling addUserToGroup given the user ${convertToStatement(
      '%s'
    )}, group ${convertToStatement(
      '%s'
    )}, and addUserToGroup subroutine ${convertToStatement('%s')}`,
    async (userFail, groupFail, addUserFail) => {
      // Given a user service can retrieve a user.
      const userService: UserService = createUserService(userFail);

      // And a group service that can retrieve a group
      const groupService: GroupService = createGroupService(
        groupFail,
        addUserFail
      );

      // When we add the user to the group.
      const result = await addUserToGroup(
        userService,
        groupService,
        'userId',
        'groupId'
      )();

      // Then we should have a left.
      expect(result).toBeLeft();
    }
  );
});
