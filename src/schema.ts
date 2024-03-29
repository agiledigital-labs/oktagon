import { z } from 'zod';
import { readonlyURL } from 'readonly-types';

export const oktaAPIErrorSchema = z.object({
  status: z.number(),
});
const urlProtocol = 'https:';
const urlEnd = '.okta.com';
export const urlSchema = z
  .string()
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  .transform((urlString, ctx) => {
    const parsedUrl = readonlyURL(urlString);
    // eslint-disable-next-line functional/no-conditional-statement
    if (parsedUrl === undefined) {
      // eslint-disable-next-line functional/no-expression-statement
      ctx.addIssue({
        fatal: true,
        code: z.ZodIssueCode.custom,
        message: `Given input [${urlString}] could not be parsed to URL.`,
      });
      return z.NEVER;
    }

    return parsedUrl;
  })
  .refine(
    (url) => url.protocol === urlProtocol,
    `URL protocol must be [${urlProtocol}].`
  )
  .refine((url) => {
    return url.hostname.endsWith(urlEnd);
  }, `URL must end with [${urlEnd}].`)
  .refine(
    (url) => !url.hostname.endsWith('-admin.okta.com'),
    'Organisation URL should not be the admin URL. Please remove "-admin" and try again.'
  )
  .refine((url) => {
    return url.hostname.length > urlEnd.length;
  }, 'Domain name must be at least 1 character long.');
