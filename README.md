# Rogal

A small programming language that's genuinely easy to write, where a mistake tells you what to do about it instead of what went wrong inside the machine.

30 words and 32 actions. One way to write each thing. Blocks close with `end`, so indentation can never break a program. Comparisons are words, so `=` and `==` can't be muddled. And when something goes wrong you get the line, the word underlined, a sentence explaining it, and often a button that fixes it.

```rogal
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

**Status:** working prototype, v0.9.1.

---

## Trying it

**You need one file: `rogal.html`.** Open it in a browser and that's the whole language — examples, a reference panel, and somewhere to write. Nothing to install.

Better still, put it on the web and send a link. See *Sharing it* below.

## Running programs against real files

The browser version can read a file you pick and hand one back as a download. For a program that opens files by name, you'll need [Node.js](https://nodejs.org) installed, with `rogal-core.js` and `rogal.js` in a folder together:

```
node rogal.js myscript.rogal
```

Files are read and written next to the script, not next to wherever your terminal happens to be.

## Sharing it

Send a **link**, not the file. iOS won't run JavaScript in local HTML, so anyone opening `rogal.html` from Files, Mail or a cloud drive on an iPhone gets a dead page — no examples, no Run button.

**Cloud storage doesn't help.** Dropbox, iCloud, Google Drive and Proton Drive all show you a preview rather than serving the page, so JavaScript stays blocked and you get the same dead page. It needs real hosting.

Any of these give you a URL in a minute or two:

- [Netlify Drop](https://app.netlify.com/drop) — drag the file on, no account needed
- Cloudflare Pages
- GitHub Pages — free, but only from a public repository

On an iPhone with no hosting, **Documents by Readdle** has a proper browser inside it and will run the file from local storage.

## How it's put together

The reasoning behind these is in the [reference](rogal-reference.md), also available as a [PDF](rogal-reference.pdf).

- **`set` creates, `change` alters.** A typo can't quietly make a second variable.
- **A name holds a value, not a link to someone else's.** Every binding copies, so two names never share a list by accident.
- **Actions see only what you pass in**, and can't alter it. Everything an action touches is on its first line, and every action lives at the top level.
- **Nothing is changed in place.** `add`, `remove` and `sort_up` all hand back something new.
- **An `if` takes only `true` or `false`.** Nothing is secretly true.
- **Nothing is silently rounded.** A fractional count or position is an error, not a guess.
- **Lists count from 1**, the way people do.
- **Reaching outside is visible.** `read`, `write`, `get`, `ask` and `now` each need a line of their own and can't be used inside an action.
- **A library holds only actions.** Nothing runs behind your back when you bring one in.

Working on the language itself is covered in [CONTRIBUTING.md](CONTRIBUTING.md).
