import * as NEA from 'fp-ts/NonEmptyArray';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import { User } from './user-service';
import { Group } from './group-service';
import * as O from 'fp-ts/lib/Option';

export const validateUserExists = (
  maybeUser: O.Option<User>,
  user = 'undefined'
): E.Either<NEA.NonEmptyArray<string>, User> =>
  pipe(
    maybeUser,
    // eslint-disable-next-line functional/functional-parameters
    E.fromOption(() => NEA.of(`User [${user}] does not exist`))
  );

export const validateGroupExists = (
  maybeGroup: O.Option<Group>,
  group = 'undefined'
): E.Either<NEA.NonEmptyArray<string>, Group> =>
  pipe(
    maybeGroup,
    // eslint-disable-next-line functional/functional-parameters
    E.fromOption(() => NEA.of(`Group [${group}] does not exist`))
  );
