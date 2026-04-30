#!/usr/bin/env node

import { Command } from "commander";
import { registerLoginCommand } from "./commands/login";
import { registerLogoutCommand } from "./commands/logout";
import { registerWhoamiCommand } from "./commands/whoami";
import { registerProfilesCommand } from "./commands/profiles";

const program = new Command();

program
  .name("insighta")
  .description("CLI for the Insighta Labs platform")
  .version("1.0.0");

registerLoginCommand(program);
registerLogoutCommand(program);
registerWhoamiCommand(program);
registerProfilesCommand(program);

program.parse(process.argv);
