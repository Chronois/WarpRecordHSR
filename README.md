# Warp Record HSR — Honkai: Star Rail Pull Tracker
 
A static dashboard (HTML/CSS/JS, nothing to install) built from your own HSR Pull Tracker 
spreadsheet. It tracks pity, 50/50 win rate, luck multiplier, a "warp line" timeline, your
character roster, pull-priority wishlist, team compositions, and Stellar Jade income — all in
one page.

## Main menu
 
The tab bar at the top mirrors the sheets in your original spreadsheet, so each tab is its own
page with real data and its own "add entry" form:

| Tab | What it shows |
|---|---|
| **LimitedHistory** | Overview stats + the limited (Character / Light Cone) banner timeline |
| **StandardHistory** | The standard banner timeline |
| **Freebies** | Free 5★ rewards from events, login gifts, etc. |
| **Calc** | Derived stats — pulls, average pity, pity road, win rate, luck multiplier, and best win streaks, broken down by Character / Light Cone / Total |
| **Priority** | Your pull wishlist, ranked, with expected pull cost per target |
| **Team** | Team compositions you've built, their Stellar Jade cost, and % of total limited pulls spent |
| **Character** | Your full roster with Eidolon/Signature and pull value |
| **StellarJade** | Your Stellar Jade & Star Rail Pass income log, with running totals |

## File structure

```
index.html   → the main page (no need to edit)
style.css    → look and feel (no need to edit unless you want to change colors, etc.)
script.js    → all the page logic and the add-entry forms (no need to edit)
data.js      → DEFAULT DATA — your starting point before you begin filling data on the page
```

## Previewing it on your own computer first (optional)

Just double-click `index.html` in File Explorer — it'll open in your browser.
No server, no installation needed.

## Updating your data — there are now two ways

### Option 1 (new, recommended): fill it in right on the page

Every tab has its own **Add** form near the bottom — no need to open `data.js` anymore. For
example, on **LimitedHistory** you'll find an "Add Pull" form; on **StellarJade**, an "Add
Transaction" form; on **Character**, an "Add Character" form; and so on. Numbers you'd normally
have to calculate yourself — days since your last pull, roster pull %, Team % of total pulls —
are computed automatically.

Every table with entries you've added also has a small ✕ button per row so you can delete a
mistake.

**An important note on where the data lives:** anything you fill in is saved automatically to
your browser's *localStorage* (see the "Saved in this browser · [time]" note near the top of the
page). That means:
- It's safe across closing and reopening the same tab/browser on the same computer.
- **It will not automatically show up** for anyone else visiting your public GitHub Pages link,
  and it won't survive clearing your browser cache or switching devices.

To make your changes permanent and visible to everyone visiting the public link, there's a small
toolbar under the tab bar with three buttons:

| Button | What it does |
|---|---|
| **⬇ Export data.js** | Downloads a new `data.js` file containing all of your current data (default + anything you added, across every tab). Upload it to GitHub (overwriting the old one) to make it permanent on the public link. |
| **⬆ Import data.js** | Loads a `data.js` (or `.json`) file you previously exported — useful when switching devices/browsers, or restoring from a backup. |
| **↺ Reset to Default** | Clears everything saved in this browser and goes back to the original data in `data.js`. |

Suggested workflow after every warp session:
1. Fill it in right on the page (phone or laptop, on your public GitHub Pages link).
2. Every so often (or after a big warp session), click **Export data.js**, then upload that file to
   GitHub, overwriting the old `data.js` — so the data becomes permanent and the same for anyone
   who opens your link.

### Option 2 (manual, the old way): edit `data.js` directly

Still works if you'd rather edit text directly. Open `data.js` in any text editor (Notepad, VS
Code, etc.) — it's one JavaScript object with a key per tab (`limited`, `standard`, `freebies`,
`roster`, `priority`, `team`, `stellarJade`). Add a new entry to the matching array. Example —
adding one new 5★ pull to the limited character banner:

```js
{ "date": "2026-07-06", "category": "Character", "name": "CharacterName", "pity": 72, "result": "W", "daysSince": 15 }
```

Field notes for `limited` / `standard`:
- `result` (limited only): `"W"` won the 50/50, `"L"` lost the 50/50, `"G"` guaranteed (after a
  previous loss)
- `daysSince`: number of days since the previous 5★ pull (in the same banner & category)

Save the file, upload it to GitHub — all stats and charts recalculate automatically.

> Note: if you've already entered data on the page in a given browser, that browser will keep
> showing its saved (localStorage) version until you click **Reset to Default** or **Import** the
> `data.js` file you just edited by hand.

---

## Guide: uploading to GitHub (so others can view it)

Since you already have a GitHub account, here are the steps. The easiest way for beginners is
straight through the GitHub website (no command line):

### 1. Create a new repository
1. Go to [github.com](https://github.com) and log in.
2. Click the **+** button in the top right → **New repository**.
3. Enter a **Repository name**, e.g. `warp-record-hsr`.
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
   https://<your-github-username>.github.io/warp-record-hsr/
   ```
6. That's your dashboard's public link. Share it with anyone.

### 4. Updating your data later
Easiest: just use the **Add** forms right on the public page (see Option 1 above), then
periodically click **Export data.js** and upload the result over the old file in your repo.

Or, to edit by hand:
1. Open the repo on GitHub → click the `data.js` file.
2. Click the pencil icon (**Edit this file**) in the top right.
3. Add a new entry (see the format above), then **Commit changes**.
4. Wait about a minute for GitHub Pages to rebuild — refresh the public link, and the data is live.

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
git commit -m "Initial commit: Warp Record HSR"
git branch -M main
git remote add origin https://github.com/<your-username>/warp-record-hsr.git
git push -u origin main
```
Then just repeat the **Turn on GitHub Pages** step above.

---

Built from your own HSR Pull Tracker spreadsheet. Happy trailblazing! ✨
