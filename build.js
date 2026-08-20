/* Fuses plain-core.js and plain-ui.html into a single shareable plain.html.
   Run with:  node build.js                                                  */

const fs = require("fs");

const CORE = "plain-core.js";
const UI = "plain-ui.html";
const OUT = "plain.html";

function build() {
  const core = fs.readFileSync(CORE, "utf8");
  const ui = fs.readFileSync(UI, "utf8");

  const found = core.match(/const PLAIN_VERSION\s*=\s*"([^"]+)"/);
  if (!found) {
    console.error(`No PLAIN_VERSION found in ${CORE}. Add: const PLAIN_VERSION = "0.0.0";`);
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
