# Oktagon CLI interface

A CLI tool for managing users in Okta.

_Only use this tool in non-production environments, because it will bypass any MFA requirements of the organisation AND break the audit log that you would otherwise get in Okta._

## Node usage

After compilation using the `npm run build` command, run all commands using `./dist/oktagon <Command name>`.

## Common/Global parameters

All `oktagon` commands require connecting to the Okta management APIs. The recommended way of doing this is to create an API-only application using the Admin console. The tool currently only supports private key authentication.

Allows for environment variables under the name `OKTAGON_PK`, `OKTAGON_PRIVATE_KEY`, `OKTAGON_CID`, `OKTAGON_CLIENT_ID`. The environment variables correspond to the arguments `--pk`, `--private-key`, `--cid`, and `--client-id` respectively.

The operation will only work if you have provided the correct client ID (in string form) and private key (in string form, must be JWT format e.g `--pk "{JWK}"`).

Please note that the organisation url must be of the base address rather than the admin url. Trying to pass an argument as `https://website-name-admin.okta.com` instead of `https://website-name.okta.com` will result in a 404 error.

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

## Testing Guide

When testing the tool, a series of steps should always be performed before testing the new implementations.

To begin, after cloining the repository, install, run the linter, run the unit tests, and try to build the tool:

```
npm i
npm run lint
npm run test
npm run build
```

Ensure that no errors or failed tests have been flagged in the process of running the code.

Next, try to attempt to connect to your designated okta sandbox or non-production server. Currently there is no tool to do this in isolation (See issue [IE-11](https://agiledigital.atlassian.net/browse/IE-11) on Jira), so it is reccomended to try and list all the users in the organisation:

```
./dist/oktagon --ou <Okta Org. URL> --pk <Application Private Key> --cid <Application Client ID> list-users
```

Running this command should provide a list of non-deprovisioned users within the organisation. Invalid URLs and PKs will be flagged by the program. If you get a HTTPS page not found error, then check that your entered details are correct. If you get a HTTPS forbidden error, check that you have correctly granted the permission for your application to read users.

If trying to test commands relating to groups, try and run the list-groups and list-users [group] command as well:

```
./dist/oktagon --ou <Okta Org. URL> --pk <Application Private Key> --cid <Application Client ID> list-groups
./dist/oktagon --ou <Okta Org. URL> --pk <Application Private Key> --cid <Application Client ID> list-users [group id]
```

Finally, always verify that the solution exists cleanly, and that the specific implementations are working in accordance with the suggested QA plan on the related Jira issue.

It is also reccomended that you try and store the three required arguments as environent variables while testing in order to reduce command line clutter. This is not required. See the section on Common/Global variables for information on how to do it.
