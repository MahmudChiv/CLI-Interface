import { Command } from "commander";
import http from "http";
import { exec } from "child_process";
import ora from "ora";
import axios from "axios";
import { config } from "../lib/config";
import { output } from "../lib/output";
import dotenv from "dotenv";
dotenv.config();
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "../util/pkce.util";

const GITHUB_CLIENT_ID = "Ov23liYep2Amjsn74jz5";

function openBrowser(url: string) {
  const platform = process.platform;
  if (platform === "darwin") exec(`open "${url}"`);
  else if (platform === "win32") exec(`start "${url}"`);
  else exec(`xdg-open "${url}"`);
}

function startCallbackServer(
  port: number,
  expectedState: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${port}`);
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
        return reject(
          new Error("State mismatch — possible CSRF attack. Aborting."),
        );
      }

      if (!code) {
        return reject(new Error("No authorization code received from GitHub"));
      }

      resolve(code);
    });

    server.listen(port);
    server.on("error", (err) => {
      reject(
        new Error(
          `Could not start local server on port ${port}: ${err.message}`,
        ),
      );
    });

    // 2 minute timeout
    setTimeout(() => {
      server.close();
      reject(new Error("Login timed out. Please try again."));
    }, 120_000);
  });
}

export function registerLoginCommand(program: Command) {
  program
    .command("login")
    .description("Authenticate via GitHub OAuth")
    .option("-p, --port <port>", "Local port for OAuth callback", "9876")
    .action(async (options) => {
      const port = parseInt(options.port);
      const baseUrl = config.getBaseUrl();

      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = generateState();

      const githubParams = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: `http://localhost:${port}/callback`,
        scope: "read:user user:email",
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });

      const githubUrl = `https://github.com/login/oauth/authorize?${githubParams}`;

      output.info("Opening GitHub in your browser...");
      output.info(`If it doesn't open automatically:\n  ${githubUrl}\n`);

      const codePromise = startCallbackServer(port, state);

      openBrowser(githubUrl);

      const spinner = ora("Waiting for GitHub authorization...").start();

      try {
        const code = await codePromise;
        spinner.text = "Exchanging code for tokens...";

        const response = await axios.post(`${baseUrl}/auth/github/cli/token`, {
          code,
          code_verifier: codeVerifier,
          port,
        });

        const { accessToken, refreshToken, user } = response.data;

        config.setToken(accessToken);
        config.setRefreshToken(refreshToken);
        config.setUser(user);

        spinner.succeed("Logged in successfully!");
        output.success(`Logged in as @${user.username} (${user.role})`);
      } catch (error) {
        spinner.fail("Login failed");
        if (axios.isAxiosError(error)) {
          output.error(error.response?.data?.message || error.message);
        } else if (error instanceof Error) {
          output.error(error.message);
        }
        process.exit(1);
      }
    });
}
