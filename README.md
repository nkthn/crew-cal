# Crew Calendar

Nathan, Soohan and Ryan's week at a glance: everyone's busy time
overlaid, green where all three are free, plus shared plans. Live at https://nkthn.github.io/crew-cal/

## How it works

- Add blocks with **New**: a *group plan* (shown to everyone, doesn't count as busy) or *just me* (your busy time).
- Repeat: every day / week / 2 weeks / month, optionally until a date.
- Drag a block to move it, drag its bottom edge to resize, tap it to edit or delete.
  For repeating blocks you choose **only this one** or **all in the series**.
- Green = nobody has a "just me" block then.

Everything is stored in Firebase Firestore (config at the top of the script in `index.html`;
rules in `firestore.rules`). The Firebase web config is meant to be public — the rules protect the data.

## Run locally

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>.

## Test

```bash
node test.mjs
```

Prints `ok` when the "all free" math is right.
