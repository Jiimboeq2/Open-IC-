# Open IC Creator

Make and edit EverQuest II instance files for native OgreBot: **zone files** (the steps the instance controller runs
through a zone) and **fight files** (what the group does in one named fight). See a file as a flowchart and in plain
words, check it before Ogre reads it, edit it by point and click or as text, and save it.

It runs in a normal browser, with nothing to install, and in game as a native Ogre window, where it can reload your
files in Ogre and run them. ISXJQB and ISXADD are optional extras.

## What it does

- **Opens** OgreBot zone files, OgreBot fight files, and ISXJQB instance files; starts new zone and fight files.
- **Flowchart**: every step a box, a zone file broken into its nameds, a fight file into its rules; click to pick,
  drag a box onto a + to move it, click or drag a chip to add a step (quick snippets included); Overview, One part
  and Side by side views; zoom.
- **Words**: the whole file in plain English.
- **JSON**: the whole file as text; and for the picked step its text, the keys it can take (click one to add it with
  its default), and its problems.
- **Spots**: every spot the file names, from above; in game, you on it, and an ISXADD route preview.
- **Checks** as you edit: what Ogre would refuse (unknown actions, missing keys, wrong kinds of value, no way out, a
  bare `${...}`) and what Ogre's reload misses (misspelt conditions, two steps with one `stepId`), with the key you
  probably meant.
- **Undo / redo**, and Ogre's file-name rule for the file you have open.
- **In game**: reload zone or fight files in Ogre, queue or run the zone file, start a fight setup; with ISXJQB run
  the file or queue the zone; with ISXADD preview a route.
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

Open `creator\index.html` (double-click it). Then **Open...** a zone or fight file, or drop one on the page, or
start a **New zone file** / **New fight file**. **Save** writes it back (or downloads it); put zone files in
`Scripts\OgreSave\EQ2\IC\custom\` and fight files in `Scripts\OgreSave\EQ2\Encounters\custom\` (the right side of
the page shows the exact folder and file name).

The **In game** menu works in a browser too: it shows the console line to type in InnerSpace instead.

## Use it in game

With ISXOgreX loaded, type in the InnerSpace console:

```
run OpenIC/host/OpenIC
```

The Creator opens as an Ogre window. Its **In game** menu reloads your files in Ogre (`ogre ic reload`,
`ogre encounter reload`), queues and runs the zone file, and starts a fight setup; the pills at the top show
whether ISXJQB and ISXADD are loaded. Close the window with its X to end the script. Opening and saving by path in
game are new in this release: see [docs/extensions.md](docs/extensions.md).

## Extensions

| | Needed? | Adds |
|---|---|---|
| ISXOgreX + ISXOgreEQ2 (native OgreBot) | needed in game | The window, reloads, queue and run, fight setups. |
| ISXJQB | optional | Run a file with ISXJQB, queue a zone, quest-pack lines, ISXJQB instance files. |
| ISXADD | optional | Route preview to a spot (`u1nav path`). |

Details: [docs/extensions.md](docs/extensions.md).

## Docs

- [docs/zone-files.md](docs/zone-files.md): zone files, every action only zone files run, its keys and defaults.
- [docs/fight-files.md](docs/fight-files.md): fight files, how the bot picks one, rules, steps, who runs what.
- [docs/prebuff-and-raids.md](docs/prebuff-and-raids.md): buffing up before a named; raids.
- [docs/extensions.md](docs/extensions.md): OgreBot, ISXJQB and ISXADD in the Creator.
- [docs/developer.md](docs/developer.md): the modules, the flowchart graph, the game bridge, building and tests.
- [data/vocabulary.json](data/vocabulary.json): every action, op, key, condition and value the checks know.
- [examples/](examples/): a made-up zone file (`_01_Crypt_of_Valdoon_Heroic.json`) and the fight file of its boss
  (`The_Hollow_Regent.json`). The zone file goes in `IC\custom\`; the fight file in
  `Encounters\custom\Example\Crypt of Valdoon [Heroic]\`.

## Not in this version

- The full step-form editor for ISXJQB instance files (generated forms, add-step picker, timeline, import dialog,
  run lists) is in `creator/js` but not wired into this page yet; ISXJQB files are edited as text here.
- Game icons: the flowchart uses its own symbols (the game's icon sheets are not part of this project).
- Opening a folder of files, and Ogre's file lists, in game.
- Picking names from what was recorded in fights (that needs ISXJQB's own analysis files).

## Layout

```
creator/      the page: index.html, css/, js/ (the modules)
host/         OpenIC.iss (the in-game launcher), OpenIC.html (the in-game window, built), OpenIC.md (its help)
data/         vocabulary.json
docs/         the docs above
examples/     a zone file and a fight file
tools/        build-vocab.js, build-window.js, strip-comments.js
tests/        node tests; run-all.js runs them
```

## Tests

```
node tests/run-all.js
node tests/browser-selftest.js
```

## License

MIT. See [LICENSE](LICENSE).
