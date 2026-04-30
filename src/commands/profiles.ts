import { Command } from "commander";
import ora from "ora";
import fs from "fs";
import path from "path";
import { api, ProfileFilters } from "../lib/api";
import { output } from "../lib/output";
import { config } from "../lib/config";

// Guard — checks auth before any profile command runs
function requireAuth() {
  if (!config.getToken()) {
    output.error("Not logged in. Run: insighta login");
    process.exit(1);
  }
}

export function registerProfilesCommand(program: Command) {
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
      const filters: ProfileFilters = {};
      if (options.gender) filters.gender = options.gender;
      if (options.country) filters.country_id = options.country;
      if (options.ageGroup) filters.age_group = options.ageGroup;
      if (options.minAge) filters.min_age = options.minAge;
      if (options.maxAge) filters.max_age = options.maxAge;
      if (options.sortBy) filters.sort_by = options.sortBy;
      if (options.order) filters.order = options.order;
      if (options.page) filters.page = options.page;
      if (options.limit) filters.limit = options.limit;

      const spinner = ora("Fetching profiles...").start();
      try {
        const response = await api.listProfiles(filters);
        spinner.stop();
        output.paginated(response.data);
      } catch (err) {
        spinner.fail("Failed to fetch profiles");
        output.apiError(err);
        process.exit(1);
      }
    });

  // ── insighta profiles get <id> ──────────────────────────────────
  profiles
    .command("get <id>")
    .description("Get a single profile by ID")
    .action(async (id: string) => {
      requireAuth();

      const spinner = ora(`Fetching profile ${id}...`).start();
      try {
        const response = await api.getProfile(id);
        spinner.stop();
        output.json(response.data.data);
      } catch (err) {
        spinner.fail("Failed to fetch profile");
        output.apiError(err);
        process.exit(1);
      }
    });

  // ── insighta profiles search <query> ───────────────────────────
  profiles
    .command("search <query>")
    .description("Search profiles by natural language query")
    .option("--page <number>", "Page number", parseInt)
    .option("--limit <number>", "Results per page", parseInt)
    .action(async (query: string, options) => {
      requireAuth();

      const filters: ProfileFilters = {};
      if (options.page) filters.page = options.page;
      if (options.limit) filters.limit = options.limit;

      const spinner = ora(`Searching for "${query}"...`).start();
      try {
        const response = await api.searchProfiles(query, filters);
        spinner.stop();
        output.paginated(response.data);
      } catch (err) {
        spinner.fail("Search failed");
        output.apiError(err);
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
      const user = config.getUser();
      if (user?.role === "analyst") {
        output.error("Creating profiles requires the admin role.");
        process.exit(1);
      }

      const spinner = ora(`Creating profile for "${options.name}"...`).start();
      try {
        const response = await api.createProfile(options.name);
        spinner.succeed("Profile created!");
        output.json(response.data.data);
      } catch (err) {
        spinner.fail("Failed to create profile");
        output.apiError(err);
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
        output.error("Only --format csv is currently supported.");
        process.exit(1);
      }

      const filters: ProfileFilters = {};
      if (options.gender) filters.gender = options.gender;
      if (options.country) filters.country_id = options.country;
      if (options.ageGroup) filters.age_group = options.ageGroup;
      if (options.sortBy) filters.sort_by = options.sortBy;
      if (options.order) filters.order = options.order;

      const spinner = ora("Exporting profiles to CSV...").start();
      try {
        const response = await api.exportProfiles(filters);

        // Save to current working directory — TRD requirement
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `profiles_${timestamp}.csv`;
        const filePath = path.join(process.cwd(), filename);

        fs.writeFileSync(filePath, response.data, "utf8");

        spinner.succeed(`CSV saved to: ${filePath}`);
      } catch (err) {
        spinner.fail("Export failed");
        output.apiError(err);
        process.exit(1);
      }
    });
}
