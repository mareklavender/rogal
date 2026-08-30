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
| [`test.js`](test.js) | 140 checks. |
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
const ROGAL_VERSION = "0.9.0";
```

The build stamps it into the page and the PDF, so they can't drift apart. Bump it whenever the language changes, and add a line to `CHANGELOG.md` saying what happened.

## What to check before a release

- `node test.js` passes.
- Every example in the playground still runs.
- Every code block in the reference still runs. They're real programs, so they can be tested — and they have caught stale syntax more than once.
- The counts in the documentation match the interpreter. Recount rather than carrying the old number forward; that's how "30 actions" survived four versions when the answer was 32.
- Read the prose back cold. Not for accuracy — for anything that needs a second read.

## How the language is built

`rogal-core.js` is a tokeniser, a recursive-descent parser and a tree-walking interpreter, in that order, in one file. No build step, no dependencies, no code generation. It's meant to be readable start to finish.

The evaluator is internally asynchronous so that `read` and `get` can wait for something, at a measured cost of about 1.5x. The language itself has no notion of waiting, and shouldn't gain one.

A host supplies the five actions that reach outside a program — `read`, `write`, `get`, `ask`, `now`. The browser and the command line each provide their own. The language behaves identically in both; only the host differs, and anything a browser can't do explains itself rather than failing quietly.
