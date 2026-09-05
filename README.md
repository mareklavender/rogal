# Rogal

A programming language built to be read by people, where every error points at the problem and explains it.

32 words and 32 actions. One way to write each thing. Blocks close with `end`, so indentation can never break a program. Comparisons are words, so `=` and `==` can't be muddled. Every error names the line, underlines the word and explains the cause; most suggest what to do next, and a few offer the fix as a button.

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

**Status:** working prototype, v0.9.6. Licensed under Apache 2.0.

---

## Trying it

Go to **rogallang.netlify.app**. Nothing to install — the whole language is in the page, with examples, a reference panel and somewhere to write.

To keep a copy, download [`rogal.html`](rogal.html) and open it in a browser on a computer. On a phone, use the link: phone browsers often block JavaScript in a local page, so the downloaded file opens with nothing working. To host your own copy, [Netlify Drop](https://app.netlify.com/drop) takes a drag and no account.

## Working with files on your computer

In a browser, `read` asks you to pick a file and `write` hands one back as a download.

For a program that opens files by name, you'll need [Node.js](https://nodejs.org). Put `rogal-core.js` and `rogal.js` in a folder together and run:

```
node rogal.js myscript.rogal
```

Files are read and written next to your program, not next to wherever your terminal happens to be.

## Libraries

Three come with Rogal, all written in Rogal itself:

| Library | What it does |
|---|---|
| [`dates.rogal`](dates.rogal) | Counting days, adding them, naming weekdays |
| [`csv.rogal`](csv.rogal) | Comma-separated tables, quoted fields included |
| [`json.rogal`](json.rogal) | JSON text into values and back |

```rogal
use "json"

set reply to get("https://example.com/things.json")
set things to parse_json(reply)
show things[1].name
```

To add your own, put `mylib.rogal` next to your program. In the playground, use the **+ library** button.

## How it's put together

The reasoning behind these is in the [reference](rogal-reference.md), also available as a [PDF](rogal-reference.pdf).

- **`set` creates, `change` alters.** A typo can't quietly make a second variable.
- **A name holds a value, not a link to someone else's.** Every binding copies, so two names never share a list by accident.
- **Actions see only what you pass in**, and can't alter it. Everything an action touches is on its first line, and every action lives at the top level.
- **Nothing is changed in place.** `add`, `remove` and `sort_up` all hand back something new.
- **An `if` takes only `true` or `false`.** Nothing is secretly true.
- **Nothing is silently rounded.** A fractional count or position is an error, not a guess.
- **Lists count from 1**, the way people do.
- **Reaching outside is visible.** `read`, `write`, `get`, `ask` and `now` each need a line of their own, and an ordinary action can't use them. One that needs to says so, with `reach` instead of `make`.
- **A library holds only actions.** Nothing runs behind your back when you bring one in.

Working on the language itself is covered in [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

Apache 2.0. See [LICENSE](LICENSE).
