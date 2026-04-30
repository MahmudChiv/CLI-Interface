#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const login_1 = require("./commands/login");
const logout_1 = require("./commands/logout");
const whoami_1 = require("./commands/whoami");
const profiles_1 = require("./commands/profiles");
const program = new commander_1.Command();
program
    .name("insighta")
    .description("CLI for the Insighta Labs platform")
    .version("1.0.0");
(0, login_1.registerLoginCommand)(program);
(0, logout_1.registerLogoutCommand)(program);
(0, whoami_1.registerWhoamiCommand)(program);
(0, profiles_1.registerProfilesCommand)(program);
program.parse(process.argv);
