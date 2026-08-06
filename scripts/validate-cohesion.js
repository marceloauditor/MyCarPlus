"use strict";
const path = require("path");
const cp = require("child_process");
const root = path.resolve(__dirname, "..");
const run = cp.spawnSync(process.execPath, [path.join(root, "scripts/check-update-package.js"), "--root", root, "--mode", "installed", "--diagnostic", path.join(root, "DIAGNOSTICO_COESAO_V6_11.txt")], { cwd: root, stdio: "inherit" });
if (run.status !== 0) process.exit(run.status || 1);
console.log("VALIDAÇÃO DE COESÃO V6.12: APROVADA");
