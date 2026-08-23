# Plain

A small programming language that's genuinely easy to write, where a mistake tells you what to do about it instead of what went wrong inside the machine.

29 words. One way to write each thing. Blocks close with `end`, so indentation can never break a program. Comparisons are words, so `=` and `==` can't be muddled. And when something goes wrong you get the line, the word underlined, a sentence explaining it, and often a button that fixes it.

```plain
set prices to [12.4, 8.9, 31.2]
set total to 0

for each price in prices
  change total to total + price
end

show "Average:", round(total / count(prices), 2)
```

```
Average: 17.5
```

Small enough to hold in your head, and solid enough to write real scripts in. That makes it a good first language, and a reasonable one to stay with.

**Status:** working prototype, v0.5.0. **The name is a placeholder** — it hasn't been decided, and the repo will be renamed when it is.

---

## Trying it

Open **`plain.html`** in a browser. That's it — nothing to install, and the playground has examples and a reference built in.

Better still, put it on the web and use a link. See *Sharing it* below.

## Running programs against real files

You'll need [Node.js](https://nodejs.org) installed, and two files sitting together in a folder: `plain-core.js` and `plain.js`.

```
node plain.js myscript.plain
```

Files are read and written next to the script, not next to wherever your terminal happens to be.

## Working on the language

| File | What it is |
|---|---|
| `plain-core.js` | The language itself — tokeniser, parser, interpreter. Edit this. |
| `plain-ui.html` | The playground page. Edit this. |
| `plain-reference.md` | The reference. Edit this. |
| `build.js` | Squashes the first two into `plain.html`. |
| `make-pdf.py` | Turns the reference into a PDF. Needs pandoc, wkhtmltopdf, reportlab, pypdf. |
| `test.js` | 106 checks. |
| `plain.js` | The command-line runner. |
| `plain.html` | **Generated.** The one file to share. Don't edit it. |

Three sources, one thing to hand out. The split means a change to the language shows up as a few lines in the history, rather than a whole rewritten page.

```
node test.js      # check nothing broke
node build.js     # make plain.html
```

Run the tests first, always. They catch the mistakes that are easy to make and hard to spot — a helpful error that quietly stops firing, a built-in that starts modifying what you gave it.

The version lives in one place, the top of `plain-core.js`:

```js
const PLAIN_VERSION = "0.5.0";
```

The build stamps it into the page, so the two can't drift apart. Bump it whenever the language changes.

## Sharing it

Send a **link**, not the file. iOS won't run JavaScript in local HTML, so anyone opening `plain.html` from Files, Mail or a cloud drive on an iPhone gets a dead page — no examples, no Run button.

**Cloud storage doesn't help.** Dropbox, iCloud, Google Drive and Proton Drive all show you a preview rather than serving the page, so JavaScript stays blocked and you get the same dead page. It needs real hosting.

Any of these give you a URL in a minute or two:

- [Netlify Drop](https://app.netlify.com/drop) — drag the file on, no account needed
- Cloudflare Pages
- GitHub Pages — free, but only from a public repository

On an iPhone with no hosting, **Documents by Readdle** has a proper browser inside it and will run the file from local storage.

## How it's put together

The reasoning behind these is in `plain-reference.md`.

- **`set` creates, `change` alters.** A typo can't quietly make a second variable.
- **A name holds a value, not a link to someone else's.** Every binding copies, so two names never share a list by accident.
- **Actions see only what you pass in**, and can't alter it. Everything an action touches is on its first line, and every action lives at the top level.
- **Nothing is changed in place.** `add`, `remove` and `sort_up` all hand back something new.
- **An `if` takes only `true` or `false`.** Nothing is secretly true.
- **Nothing is silently rounded.** A fractional count or position is an error, not a guess.
- **Lists count from 1**, the way people do.
- **Reaching outside is visible.** `read`, `write`, `get` and `ask` each need a line of their own and can't be used inside an action.

## What's next

1. ~~Async evaluator~~ — done in v0.4.0, at a measured cost of 1.54x.
2. ~~A kernel: `read`, `write`, `get`, `ask`~~ — done in v0.4.0 and v0.5.0.
3. A standalone binary, via Bun, so nobody needs Node.
4. Text formatting — padding, alignment, fixed decimals.
5. Libraries, written in Plain itself rather than wrapping JavaScript packages.

The language behaves the same everywhere it runs. Only the kernel differs, and anything a browser can't do says so rather than failing quietly.

Known gaps are listed at the end of the reference: no error handling, no modules, no dates.
