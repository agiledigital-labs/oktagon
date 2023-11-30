/* eslint-disable functional/no-return-void */
/* eslint-disable functional/no-expression-statement */

import { Left } from 'fp-ts/lib/Either';
import { parseUrl } from './okta-service';
import { readonlyURL } from 'readonly-types';

/* eslint-disable functional/functional-parameters */
describe('Parsing url', () => {
  it.each(['https://example.okta.com', 'https://example.okta.com/'])(
    'should return a right when the url is valid',
    async (url) => {
      const result = await parseUrl(url)();
      expect(result).toEqualRight(readonlyURL(url));
    }
  );

  it.each([
    [
      '2',
      [
        {
          code: 'custom',
          fatal: true,
          message: 'Given input [2] could not be parsed to URL.',
          path: [],
        },
      ],
    ],
    [
      'http://.co',
      [
        {
          code: 'custom',
          message: 'URL protocol must be [https:].',
          path: [],
        },
        {
          code: 'custom',
          message: 'URL must end with [.okta.com].',
          path: [],
        },
        {
          code: 'custom',
          message: 'Domain name must be at least 1 character long.',
          path: [],
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
