/* eslint-disable functional/no-return-void */
/* eslint-disable functional/no-expression-statement */
/* eslint-disable functional/functional-parameters */
import * as TE from 'fp-ts/TaskEither';
import { User, UserService } from '../services/user-service';
import { Group, GroupService } from '../services/group-service';
import { UserStatus } from '@okta/okta-sdk-nodejs';

export const returnLeftTE = jest.fn(() => TE.left('An error occurred'));

export const user: User = {
  id: 'user_id',
  login: 'login',
  email: 'test@localhost',
  name: 'test user',
  status: UserStatus.ACTIVE,
  deactivated: false,
};

export const deactivatedUser: User = {
  ...user,
  status: UserStatus.DEPROVISIONED,
  deactivated: true,
};

export const group: Group = {
  id: 'group_id',
  name: 'test group',
  type: 'group type',
};

export const baseUserService = (): UserService => ({
  getUser: returnLeftTE,
  createUser: returnLeftTE,
  deleteUser: returnLeftTE,
  deactivateUser: returnLeftTE,
  listUsers: returnLeftTE,
  listUsersInGroup: returnLeftTE,
  activateUser: returnLeftTE,
  expirePasswordAndGetTemporaryPassword: returnLeftTE,
});

export const baseGroupService = (): GroupService => ({
  getGroup: returnLeftTE,
  listGroups: returnLeftTE,
  addUserToGroup: returnLeftTE,
  removeUserFromGroup: returnLeftTE,
});
