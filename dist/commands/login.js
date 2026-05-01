"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLoginCommand = registerLoginCommand;
const http_1 = __importDefault(require("http"));
const child_process_1 = require("child_process");
const ora_1 = __importDefault(require("ora"));
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../lib/config");
const output_1 = require("../lib/output");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pkce_util_1 = require("../util/pkce.util");
const GITHUB_CLIENT_ID = "Ov23liYep2Amjsn74jz5";
function openBrowser(url) {
    const platform = process.platform;
    if (platform === "darwin")
        (0, child_process_1.exec)(`open "${url}"`);
    else if (platform === "win32")
        (0, child_process_1.exec)(`start "${url}"`);
    else
        (0, child_process_1.exec)(`xdg-open "${url}"`);
}
function startCallbackServer(port, expectedState) {
    return new Promise((resolve, reject) => {
        const server = http_1.default.createServer((req, res) => {
            const url = new URL(req.url, `http://localhost:${port}`);
            const code = url.searchParams.get("code");
            const state = url.searchParams.get("state");
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(`
        <html>
          <body style="font-family:sans-serif;text-align:center;padding:60px;background:#0d1117;color:#e6edf3">
            <h2 style="color:#3fb950">✔ Authorization successful!</h2>
            <p>You can close this tab and return to your terminal.</p>
          </body>
        </html>
      `);
            server.close();
            // Validate state to prevent CSRF attacks
            if (state !== expectedState) {
                return reject(new Error("State mismatch — possible CSRF attack. Aborting."));
            }
            if (!code) {
                return reject(new Error("No authorization code received from GitHub"));
            }
            resolve(code);
        });
        server.listen(port);
        server.on("error", (err) => {
            reject(new Error(`Could not start local server on port ${port}: ${err.message}`));
        });
        // 2 minute timeout
        setTimeout(() => {
            server.close();
            reject(new Error("Login timed out. Please try again."));
        }, 120000);
    });
}
function registerLoginCommand(program) {
    program
        .command("login")
        .description("Authenticate via GitHub OAuth")
        .option("-p, --port <port>", "Local port for OAuth callback", "9876")
        .action(async (options) => {
        const port = parseInt(options.port);
        const baseUrl = config_1.config.getBaseUrl();
        const codeVerifier = (0, pkce_util_1.generateCodeVerifier)();
        const codeChallenge = (0, pkce_util_1.generateCodeChallenge)(codeVerifier);
        const state = (0, pkce_util_1.generateState)();
        const githubParams = new URLSearchParams({
            client_id: GITHUB_CLIENT_ID,
            redirect_uri: `http://localhost:${port}/callback`,
            scope: "read:user user:email",
            state,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
        });
        const githubUrl = `https://github.com/login/oauth/authorize?${githubParams}`;
        output_1.output.info("Opening GitHub in your browser...");
        output_1.output.info(`If it doesn't open automatically:\n  ${githubUrl}\n`);
        const codePromise = startCallbackServer(port, state);
        openBrowser(githubUrl);
        const spinner = (0, ora_1.default)("Waiting for GitHub authorization...").start();
        try {
            const code = await codePromise;
            spinner.text = "Exchanging code for tokens...";
            const response = await axios_1.default.post(`${baseUrl}/auth/github/cli/token`, {
                code,
                code_verifier: codeVerifier,
                port,
            });
            const { accessToken, refreshToken, user } = response.data;
            config_1.config.setToken(accessToken);
            config_1.config.setRefreshToken(refreshToken);
            config_1.config.setUser(user);
            spinner.succeed("Logged in successfully!");
            output_1.output.success(`Logged in as @${user.username} (${user.role})`);
        }
        catch (error) {
            spinner.fail("Login failed");
            if (axios_1.default.isAxiosError(error)) {
                output_1.output.error(error.response?.data?.message || error.message);
            }
            else if (error instanceof Error) {
                output_1.output.error(error.message);
            }
            process.exit(1);
        }
    });
}
