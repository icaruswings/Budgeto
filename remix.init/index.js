import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import PackageJson from "@npmcli/package-json";

const getRandomString = (length) => crypto.randomBytes(length).toString("hex");

const escapeRegExp = (string) =>
  // $& means the whole matched string
  string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const main = async ({ rootDirectory }) => {
  try {
    const DIR_NAME = path.basename(rootDirectory);
    const SUFFIX = getRandomString(2);

    console.log(`📝 Initializing project in ${rootDirectory}...`);

    const README_PATH = path.join(rootDirectory, "README.md");
    const EXAMPLE_ENV_PATH = path.join(rootDirectory, ".env.example");
    const ENV_PATH = path.join(rootDirectory, ".env");

    const APP_SLUG = (DIR_NAME + "-" + SUFFIX).replace(/[^a-zA-Z0-9-_]/g, "-");

    console.log(`🔧 Setting up project as: ${APP_SLUG}`);

    try {
      const [readme, env, packageJson] = await Promise.all([
        fs.readFile(README_PATH, "utf8"),
        fs.readFile(EXAMPLE_ENV_PATH, "utf8"),
        PackageJson.load(rootDirectory),
      ]);

      const TEMPLATE_SLUG = packageJson.content.name;

      packageJson.update({ name: APP_SLUG });

      const newReadme = readme.replace(escapeRegExp(TEMPLATE_SLUG), APP_SLUG);

      const newEnv = env
        .replace(
          /^SESSION_SECRET=.*$/m,
          `SESSION_SECRET="${getRandomString(16)}"`
        )
        .replace(escapeRegExp(TEMPLATE_SLUG), APP_SLUG);

      await Promise.all([
        fs.writeFile(README_PATH, newReadme),
        fs.writeFile(ENV_PATH, newEnv),
        packageJson.save(),
      ]);

      console.log("✅ Project initialization completed successfully!");
    } catch (error) {
      throw new Error(`Failed to process files: ${error.message}`);
    }
  } catch (error) {
    console.error("❌ Project initialization failed:");
    console.error(error);
    throw error;
  }
};

export default main;
