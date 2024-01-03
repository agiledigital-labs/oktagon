import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { RootCommand } from '..';
import * as Console from 'fp-ts/lib/Console';
import { pipe } from 'fp-ts/lib/function';
import { Argv } from 'yargs';
import { oktaReadOnlyClient } from './services/client-service';
import { retrieveLogs } from './services/okta-service';
import * as okta from '@okta/okta-sdk-nodejs';
import { ReadonlyDate, ReadonlyURL, readonlyDate } from 'readonly-types';
import { table } from 'table';
import * as duration from 'tinyduration';
import { sub, isAfter } from 'date-fns';

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const logsTable = (logs: readonly okta.LogEvent[]): string => {
  return table(
    [
      ['ID', 'Published', 'Severity', 'Type', 'Who', 'Message'],
      // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
      ...logs.map((log: okta.LogEvent) => [
        log.uuid,
        log.published,
        log.severity,
        log.eventType,
        log.actor.displayName,
        log.displayMessage,
      ]),
    ],
    {
      // eslint-disable-next-line functional/functional-parameters
      drawHorizontalLine: () => false,
      // eslint-disable-next-line functional/functional-parameters
      drawVerticalLine: () => false,
    }
  );
};

const displayLogs = (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  client: okta.Client,
  format: 'json' | 'table',
  limit: number,
  query?: string,
  filter?: string,
  since?: ReadonlyDate,
  until?: ReadonlyDate
): TE.TaskEither<Error, string> =>
  pipe(
    retrieveLogs(client, limit, query, filter, since, until),
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    TE.map((logEvents) =>
      format === 'table'
        ? logsTable(logEvents)
        : JSON.stringify(logEvents, null, 2)
    ),
    TE.tapIO(Console.info)
  );

const coercedDate = (s: string) => {
  // eslint-disable-next-line functional/no-try-statement
  try {
    return readonlyDate(s);
  } catch (error: unknown) {
    // eslint-disable-next-line functional/no-throw-statement
    throw new Error(`Invalid date [${s}].`, { cause: error });
  }
};

export default (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  rootCommand: RootCommand
) => {
  const builderCallback = (
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    yargs: RootCommand
  ): Argv<
    {
      readonly 'client-id': string;
    } & {
      readonly 'private-key': string;
    } & {
      readonly 'organisation-url': ReadonlyURL;
    } & {
      readonly 'output-format': 'json' | 'table';
    } & {
      readonly limit: number;
    }
  > => {
    return (
      yargs
        .option('output-format', {
          alias: 'o',
          type: 'string',
          choices: ['json', 'table'] as const,
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          default: 'table' as 'table' | 'json',
          description: 'The format to output the logs in.',
        })
        .option('limit', {
          alias: 'l',
          type: 'number',
          default: 10,
          description: 'The number of logs to retrieve.',
        })
        .option('query', {
          alias: 'q',
          type: 'string',
          description:
            'The query by which the logs will be filtered (e.g. OIDC).',
        })
        .option('filter', {
          alias: 'f',
          type: 'string',
          description:
            'The filter by which the logs will be filtered (e.g. eventType eq "user.session.start").',
        })
        .option('since', {
          description: 'The start date of the logs to retrieve.',
          coerce: (date: string) => coercedDate(date),
        })
        .option('until', {
          description: 'The end date of the logs to retrieve.',
          coerce: (date: string) => coercedDate(date),
        })
        .option('within', {
          description:
            'The start date of the logs to retrieve, expressed as an ISO8601 (https://en.wikipedia.org/wiki/ISO_8601#Durations) duration to be subtracted from now (e.g. 1d/P1D for 1 day, 2w/P2W for two weeks).',
          conflicts: ['since', 'until'],
          coerce: (s: string) => {
            const durationWithP = s.startsWith('P') ? s : `P${s}`;
            // eslint-disable-next-line functional/no-try-statement
            try {
              return duration.parse(durationWithP.toUpperCase());
            } catch (error: unknown) {
              // eslint-disable-next-line functional/no-throw-statement
              throw new Error(`Invalid duration [${s}].`, { cause: error });
            }
          },
        })
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
        .check((argv) => {
          // eslint-disable-next-line functional/no-expression-statement
          console.info(`argv [${JSON.stringify(argv, null, 2)}]`);
          // eslint-disable-next-line functional/no-conditional-statement, sonarjs/no-collapsible-if
          if (argv.since !== undefined && argv.until !== undefined) {
            // eslint-disable-next-line functional/no-conditional-statement
            if (
              isAfter(
                // eslint-disable-next-line no-restricted-globals
                new Date(argv.since.getTime()),
                // eslint-disable-next-line no-restricted-globals
                new Date(argv.until.getTime())
              )
            ) {
              // eslint-disable-next-line functional/no-throw-statement
              throw new Error(
                `Invalid date range, since [${argv.since.toISOString()}] is after until [${argv.until.toISOString()}] but must be before.`
              );
            }
          }
          return true;
        })
    );
  };

  // eslint-disable-next-line sonarjs/prefer-immediate-return
  const command = rootCommand.command(
    'logs',
    'Retrieves logs from okta',
    builderCallback,
    async (args: {
      readonly clientId: string;
      readonly privateKey: string;
      readonly organisationUrl: ReadonlyURL;
      readonly outputFormat: 'json' | 'table';
      readonly limit: number;
      readonly query?: string;
      readonly filter?: string;
      readonly since?: ReadonlyDate;
      readonly until?: ReadonlyDate;
      readonly within?: duration.Duration;
    }) => {
      const { clientId, privateKey } = args;
      const client = oktaReadOnlyClient(
        {
          clientId,
          privateKey,
          orgUrl: args.organisationUrl,
        },
        ['logs']
      );

      const effectiveSince =
        args.since !== undefined
          ? args.since
          : args.within !== undefined
          ? // eslint-disable-next-line no-restricted-globals
            sub(new Date(), args.within)
          : undefined;

      const result = await displayLogs(
        client,
        args.outputFormat,
        args.limit,
        args.query,
        args.filter,
        effectiveSince,
        args.until
      )();
      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-expression-statement
        console.error(`Fail [${JSON.stringify(result.left, null, 2)}].`);
        // eslint-disable-next-line functional/no-throw-statement
        throw result.left;
      }
    },
    [],
    false
  );

  return command;
};
