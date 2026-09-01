/*
 * Rogal — a small programming language.
 * Copyright 2026 Marek "Lavender" Bartoszak
 *
 * Licensed under the Apache License, Version 2.0. You may not use this file
 * except in compliance with the License. A copy is in LICENSE, and at
 * http://www.apache.org/licenses/LICENSE-2.0
 */

/* Fuses rogal-core.js and rogal-ui.html into a single shareable rogal.html.
   Run with:  node build.js                                                  */

const fs = require("fs");

const CORE = "rogal-core.js";
const UI = "rogal-ui.html";
const OUT = "rogal.html";

function build() {
  const core = fs.readFileSync(CORE, "utf8");
  const ui = fs.readFileSync(UI, "utf8");

  const found = core.match(/const ROGAL_VERSION\s*=\s*"([^"]+)"/);
  if (!found) {
    console.error(`No ROGAL_VERSION found in ${CORE}. Add: const ROGAL_VERSION = "0.0.0";`);
    process.exit(1);
  }
  const version = found[1];

  if (!ui.includes("/*__CORE__*/")) {
    console.error(`No /*__CORE__*/ placeholder found in ${UI}. The interpreter has nowhere to go.`);
    process.exit(1);
  }

  const page = ui
    .replace("/*__CORE__*/", () => core)
    .replace(/__VERSION__/g, version);

  fs.writeFileSync(OUT, page);

  const kb = (Buffer.byteLength(page) / 1024).toFixed(1);
  console.log(`Built ${OUT}  ·  v${version}  ·  ${kb} KB`);
  console.log(`Upload that one file. Do not edit it — it is regenerated every build.`);
}

build();
