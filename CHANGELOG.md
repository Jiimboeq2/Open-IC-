# Changelog

## 0.5.3 - 2026-11-17

Run in game (is1); what that showed is fixed.

- No more "No such 'ogreeq2ic' member 'Validation'" lines on the console each time the window opened: asking for a
  member Ogre lacks prints that even inside `(exists)`. The script now reads which members Ogre's IC and Encounter
  have once, from `lstype`, which prints nothing wrong.
- **Ask Ogre** ended the script: a variable named `Zone` (a top-level object's name). Renamed, and a test now fails on
  any variable named after one. Ogre's file list (`IC:List`) also matched nothing with quote marks or an apostrophe in
  its filter, so the file always read as not loaded: it now gets one plain word of the zone's name, unquoted. Proven:
  a DTV file loaded with Ogre's line about it; the converted Gerion file shown claiming the same zone and difficulty
  as Ogre's own.
- **Map** with no file open fits the floor's picture (it was zoomed to the 20 m around you). Proven in game: ISXJQB's
  saved map of the guild hall, four floors.
- The chart's scroll layer is proven in Ogre's window: a scroll moves the chart.

## 0.5.2 - 2026-11-17

- **Swap the belt rune (immunity)** (Ogre's `beltAdorn`): the kind is five chips, stun, stifle, mez, fear and medic, each
  saying which rune it means (the end of the rune's name: Adamant Defiance, Adamant Resolve, Astral Dominion, Blinding
  Gleam, Field Medic, the same in every family), and "take the belt off" in words. The step reads "Everyone swap the
  belt rune to stifle (Adamant Resolve)". A kind Ogre does not have is caught.
- `data/belt-runes.json`: every belt immunity rune and its kind, family, tier and level, from the isxjhub census and
  the Descent to Val'Zyroth beta list (the Corathus runes); built by ISXJQB's `gen_belt_runes.py`, run again for new
  runes.

## 0.5.1 - 2026-11-17

- No drop-down list is a `<select>` any more: in Ogre's window (Ultralight) one opened as a bare list over the whole
  window. Every list is the page's own menu, as high as the window at most: **+ Add a condition** (the common ones,
  then every condition with its words, and a find box), **Who does it** / **Send it to**, the backup (**Pick who does
  it instead** adds it at once), an op list of more than five, "the group has a ...", and a Ready-made snippet's who.
  A few choices are chips: all of these / any one of these, Repeat, a comparison, an op list of five or fewer.
- A test fails if a `<select>` comes back into the page, and the self test checks the step form, Add a step and File
  settings for one.

## 0.5.0 - 2026-11-17

- **When and who**, at the top of This step: who does it (with the backup when the group has no such class);
  **Only if**, the step's conditions in words: the common ones first (the group has a class or archetype, something
  is near, I am in combat, the named is in combat, its health, a detriment, my camp spot, a saved value, an OgreBot
  option, the zone, a timer), then every condition Ogre has, each with its settings, **not** to turn one round, and
  **all of these** or **any one of these**; **Repeat** a number of times, until something is true, or while it is
  (a repeat block, as Ogre's files write it; **Once** takes the step out again).
- **Validate** (the bar button that was Problems) and **Ask Ogre about this file**: Ogre's Validate when it has one;
  otherwise Ogre reloads your zone files and the page reads Ogre's own lines about this file: loaded or not, each
  problem on its step, and another file that claims the same zone and difficulty. A new check from that: a
  heroicOpportunity step with Send to and an op other than disableIcon, allowIcon or clearIcons (Ogre skips the file;
  it skipped seven of the converted ones).
- **Test in game**: this step, through the next named, or from the start to here (or through this named), while you
  stand in the zone; **Stop it**; a fight file's setup (**Use in game > Test this fight file now**). Not run in game
  yet: no game client was up.
- The Chart scrolls with the wheel in Ogre's window (it is drawn by Ultralight, where the wheel never reached the
  chart's own handler: the chart now scrolls natively); its part chips show in full instead of behind a small scroll
  bar, and the Jump to row shows on the Steps view only. The Map has - and + buttons.
- Words: "the group has a bard" (not "the troubadors in my group number at least 1"); a condition turned round reads
  "we are not in combat".
- The right side no longer scrolls sideways; an op list's line of bare values is left out (the op's own words say more).

