import { z } from 'zod';
import { readonlyURL } from 'readonly-types';

export const oktaAPIErrorSchema = z.object({
  status: z.number(),
});
const urlStart = 'https://';
const urlEnd = '.okta.com';
export const urlSchema = z
  .string()
  .url()
  .startsWith(urlStart, `URL must start with [${urlStart}].`)
  .min(
    urlStart.length + urlEnd.length + 1,
    'Domain name must be at least 1 character long.'
  )
  .refine(
    (url) => !url.endsWith('-admin.okta.com'),
    'Organisation URL should not be the admin URL. Please remove "-admin" and try again.'
  )
  .refine(
    //.co will cause fetch to time out
    (url) => {
      return readonlyURL(url)?.hostname.endsWith(urlEnd);
    },
    `URL must end with [${urlEnd}].`
  );
