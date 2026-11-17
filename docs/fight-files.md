# Fight files

A fight file (an encounter file) tells native OgreBot what the group does in one named fight: where each box stands,
what it casts, and what it does when the mob does something. A zone file walks the group through the zone; the
fight files do the fighting. This page is a working summary for people who write fight files with Open IC Creator;
Ogre's own documentation is the final word.

## How the bot picks a file

Nothing runs a fight file by its name or path. The bot picks it from **the zone you are in** and **the named's
name**:

| Key | What it does |
|---|---|
| `zone` | The zone as the game shows it, with its tag: `"Crypt of Valdoon [Heroic]"`. A list covers several zones. No `zone`: any zone. |
| `named` | The mobs the file is for: `[{ "name": "...", "distance": 50, "aliases": ["..."] }]`. A setup starts when one of them is in a fight within `distance`. |
| `enabled` | `false` turns the file off. |

A setup starts by itself (with **Enable Heroic Setups**, or **Enable Raid Setups** in raid zones, ticked), or early
by hand: the console command `-SetUpFor`, a zone-file step (below), or `ISXOgreEQ2.Encounter:Fire["<named>"]` in a
script. A zone file's `named` step already sets up for the named it fights.

## Where they go

- Ogre's own: `Scripts\Ogre\EQ2\Encounters\default\<Expansion>\<Zone>\<Named>.json`. Never save there.
- Yours: `Scripts\OgreSave\EQ2\Encounters\custom\`. Make the folder if it is not there.
- **To change a shipped fight**, put your file at the same place under `custom`: it is laid over the shipped file key
  by key, so it only needs the part you changed. Add `"noMerge": true` to replace the shipped file whole.
- A custom file at any other path that claims the same mob in the same zone is skipped.
- `ogre encounter reload` reads the files again. `-ShowAvailableSetups` lists what this zone has.

The Creator shows the folder and file name for the file you have open (`<Expansion>/<Zone with ": " as " - ">/<Named>.json`).

## The parts of a fight file

| Key | What it holds |
|---|---|
| `setup` | Steps every box runs when the setup starts. |
| `triggers` | Rules: `{ "on": ..., "match": ..., "do": [steps], "when": [...], "forwho": ..., "allowConcurrentRuns": false, "throttleMs": ... }`. |
| `onPulse` | Checks made on every pulse of the engine: `{ "id", "when", "do", "everyPulse", "throttleMs", "forwho" }`, or the lifecycle form `{ "activeWhile", "onEnter", "do", "onExit", "abortWhen" }`. |
| `onKilled` | `{ "<named>": [steps] }`: when that mob dies. |
| `routines` | `{ "<name>": { "params": [...], "steps": [...] } }`, run with the step `{ "use": "<name>", "with": { ... } }`. Inside, `{{<param>}}` reads a parameter. |
| `initialize` | `{ "events": [custom event names], "vars": { ... } }`. |
| `spotTables` | `{ "<table>": [[x, y, z], ...] }`: named lists of spots. |
| `dets`, `detTables` | Named detriments `{ "<key>": { "main": id, "back": id } }`. |
| `teardown` | Steps when the setup ends. |

### What sets a rule off (`on`)

`text`, `announcement` (red text), `chat`, `spawn`, `spawnDelayed`, `despawn`, `detAdded`, `detRemoved`,
`detUpdated`, `castEnded`, or a custom event: a name a `timer`, `broadcast` or `fireEvent` step in this or another
file sends. List your own events in `initialize.events`.

`match` narrows it: `{ "mode": "substring" | "exact" | "regex", "needle": "..." }` for text, `{ "name": "..." }` for a
spawn, `{ "main": id, "back": id }` for a detriment.

### Steps

The same four shapes as zone files (`do`, `wait`, `repeat`, `forEach`) plus `use` (run a routine). A `wait` can also
be `"moveFinished"`. Every step can carry `when`, `forwho`, `throttleMs` and `stepId`. On a fight-file step, only the
notes `_comment` and `_why` are silent; any other `_` key is reported.

The actions (52 of them) are listed with their ops and keys in `data/vocabulary.json` under `fightFile.actions`. The
ones used most: `setVar`, `campSpot`, `stop`, `ogreBotUIOption`, `autotarget`, `timer`, `actorInteract`,
`onScreenTimer`, `announce`, `castAbility`, `castStack`, `broadcast`, `joust`, `noOffensive`, `movement`, `curses`,
`cancelMaintained`, `flagToon`, `heroicOpportunity`, `useItem`. `template` runs a ready-made mechanic: `castMonitor`,
`dispel`, `getAwayToCure`, `radialSpread`, `removeTankSwap`, `returnFromCure`, `tankSwap`, `walkToActor`,
`walkToActorAndInteract`.

### Who runs a step

The whole file runs on every box; `forwho` picks which boxes run a step or a rule, and `sendTo` is who a line is sent
to. Words: `all`, `fighter`, `priest`, `mage`, `scout`, `groupleader`, `igw:{{me}}` (my group), `irw:{{me}}` (my raid),
`igwbn:{{me}}` (my group but me), `groups:1` ... (raid groups), `@Priest1` (preferred members), `ToonFlagged:1`,
`*Team:<name>`. `|` means or, `+` means and, a leading `-` means not: `fighter+groups:1`, `-fighter`.

### Values and variables

`setVar` saves a value (`scope`: `encounter`, `global`, `group`, `raid`); `{{encounter.<name>}}` reads it and the
conditions `varEquals` / `varCompare` test it. Other values: `{{me}}`, `{{target}}`, `{{chat.*}}`, `{{event.argN}}`,
`{{actor.*}}`, `{{det.*}}`, `{{global.*}}`, `{{seq.*}}`, `{{ability.*}}`. A `value` can also be computed
(`textAfter`, `calc`, `rank`, `spotIndex`, `rosterPick` ...).

## In the Creator

- The flowchart has one lane per part: the start (`setup`), each rule, each pulse check, each "when it dies", each
  routine, and the end (`teardown`). Purple dashed lines run from each `setVar` to the checks that read it, and from
  each sent event to the rule that hears it.
- **New rule** on the right adds a rule (a line, red text, a spawn, a health level, a death, a loop while in combat);
  the chips under the chart add steps into the rule you picked.
- The checks report unknown actions, ops and keys (with the key you probably meant), unknown conditions, a missing
  `named`, a zone-only action, and a custom event nothing sends.
- **In game > Start the fight setup now** sends `-SetUpFor` for the named, to try a setup without pulling.
