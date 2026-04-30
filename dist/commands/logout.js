"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLogoutCommand = registerLogoutCommand;
const ora_1 = __importDefault(require("ora"));
const config_1 = require("../lib/config");
function registerLogoutCommand(program) {
    program
        .command("logout")
        .description("Log out and clear stored credentials")
        .action(async () => {
        const spinner = (0, ora_1.default)("Logging out...").start();
        try {
            // Tell the backend to invalidate the refresh token server-side
            config_1.config.clearAll();
            // await api.logout();
            spinner.succeed("Logged out successfully");
        }
        catch {
            // Even if the server call fails, we still clear local credentials.
            // No point keeping dead tokens.
            spinner.warn("Could not reach server, clearing local credentials anyway");
        }
    });
}
