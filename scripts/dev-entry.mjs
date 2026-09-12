// Helper used only by the local preview launcher (.claude/launch.json) to
// guarantee the dev server starts with the project directory as cwd
// (needed for lib/db.ts's SQLite file path) regardless of where the
// parent process was spawned from. Normal usage is just `npm run dev`
// from inside this folder, which already has the right cwd.
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.chdir(projectDir);

await import(path.join(projectDir, "node_modules/next/dist/bin/next"));
