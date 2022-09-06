# Oktagon CLI interface

CLI tools for managing users in Okta.

_Only use this tool in non-production environments, because it will bypass any MFA requirements of the organisation AND break the audit log that you would otherwise get in Okta._

## Node usage

After compilation using the `npm run build` command, run all commands using `./dist/oktagon <Command name>`.

## Common/Global parameters

All `oktagon` commands require connecting to the Okta management APIs. The recommended way of doing this is to create an API-only application using the Admin console. The tool currently only supports private key authentication.

Allows for environment variables under the name `OKTAGON_PK`, `OKTAGON_PRIVATE_KEY`, `OKTAGON_CID`, `OKTAGON_CLIENT_ID`. The environment variables correspond to the arguments `--pk`, `--private-key`, `--cid`, and `--client-id` respectively.

The operation will only work if you have provided the correct client ID (in string form) and private key (in string form, must be JWT format e.g -pk "{JWK}").

Please note that the organisation url must be of the base adress rather than the admin url. Trying to pass an argument as `https://website-name-admin.okta.com'` instead of `https://website-name.okta.com'` will result in a 404 error.

The module additionally works for Okta's API services applications only. Applications must be granted the API scopes of users.read and users.manage.

Run `oktagon --help` to see a list of available commands.
