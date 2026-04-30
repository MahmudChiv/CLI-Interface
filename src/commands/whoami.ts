import { Command, program } from "commander";
import { config } from "../lib/config";
import { output } from "../lib/output";
import chalk from "chalk";

export function registerWhoamiCommand(program: Command) {
  program.command("whoami").description("Show the currently logged in user").action(() => {
    const token = config.getToken()
    const user = config.getUser()

    if (!token || !user) {
      output.error("Not logged in. Run: insighta login");
      process.exit(1);
    }

    console.log("");
    console.log(`  ${chalk.bold("Username:")}  @${user.username}`);
    console.log(`  ${chalk.bold("Email:")}     ${user.email}`);
    console.log(
      `  ${chalk.bold("Role:")}      ${
        user.role === "admin" ? chalk.green(user.role) : chalk.yellow(user.role)
      }`,
    );
    console.log("");
  })
}
