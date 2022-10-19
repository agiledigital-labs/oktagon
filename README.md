# Oktagon CLI interface

A CLI tool for managing users in Okta.

_Only use this tool in non-production environments, because it will bypass any MFA requirements of the organisation AND break the audit log that you would otherwise get in Okta._

## Node usage

After compilation using the `npm run build` command, run all commands using `./dist/oktagon <Command name>`.

## Common/Global parameters

All `oktagon` commands require connecting to the Okta management APIs. The recommended way of doing this is to create an API-only application using the Admin console. The tool currently only supports private key authentication.

Allows for environment variables under the name `OKTAGON_PK`, `OKTAGON_PRIVATE_KEY`, `OKTAGON_CID`, `OKTAGON_CLIENT_ID`. The environment variables correspond to the arguments `--pk`, `--private-key`, `--cid`, and `--client-id` respectively.

The operation will only work if you have provided the correct client ID (in string form) and private key (in string form, must be JWT format e.g -pk "{JWK}").

Please note that the organisation url must be of the base address rather than the admin url. Trying to pass an argument as `https://website-name-admin.okta.com'` instead of `https://website-name.okta.com'` will result in a 404 error.

The module additionally works for Okta's API services applications only.

Run `oktagon --help` to see a list of available commands.

## Application scopes

Some commands require different access to application scopes. The list provided below details what scopes are required to run a given command:

```
COMMAND                 PERMISSIONS
list-users              okta.users.read
list-users [group]      okta.groups.read
create-user             okta.users.manage
deactivate-user         okta.users.manage
delete-user             okta.users.manage
list-groups             okta.groups.read
add-user-to-group       okta.groups.manage, okta.users.manage
remove-user-from-group  okta.groups.manage, okta.users.manage
```

Attemting to run a command without the required permissions will most likely result in a 400 or 403 HTTPS error.