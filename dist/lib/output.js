"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.output = void 0;
const chalk_1 = __importDefault(require("chalk"));
const axios_1 = require("axios");
exports.output = {
    success: (msg) => console.log(chalk_1.default.green("✔  " + msg)),
    error: (msg) => console.error(chalk_1.default.red("✖  " + msg)),
    info: (msg) => console.log(chalk_1.default.cyan("ℹ  " + msg)),
    warn: (msg) => console.log(chalk_1.default.yellow("⚠  " + msg)),
    // For paginated API responses
    paginated: (response) => {
        if (response.data.length === 0) {
            console.log(chalk_1.default.yellow("\n  No results found.\n"));
            return;
        }
        // Print the data table
        console.log("");
        console.table(response.data);
        // Print pagination summary below the table
        console.log(chalk_1.default.dim(`  Page ${response.page} of ${response.total_pages}  ·  ` +
            `${response.total} total results  ·  ` +
            `${response.limit} per page`));
        if (response.links.next) {
            console.log(chalk_1.default.dim(`  Next: add --page ${response.page + 1} --limit ${response.limit} to see more`));
        }
        console.log("");
    },
    // For single objects
    json: (data) => {
        console.log("");
        console.log(JSON.stringify(data, null, 2));
        console.log("");
    },
    apiError: (err) => {
        if (err instanceof axios_1.AxiosError) {
            const status = err.response?.status;
            const message = err.response?.data?.message || err.message;
            if (status === 403) {
                console.error(chalk_1.default.red("✖  Access denied. You do not have permission to do that."));
                console.error(chalk_1.default.dim("   (This action may require the admin role)"));
            }
            else if (status === 404) {
                console.error(chalk_1.default.red("✖  Not found."));
            }
            else if (status === 429) {
                console.error(chalk_1.default.red("✖  Rate limit hit. Please wait a moment and try again."));
            }
            else {
                console.error(chalk_1.default.red(`✖  API Error (${status}): ${message}`));
            }
        }
        else if (err instanceof Error) {
            console.error(chalk_1.default.red("✖  " + err.message));
        }
        else {
            console.error(chalk_1.default.red("✖  An unknown error occurred"));
        }
    },
};
