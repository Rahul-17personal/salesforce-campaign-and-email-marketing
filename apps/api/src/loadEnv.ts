import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// npm workspaces execute API scripts with apps/api as cwd. Resolve the
// repository-root .env explicitly so local configuration is consistent.
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(currentDirectory, "../../..");
dotenv.config({ path: resolve(repositoryRoot, ".env") });
