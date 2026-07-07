# Warp Ledger — Honkai: Star Rail Pull Statistics Dashboard

A static dashboard (HTML/CSS/JS, nothing to install) that shows your pull history:
pity, 50/50 win rate, luck multiplier, a "warp line" timeline, character roster, and free rewards.

The data was originally pulled from the HSR Pull Tracker spreadsheet you shared.

## Main menu

The top of the page has a pill-shaped nav bar with five sections, styled after a Star Rail
companion app: **Characters**, **Data Bank**, **Warp Tracker**, **Ascension Planner**, and
**Achievements**. Right now, **Warp Tracker** is the only fully built section — it holds
everything described in this README. The other four are placeholder "decks" so the app already
has room to grow; clicking one shows a short "under construction" screen with a button back to
Warp Tracker.

## File structure

```
index.html   → the main page (no need to edit)
style.css    → look and feel (no need to edit unless you want to change colors, etc.)
script.js    → statistics logic + the Manage Data panel (no need to edit)
data.js      → DEFAULT DATA — your starting point before you begin filling data through Manage Data
```

## Previewing it on your own computer first (optional)

Just double-click `index.html` in File Explorer — it'll open in your browser.
No server, no installation needed.

## Updating your data — there are now two ways

### Option 1 (new, recommended): the "Manage Data" panel on the page

Scroll to the bottom of the Warp Tracker section (**06 — Manage Data**). There you'll find:

- **Category tabs**: Limited Warps, Standard Warps, Free Rewards, Roster — pick whichever matches
  the pull you want to add.
- **Add form**: fill in the date, name, pity, 50/50 result, etc., then click **+ Add**.
  Days since the last pull (`daysSince`) and the roster percentage (`pullPercent`) are calculated
  automatically — you don't need to work those out yourself.
- **Table below the form**: every entry already in that category, each with a ✕ button to delete
  it if you made a mistake.
- The stats, charts, and roster higher up the page update automatically every time you add or
  delete an entry — no manual refresh needed.

**An important note on where the data lives:** anything you fill in through this panel is saved
automatically to your browser's *localStorage* (you'll see a small "Saved in this browser · [time]"
note in the corner of the panel). That means:
- It's safe across closing and reopening the same tab/browser on the same computer.
- **It will not automatically show up** for anyone else visiting your public GitHub Pages link, and
  it won't survive clearing your browser cache or switching devices.

To make your changes permanent and visible to everyone visiting the public link, the panel has
three more buttons:

| Button | What it does |
|---|---|
| **⬇ Export data.js** | Downloads a new `data.js` file containing all of your current data (default + anything you added). Upload it to GitHub (overwriting the old one) to make it permanent on the public link. |
| **⬆ Import data.js** | Loads a `data.js` (or `.json`) file you previously exported — useful when switching devices/browsers, or restoring from a backup. |
| **↺ Reset to Default** | Clears everything saved in this browser and goes back to the original data in `data.js`. |

Suggested workflow after every warp session:
1. Fill it in through the Manage Data panel in your browser (phone or laptop, right on your public
   GitHub Pages link).
2. Every so often (or after a big warp session), click **Export data.js**, then upload that file to
   GitHub, overwriting the old `data.js` — so the data becomes permanent and the same for anyone
   who opens your link.

### Option 2 (manual, the old way): edit `data.js` directly

Still works if you'd rather edit text directly. Open `data.js` in any text editor (Notepad, VS Code,
etc.), then add a new line to the matching array. Example — adding one new 5★ pull to the limited
character banner:

```js
{ "date": "2026-07-06", "category": "Character", "name": "CharacterName", "pity": 72, "result": "W", "daysSince": 15 }
```

Field notes:
- `result`: `"W"` won the 50/50, `"L"` lost the 50/50, `"G"` guaranteed (after a previous loss)
- `daysSince`: number of days since the previous 5★ pull (in the same banner & category)

Save the file, upload it to GitHub — all stats and charts recalculate automatically.

> Note: if you've already entered data through the Manage Data panel in a given browser, that
> browser will keep showing its saved (localStorage) version until you click **Reset to Default**
> or **Import** the `data.js` file you just edited by hand.

---

## Guide: uploading to GitHub (so others can view it)

Since you already have a GitHub account, here are the steps. The easiest way for beginners is
straight through the GitHub website (no command line):

### 1. Create a new repository
1. Go to [github.com](https://github.com) and log in.
2. Click the **+** button in the top right → **New repository**.
3. Enter a **Repository name**, e.g. `warp-ledger`.
4. Choose **Public** (so it can be viewed by others / GitHub Pages is free for public repos).
5. **Don't** check "Add a README file" (to avoid a conflict, since we already have our own).
6. Click **Create repository**.

### 2. Upload the dashboard files
1. On the new repo's page, click **uploading an existing file** (or **Add file → Upload files**).
2. Drag and drop all five files at once: `index.html`, `style.css`, `script.js`, `data.js`, and
   this `README.md`.
3. Scroll down and click **Commit changes**.

### 3. Turn on GitHub Pages (to get a public link)
1. On the repo page, open the **Settings** tab.
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Under **Branch**, choose `main` and folder `/ (root)`, then click **Save**.
5. Wait 1–2 minutes, then refresh that page — a link like this will appear:
   ```
   https://<your-github-username>.github.io/warp-ledger/
   ```
6. That's your dashboard's public link. Share it with anyone.

### 4. Updating your data later
Every time you're done warping and want to update:
1. Open the repo on GitHub → click the `data.js` file.
2. Click the pencil icon (**Edit this file**) in the top right.
3. Add a new pull line (see the format above), then **Commit changes**.
4. Wait about a minute for GitHub Pages to rebuild — refresh the public link, and the data is live.

(Or just use the **Manage Data** panel described above and skip editing `data.js` by hand entirely.)

---

### About the "Node.js 20 is deprecated" warning in the Actions tab

If you see a yellow annotation like this in your repo's **Actions** tab:

> Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/upload-artifact@v4.

**This is just a warning, not an error, and your site still deploys successfully** (the run still
shows "succeeded"). It comes from GitHub's own internal "**pages build and deployment**" build
system (used automatically when Pages is set to "Deploy from a branch" as in the guide above) —
not from any workflow file in your repo, so there's nothing for you to edit to fix it. It'll go
away on its own once GitHub updates their internal build machinery. Safe to ignore.

### Alternative: using Git from the command line (if you want to go more advanced later)
```bash
git init
git add .
git commit -m "Initial commit: Warp Ledger"
git branch -M main
git remote add origin https://github.com/<your-username>/warp-ledger.git
git push -u origin main
```
Then just repeat the **Turn on GitHub Pages** step above.

---

Built from your own HSR Pull Tracker template. Happy trailblazing! ✨
