# Open IC Creator

Make and edit EverQuest II instance files for native OgreBot: **zone files** (the steps the instance controller runs
through a zone) and **fight files** (what the group does in one named fight). See a file as a flowchart and in plain
words, check it before Ogre reads it, edit it by point and click or as text, and save it.

It runs in a normal browser, with nothing to install, and in game as a native Ogre window, where it can reload your
files in Ogre and run them. ISXJQB and ISXADD are optional extras.

## What it does

- **Opens** OgreBot zone files, OgreBot fight files, and ISXJQB instance files; starts new zone and fight files. In
  game, **Open** and **Save as** are a file window over the folders Ogre and ISXJQB read: click a folder to go in,
  a file to open it; **New folder** makes one.
- **Steps**: every step in order, numbered, in plain words, by named; **Jump to** goes straight to a named or the
  way out. The picked step has Up, Down, Copy, Delete and Add a step after it.
- **The right side**: **Add a step** (every action Ogre has, by what it is for, or found by a word), **This step**
  (what it does, who runs it, its problems, and its settings as a form with a line on each; an op list says what
  each op does), **File settings**.
- **When and who**, at the top of a step: who does it, with a backup ("if the group has no bard, a mage does it" is
  one click: a roster count, as Ogre's own files write it); **Only if** (the step's conditions in words, the common ones
  first, all or any, each one turned round with "not"); **Repeat** a number of times, until or while something is true.
- **Validate**: the checks as you edit, and **Ask Ogre** for Ogre's own word on the saved file (its Validate, or with an
  Ogre that has none, a reload and the lines Ogre wrote about this file, each on its step).
- **Test in game**: this step, through the next named, or from the start to here, while you stand in the zone (the
  steps run as a small zone file of their own that stays in the zone, then is switched off); a fight file's setup.
