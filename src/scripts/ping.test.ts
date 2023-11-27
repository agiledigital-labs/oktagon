/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable functional/no-return-void */
/* eslint-disable functional/no-expression-statement */
/* eslint-disable functional/functional-parameters */
import { Left } from 'fp-ts/lib/Either';
import { validateOktaServerAndCredentials } from './ping';
import { oktaReadOnlyClient } from './services/client-service';

const mockFetchRequest = jest.fn();
const mockOktaRequest = jest.fn();
jest.mock('node-fetch', () =>
  jest.fn().mockImplementation(() =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    mockFetchRequest()
  )
);

jest.mock('@okta/okta-sdk-nodejs', () => ({
  Client: jest.fn().mockImplementation(() => {
    return {
      oauth: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        getAccessToken: jest.fn().mockImplementation(() => mockOktaRequest()),
      },
    };
  }),
}));
// eslint-disable-next-line functional/no-class
class OktaAPIError extends Error {
  readonly status: number;
  constructor(message: string | undefined, status: number) {
    super(message); // (1)
    // eslint-disable-next-line functional/no-this-expression
    this.status = status;
  }
}
describe('Pinging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const oktaClient = oktaReadOnlyClient({
    clientId: 'client id',
    organisationUrl: 'organisation url',
    privateKey: '',
  });

  it.each([200, 299])(
    'should return a right when the okta server returns status [200-299] and credentials are correct',
    async (statusCode) => {
      mockFetchRequest.mockResolvedValue({ status: statusCode });
      mockOktaRequest.mockResolvedValue('resolved value');
      const result = await validateOktaServerAndCredentials(
        oktaClient,
        '',
        ''
      )();
      expect(result).toEqualRight(true);
      expect(mockFetchRequest).toHaveBeenCalledTimes(1);
      expect(mockOktaRequest).toHaveBeenCalledTimes(1);
    }
  );

  it.each([500, 599])(
    'should return a left when the okta server returns status [500-599]',
    async (statusCode) => {
      mockFetchRequest.mockResolvedValue({ status: statusCode });
      const result = await validateOktaServerAndCredentials(
        oktaClient,
        '',
        ''
      )();
      expect(result).toEqualLeft(
        new Error('Server error. Please wait and try again later.')
      );
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      expect((result as Left<Error>).left.cause).toEqual({
        status: statusCode,
      });
      expect(mockFetchRequest).toHaveBeenCalledTimes(1);
      expect(mockOktaRequest).toHaveBeenCalledTimes(0);
    }
  );

  it.each([400, 499])(
    'should return a left when the okta server returns status [400-499]',
    async (statusCode) => {
      mockFetchRequest.mockResolvedValue({ status: statusCode });
      const result = await validateOktaServerAndCredentials(
        oktaClient,
        '',
        ''
      )();
      expect(result).toEqualLeft(
        new Error(
          'Client error. Please check your client id and the URL of your organisation.'
        )
      );
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      expect((result as Left<Error>).left.cause).toEqual({
        status: statusCode,
      });
      expect(mockFetchRequest).toHaveBeenCalledTimes(1);
      expect(mockOktaRequest).toHaveBeenCalledTimes(0);
    }
  );

  it.each([100, 300, 600])(
    'should return a left when the okta server returns status [100, 300, 600]',
    async (statusCode) => {
      mockFetchRequest.mockResolvedValue({ status: statusCode });
      const result = await validateOktaServerAndCredentials(
        oktaClient,
        '',
        ''
      )();
      expect(result).toEqualLeft(
        new Error('Unexpected response from pinging okta server.')
      );
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      expect((result as Left<Error>).left.cause).toEqual({
        status: statusCode,
      });
      expect(mockFetchRequest).toHaveBeenCalledTimes(1);
      expect(mockOktaRequest).toHaveBeenCalledTimes(0);
    }
  );

  it('should return a left when the ping request fails', async () => {
    mockFetchRequest.mockRejectedValue('rejected value');
    const result = await validateOktaServerAndCredentials(oktaClient, '', '')();
    expect(result).toEqualLeft(new Error('Failed to ping okta server.'));
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    expect((result as Left<Error>).left.cause).toEqual('rejected value');
    expect(mockFetchRequest).toHaveBeenCalledTimes(1);
    expect(mockOktaRequest).toHaveBeenCalledTimes(0);
  });

  it.each([
    new Error('Unable to convert private key from PEM to JWK:'),
    new Error('Key type bla bla is not supported.'),
    new Error(
      'The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received undefined'
    ),
    new Error('error:0180006C:bignum routines::no inverse'),
    new Error('error:1E08010C:DECODER routines::unsupported'),
    new OktaAPIError('error message', 400),
  ])(
    'should return a left when the okta server returns status [200-299] but credentials return a known error',
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    async (error) => {
      mockFetchRequest.mockResolvedValue({ status: 200 });
      mockOktaRequest.mockRejectedValue(error);
      const result = await validateOktaServerAndCredentials(
        oktaClient,
        '',
        ''
      )();
      expect(result).toEqualLeft(
        new Error('Failed to decode the private key.')
      );
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      expect((result as Left<Error>).left.cause).toEqual(error);
      expect(mockFetchRequest).toHaveBeenCalledTimes(1);
      expect(mockOktaRequest).toHaveBeenCalledTimes(1);
    }
  );

  it('should return a left when the okta server returns status [200-299] but credentials return an unknown error', async () => {
    mockFetchRequest.mockResolvedValue({ status: 200 });
    mockOktaRequest.mockRejectedValue('rejected value');
    const result = await validateOktaServerAndCredentials(oktaClient, '', '')();
    expect(result).toEqualLeft(new Error('Failed to get access token.'));
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    expect((result as Left<Error>).left.cause).toEqual('rejected value');
    expect(mockFetchRequest).toHaveBeenCalledTimes(1);
    expect(mockOktaRequest).toHaveBeenCalledTimes(1);
  });
});
