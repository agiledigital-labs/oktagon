/* eslint-disable functional/no-return-void */
/* eslint-disable functional/no-expression-statement */

import { Left } from 'fp-ts/lib/Either';
import { parseUrl } from './okta-service';

/* eslint-disable functional/functional-parameters */
describe('Parsing url', () => {
  it.each([
    [
      '',
      [
        {
          code: 'invalid_string',
          message: 'Invalid url',
          path: [],
          validation: 'url',
        },
        {
          code: 'invalid_string',
          message: 'URL must start with [https://].',
          path: [],
          validation: { startsWith: 'https://' },
        },
        {
          code: 'invalid_string',
          message: 'URL must end with [.okta.com].',
          path: [],
          validation: { endsWith: '.okta.com' },
        },
        {
          code: 'too_small',
          exact: false,
          inclusive: true,
          message: 'Domain name must be at least 1 character long.',
          minimum: 18,
          path: [],
          type: 'string',
        },
      ],
    ],
    [
      'https://trial-admin.okta.com',
      [
        {
          code: 'custom',
          message:
            'Organisation URL should not be the admin URL. Please remove "-admin" and try again.',
          path: [],
        },
      ],
    ],
  ])(
    'should return a left when the url is invalid',
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    async (url, issues) => {
      const result = await parseUrl(url)();
      expect(result).toEqualLeft(
        new Error(`Client error. Invalid URL [${url}].`)
      );
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      expect((result as Left<Error>).left.cause).toEqual(issues);
    }
  );
});
