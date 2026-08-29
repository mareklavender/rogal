#!/usr/bin/env node
/* Runs a Plain program from the command line, with files and the network.
   Usage:  node plain.js script.plain                                     */

const fs = require("fs");
const path = require("path");
const { run, PLAIN_VERSION, makeRecord, momentRecord } = require("./plain-core.js");

const file = process.argv[2];

if (!file || file === "--help" || file === "-h") {
  // "node plain.js" when running from source, just "plain" when compiled
  const compiled = typeof Bun !== "undefined" && String(process.argv[1] || "").includes("$bunfs");
  const calledAs = compiled
    ? "./" + path.basename(process.execPath)
    : "node " + path.basename(process.argv[1] || "plain.js");
  console.log(`Plain v${PLAIN_VERSION}\n\n  ${calledAs} <file>\n\nRuns a Plain program. Files are read and written next to the\nprogram, not next to wherever you happen to be.`);
  process.exit(file ? 0 : 1);
}

if (!fs.existsSync(file)) {
  console.error(`There's no file called "${file}" here.`);
  process.exit(1);
}

const near = name => path.resolve(path.dirname(path.resolve(file)), name);

// Anything the host throws is turned into a sentence; the interpreter
// wraps it with the line and the caret.
const host = {
  async library(name, node) {
    const beside = near(name + ".plain");
    const shipped = path.join(__dirname, name + ".plain");
    for (const candidate of [beside, shipped]) {
      if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf8");
    }
    throw plainly(`I couldn't find "${name}.plain".`, node,
      `Put it next to your program, or next to Plain itself.`);
  },

  async read(name, node) {
    const full = near(name);
    if (!fs.existsSync(full)) throw plainly(`There's no file called "${name}" next to this program.`, node,
      `Check the spelling, or that it's in the same folder.`);
    if (fs.statSync(full).isDirectory()) throw plainly(`"${name}" is a folder, not a file.`, node);
    return fs.readFileSync(full, "utf8");
  },

  async write(name, text, node) {
    const full = near(name);
    try { fs.writeFileSync(full, text); }
    catch (e) { throw plainly(`I couldn't write "${name}".`, node, e.code === "EACCES" ? `There's no permission to write there.` : e.message); }
    return text.length;
  },

  async ask(question, node) {
    const answer = await askOnTheTerminal(question);
    if (answer === null)
      throw plainly(`Nothing was answered.`, node, `"ask" waits for a reply, and the input ended first.`);
    return answer;
  },

  async now() {
    return momentRecord(makeRecord);
  },

  async get(address, node) {
    let response;
    try { response = await fetch(address); }
    catch (e) { throw plainly(`I couldn't reach ${address}.`, node, `Check the address, and that you're online.`); }
    if (!response.ok) throw plainly(`${address} answered with ${response.status}.`, node,
      response.status === 404 ? `That address doesn't exist.` : `The site refused the request.`);
    return await response.text();
  },
};

function askOnTheTerminal(question) {
  const readline = require("readline");
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let answered = false;
    const settle = value => { if (!answered) { answered = true; resolve(value); } };
    rl.question(question + " ", answer => { settle(answer); rl.close(); });
    // Only counts as "no answer" if the input ended before one arrived.
    rl.on("close", () => settle(null));
  });
}

function plainly(message, node, hint) {
  const e = new Error(message);
  e.plain = true;
  e.line = node && node.tok ? node.tok.line : 1;
  e.col = node && node.tok ? node.tok.col : 1;
  e.len = node && node.tok ? String(node.tok.text).length : 1;
  e.hint = hint || null;
  e.fix = null;
  return e;
}

(async () => {
  const source = fs.readFileSync(file, "utf8");
  const result = await run(source, host);

  for (const line of result.output) console.log(line);

  if (result.error) {
    const srcLine = (source.split("\n")[result.error.line - 1] || "").replace(/\t/g, "  ");
    const carets = " ".repeat(Math.max(0, result.error.col - 1)) + "^".repeat(Math.max(1, result.error.len));
    console.error(`\nLine ${result.error.line}`);
    console.error(`  ${srcLine}`);
    console.error(`  ${carets}`);
    console.error(result.error.message);
    if (result.error.hint) console.error(result.error.hint);
    process.exit(1);
  }
})();