## 0.4.0 - 2026-11-17

Writing files, not just looking at them.

- **Steps** is the main view: every step in order, numbered, in plain words, by named, with **Jump to** at the top
  (a named, the end, the way out). The picked step has **Up**, **Down**, **Copy**, **Delete** and **Add a step
  after it** right under it. The Chart has Jump to as well, and its wheel scrolls (Shift sideways, Ctrl zooms).
- The right side has three tabs:
  - **Add a step**: every action Ogre has (the ready-made ones first, filled in), by what it is for (Moving,
    Fighting, Loot, Clicks and talk, Waiting, Messages, Bot and group, Logic, The way out, Ready-made) or found by a
    word, each with a line on what it does. A click adds it after the picked step, or where a + was clicked.
  - **This step**: what it does, **who runs it** (in a zone file the IC character, with the group along on walks,
    nameds, loot, teleporters and the way out; in a fight file every box, or the ones its forwho names), its
    problems, then its settings as a form with a line on each. An op list says what each op does. **More
    settings** holds the rest; **The step as text** takes any change.
  - **File settings**.
- **Who does it, with a backup**: a step's forwho or Send to is picked from everyone, one box, an archetype, a class
  or a raid group (or typed). For an archetype, a class or a role, **If the group has no ...** adds a backup in one
  click: the step runs only when the group has one, and a copy for the other box only when it has none (a roster
  count, the way Ogre's own fight files write it).
- **Map**: drawn the way the game's map shows a zone (x grows to the left); the wheel zooms, a drag moves it, **Fit**
  shows all of it. In game, ISXJQB's saved map of the zone you stand in lies under the spots, with ISXJQB's ways out,
  floor by floor. Not run in game yet: no game client was up when it was written.
- **Pictures** on the bar (it was Icons): pictures on or off, and whose ability pictures show; it says it never
  changes the file. **A-** / **A+** make the text smaller or bigger.
- New checks: a who-word Ogre does not have (`scouts` for `scout`: as written it matches only a character called
  Scouts), and a tip on a per-box action in a zone file (castStack, cancelMaintained, useItem, beltAdorn change the
  IC character only). An ISXJQB fight mechanics file is no longer read as an Ogre fight file.
- Words: every fight-file action, all 63 conditions, every op and key now have a line in plain words (from Ogre's docs
  and its shipped files); loot `op: corpses` and a fight file's `enabled` are known (they showed as an error and a
  warning). Fixed meanings: a waypoint points the game's on-screen trail and moves nobody; stop following does not
  hold a box still (stand still does); joust out for everyone at the start clears an old joust hold.
- [docs/ogre-files.md](docs/ogre-files.md): both formats in plain words, with examples and pitfalls.
- Fixes: dropdowns and number boxes in the dark theme; two toasts at most; the checks line reads as a sentence.

## 0.3.0 - 2026-11-17

- In game, **Open** and **Save as** are a file window, no typed paths: My zone files, My fight files, Ogre's zone
  files and Ogre's fight files (read only), ISXJQB instance files. Click a folder to go in, a file to open it; Save as
  picks the folder and takes a name, and **New folder** makes one. A file of Ogre's own opens read only and Save as
  puts your copy in your folder (a fight file at the same path, where Ogre lays it over the shipped one). Queue and
  Run use the place the file was saved.
- The bar says what each button does: **New** (a zone file or a fight file, each said in a line), **Open**,
  **Save**, **Save as**; the views **Chart**, **Plain English**, **File text** and **Map**; **Problems** with the
  count; **Use in game**; **Icons**. The in-game help page is written around them.
- The tests read a Windows checkout too (CR LF line ends).

## 0.2.2 - 2026-11-17

- In game, the buttons work after the window is closed and opened again. Ogre's windows share one page that outlives
  the window, and a window opened a second time kept the copy from before, bound to markup that was gone: none of
  its buttons did anything. The window's first script now puts that copy away (its page-wide listeners and timers
  taken off) and starts a fresh one.
- In game, the modules get a window that has `innerWidth`, `innerHeight` and `addEventListener` (the More menu's
  placing and closing).

## 0.2.1 - 2026-11-17

Run in game; what that showed is fixed.

- The icon sheets and the ability list load in parts of under 900 KB (`host/OpenIC-assets-1.js` ...), one after the
  other: Ogre's UI drops a message over its limit whole, and the single 4.8 MB pack never arrived.
