"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const cp = require("child_process");
const root = path.resolve(__dirname, "..");
const diagnostic = path.join(os.tmpdir(), `DIAGNOSTICO_COESAO_MYCAR_V6_14_${process.pid}.txt`);
const run = cp.spawnSync(process.execPath, [path.join(root, "scripts/check-update-package.js"), "--root", root, "--mode", "installed", "--diagnostic", diagnostic], { cwd: root, stdio: "inherit" });
try { if (fs.existsSync(diagnostic)) fs.unlinkSync(diagnostic); } catch (_) {}
if (run.status !== 0) process.exit(run.status || 1);
console.log("VALIDAÇÃO DE COESÃO V6.14: APROVADA");
