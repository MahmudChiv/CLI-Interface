import chalk from "chalk";
import { AxiosError } from "axios";
import { PaginatedResponse } from "./api";

export const output = {
  success: (msg: string) => console.log(chalk.green("✔  " + msg)),
  error: (msg: string) => console.error(chalk.red("✖  " + msg)),
  info: (msg: string) => console.log(chalk.cyan("ℹ  " + msg)),
  warn: (msg: string) => console.log(chalk.yellow("⚠  " + msg)),

  // For paginated API responses
  paginated: <T extends object>(
    response: PaginatedResponse<T>,
  ) => {
    if (response.data.length === 0) {
      console.log(chalk.yellow("\n  No results found.\n"));
      return;
    }

    // Print the data table
    console.log("");
    console.table(response.data);

    // Print pagination summary below the table
    console.log(
      chalk.dim(
        `  Page ${response.page} of ${response.total_pages}  ·  ` +
          `${response.total} total results  ·  ` +
          `${response.limit} per page`,
      ),
    );

    if (response.links.next) {
      console.log(
        chalk.dim(`  Next: add --page ${response.page + 1} --limit ${response.limit} to see more`),
      );
    }

    console.log("");
  },

  // For single objects
  json: (data: unknown) => {
    console.log("");
    console.log(JSON.stringify(data, null, 2));
    console.log("");
  },

  apiError: (err: unknown) => {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const message = err.response?.data?.message || err.message;

      if (status === 403) {
        console.error(
          chalk.red("✖  Access denied. You do not have permission to do that."),
        );
        console.error(chalk.dim("   (This action may require the admin role)"));
      } else if (status === 404) {
        console.error(chalk.red("✖  Not found."));
      } else if (status === 429) {
        console.error(
          chalk.red("✖  Rate limit hit. Please wait a moment and try again."),
        );
      } else {
        console.error(chalk.red(`✖  API Error (${status}): ${message}`));
      }
    } else if (err instanceof Error) {
      console.error(chalk.red("✖  " + err.message));
    } else {
      console.error(chalk.red("✖  An unknown error occurred"));
    }
  },
};
