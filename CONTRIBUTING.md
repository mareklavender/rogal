# Working on Rogal

Everything you need is in this repository. There are no dependencies to install for the language itself — only Node to run the tests and the build.

## The files

| File | What it is |
|---|---|
| [`rogal-core.js`](rogal-core.js) | The language — tokeniser, parser, interpreter. |
| [`rogal-ui.html`](rogal-ui.html) | The playground page. |
| [`rogal-reference.md`](rogal-reference.md) | The reference. |
| [`rogal.js`](rogal.js) | The command-line runner. |
| [`dates.rogal`](dates.rogal) | A date library, written in Rogal itself. |
| [`csv.rogal`](csv.rogal) | A CSV library, likewise. |
| [`json.rogal`](json.rogal) | A JSON library, likewise. |
| `LICENSE` | Apache 2.0. |
| [`test.js`](test.js) | 219 checks. |
| [`build.js`](build.js) | Squashes the interpreter and the page into `rogal.html`. |
| [`make-pdf.py`](make-pdf.py) | Turns the reference into a PDF. |
| `rogal.html` | **Generated.** Never edit it. |
| `rogal-reference.pdf` | **Generated.** Never edit it. |

Three files are edited by hand and two are produced from them. The split means a change to the language shows up in the history as a few lines, rather than a whole rewritten page.

## The loop

```
node test.js      # check nothing broke
node build.js     # produce rogal.html
```

Run the tests first, always. They catch the mistakes that are easy to make and hard to notice — a helpful error that quietly stops firing, a built-in that starts modifying what it was given.

To rebuild the PDF you'll also need pandoc, wkhtmltopdf, and Python's reportlab and pypdf:

```
python3 make-pdf.py
```

## The version

It lives in one place, the top of `rogal-core.js`:

```js
const ROGAL_VERSION = "0.9.5";
```

The build stamps it into the page and the PDF, so they can't drift apart. Bump it whenever the language changes, and add a line to `CHANGELOG.md` saying what happened.

## What belongs in the core

The core is for what you can't write cleanly in Rogal itself.

`read` can't be written in Rogal — nothing else reaches a file. `fail` can't — no action can stop a program. `parse_csv` can, and does, in `csv.rogal`. So can `starts(line, prefix)`, in four lines on top of `slice`.

The test for any new built-in: **try writing it in Rogal first.** If it comes out clean, it belongs in a library. If it's impossible or grotesque, it belongs in the core. That's what keeps 32 actions from becoming 200.

## Words from other languages

Someone arriving from Python or JavaScript reaches for a habit, not a typo. `print`, `return`, `elif`, `null` — the error should teach the Rogal way rather than suggesting they make a variable called `print`.

The table is `FROM_ELSEWHERE` in `rogal-core.js`, wired into three separate error paths, and `test.js` checks a sample. Add to both when a new one turns up.

Worth re-reading it when a feature lands: if error handling ever arrives, `try` and `catch` stop being "Rogal doesn't have this" and need different entries rather than new ones.

## Security, every release

A short list, because the surface is small:

- **Can a program reach where it shouldn't?** `use` takes a name, never a path. `read` and `write` are deliberately unrestricted, which is documented. Any new kernel action needs the same question asked.
- **Does anything from a program reach the page as HTML?** Output uses `textContent`; errors use `escapeHtml`. If either becomes `innerHTML`, a program could inject script into the page.
- **Do the limits still hold?** 2000 lines, four million steps, five seconds, 300 levels of recursion, 200 of copying. Each was added for a reason and each could be lost in a rewrite.
- **Is anything new reachable from inside an ordinary action?** The kernel is sealed off on purpose, and `reach` is the only door. A new action that quietly isn't sealed would undo it.
- **What can a shared file do?** Someone downloads a `.rogal` file and runs it. Today that's `read` plus `get`, which is the same exposure as any scripting language — but it should stay a considered position rather than an accident.

## Read it as someone arriving cold

Every sentence can be true and the document still not work, because things get added in the order they were thought of rather than the order someone needs them. The README told people to download a file, then mentioned two sections later that a link was better — both true, wrong way round. That happened because the hosting advice was written when nothing was hosted, and nobody moved it afterwards.

So once a release is otherwise done, read the README top to bottom and ask whether the first thing someone needs is the first thing they find. Check the reference's cross-references still land where they say, since section numbers shift when one is added.

## What to check before a release

- `node test.js` passes.
- Every example in the playground still runs.
- Every code block in the reference still runs. They're real programs, so they can be tested — and they have caught stale syntax more than once.
- The counts in the documentation match the interpreter. Recount rather than carrying the old number forward; that's how "30 actions" survived four versions when the answer was 32.
- Read the prose back cold. Not for accuracy — for anything that needs a second read.
- Check any claim that Rogal *lacks* something. Two of the four in "what it doesn't have yet" were wrong: it said there were no dates when `now()` is one of the 32 actions, and no error handling without mentioning `fail`. A wrong absence puts people off for no reason.

## How the language is built

`rogal-core.js` is a tokeniser, a recursive-descent parser and a tree-walking interpreter, in that order, in one file. No build step, no dependencies, no code generation. It's meant to be readable start to finish.

The evaluator is internally asynchronous so that `read` and `get` can wait for something, at a measured cost of about 1.5x. The language itself has no notion of waiting, and shouldn't gain one.

A host supplies the five actions that reach outside a program — `read`, `write`, `get`, `ask`, `now`. The browser and the command line each provide their own. The language behaves identically in both; only the host differs, and anything a browser can't do explains itself rather than failing quietly.
