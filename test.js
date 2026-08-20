/* Checks the language still behaves as intended.
   Run with:  node test.js                                          */

const { run, PLAIN_VERSION } = require("./plain-core.js");

let passed = 0;
const failures = [];

/* shows(source, expected lines) — the program runs and prints exactly this */
function shows(label, source, expected) {
  const r = run(source);
  if (r.error) {
    failures.push(`${label}\n    expected output, got error: ${r.error.message}`);
    return;
  }
  const got = r.output.join("\n");
  const want = expected.join("\n");
  if (got !== want) {
    failures.push(`${label}\n    expected: ${JSON.stringify(want)}\n    got:      ${JSON.stringify(got)}`);
    return;
  }
  passed++;
}

/* fails(source, fragment) — the program stops, and the message mentions this */
function fails(label, source, fragment) {
  const r = run(source);
  if (!r.error) {
    failures.push(`${label}\n    expected an error mentioning ${JSON.stringify(fragment)}, but it ran cleanly`);
    return;
  }
  const whole = r.error.message + " " + (r.error.hint || "");
  if (!whole.includes(fragment)) {
    failures.push(`${label}\n    expected a message mentioning ${JSON.stringify(fragment)}\n    got: ${r.error.message}`);
    return;
  }
  passed++;
}

/* ---------- values and showing ---------- */

shows("text and numbers join", `show "Total: " + 5`, ["Total: 5"]);
shows("several values on one line", `show 1, "two", true`, ["1 two true"]);
shows("numbers are tidied", `show 0.1 + 0.2`, ["0.3"]);
shows("division", `show 10 / 4`, ["2.5"]);
shows("remainder", `show 7 % 3`, ["1"]);
shows("lists print readably", `show [1, "a", true]`, [`[1, "a", true]`]);
shows("records print readably", `show {name: "Ada", age: 36}`, [`{name: "Ada", age: 36}`]);
shows("nothing prints", `set x to nothing\nshow x`, ["nothing"]);

/* ---------- set and change ---------- */

shows("set then change", `set total to 0\nchange total to 5\nshow total`, ["5"]);
fails("set twice", `set x to 1\nset x to 2`, "already exists");
fails("change what doesn't exist", `change x to 1`, "nothing called");
fails("change a near miss suggests", `set total to 0\nchange totl to 1`, "total");
fails("cannot shadow a built-in", `set count to 1`, "built-in");
fails("no equals sign", `x = 5`, `no "="`);
fails("set cannot reach inside", `set p to {a: 1}\nset p.a to 2`, "whole new name");
shows("change reaches inside", `set p to {a: 1}\nchange p.a to 2\nshow p`, ["{a: 2}"]);
shows("change a list position", `set xs to [1, 2]\nchange xs[1] to 9\nshow xs`, ["[9, 2]"]);

/* ---------- blocks and scope ---------- */

shows("accumulator across a loop",
  `set total to 0\nfor each n in [1, 2, 3]\n  change total to total + n\nend\nshow total`, ["6"]);
fails("name made in a loop is forgotten",
  `for each n in [1]\n  set found to n\nend\nshow found`, "only exists inside");
fails("name made in an if is forgotten",
  `if true\n  set x to 1\nend\nshow x`, "only exists inside");
fails("loop name is forgotten",
  `for each n in [1]\n  show n\nend\nshow n`, "only exists inside");
fails("loop name cannot clash",
  `set n to 1\nfor each n in [1]\n  show n\nend`, "already exists");

/* ---------- actions ---------- */

shows("action gives a value", `make double(n)\n  give n * 2\nend\nshow double(21)`, ["42"]);
shows("recursion",
  `make fact(n)\n  if n is at most 1\n    give 1\n  end\n  give n * fact(n - 1)\nend\nshow fact(6)`, ["720"]);
shows("an action may call another",
  `make double(n)\n  give n * 2\nend\nmake quad(n)\n  give double(double(n))\nend\nshow quad(3)`, ["12"]);
shows("inputs are reusable across actions",
  `make double(n)\n  give n * 2\nend\nmake triple(n)\n  give n * 3\nend\nshow double(4), triple(4)`, ["8 12"]);
shows("actions are values",
  `make double(n)\n  give n * 2\nend\nmake apply(fn, v)\n  give fn(v)\nend\nshow apply(double, 7)`, ["14"]);
shows("no give means nothing", `make f()\n  set x to 1\nend\nshow f()`, ["nothing"]);
fails("actions cannot see outside names",
  `set tax to 0.2\nmake total(a)\n  give a * tax\nend\nshow total(1)`, "can't see outside");