- **Chart**: every step a box, a zone file broken into its nameds, a fight file into its rules; click to pick,
  drag a box onto a + to move it, click a + to add a step there; the wheel scrolls (in Ogre's window too), - and +
  zoom; Overview, One part and Side by side views.
- **Game pictures**: EverQuest II's own spell, class and item icons on the steps and boxes. **Pictures** turns them
  on or off and picks whose ability pictures show: every class's, or one class's (another class's ability then shows
  that class's icon, with "Who: Fury", for example, as its tooltip). In game the class you play counts.
- **File text**: the whole file as Ogre reads it, to change as text.
- **Map**: every spot the file walks to, seen from above the way the game's map shows it; zoom and drag. In game, you
  on it, an ISXADD route preview, and ISXJQB's saved map of the zone you stand in under the spots, floor by floor.
- **Problems**, found as you edit: what Ogre would refuse (unknown actions, missing keys, wrong kinds of value, no way out, a
  bare `${...}`) and what Ogre's reload misses (misspelt conditions, two steps with one `stepId`, who-words Ogre does
  not have such as `scouts` for `scout`), with the key you probably meant; and tips, such as a per-box action in a
  zone file that only the IC character runs.
- **A- / A+**: smaller or bigger text.
- **Undo / redo**, and Ogre's file-name rule for the file you have open.
- **Use in game**: reload zone or fight files in Ogre, have Ogre check the open file by its own load rules, queue or run
  the zone file, start a fight setup; with ISXJQB run the file or queue the zone; with ISXADD preview a route.
- **ISXJQB quests**: the quest-pack steps (`TeamRunIC` / `RunIC`) that run this file from a quest.

It does **not** plan or solve a zone for you: there is no auto solver and no map planner. You write the steps; the
Creator shows, checks and saves them.

## Requirements

| | |
|---|---|
| In a browser | Any current browser. Edge and Chrome can save over the file you opened; others download a copy. |
| In game | InnerSpace with EverQuest II, and native OgreBot: **ISXOgreX** and **ISXOgreEQ2**. |
| Optional | **ISXJQB** (run with ISXJQB, quest lines, its instance files), **ISXADD** (route preview). |
| Developing | Node.js 18 or newer for the tools and tests (22 or newer for the browser test). |

## Install

Copy (or clone) this repository into InnerSpace's `Scripts` folder and name the folder `OpenIC`, so that this file
is `Scripts\OpenIC\README.md` and the launcher is `Scripts\OpenIC\host\OpenIC.iss`. The launcher finds the custom
folders from there.

## Use it in a browser

Open `creator\index.html` (double-click it). Then **Open** a zone or fight file, or drop one on the page, or
start one with **New**. **Save** writes it back (or downloads it); put zone files in
`Scripts\OgreSave\EQ2\IC\custom\` and fight files in `Scripts\OgreSave\EQ2\Encounters\custom\` (the right side of
the page shows the exact folder and file name).

The **Use in game** menu works in a browser too: it shows the console line to type in InnerSpace instead.

## Use it in game

With ISXOgreX loaded, type in the InnerSpace console:

```
run OpenIC/host/OpenIC
```

The Creator opens as an Ogre window. **Open** and **Save as** show the folders Ogre and ISXJQB read (yours, and
Ogre's own read only). Its **Use in game** menu reloads your files in Ogre (`ISXOgreEQ2.IC:Reload`, the
same as `ogre ic reload`, and `ISXOgreEQ2.Encounter:Reload` for fight files), has Ogre check the saved file
(**Check this file by Ogre's own rules**, with an Ogre that has that check: Ogre's answer is listed with the page's
own checks), queues and runs the zone file, and starts a fight setup; the pills at the top show whether ISXJQB and
ISXADD are loaded. Once the window is open the script loads the icon sheets and the ability list, in parts
(`host/OpenIC-assets-1.js` ...); without them the window still works, with the class icons and its own symbols.
The Map lays ISXJQB's saved map of the zone you stand in under the spots when ISXJQB has one (its JB Map saves a zone
the first time it is open there). Close the window with its X to end the script. What was tried in game, and how: see
[docs/extensions.md](docs/extensions.md).

## Extensions

| | Needed? | Adds |
|---|---|---|
| ISXOgreX + ISXOgreEQ2 (native OgreBot) | needed in game | The window, reloads, queue and run, fight setups. |
| ISXJQB | optional | Run a file with ISXJQB, queue a zone, quest-pack lines, ISXJQB instance files, its saved zone maps under the Map. |
| ISXADD | optional | Route preview to a spot (`u1nav path`). |

Details: [docs/extensions.md](docs/extensions.md).

## Docs

- [docs/ogre-files.md](docs/ogre-files.md): both formats in plain words, from Ogre's docs and its shipped files: every
  key, every zone step and fight action with an example, conditions, values, who runs what, and the pitfalls.
- [docs/zone-files.md](docs/zone-files.md): zone files, every action only zone files run, its keys and defaults.
- [docs/fight-files.md](docs/fight-files.md): fight files, how the bot picks one, rules, steps, who runs what.
- [docs/prebuff-and-raids.md](docs/prebuff-and-raids.md): buffing up before a named; raids.
- [docs/extensions.md](docs/extensions.md): OgreBot, ISXJQB and ISXADD in the Creator.
- [docs/developer.md](docs/developer.md): the modules, the flowchart graph, the game bridge, building and tests.
- [data/vocabulary.json](data/vocabulary.json): every action, op, key, condition and value the checks know.
- [data/belt-runes.json](data/belt-runes.json): every belt immunity rune and its kind (stun, stifle, mez, fear, medic),
  for the Swap the belt rune step.
- [examples/](examples/): a made-up zone file (`_01_Crypt_of_Valdoon_Heroic.json`) and the fight file of its boss
  (`The_Hollow_Regent.json`). The zone file goes in `IC\custom\`; the fight file in
  `Encounters\custom\Example\Crypt of Valdoon [Heroic]\`.

## Game art

The spell icons, class icons and item pictures (`creator/assets/`, and the same pictures inside
`creator/data/`, `creator/css/openic-icons.css`, `host/OpenIC.html` and `host/OpenIC-assets-*.js`) are EverQuest II's
own art, owned by Daybreak Game Company. They are included only so the editor can show the game's icons. The MIT
license of this project covers its code and text, not that art.

Item pictures cover the 158 items named by the zone files, fight files and quest packs that ship with the bots; any
other item shows the step's own icon. The page makes no network calls: every picture comes from the files in this
repository.

## Not in this version

- The full step-form editor for ISXJQB instance files (generated forms, add-step picker, timeline, import dialog,
  run lists) is in `creator/js` but not wired into this page yet; ISXJQB files are edited as text here.
- Opening a folder of files, and Ogre's file lists, in game.
- Picking names from what was recorded in fights (that needs ISXJQB's own analysis files).

## Layout

```
creator/      the page: index.html, css/, js/ (the modules), data/ (the ability and item lists), assets/ (the icons)
host/         OpenIC.iss (the in-game launcher), OpenIC.html (the in-game window, built), OpenIC-assets-*.js
              (its icon sheets and lists in parts, built), OpenIC.md (its help)
data/         vocabulary.json
docs/         the docs above
examples/     a zone file and a fight file
tools/        build-vocab.js, build-icon-data.js, build-window.js, strip-comments.js
tests/        node tests; run-all.js runs them
```

## Tests

```
node tests/run-all.js
node tests/browser-selftest.js
```

## License

MIT. See [LICENSE](LICENSE).
