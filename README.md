# Oktagon CLI interface

This is a project to aid in the interaction with Okta.

### Node usage

After compilation using the `npm run build` command, run all commands using `./dist/oktagon <Command name>`.

### Command: list-users

Provides a list of all users' logins, emails, display names, and statuses. Allows for environment variables under the name `OKTAGON_PK`, `OKTAGON_PRIVATE_KEY`, `OKTAGON_CID`, `OKTAGON_CLIENT_ID`. The environment variables correspond to the arguments `--pk`, `--private-key`, `--cid`, and `--client-id` respectively.

The operation will only work if you have provided the correct client ID (in string form) and private key (in string form, must be JWT format e.g -pk "{JWK}").