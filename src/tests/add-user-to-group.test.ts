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

describe('Adding Users to Groups', () => {
  const convertToStatement = (str: string) =>
    // eslint-disable-next-line prettier/prettier
    str === 'true' ? 'doesn\'t exist' : 'exists';

  test.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])(
    `Call addUserToGroup given the user ${convertToStatement(
      '%s'
    )} and group ${convertToStatement('%s')}`,
    async (userFail, groupFail) => {
      // Given a user service can retrieve a user.
      const userService: UserService = {
        ...baseUserService,
        getUser: baseGetUser(userFail),
      };

      // And a group service that can retrieve a group
      const groupService: GroupService = {
        ...baseGroupService,
        getGroup: baseGetGroup(groupFail),
        addUserToGroup: baseAddUserToGroup(false),
      };

      // When we add the user to the group.
      const response = addUserToGroup(
        userService,
        groupService,
        'userId',
        'groupId'
      );

      const result = await response();

      // Then we should have a right.
      expect(result).toBeRight();
    }
  );
});