- A file and Ogre's answer cross between the window and the script in pieces of 6,000 characters. **Save** writes
  the file in pieces and reads it back before it says saved. One LavishScript command of 33 KB took a game client
  down.
- **Check this file by Ogre's own rules** checks the saved file (`Validate[tier,path]`), and only with an Ogre that
  has the check: the ISXOgreEQ2 of 2026-11-16 has no `Validate`, and calling a method Ogre does not have ends the
  script. The menu item says so.
- The ISXJQB queue gets the zone as ISXJQB's files name it (`-` for `:`).
- In game the self test waits for the last icon part.
- Tried in game: the window, the bridge both ways, Open (a 46 KB zone file), Save (5 pieces, read back equal),
  the 7 icon parts. See docs/extensions.md.

## 0.2.0 - 2026-11-17

Game icons, and the in-game calls checked against Ogre's developer API reference.

- Game icons: EverQuest II's own art (Daybreak Game Company), included for display in the editor: the 34 spell icon
  sheets, the 26 class icons, and item pictures cut into 4 sheets for the 158 items the shipped zone files, fight
  files and quest packs name. The ability list (14,021 abilities: icon, backdrop, classes) and the item list ship
  as scripts the page loads; the page makes no network calls.
- The flowchart boxes, the palette chips and the Words view show the game's icons. The new **Class** button picks
  my class (any of the 26, kept in the browser) and, if wanted, the classes in my group. An ability of my class
  shows its own icon; an ability of another class shows that class's icon, with `Who: <Class>` as its tooltip. With
  no class picked every ability shows its own icon; in game the class the character plays counts until one is
  picked. No detriment icons on boxes. The flowchart's **Ability icons** switch turns the icons off.
- In game: the window carries the class icons inline; the spell and item sheets and the two lists are in
  `host/OpenIC-assets.js`, which `OpenIC.iss` loads with `ISXOgreX.UI:EvalFile` once the window is open.
- Checked against https://kannkor.github.io/ISXOgre/EQ2/bot/developer/api/: a zone file now runs with
  `ISXOgreEQ2.IC:Run[custom,"<path>"]`, a fight setup starts with `OgreBotAPI.Bot:SetUpFor`, reloads use
  `ISXOgreEQ2.IC:Reload` and `ISXOgreEQ2.Encounter:Reload`, and opening checks the file with
  `OgreBotAPI.Util.FileExists`. Each call in `OpenIC.iss` names its section; what the reference does not cover
  stays marked UNVERIFIED.
- New in the In game menu: **Check this file by Ogre's own rules** (`ISXOgreEQ2.IC:Validate` /
  `ISXOgreEQ2.Encounter:Validate`). Ogre's answer is listed with the page's checks.
- New modules: `openic-icons.js` (the icons and the Class button) and `openic-game.js` (the In game menu).
- Tools: `build-icon-data.js`; `build-window.js` also builds the asset pack. Tests: `test-icons.js`; the self test
  covers the icons and Ogre's check; the corpus test draws every shipped file with icons on.

## 0.1.0 - 2026-11-17

The first public version.

- The Creator's modules, opened up: the flowchart engine and its views, plain words for OgreBot zone files, fight
  files and console lines, the ISXJQB instance-file model and checks, snippets, zone-file blocks and checks.
- A page that runs in any browser and, built into one file, as a native Ogre window: open, new, flowchart, words,
  JSON, spots, checks, undo and redo, save.
- Checks for native zone and fight files from a shipped vocabulary (`data/vocabulary.json`): actions, ops, keys with
  their kinds and defaults, conditions, values. Ogre's own shipped zone and fight files check with no error.
- `host/OpenIC.iss`: opens the window in game and runs its buttons: reload zone and fight files, queue and run a zone
  file, start a fight setup; with ISXJQB, run a file or queue a zone; with ISXADD, a route preview.
- The quest-pack lines that run a file from an ISXJQB quest (`TeamRunIC`, `RunIC`).
- Docs for zone files, fight files, pre-buffs and raids, the extensions, and developers; a made-up example zone file
  and fight file.
- Tools: the vocabulary and window builders, and a comment stripper. Tests for all of it, a browser self test, and
  a stand-in for Ogre's window host.
- Not included: the auto solver and the map planner.
