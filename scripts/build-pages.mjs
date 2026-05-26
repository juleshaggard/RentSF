import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiDir = path.join(root, "src", "app", "api");
const disabledApiDir = path.join(root, "src", "app", "_api-disabled");

let movedApi = false;

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

try {
  if (fs.existsSync(apiDir)) {
    if (fs.existsSync(disabledApiDir)) {
      fs.rmSync(disabledApiDir, { recursive: true, force: true });
    }
    fs.renameSync(apiDir, disabledApiDir);
    movedApi = true;
  }

  const pagesEnv = {
    GITHUB_PAGES: "1",
    NEXT_PUBLIC_STATIC_EXPORT: "1"
  };

  run("npx", ["prisma", "generate"]);
  run("npx", ["next", "build", "--turbopack"], pagesEnv);
} finally {
  if (movedApi && fs.existsSync(disabledApiDir)) {
    fs.renameSync(disabledApiDir, apiDir);
  }
}
