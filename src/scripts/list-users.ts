import { Argv } from 'yargs';
import { RootCommand } from '..';
import * as okta from "@okta/okta-sdk-nodejs";

const chalk = require("chalk");
const chalkTable = require("chalk-table");

// User interface, which can be modified for further purposes
interface user {
  login: string;
  email: string;
  firstName: string;
  status: string;
}

// Get the clients given a set of arguments
async function getClients(clientId: string, privateKey: string): Promise<user[]> {
  const client = new okta.Client({
    orgUrl: "https://live-nonprod-esgtech-co.oktapreview.com/",
    authorizationMode: "PrivateKey",
    clientId: clientId,
    scopes: ["okta.users.read"],
    privateKey:
      // eslint-disable-next-line no-secrets/no-secrets
      privateKey
  });

  var users: user[] = [];

  // Adds users to the list of users, can be modified to include additional arguments
  await client.listUsers().each((user: any) => {
    users.push({
      login: String(user.profile.login),
      email: String(user.profile.email),
      firstName: String(user.profile.firstName),
      status: String(user.status)
    });
  });

  return users;
}

export default ({ command }: RootCommand): Argv<unknown> =>
  command(
    'list-users',
    "Provides a list of all users' logins, emails, display names, and statuses. Allows for environment variables under the name OKTAGON_[arg].",
    (yargs) =>
      yargs.env("OKTAGON").option(
        'client-id', {
        type: 'string',
        alias: 'cid',
        describe: 'Okta client ID',
      }
      ).option(
        'private-key', {
        type: 'string',
        alias: 'pk',
        describe: 'Okta private key as string form of JSON',
      }
      ).help()
        .demandOption(['client-id', 'private-key'], "Both arguments are required to sign into Okta"),
    async (args: any) => {

      try {
        let clients = await getClients(args.clientId, args.privateKey);

        const options = {
          leftPad: 1,
          columns: [
            { field: "login", name: chalk.green("Login") },
            { field: "email", name: chalk.green("Email") },
            { field: "firstName", name: chalk.white("D.Name") },
            { field: "status", name: chalk.yellow("Status") }
          ]
        };

        const table = chalkTable(options, clients);
        console.info(table);

      } catch (exp: any) {
        console.info("\n" + chalk.red.bold("ERROR") + " encountered while performing instruction: " + chalk.green(exp.message));
        console.info("Please ensure that you have entered the correct parameters into the argument.\n");
      }
    }
  );
