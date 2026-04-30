"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProfilesCommand = registerProfilesCommand;
const ora_1 = __importDefault(require("ora"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const api_1 = require("../lib/api");
const output_1 = require("../lib/output");
const config_1 = require("../lib/config");
// Guard — checks auth before any profile command runs
function requireAuth() {
    if (!config_1.config.getToken()) {
        output_1.output.error("Not logged in. Run: insighta login");
        process.exit(1);
    }
}
function registerProfilesCommand(program) {
    const profiles = program.command("profiles").description("Manage profiles");
    // ── insighta profiles list ──────────────────────────────────────
    profiles
        .command("list")
        .description("List profiles with optional filters")
        .option("--gender <gender>", "Filter by gender (male/female)")
        .option("--country <code>", "Filter by country code (e.g. NG, US)")
        .option("--age-group <group>", "Filter by age group (e.g. adult, youth)")
        .option("--min-age <number>", "Minimum age", parseInt)
        .option("--max-age <number>", "Maximum age", parseInt)
        .option("--sort-by <field>", "Sort by field (e.g. age, name)")
        .option("--order <direction>", "Sort direction: asc or desc", "asc")
        .option("--page <number>", "Page number", parseInt)
        .option("--limit <number>", "Results per page", parseInt)
        .action(async (options) => {
        requireAuth();
        // Build filters object — only include options that were actually passed
        const filters = {};
        if (options.gender)
            filters.gender = options.gender;
        if (options.country)
            filters.country_id = options.country;
        if (options.ageGroup)
            filters.age_group = options.ageGroup;
        if (options.minAge)
            filters.min_age = options.minAge;
        if (options.maxAge)
            filters.max_age = options.maxAge;
        if (options.sortBy)
            filters.sort_by = options.sortBy;
        if (options.order)
            filters.order = options.order;
        if (options.page)
            filters.page = options.page;
        if (options.limit)
            filters.limit = options.limit;
        const spinner = (0, ora_1.default)("Fetching profiles...").start();
        try {
            const response = await api_1.api.listProfiles(filters);
            spinner.stop();
            output_1.output.paginated(response.data);
        }
        catch (err) {
            spinner.fail("Failed to fetch profiles");
            output_1.output.apiError(err);
            process.exit(1);
        }
    });
    // ── insighta profiles get <id> ──────────────────────────────────
    profiles
        .command("get <id>")
        .description("Get a single profile by ID")
        .action(async (id) => {
        requireAuth();
        const spinner = (0, ora_1.default)(`Fetching profile ${id}...`).start();
        try {
            const response = await api_1.api.getProfile(id);
            spinner.stop();
            output_1.output.json(response.data.data);
        }
        catch (err) {
            spinner.fail("Failed to fetch profile");
            output_1.output.apiError(err);
            process.exit(1);
        }
    });
    // ── insighta profiles search <query> ───────────────────────────
    profiles
        .command("search <query>")
        .description("Search profiles by natural language query")
        .option("--page <number>", "Page number", parseInt)
        .option("--limit <number>", "Results per page", parseInt)
        .action(async (query, options) => {
        requireAuth();
        const filters = {};
        if (options.page)
            filters.page = options.page;
        if (options.limit)
            filters.limit = options.limit;
        const spinner = (0, ora_1.default)(`Searching for "${query}"...`).start();
        try {
            const response = await api_1.api.searchProfiles(query, filters);
            spinner.stop();
            output_1.output.paginated(response.data);
        }
        catch (err) {
            spinner.fail("Search failed");
            output_1.output.apiError(err);
            process.exit(1);
        }
    });
    // ── insighta profiles create ────────────────────────────────────
    profiles
        .command("create")
        .description("Create a new profile (admin only)")
        .requiredOption("--name <name>", "Full name of the person")
        .action(async (options) => {
        requireAuth();
        // Warn analyst users before even hitting the API
        const user = config_1.config.getUser();
        if (user?.role === "analyst") {
            output_1.output.error("Creating profiles requires the admin role.");
            process.exit(1);
        }
        const spinner = (0, ora_1.default)(`Creating profile for "${options.name}"...`).start();
        try {
            const response = await api_1.api.createProfile(options.name);
            spinner.succeed("Profile created!");
            output_1.output.json(response.data.data);
        }
        catch (err) {
            spinner.fail("Failed to create profile");
            output_1.output.apiError(err);
            process.exit(1);
        }
    });
    // ── insighta profiles export ────────────────────────────────────
    profiles
        .command("export")
        .description("Export profiles to CSV")
        .requiredOption("--format <format>", "Export format (csv)")
        .option("--gender <gender>", "Filter by gender")
        .option("--country <code>", "Filter by country code")
        .option("--age-group <group>", "Filter by age group")
        .option("--sort-by <field>", "Sort by field")
        .option("--order <direction>", "Sort direction: asc or desc")
        .action(async (options) => {
        requireAuth();
        if (options.format !== "csv") {
            output_1.output.error("Only --format csv is currently supported.");
            process.exit(1);
        }
        const filters = {};
        if (options.gender)
            filters.gender = options.gender;
        if (options.country)
            filters.country_id = options.country;
        if (options.ageGroup)
            filters.age_group = options.ageGroup;
        if (options.sortBy)
            filters.sort_by = options.sortBy;
        if (options.order)
            filters.order = options.order;
        const spinner = (0, ora_1.default)("Exporting profiles to CSV...").start();
        try {
            const response = await api_1.api.exportProfiles(filters);
            // Save to current working directory — TRD requirement
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const filename = `profiles_${timestamp}.csv`;
            const filePath = path_1.default.join(process.cwd(), filename);
            fs_1.default.writeFileSync(filePath, response.data, "utf8");
            spinner.succeed(`CSV saved to: ${filePath}`);
        }
        catch (err) {
            spinner.fail("Export failed");
            output_1.output.apiError(err);
            process.exit(1);
        }
    });
}
