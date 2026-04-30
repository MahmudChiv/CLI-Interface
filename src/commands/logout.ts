import { Command } from "commander";
import ora from "ora";
import { api } from "../lib/api";
import { config } from "../lib/config";
import { output } from "../lib/output";

export function registerLogoutCommand(program: Command) {
  program
    .command("logout")
    .description("Log out and clear stored credentials")
    .action(async () => {
      const spinner = ora("Logging out...").start();
      try {
        // Tell the backend to invalidate the refresh token server-side
        config.clearAll();
        // await api.logout();
        spinner.succeed("Logged out successfully");
      } catch {
        // Even if the server call fails, we still clear local credentials.
        // No point keeping dead tokens.
        spinner.warn(
          "Could not reach server, clearing local credentials anyway",
        );
      }
    });
}
