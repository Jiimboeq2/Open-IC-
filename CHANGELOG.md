# Changelog

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