fails("actions cannot change outside names",
  `set tally to 0\nmake bump()\n  change tally to 1\nend\nbump()`, "can't see outside");
fails("wrong number of inputs",
  `make double(n)\n  give n * 2\nend\nshow double(1, 2)`, "needs 1 value");
fails("duplicate input names", `make f(a, a)\n  give a\nend`, "already has an input");

/* ---------- conditions ---------- */

shows("else if chain",
  `set s to 7\nif s is at least 9\n  show "high"\nelse if s is at least 7\n  show "mid"\nelse\n  show "low"\nend`, ["mid"]);
shows("and / or / not", `show true and false, true or false, not true`, ["false true false"]);
fails("if needs true or false", `if 5\n  show "x"\nend`, "instead of true or false");
fails("symbols are not comparisons", `set a to 1\nif a > 0\n  show "x"\nend`, "in words");

/* ---------- loops ---------- */

shows("repeat", `repeat 3 times\n  show "x"\nend`, ["x", "x", "x"]);
shows("while", `set n to 1\nwhile n is at most 3\n  show n\n  change n to n + 1\nend`, ["1", "2", "3"]);
shows("stop leaves the loop", `for each n in [1, 2, 3]\n  if n is 3\n    stop\n  end\n  show n\nend`, ["1", "2"]);
shows("for each over text", `for each letter in "ab"\n  show letter\nend`, ["a", "b"]);

/* ---------- built-in actions ---------- */

shows("count adapts", `show count([1,2]), count("abc"), count({a: 1})`, ["2 3 1"]);
shows("sum", `show sum([1, 2, 3])`, ["6"]);
shows("sort_up and sort_down", `show sort_up([3,1,2]), sort_down([3,1,2])`, ["[1, 2, 3] [3, 2, 1]"]);
shows("sorting text ignores capitals", `show sort_up(["banana", "Apple"])`, [`["Apple", "banana"]`]);
shows("sorting records by field",
  `set p to [{n: "b", v: 2}, {n: "a", v: 1}]\nshow sort_up(p, "v")`, [`[{n: "a", v: 1}, {n: "b", v: 2}]`]);
fails("sorting by a missing field",
  `set p to [{n: "a"}]\nshow sort_up(p, "nn")`, "no field called");
fails("bare sort is retired", `show sort([1])`, "sort_up");
shows("add gives a new list", `set xs to [1]\nset ys to add(xs, 2)\nshow xs, ys`, ["[1] [1, 2]"]);
shows("remove gives a new list", `set xs to [1, 2]\nshow remove(xs, 1), xs`, ["[2] [1, 2]"]);
shows("first, last, reverse", `show first([1,2]), last([1,2]), reverse([1,2])`, ["1 2 [2, 1]"]);
shows("has", `show has([1,2], 2), has("abc", "b"), has({a: 1}, "a")`, ["true true true"]);
shows("join and split", `show join([1,2], "-"), split("a,b", ",")`, [`1-2 ["a", "b"]`]);
shows("upper, lower, trim", `show upper("a"), lower("B"), trim("  c  ")`, ["A b c"]);
shows("round to places", `show round(17.12345, 2)`, ["17.12"]);
shows("round is symmetric", `show round(2.5), round(-2.5)`, ["3 -3"]);
shows("text and number convert", `show number("12") + 1, text(12) + "!"`, ["13 12!"]);
shows("keys", `show keys({a: 1, b: 2})`, [`["a", "b"]`]);

/* ---------- errors that must stay helpful ---------- */

fails("unknown name suggests yours first", `set total to 0\nshow totl`, "total");
fails("list position past the end", `show [1,2,3][5]`, "only has 3");
fails("missing end names the opener", `if true\n  show "x"`, "never closed");
fails("unclosed text", `show "abc`, "quote mark");
fails("divide by zero", `show 1 / 0`, "Dividing by zero");
fails("unreadable number", `show number("twelve")`, "can't be read");
fails("wrong kind of arithmetic", `show "a" * 2`, "multiply");
fails("missing record field lists the real ones", `set p to {name: "a"}\nshow p.naem`, "name");
fails("endless loop is stopped", `while true\n  set x to 1\nend`, "stopped it");

/* ---------- report ---------- */

console.log(`\nPlain v${PLAIN_VERSION}`);
if (failures.length === 0) {
  console.log(`All ${passed} checks passed.\n`);
  process.exit(0);
}
console.log(`${passed} passed, ${failures.length} FAILED:\n`);
failures.forEach(f => console.log("  ✗ " + f + "\n"));
process.exit(1);
