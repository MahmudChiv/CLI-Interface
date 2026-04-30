"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWhoamiCommand = registerWhoamiCommand;
const config_1 = require("../lib/config");
const output_1 = require("../lib/output");
const chalk_1 = __importDefault(require("chalk"));
function registerWhoamiCommand(program) {
    program.command("whoami").description("Show the currently logged in user").action(() => {
        const token = config_1.config.getToken();
        const user = config_1.config.getUser();
        if (!token || !user) {
            output_1.output.error("Not logged in. Run: insighta login");
            process.exit(1);
        }
        console.log("");
        console.log(`  ${chalk_1.default.bold("Username:")}  @${user.username}`);
        console.log(`  ${chalk_1.default.bold("Email:")}     ${user.email}`);
        console.log(`  ${chalk_1.default.bold("Role:")}      ${user.role === "admin" ? chalk_1.default.green(user.role) : chalk_1.default.yellow(user.role)}`);
        console.log("");
    });
}
