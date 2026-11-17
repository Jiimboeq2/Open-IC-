# Ogre zone files and fight files

This page is for people who write the JSON files native OgreBot (ISXOgreX and ISXOgreEQ2) runs in instances:

- **zone files**, which the Instance Controller (IC) runs through one zone, and
- **fight files** (encounter files), which run one named fight.

For each it gives what the file is for, where it goes, every top-level key, and every step kind: what it does in the
game, its fields and the values seen, and a short real example.

Where it comes from:

- Ogre's developer pages on zone files (where they go, how a run goes, the steps, other actions, fight files,
  checking) and Ogre's notes for people coming from OgreBot Classic.
- The files Ogre ships: 18 zone files (Rage of Cthurath, Scars of Destruction) and 763 fight files. Many shipped
  steps carry a `_comment` that says why the step is there; much of the fight-file part is read from those notes.
- **(inferred)** marks what is read from the files and not stated by Ogre's docs. Ogre's reload is the final word:
  `ogre ic reload` for zone files, `ogre encounter reload` for fight files.

Shorter summaries: [zone-files.md](zone-files.md) and [fight-files.md](fight-files.md). The editor's own words for
every key and step kind are in `data/vocabulary.json`.

Contents:

1. [The two kinds of file](#1-the-two-kinds-of-file)
2. [Zone files](#2-zone-files)
3. [Fight files](#3-fight-files)
4. [Who runs a step: forwho, sendTo, responders, scope, op, when](#4-who-runs-a-step-forwho-sendto-responders-scope-op-when)
5. [Conditions](#5-conditions)
6. [Values in text, saved values and computed values](#6-values-in-text-saved-values-and-computed-values)
7. [What the shipped notes warn about](#7-what-the-shipped-notes-warn-about)

---

## 1. The two kinds of file

| | Zone file | Fight file |
|---|---|---|
| What it is for | One zone: the walk, the nameds, the loot, the way out. | One named fight: where each box stands, what it casts, what it does when the mob does something. |
| Who runs it | One box, the IC character (the one running the Instance Controller). `path`, `named`, `loot`, `teleporter` and `zoneOut` move the whole group; any other action acts on the IC character only, unless it carries `sendTo`. | Every box that has the file runs it, each for itself. `forwho` picks which boxes run a step or a rule; `sendTo` sends a command from this box to others. |
| How it starts | Queued in the IC window (or `ogre ic queue add ...`) and run. | By itself, when a mob in `named` is in a fight within `distance` and Enable Heroic Setups (Enable Raid Setups in raid zones) is ticked; by hand with `-SetUpFor`; a zone file's `named` step sets the fight up at the engage. |
| Ogre's own | `Scripts\Ogre\EQ2\IC\default\` | `Scripts\Ogre\EQ2\Encounters\default\<Expansion>\<Zone>\<Named>.json` |
| Yours | `Scripts\OgreSave\EQ2\IC\custom\`, folders of your own inside it at any depth. | `Scripts\OgreSave\EQ2\Encounters\custom\`. At the shipped file's path it is laid over the shipped file key by key; `"noMerge": true` replaces it whole. |
| Reload | `ogre ic reload` | `ogre encounter reload` |
| Notes | Any key that starts with `_` is a note, anywhere in the file. | On a step only `_comment` and `_why` are silent notes; another `_` key is reported. |

Never save into `Scripts\Ogre`: updates replace that folder.

---

## 2. Zone files

### 2.1 The top of the file

| Key | Needed | What it does |
|---|---|---|
| `zone` | yes | The zone name as the game shows it, without the difficulty tag. |
| `variants` | yes | The difficulty tags the file covers, as the game writes them: `["[Solo]", "[Heroic]"]`. `[]` for a zone without a tag. |
| `steps` | | The main list of steps. Most files need only this. |
| `enter`, `exit` | | Steps before and after `steps`. A run is `enter`, then `steps`, then `exit`. When `enter` fails, `steps` does not run. `exit` still runs after a failure, but not when the run is stopped, hits Max wait, or is given up after wipes. |
| `entrance` | | `{ "loc": [x, y, z], "tolerance": 30 }`: the zone-in spot; `tolerance` in meters, 30 when left out. Wipe recovery uses it to know the group is back at the zone-in. Nameds without an entrance load with a warning. |
| `progression` | | `sequential` (the default): a named that is up means every earlier named is taken as dead and skipped; use it only when each named appears after the one before dies. `open`: only the nameds IC saw die count. |
| `rerunWholeZoneAfterWipe` | | `true`: after a wipe recovery, run the file again from the top (zones with teleporters inside). The group must start within 30 m of the `entrance`. |
| `wipeAttempts` | | Wipe recoveries before the zone is given up: 0 to 10, 2 when left out. |
| `onWipe` | | Your own recovery steps instead of the built-in one. `[]` gives the zone up at the first wipe. |
| `afterWipe` | | Your own steps for a zone given up, instead of the built-in ones. |
| `fileOptions` | | Up to 3 names for the IC window's File Option boxes, read as `{{ic.options.fileOption1}}` ... (`TRUE` or `FALSE`). The File Args box is `{{ic.options.fileArgs}}`. |
| `options` | | Your own values, read as `{{ic.zone.options.<name>}}`. IC itself does not use them. |
| `difficulty` | | A difficulty menu in the IC window: `{ "choices": [...] }` or `{ "minValue", "maxValue" }`. The run does not use it yet. |
| `run` | | `{ "iss": "<path under Scripts>" }` or `{ "json": "<zone file in the same root>" }`: hand the zone to a script or to another file. A script must call `ISXOgreEQ2.IC:Complete` when it is done. A file has `run` or steps, never both. |
| `enabled` | | `false` hides the file. |
| `expansion`, `author` | | Notes for people. |

The top of a shipped file:

```json
{
  "zone": "Zon Zobboz: The Chimeric Chain",
  "variants": ["[Solo]", "[Heroic]"],
  "expansion": "Rage of Cthurath",
  "progression": "sequential",
  "entrance": { "loc": [-23.032352, 14.243402, 814.536438], "tolerance": 10 },
  "rerunWholeZoneAfterWipe": true,
  "steps": [
    { "stepId": "named1.walk", "do": "path", "using": "nav", "spots": [[-209.637543, 14.719315, 902.476257]] },
    { "stepId": "named1", "do": "named", "name": "Lord Shomp", "spot": [-229.73143, 14.634876, 914.465271] },
    { "stepId": "named1.chest", "do": "loot", "op": "chest" },
    { "stepId": "named1.shinies", "do": "loot", "op": "shinies" },
    { "stepId": "named1.said", "do": "announce", "message": "Chimeric Chain 1/5: Lord Shomp - {{ic.run.verdicts.named1}}" },
    { "stepId": "exit.walk", "do": "path", "using": "nav", "spots": [[-535.043945, 9.996367, -60.834518]] },
    { "stepId": "exit.door", "do": "zoneOut", "op": "door", "name": "exit_spawned" }
  ]
}
```

### 2.2 How a run goes

- The steps run one at a time on the IC character. The moving steps take the whole group along.
- **stepId**: names a step in the log and the IC window, and its result is kept under that name. Name each named
  `named1`, `named2` ..., and the steps that belong to it `named1.walk`, `named1.chest`, `named1.said`. Skip the boss
  drops the boss and every step named after it; the named # start and a resume back up to the steps of the named
  before. A named with no stepId cannot be remembered as done.
- **onFail**: `fail` ends the list when the step fails; `proceed` goes on. Left out: `fail` in a list, `proceed`
  inside a loop.
- **when**: conditions that must all hold, or the step is skipped (a skip is not a failure).
- **throttleMs**: skip the step if it ran less than this many milliseconds ago (handy in loops).
- **Results**: `named`, `loot` and `zoneOut` record a result, read as `{{ic.run.verdicts.<stepId>}}`: `killed`,
  `alreadyDead`, `skipped`, `neverSpawned`, `timedOut` for a named; `looted`, `nothingToLoot`, `left`, `skipped` for
  loot; `zonedOut` for the way out.
- **The way out**: every zone file needs a `zoneOut` step in `enter`, `steps` or `exit` (a loop counts). Without one
  the file is "not valid": it shows in red and cannot run.
- **Wipes**: during `enter` and `steps` a wipe (also a near-wipe: in a group of 5 or 6, two or fewer alive, all in
  combat) starts the recovery: revive at the entrance, evacuate if needed, rest about a minute. After `wipeAttempts`
  recoveries the zone is given up: `afterWipe` runs, `exit` does not, and the list moves on.
- **Options a step changes are put back**: an `ogreBotUIOption` a zone file writes is put back when the run ends,
  however it ends; IC sets running back when the zone ends after `movement setRunMode`.
- **Other boxes**: an action taken from fight files runs on the IC character only. It reaches the rest of the group
  only through `sendTo`, on the actions that take it: `campSpot`, `ogreBotUIOption`, `actorInteract` (doubleClick),
  `castAbility`, `movement`, `assist`. `"sendTo": "igwbn:{{me}}"` is everyone in the group but the IC character.
- **Startup Options** in the IC window (the IC setup list) are console lines run at the start of every zone and undone
  when the run ends. Ogre's notes put zone-wide option settings there rather than in the file.

### 2.3 Step shapes

Every step is one of four shapes.

| Shape | Keys | What it does |
|---|---|---|
| `do` | `do` plus the action's own keys | An action (2.4 and 2.5). |
| `wait` | `wait`, `limitMs`, `onTimeout` (all needed) | `"ms"`: a pause of limitMs. `"atCampSpot"`: until the IC character stands on its camp spot. Or a condition to wait for. `onTimeout`: `proceed` or `fail`; a `"ms"` wait must use `proceed`. |
| `repeat` | `repeat: { "times": n }` or `{ "until": [...], "max": n }`, and `steps` | Runs its own steps again. `max` is needed with `until`; `until` is checked after each pass. |
| `forEach` | `forEach: { "find" or "spots" or "vars", "as", "max" }`, and `steps` | One pass per actor found, per spot, or per saved value with a prefix. Inside, `{{seq.<as>.x}}`, `.y`, `.z`, `.loc`, `.id`, `.name`, `.distance` read the current one. |

Any step may also carry `stepId`, `onFail`, `when`, `throttleMs`; the engine also reads `forwho`, `awaitWhen` and
`awaitTimeout`.

Real examples (Gerion: Dominion of Pain):

```json
{ "stepId": "named1.platform.settle", "wait": "ms", "limitMs": 5000, "onTimeout": "proceed" }
{ "stepId": "named1.light.there", "wait": "atCampSpot", "limitMs": 15000, "onTimeout": "proceed" }
{ "stepId": "named1.lights.up", "wait": { "count": { "of": "actors", "find": { "query": "Name == \"boss_01_knight_light\"" }, "compare": ">=", "value": 1 } },
  "limitMs": 20000, "onTimeout": "proceed" }
{ "stepId": "named1.lights", "repeat": { "until": [ ... ], "max": 10 }, "steps": [
  { "stepId": "named1.light", "forEach": { "find": { "query": "Name == \"boss_01_knight_light\" && Distance < 100" }, "as": "light", "max": 1 }, "steps": [
    { "stepId": "named1.light.go", "do": "campSpot", "op": "setLoc", "x": "{{seq.light.x}}", "y": "{{seq.light.y}}", "z": "{{seq.light.z}}" },
    { "stepId": "named1.light.click", "do": "actorInteract", "op": "doubleClick", "id": "{{seq.light.id}}" } ] } ] }
```

A one-pass `repeat` with a `when` is how a shipped file writes "if": `{ "when": [...], "repeat": { "times": 1 }, "steps": [...] }`.

### 2.4 The steps only zone files run

These thirteen run only in zone files.

#### `path`

Moves the group along the spots in order. At each spot it waits until everyone is there, alive and out of combat.

| Key | Values | Default | What it does |
|---|---|---|---|
| `using` (needed) | `nav`, `campspot` | | `nav`: each member walks itself on the nav mesh. `campspot`: the camp spot moves in straight lines and the group follows it. |
| `spots` (needed) | `[[x, y, z], ...]` | | The spots, in order. |
| `groupWithin` | meters | 10 | Everyone must be this close before the walk goes on. |
| `spotLimitMs` | ms | 30000 | Time per spot; fights, pauses and deaths do not count. |
| `onSpotTimeout` | `retry`, `fail`, `proceed` | `retry` | `retry` tries the spot once more, then fails. |
| `waitForCombat` | true, false, or an object | true | Hold at each spot while anything fights the group. An object gives `waitForCombat` keys. |
| `fly` | true, false | false | With `nav`: fly where possible. |
| `waitForStragglers` | true, false | true | With `nav`: wait for members who fall far behind. |
| `exitOnActorAggro` | a mob's name | | The walk ends as soon as that mob fights the group. |
| `fromStart` | true, false | false | With `campspot`: always start at spot 1; otherwise a group near a later spot joins there. |
| `sendTo` | a for-who | the group | Who walks. |
| `killWithin` | meters, at most 100 | | Stop to kill trash that comes this close, then walk on. Stops do not count against spotLimitMs. |
| `killTypes` | `NPC`, `NamedNPC`, `Special` | `["NPC"]` | With killWithin: what counts. Nameds are walked past unless `NamedNPC` is listed. |
| `killLimitMs` | ms | 120000 | With killWithin: the longest one stop may take; a mob left behind is named in the console, not a failure. |

The engine also reads `howClose`, `legM`, `resWithin`, `resLimitMs`, `returnNoProgressMs`, `returnProgressDist` and
`returnLimitMs` (not in Ogre's docs).

```json
{ "stepId": "named1.walk", "do": "path", "using": "nav", "exitOnActorAggro": "Sinferzall", "spots": [[-195.526566, 92.186394, -11.80389]] }
{ "stepId": "named1.walk.s01", "do": "path", "using": "campspot", "spots": [[-859.879944, 169.465637, 127.360184]] }
```

#### `named`

Kills one named: buffs up, walks to the kill spot, pulls, fights, waits for the death, then holds until the fight is
over. At the engage it tells each member to set up the named's fight file. Records `killed`, `alreadyDead`,
`skipped` (Skip the boss), `neverSpawned` or `timedOut`; `neverSpawned` does not fail the zone.

| Key | Values | Default | What it does |
|---|---|---|---|
| `name` (needed) | text | | The named's exact name. |
| `spot` | `[x, y, z]` | | Where to fight it. |
| `navTo` | true, false | false | Walk the group to the named wherever it stands (one that roams). |
| `aliases` | a list | | Other names it shows or dies under. |
| `boss` | true, false | false | The zone's last boss: Skip the boss and the boss chest options act on it. |
| `spawnWaitMs` | ms | 0 | How long to wait for it to spawn. |
| `pullLimitMs` | ms | 30000 | It must be fighting the group this soon after the pull. |
| `limitMs` | ms | 3600000 | The longest the whole fight may take. |
| `scanRadius` | meters | 50 | How far to look for it when pulling. |
| `scanHeight` | meters | | How far up and down to look. |
| `prebuffMs` | ms | 10000 | Buff-up time before the pull; 0 skips it. |
| `waitForCombat` | true, false | true | Hold after the kill until nothing fights the group. |

The engine also reads `preCastTagMs` (not in Ogre's docs). If the group is fighting something else when the step
starts, it waits for that fight to end first.

```json
{ "stepId": "named5", "do": "named", "name": "High Lord Glazereyez", "spot": [-781.897156, 299.072845, 248.107712], "boss": true }
{ "stepId": "named3", "do": "named", "name": "Vexven Mucktail", "navTo": true, "spawnWaitMs": 30000 }
```

#### `loot`

Loots the chest, the shinies or the corpses: the group moves there if needed, waits for the looting, then walks
back. A loot step never fails the zone.

| Key | Values | Default | What it does |
|---|---|---|---|
| `op` (needed) | `chest`, `shinies`, `corpses` | | `chest`: found by its kind (Chest), not its name; waits up to 8 s for one after a kill. `shinies`: the shinies in reach. `corpses`: unlooted corpses, nearest first (usable after a trash pull too). |
| `within` | meters, at most 100 | 75 (50 for corpses) | How far to look. |
| `boss` | true, false | false | The boss chest: the Skip no-trade boss chest option acts on it. |
| `back` | true, false | true | Walk back to where the step started. |
| `noTrade` | `loot`, `skip` | the IC window's option | No-trade items, for this step only. |
| `corpses` | true, false | true | Chest only: loot the corpses after the chest. |
| `corpsesWithin` | meters, at most 100 | 50 | Chest only: how far to look for corpses. |

Corpses are skipped when OgreBot's looting is off or Do not loot Corpses is ticked. The engine also reads
`windowBaseMs` and `windowPerItemMs`.

```json
{ "stepId": "named1.chest", "do": "loot", "op": "chest" }
{ "stepId": "named5.chest", "do": "loot", "op": "chest", "boss": true }
{ "stepId": "named3.shinies", "do": "loot", "op": "shinies", "within": 100 }
```

#### `zoneOut`

Leaves the zone with the group. Every zone file needs one. A failed zone-out does not fail the zone: the run
counts as done, with the failure noted.

| Key | Values | Default | What it does |
|---|---|---|---|
| `op` (needed) | `door`, `auto`, `endOfZone`, `none` | | `door`: click the exit named in `name`. `auto`: the nearest clickable exit named `zone exit`, `exit`, `zone_exit` or `exit_spawned`; fails when there is none. `endOfZone`: like auto, but only within `searchWithin`; finding none is not a failure, so add a fallback after it. `none`: stay in the zone on purpose. |
| `name` | text | | door: the exit's exact name. |
| `destination` | a row's text or number | the last row | When the zone list pops up, the row to pick (1 = the first). |
| `within` | meters | 30 | How close the group must be to click. |
| `walk` | true, false | false for door, true for the others | Walk the group to the exit when it is farther than `within`. |
| `searchWithin` | meters | 100 | endOfZone: how far to look. |
| `findLimitMs` | ms | 10000 | How long to look for the exit. |
| `zoneLimitMs` | ms | 40000 | Zoning must start this soon after the click; IC clicks once more, then gives up. |
| `groupLimitMs` | ms | 120000 | How long to wait for everyone to arrive in the new zone. |

```json
{ "stepId": "exit.endOfZone", "do": "zoneOut", "op": "endOfZone" }
{ "stepId": "exit.door", "do": "zoneOut", "op": "door", "name": "Exit", "walk": true }
```

Four shipped files write both: `endOfZone` first, then `door` as the fallback.

#### `teleporter`

Takes the group through an in-zone teleporter: every box clicks its nearest one of that name, then IC waits until
all are through and still. Camp spots are off and follow is held while they click; afterwards each box gets a camp
spot where it stands. A member left behind is brought back. The step fails when the teleporter is not there.

| Key | Values | Default | What it does |
|---|---|---|---|
| `name` | text | | The teleporter's exact name, as the game spells it. Needed unless `walkOnto` is used. |
| `walkOnto` | `[x, y, z]` | | A portal you walk onto, instead of a name. Needs `landing`. |
| `landing` | `[x, y, z]` | | Where the group lands; lets a part-way run start on the far side. |
| `limitMs` | ms | 20000 | Time for everyone to get through. |

```json
{ "stepId": "named3.teleporter", "do": "teleporter", "name": "teleporter_to_boss_03", "landing": [-733.345215, 104.072159, 649.225098] }
```

#### `hunt`

Kills every mob whose name contains `name` until the `until` mob shows up, then goes to it. While it hunts, the IC
character's AutoTarget is on with a 35 m radius. Running out of time does not fail the zone.

| Key | Values | Default | What it does |
|---|---|---|---|
| `name` (needed) | text | | A part of the name of the mobs to kill. |
| `until` (needed) | text | | The exact name that ends the hunt. |
| `untilLine` | text | | A chat line that also ends it (a part is enough). |
| `spots` | `[[x, y, z], ...]` | | Where to search from, in turn, when nothing is in sight. |
| `limitMs` | ms | 900000 | The longest the hunt may take. |

```json
{ "stepId": "named3.hunt", "do": "hunt", "name": "Mucktail", "until": "Vexven Mucktail",
  "untilLine": "You have summoned the spirit of Vexven Mucktail", "spots": [[25.195627, -109.515015, 49.84766], [-23.16246, -109.514992, 29.329113]] }
```

#### `trash`

Clears every mob in a circle around where the step starts, one at a time; it also pulls what stands inside the
circle, so size it to the room. It can hold for waves.

| Key | Values | Default | What it does |
|---|---|---|---|
| `radius` | meters | 30 | The circle. |
| `types` | `NPC`, `NamedNPC`, `Special` | `["NPC"]` | What to kill. |
| `until` | a name | | The step ends when this mob shows up. |
| `whenEmpty` | `done`, `wait` | `done` | `wait`: wait for the next wave. |
| `quietMs` | ms | 60000 | With wait: end after this long with nothing in the circle or fighting the group. |
| `move` | `none`, `nav`, `campspot` | `none` | Walk to mobs more than 20 m away; the group comes back at the end. |
| `limitMs` | ms | 600000 | Reaching it fails the step. |

No shipped zone file uses it; the shape is from Ogre's notes:

```json
{ "stepId": "named2.trash", "do": "trash", "radius": 30, "until": "<the named>", "whenEmpty": "wait", "quietMs": 30000 }
```

#### `waitForCombat`

Holds while anything fights the group: a gap between other steps. `path` and `named` already hold at every spot, so
most files never need it.

| Key | Values | Default | What it does |
|---|---|---|---|
| `settleMs` | ms | 2000 | When a mob is close, the time it gets to join the fight. |
| `settleWithin` | meters | 15 | What counts as close. |
| `noProgressMs` | ms | 15000 | A fight with no change for this long is stuck. |
| `onNoProgress` | `moveOn`, `fail` | `moveOn` | Leave a stuck fight, or fail. A named is never left. |
| `limitMs` | ms | | The longest it may hold; reaching it while still fighting fails. |

No shipped zone file uses it; with every key left at its default it is just:

```json
{ "stepId": "named2.clear", "do": "waitForCombat" }
```

#### `waitForLoot`

Waits until OgreBot has looted everything in reach.

| Key | Values | Default | What it does |
|---|---|---|---|
| `settleMs` | ms | 3000 | Time for loot to appear. |
| `limitMs` | ms | 120000 | The longest it waits with nothing new looted (it keeps waiting while corpses are opened); 0 = no limit. |
| `onTimeout` | `proceed`, `fail` | `proceed` | At the limit. |

```json
{ "stepId": "named1.walk.s01.loot", "do": "waitForLoot", "settleMs": 1000, "limitMs": 15000, "onTimeout": "proceed",
  "when": [{ "count": { "of": "actors", "find": { "query": "IsDead && Distance < 20" }, "compare": ">=", "value": 1 } }] }
```

#### `reward`

Takes a reward from the reward window, the same choice every time.

| Key | Values | Default | What it does |
|---|---|---|---|
| `choose` (needed) | a number (1 = the first) or a name | | The reward. |
| `limitMs` | ms | 5000 | Time to wait for the window. |
| `sendTo` | a for-who | the group | Who takes it. |

No shipped zone file uses it; the shape is from Ogre's notes:

```json
{ "do": "reward", "choose": 2 }
```

#### `groupQuery`

Asks the group a question and keeps the answers as values. Zone files only.

| Key | Values | Default | What it does |
|---|---|---|---|
| `var` (needed) | text | | The name the answers are kept under. |
| `question` (needed) | `itemCount`, `abilityReady`, `slotResolve`, or `LavishScript["${...}"]` | | The question; a LavishScript one is worked out by each member. |
| `item`, `ability`, `slot` | text | | What itemCount, abilityReady and slotResolve ask about. |
| `compare`, `value` | `==`, `!=`, `<`, `>`, `<=`, `>=`; a number | | Turn each answer into yes or no. |
| `sendTo` | a for-who | the group | Who is asked. |
| `limitMs` | ms | 3000 | Time to wait for answers. |

The answers, read as `{{encounter.<var>.<answer>}}`: `askedCount`, `answeredCount`, `yesCount`, `noCount`,
`missingCount`, `allYes`, `anyYes`, `allNo`, `anyNo`, `yesWho`, `noWho`, `missingWho` (for-who lists), and per member
`answer.<Name>`, `yes.<Name>`, `no.<Name>`, `missing.<Name>`. A misspelt answer name is refused when the file loads.
The engine also reads `askAgainIfBlank`. Shape from Ogre's notes:

```json
{ "do": "groupQuery", "var": "bot", "question": "itemCount", "item": "Mechanized Platinum Repository of Reconstruction" }
```

#### `progress`

Marks a step done or skipped, so a later start or resume leaves it out. `op`: `complete` or `skip`; `id`: the
stepId. No shipped file uses `progress` or `recover`; the shapes follow Ogre's docs.

```json
{ "do": "progress", "op": "complete", "id": "named3" }
```

#### `recover`

A wipe-recovery step, for the `onWipe` and `afterWipe` lists. `op`: `revive` (at the revive window row in `at`, such
as `Entrance`; with no match each box revives at the last row listed), `evac` (back to the entrance), `callGH`,
`callHome`. `limitMs`: the time each may take.

```json
{ "onWipe": [{ "do": "recover", "op": "revive", "at": "Entrance" }, { "do": "recover", "op": "evac" }] }
```

### 2.5 Actions from fight files in zone files

Any fight-file action may be a zone-file step (section 3.7 describes them all). Ogre's own zone files use these:

| Action | Used for | Example from a shipped zone file |
|---|---|---|
| `announce` | A line per named with its results. | `{ "stepId": "named1.said", "do": "announce", "message": "Ver'Bohten Atoll 1/5: Glorfab Flit - {{ic.run.verdicts.named1}}" }` |
| `autotarget` | Adds to kill before or with a named. | `{ "stepId": "named1.knights.add", "do": "autotarget", "op": "addActor", "name": "a Knight of Truth", "hp": 0, "checkCollision": false, "aggroOnGroupOnly": false }` |
| `campSpot` | Move the group's camp spot inside a loop. | `{ "stepId": "named1.light.arm.group", "do": "campSpot", "op": "enable", "sendTo": "igwbn:{{me}}" }` |
| `actorInteract` | Click or target something; most carry `onFail: proceed`. | `{ "stepId": "named2.wake", "do": "actorInteract", "op": "doubleClick", "name": "Wrek Shralok", "onFail": "proceed" }` |
| `movement` | Walk instead of run for a stretch. | `{ "stepId": "named5.edge.walk", "do": "movement", "op": "setRunMode", "mode": "walk", "sendTo": "igw:{{me}}" }` |
| `ogreBotUIOption` | An option for one named, put back after. | `{ "stepId": "named4.collision.on", "do": "ogreBotUIOption", "id": "checkbox_settings_disableabilitycollisionchecks", "value": true, "sendTo": "igw:{{me}}" }` |
| `raw` | One console line, such as an early fight setup (no shipped zone file uses it; this is the line Ogre's fight-file page gives). | `{ "do": "raw", "command": "oc !ci -SetUpFor igw:{{me}} \"<named>\"" }` |

A plain `announce` prints on the IC character's console only; add `"console": true` for every box.

### 2.6 Values in a zone file

- `{{me}}`: the IC character's name.
- `{{ic.zone.name}}`, `.variant`, `.fullName`, `.tier`, `.file`, `.entrance`, `{{ic.zone.options.<name>}}`.
- `{{ic.options.<name>}}`: the IC window's boxes, `TRUE` or `FALSE`: `skipBoss`, `haltAtEnd`, `fileOption1` to `3`,
  and `{{ic.options.fileArgs}}` (text).
- `{{ic.run.verdicts.<stepId>}}`, `{{ic.run.id}}`, `.attempts`, `.completed`, `.skipped`.
- `{{ic.list.name}}`, `.entry`, `.of`; `{{ic.group.size}}`, `{{ic.group.mode}}` (`group` or `raid`).
- `{{encounter.<name>}}` (for example groupQuery answers) and `{{seq.<as>.*}}` inside a forEach.
- LavishScript is written `LavishScript["${Me.Name}"]`. **A bare `${...}` makes a zone file not valid.**
- An unknown name right after `ic.` is caught when the file loads; a misspelling deeper in the path reads as empty.

---

## 3. Fight files

### 3.1 The top of the file

| Key | What it holds |
|---|---|
| `named` (needed) | `[{ "name": "...", "distance": 100, "aliases": ["..."] }]`: the mobs this file is for. A setup starts when one of them is in a fight within `distance` meters (shipped files mostly use 100). |
| `zone` | The zone as the game shows it, with its difficulty tag, any case, without an instance number: `"Gerion: Dominion of Pain [Heroic]"`. A list covers several zones. No zone: any zone. |
| `enabled` | `false` turns the file off. |
| `noMerge` | `true`: a custom file at the shipped file's path replaces it whole instead of being laid over it. |
| `expansion` | A note (and the first folder of the shipped path). |
| `setup` | Steps every box runs when the setup starts: at the engage, or when asked with `-SetUpFor`. |
| `triggers` | Rules that fire when something happens (3.3). |
| `onPulse` | Rules checked on every pulse of the fight (3.4). |
| `onKilled` | `{ "<mob name>": [steps] }`: steps when that mob dies. Leaving the zone runs them too. |
| `teardown` | Steps when the setup ends. |
| `initialize` | `{ "events": ["<custom event>", ...], "vars": { "<name>": "<value>" } }`: the file's own events and starting values. |
| `routines` | `{ "<name>": { "params": [...], "steps": [...] } }`: steps run with `{ "use": "<name>", "with": { ... } }`. Inside, `{{<param>}}` reads a parameter. |
| `spotTables` | `{ "<table>": [[x, y, z], ...] }`: named lists of spots, used by name in campSpot `spotAt`, `bestOf`, `nearSpot`, `spotIndex` ... |
| `dets` | `{ "<key>": { "main": 558, "back": 65535 } }`: named detriments, used as `{ "det": "<key>" }`. |
| `detTables` | `{ "<key>": [{ "main", "back" }, ...] }`: named lists of detriments (`examine`, `detIndex`). |

Ogre's shipped fight files also carry `_source` and `_status` notes at the top: where each fight was converted from
and what it does.

How a file is picked: no command takes a fight file's name or path. The bot picks it by the zone you are in and the
named's name. A custom file at another path that claims the same mob in the same zone is skipped ("already
claimed"). `-ShowAvailableSetups` lists what this zone has.

### 3.2 How a fight file runs

- Every box with the file runs it for itself. `setup` runs on every box at the engage (or on `-SetUpFor`).
- **Triggers** fire on each box from what that box sees. Detriment events (`detAdded`, `detRemoved`, `detUpdated`) are
  about this box only; a named's detriment is checked with `hasDet` and `actor` in an onPulse rule (shipped notes).
- **onPulse** rules are checked on every pulse while the fight runs, in file order. A rule without `everyPulse` fires
  once each time its `when` becomes true (shipped notes call this a rising edge); with `everyPulse` it fires on
  every pulse while `when` holds (`throttleMs` spaces it out). `stopEvaluating` skips the rules after it for that pulse.
- A list of steps does not run all at once: it can pause for a pulse between two steps, and onPulse rules are checked
  first (shipped notes).
- **At the end of the fight** (a kill, a wipe, a zone-out) the engine puts back every option the fight wrote with
  `ogreBotUIOption`, hands back the relative camp spot it set, releases `noOffensive`, and clears what the fight added to
  AutoTarget. It does **not** undo `castStack`, `cures disable` or a camp spot sent to others: write those back in
  `onKilled` (shipped notes).

### 3.3 Triggers

```json
{ "on": "text", "match": { "mode": "substring", "needle": "gazes are cured!" }, "allowConcurrentRuns": true, "do": [ ... ] }
```

| Key | What it does |
|---|---|
| `on` (needed) | What sets it off (the table below), or a custom event name. |
| `match` | Narrows `on` (the table below). |
| `when` | Conditions that must all hold when it fires. |
| `forwho` | Which boxes act on it; every box when left out. |
| `do` | The steps. |
| `allowConcurrentRuns` | `false`: a firing while this rule's steps still run is dropped (and logged); this is also what happens when it is left out (inferred). `true`: each firing runs. |
| `throttleMs` | Ignore more firings for this long: one call for several hits. |
| `id` | A name for the rule. |

| `on` | Fires when | `match` keys | Values inside |
|---|---|---|---|
| `text` | A line shows in the text feed: emotes, combat and system lines. | `mode` (substring, exact, regex), `needle` | `{{chat.message}}`, `{{chat.tokenN}}` (the nth word), `{{chat.nameN}}` (the nth word, cleaned of colour codes and marks) |
| `announcement` | The large centre-screen text shows. | `mode`, `needle` | `{{chat.message}}` |
| `chat` | A line is said in a chat channel. | `chatType` (the channel number: 8, 10, 15, 16, 28 are used), `mode`, `needle` | `{{chat.message}}`, `{{chat.speaker}}` |
| `spawn` | An actor appears. | `name`, `mode` | `{{actor.id}}`, `{{actor.name}}` |
| `spawnDelayed` | An actor appeared a moment ago (about 1 s later, once its look can be read). | `name`, `mode` | `{{actor.id}}` |
| `despawn` | An actor goes away. | `name`, `mode` | `{{actor.id}}` |
| `detAdded` | A detriment lands on this box. | `main`, `back` (or `det`) | |
| `detRemoved` | A detriment comes off this box. | `main`, `back` | |
| `detUpdated` | A detriment on this box changes. | `main`, `back`, `field` (such as `currentincrements`), `compare`, `value` | |
| `castEnded` | The named finishes a cast. | `abilityId` (and `named`) | |
| any other name | A custom event sent by `broadcast`, `fireEvent` or `timer`. | | `{{event.arg1}}`, `{{event.arg2}}` ... |

A `match` with no `mode` is used for a part of the line (inferred). List your own events in `initialize.events`.

Real triggers:

```json
{ "on": "spawn", "match": { "name": "Archmage's Chosen", "mode": "exact" }, "do": [{ "use": "dondariReposition" }] }
{ "on": "detAdded", "match": { "main": 209, "back": 315 }, "do": [{ "do": "noOffensive" }] }
{ "on": "detRemoved", "match": { "main": 209, "back": 315 }, "do": [{ "do": "noOffensive", "value": false }] }
{ "on": "detUpdated", "match": { "main": 716, "back": 315, "field": "currentincrements", "compare": ">", "value": 10 },
  "do": [{ "do": "campSpot", "op": "setLoc", "forwho": "all", "loc": [681.930725, 17.455378, 84.436302] }] }
{ "on": "castEnded", "match": { "abilityId": 3359949986 }, "do": [{ "do": "timer", "event": "Xigothid_FaceAwayFromNamed_Completed", "after": "1s" }] }
{ "on": "Kly_Orbs", "allowConcurrentRuns": false, "do": [{ "use": "orbs" }] }
```

### 3.4 onPulse rules

| Key | What it does |
|---|---|
| `id` | A name for the rule (the `ruleState` condition reads it). |
| `when` | The rule fires when these hold. |
| `do` | The steps. |
| `everyPulse` | `true`: fire on every pulse while `when` holds. Left out: fire once each time `when` becomes true. |
| `throttleMs` | With everyPulse: at most once per this many ms. |
| `forwho` | Which boxes check the rule. |
| `activeWhile`, `onEnter`, `onExit`, `abortWhen` | The lifecycle form, used instead of `when` and `do`: `onEnter` runs when `activeWhile` becomes true, `onExit` when it stops being true; `abortWhen` ends it early. |
| `runOnExitAfterwards`, `runOncePerEncounter` | Read by the engine; one shipped file each (inferred: run onExit after an abort; fire once per fight). |

```json
{ "id": "bm.dispel", "forwho": "enchanter", "everyPulse": true,
  "when": [{ "engaged": { "named": "Bull McCleran" } }, { "dispelReady": {} }, { "hasDet": { "actor": "Bull McCleran", "main": 365, "back": 33084 } }],
  "do": [{ "do": "dispel", "op": "any", "mob": "Bull McCleran", "main": 365, "back": 33084 }] }
{ "when": [{ "namedCasting": { "named": "Lu'Gul of Zob", "abilityId": 184944979 } }], "do": [{ "do": "castInterrupt" }] }
{ "id": "gg.curse", "activeWhile": [{ "hasDet": { "det": "burningAffliction" } }],
  "onEnter": [{ "do": "announce", "irc": true, "message": "{{me}} -> Curse" }],
  "onExit": [{ "do": "campSpot", "op": "clearRelative" }] }
```

### 3.5 Steps in a fight file

The same four shapes as zone files, plus `use`:

- `do`: an action (3.7).
- `wait`: `"ms"`, `"atCampSpot"`, `"moveFinished"` (until my last move is done) or a condition; `limitMs` and
  `onTimeout` are needed.
- `repeat` and `forEach`: as in zone files. A fight file's `repeat.until` may be one condition object.
- `use`: run a routine of this file: `{ "use": "edKeys", "when": [...] }` or `{ "use": "gdMove", "with": { "to": "{{event.arg1}}" } }`.

Any step may carry `when`, `forwho`, `throttleMs`, `stepId`, and:

- `awaitWhen` and `awaitTimeout`: hold the step until these conditions hold, at most this many ms:
  `{ "do": "rosterOrder", "list": "crowdedAnimosity", "var": "crowdedAnimosity_idx", "awaitWhen": [{ "roster": { "list": "crowdedAnimosity", "state": "windowOver" } }], "awaitTimeout": 3000 }`.
- `await: true` on `castAbility`, `actorInteract`, `move`, `useItem`: wait for it to finish before the next step
  (inferred).

### 3.6 The other parts

```json
"initialize": { "events": ["Brutas_NeedWater", "Brutas_NoWater"] }
"initialize": { "vars": { "mkDeaths": "0" } }
"onKilled": { "Nugget": [{ "do": "ogreBotUIOption", "op": "restore", "forwho": "all", "id": "checkbox_settings_noaeblockers" }] }
"spotTables": { "grRaid": [[102.048653, -109.403748, 63.252628], [89.193306, -109.403748, 63.08971]] }
"dets": { "highHorse": { "main": 558, "back": 65535 } }
"detTables": { "bristlebaneUrge": [{ "main": 112, "back": 317 }] }
"routines": { "metJoust": { "params": [], "steps": [
  { "do": "timer", "name": "metJoust", "set": 10000 },
  { "do": "campSpot", "op": "bestOf", "spots": "metalloidJS", "pick": "farthest", "sendTo": "igw:{{me}}" } ] } }
```

A detriment is two numbers: `main`, its icon, and `back`, its backdrop. `back: -1` appears where the backdrop does
not matter, and 65535 where a detriment has no backdrop (both inferred). Classic scripts listed the pair backdrop
first: swap it when you copy one.

### 3.7 Every fight-file action

Grouped by what they are for. "These boxes" means the boxes the step's `forwho` lets run it (every box when left
out). Actions marked "no shipped file uses it" are known to the engine's list of actions; their meaning is read from
their names and keys.

#### Positioning

**`campSpot`**: changes OgreBot's camp spot, the spot each box holds and walks back to. The base spot is set by
`setLoc` and the like. A relative spot (`setRelativeLoc` ...) is a temporary spot over the base; `clearRelative` drops
it, back to the base **as it is now**. A box with no camp spot ignores camp spot moves, so `enable` or `setHere` comes
first. `howClose` (2 by default) is how close counts as on the spot; `howFar` (200 by default) is the farthest a new
spot may be: a move beyond it is ignored.

| `op` | What it does | Main fields |
|---|---|---|
| `enable` | Camp spot on where the box stands. | `keepSpot` |
| `setHere` | Camp spot on where the box stands. | `howClose`, `howFar` |
| `disable` | Camp spot off. | |
| `clear` | Clear my camp spot (no `sendTo`). | |
| `clearAll` | Clear the base and the relative spot; the form `sendTo` can carry. | |
| `release` | Let go of the camp spot: the box follows again (inferred). | |
| `setLoc` | Base spot at a place. | `loc` or `x`, `y`, `z` |
| `setLocBy` | Move the base spot by an offset. | `by: [dx, dy, dz]` |
| `setLocToActor` | Base spot on an actor. | `name` or `id`, `nth` |
| `setRelativeLoc` | Relative spot at a place. | `loc` or `x`, `y`, `z` |
| `setRelativeBy` | Relative spot at the base plus an offset. | `by` |
| `setRelativeLocToActor` | Relative spot on an actor. | `id`, `name` or `query` |
| `clearRelative` | Drop the relative spot. | |
| `atAngleFromActor` | A spot `dist` m from an actor at an angle: 0 or `behind` = behind it, 180 or `front` = in front; a list `[a, b]` picks one. | `name` or `id`, `angle`, `dist`, `includeNpcSize`, `relative` |
| `towardLoc` | A spot `dist` m from an actor toward a place or another actor; a negative `dist` goes past it; `fraction` instead of `dist`. | `id`, `toward` or `towardActor`, `dist`, `fraction`, `2d` |
| `spotAt` | Spot number `index` of a list or a spotTables table; `next` steps round it. | `spots`, `index`, `indexVar`, `relative` |
| `bestOf` | The nearest, farthest or next-after-nearest of some spots, measured from me or an actor. | `spots`, `pick`, `from`, `indexVar`, `minDistance` |
| `formation` | `kind: "monkey"`: a ring round a spot, `dist` apart, with `middle` in the middle. | `x`, `y`, `z` or `spots` + `index`, `dist`, `middle` |
| `clearOf` | Step away from something, `step` m at a time, up to `maxDistance`. | `avoid: { "find", "within" }`, `toward` |
| `activate` | Use a saved camp spot slot. | `slot` |
| `setHowClose`, `setHowFar` | Set howClose or howFar. | `value` |

No shipped file uses `setCsp`, `restoreCsp`, `setUse3D`, `trackLocToActor`, `trackRelativeLocToActor` or
`clearTracking`. `sendTo` sends the camp spot to other boxes (`igw:{{me}}`: my group).

```json
{ "do": "campSpot", "op": "setLoc", "forwho": "all", "loc": [5.5, 107, -227.8] }
{ "do": "campSpot", "op": "atAngleFromActor", "forwho": "notfighter", "name": "The Exhumed Executioner", "angle": 0, "dist": 3, "includeNpcSize": false }
{ "do": "campSpot", "op": "spotAt", "spots": "grTank", "index": 1, "forwho": "fighter" }
{ "do": "campSpot", "op": "setRelativeLoc", "forwho": "scout", "loc": [-449.468048, 0.631567, 141.793106] }
{ "do": "campSpot", "op": "clearRelative" }
```

**`joust`**: `out` sends these boxes out of the mob's reach (their joust spot); `in` brings them back. Shipped setups
run `out` for all first; their notes say that clears a joust hold left from before and moves nobody.

```json
{ "do": "joust", "op": "out", "forwho": "scout" }
```

**`movement`**: movement for these boxes.

| `op` | What it does |
|---|---|
| `jump`, `crouch`, `stand` | Jump once, crouch, stand up. |
| `setRunMode` | `mode`: `walk` or `run`. |
| `stopFollow` | Stop following and halt the move in progress. It adds no block: a camp spot pulls the box again on the next pulse. |
| `block`, `unblock` | Hold still under a `reason`, counted (undo with `unblock`); this does stop the camp spot pulling. |
| `navTo` | Walk to `loc` on the nav mesh. |
| `jumpRoute`, `stopJumpRoute` | Run from `start`, jump at `jump`, land at `end` (or several `legs: [{ "to", "jumpAt", "jumpWithin" }]`); stop it. |
| `faceHeading` | Face `heading` (degrees). |
| `faceLock`, `faceUnlock` | Keep facing `actor` (`away`: the back to it) for `seconds`; let go. |
| `setCombatAutoFace` | The game's combat auto-face on or off (`value`). |

No shipped file uses `holdUp`, `clearBlocks` or `navInRange`.

```json
{ "do": "movement", "op": "navTo", "loc": [95.94, -86.8, -90.88] }
{ "do": "movement", "op": "jumpRoute", "start": [670.611084, 270.297485, 899.485718], "jump": [673.82843, 270.56073, 896.099426], "end": [682.585876, 270.570007, 888.617676] }
```

**`move`**: moves this box to a spot (`loc`, or `x`, `y`, `z`); `precision` is how close counts; `await: true` waits
until it gets there.

```json
{ "do": "move", "loc": [-82.52, 16.772, 110.468], "precision": 2 }
```

**`waypoint`**: points the game's waypoint (the on-screen trail) at a spot on these boxes. It moves nobody
(inferred from the shipped notes: "every session gets a waypoint to it").

```json
{ "do": "waypoint", "x": "{{seq.m.x}}", "y": "{{seq.m.y}}", "z": "{{seq.m.z}}" }
```

**`repositionOnCondition`**: `enter` moves the box to its own spot of a list (`index`, or the number kept in
`indexVar`); `exit` brings it back. `mode`: `absolute` (places) or `relativeBy` (offsets).

```json
{ "do": "repositionOnCondition", "op": "enter", "index": 5, "spots": "nugTreeClick", "mode": "absolute", "forwho": "@Priest1" }
{ "do": "repositionOnCondition", "op": "exit" }
```

#### Targets and the kill list

**`autotarget`**: edits OgreBot's AutoTarget, the list of mobs to kill, tried in the order added. In a zone file the
`named` step arms AutoTarget for its own named.

| `op` | What it does |
|---|---|
| `addActor` | Put `name` on the list (a part of the name matches; `NPC` and `NamedNPC` also work as type words). `hp`: the health floor, it is taken while above this % (0 = until it dies); `maxHp`: the ceiling, only while at or below this %; `checkCollision`; `aggroOnGroupOnly`, `aggroOnNotMe`, `aggroOnNonFighterOnly`: only while it fights my group, someone else, a non-fighter. |
| `removeActor`, `clear` | Take one off; empty the list. |
| `set` | `radius`, `height` or `enabled`. |
| `setScanRadius`, `setScanHeight`, `setRescanTime` | `radius`, `height`, `seconds`. |
| `setEnabled`, `setOutOfCombatScanning`, `setWhenHated` | `value`: true or false. |
| `suppress`, `release` | Pause AutoTarget under a `reason`; resume it (the same reason). |
| `loadPreset`, `loadSaved` | `preset` (such as `Named`), `list`. |

```json
{ "do": "autotarget", "op": "addActor", "forwho": "fighter", "name": "celestial materia", "hp": 90, "checkCollision": true, "aggroOnGroupOnly": false }
{ "do": "autotarget", "op": "setScanRadius", "radius": 36 }
```

**`actorInteract`**: does something to an actor found by `name` or `id`: `doubleClick` (doors, levers, items on the
ground; `awaitCastBar` waits for the cast bar), `verb` (the right-click `verb`), `target`, `hail`, `dialog` (picks the
reply `choiceText`), `clearTarget`. A missing actor fails the step.

```json
{ "do": "actorInteract", "op": "verb", "id": "{{seq.b.id}}", "verb": "Push" }
{ "do": "actorInteract", "op": "dialog", "forwho": "mage", "choiceText": "i trust" }
```

**`assist`**: `op: "anchor"`: the boxes in `sendTo` assist `who` (a name, `{{me}}`, or a preferredMember pick).

```json
{ "do": "assist", "op": "anchor", "who": "{{me}}", "sendTo": "igw:{{me}}", "forwho": "fighter" }
```

**`threatIgnoreList`**: `add` puts this box on, `remove` takes it off, the threat-ignore list of the boxes in
`sendTo`; `clear` empties it. Used in tank swaps (inferred).

```json
{ "do": "threatIgnoreList", "op": "add", "sendTo": "irw:{{me}}" }
```

#### Casting and abilities

**`castAbility`**: casts an ability on these boxes, queued with a high priority: by `ability` (name) or `abilityId`;
`firstReady: [...]` casts the first ready one of a list; `allReady: [...]` every ready one; `abilityQuery` picks by a
property. `target`: who to cast it on (a name, `{{me}}`, `@target`). `cancelCasting`: stop the current cast first.
`announce: { "message", "irc" }` says so, with `{{ability}}`. `sendTo`: others cast it too.

```json
{ "do": "castAbility", "forwho": "fighter", "ability": "Subtle Strikes", "when": [{ "abilityReady": { "name": "Subtle Strikes" } }] }
{ "do": "castAbility", "firstReady": ["Sneering Assault", "Rescue", "Cry of the Warrior"] }
{ "do": "castAbility", "abilityQuery": ["IsStun", "=", "TRUE"], "target": "@target" }
```

**`castStack`**: turns a cast-stack entry on or off: `op: "set"` (or left out), `ability` (the entry, or a tag),
`match` (`entry` or `tag`, such as `IsInterrupt`), `value` true or false. Not undone at the fight's end: set it back
in `onKilled`.

```json
{ "do": "castStack", "op": "set", "match": "entry", "forwho": "all", "ability": "Temporal Mimicry", "value": false }
```

**`abilities`**: turns a group of abilities on or off with `enabled`: `stuns`, `interrupts`, `dispels`,
`dispelSetup` (the dispel rows together), `aoes` (`allowEncounters` keeps encounter AEs), `bowAbilities`. Or one job:
`castBulwark` (cast Bulwark of Order), `cancelCasting`, `cancelInvis`, `setUpForIntercept` (Intercept and Guardian off
in the cast stack; guardians cancel Guardian), `resetForIntercept` (guardians turn Guardian back on).

```json
{ "do": "abilities", "op": "interrupts", "forwho": "all", "enabled": false }
```

**`cancelMaintained`**: cancels maintained spells by name: `args: ["<spell>", ...]`.

```json
{ "do": "cancelMaintained", "forwho": "fighter", "args": ["Subtle Strikes"], "when": [{ "maintained": { "ability": "Subtle Strikes" } }] }
```

**`castInterrupt`**: each box fires its own fastest ready interrupt at the casting mob (`mob`; the named when left
out), usually gated on `namedCasting`.

```json
{ "do": "castInterrupt", "mob": "Raynax S'Vere" }
```

**`noOffensive`**, **`noDefensive`**: hold back (`value: true`; also when left out, inferred) or allow (`false`)
offensive or defensive abilities, under a `reason`. A release under another reason releases nothing. The fight's
end releases noOffensive.

```json
{ "do": "noOffensive", "forwho": "fighter", "value": true, "reason": "Grevog" }
```

**`heroicOpportunity`**: heroic opportunity (HO) control. `set`: who may `start`, add to the `starter` and finish the
`wheel` (and `surge`); `start`; `solo` (do it alone on `target`, `leaveWheelOpen`); `startSolo`, `stopSolo`;
`advance`; `cancelStarter`; `disableIcon` (`icon`); `clearIcons` (`which: "disabled"`).

```json
{ "do": "heroicOpportunity", "op": "set", "forwho": "all", "start": false, "starter": true, "wheel": true }
```

**`pet`**: `attack` sends the pet in, `off` calls it back (`stayOff`: also tick Do not send pet to attack, put back at
the fight's end), `getLost` dismisses it.

```json
{ "do": "pet", "op": "getLost", "forwho": "enchanter" }
```

**`useItem`**: `use` an `item` (on `target`), `cure` (drink a cure potion of `type`: trauma, noxious, arcane,
elemental), `drinkAlcohol`.

```json
{ "do": "useItem", "op": "use", "item": "Zov'Dyn Crystal", "when": [{ "itemReady": { "item": "Zov'Dyn Crystal" } }] }
```

**`beltAdorn`**: puts in the belt adornment rune of a `type`: stun, stifle, mez, fear or medic.

```json
{ "do": "beltAdorn", "forwho": "all", "type": "stifle" }
```

**`abilityTracker`**: `op: "add"`: tracks an ability for the group (OgreBot's ability tracker), for values such as
`groupCooldownSpread` (inferred).

```json
{ "do": "abilityTracker", "op": "add", "forwho": "all", "ability": "Balanced Synergy" }
```

#### Cures and dispels

**`cures`**: `enable` / `disable` auto-cures (disable is not undone at the fight's end: enable again in onKilled);
`now` (cure these `kinds` now); `request` (ask `responders` to cure `target`, me when left out, of `kinds`);
`requestGroup` (ask for a group cure); `castGroup`; `cancelDetrimental` (click off `main` / `back` on myself);
`clearRequests`. `kinds`: Trauma, Arcane, Noxious, Elemental, Curse. Left out, `responders` is my group.

```json
{ "do": "cures", "op": "request", "target": "{{me}}", "responders": "igw:{{me}}+mage" }
{ "do": "cures", "op": "cancelDetrimental", "forwho": "all", "main": 638, "back": -1 }
```

**`curses`**: `request` asks `responders` to cure the curse on `target`; `order` takes turns by the number in `var`.

```json
{ "do": "curses", "op": "request", "target": "{{me}}", "responders": "all" }
```

**`dispel`**: dispels a detriment (`main` / `back`) off `mob`: `any` (whatever this box has ready), `ability`,
`spell`, `item` (a dispel item; the named when `mob` is left out).

```json
{ "do": "dispel", "op": "any", "mob": "Captain Mergin", "main": 489, "back": 33080 }
```

#### Telling the group

**`announce`**: a line in my console; `console: true` in every box's console; `irc: true` also over IRC;
`noise: true` plays a sound (`noiseToPlay`: such as `Loud`).

```json
{ "do": "announce", "forwho": "fighter", "message": "***** {{me}} needs to RUN ******", "noise": true }
```

**`tts`**: says `message` out loud on these boxes.

```json
{ "do": "tts", "forwho": "fighter", "message": "Eye up" }
```

**`onScreenTimer`**: shows a countdown or a line on screen in `slot` 1 to 10: `time` (seconds; 0 shows the message
alone), `message`, `minUpdate` (how often it updates, inferred); `op: "clear"` clears a slot or a list of slots.

```json
{ "do": "onScreenTimer", "forwho": "all", "time": 90, "slot": 2, "message": "Spirit spawns in: ", "minUpdate": 10 }
{ "do": "onScreenTimer", "op": "clear", "slot": [1, 2] }
```

**`broadcast`**: sends a custom event to the boxes in `sendTo` (needed); each runs its rules with `on: "<event>"`,
with `args` as `{{event.arg1}}` ... `includeSelf: false` leaves me out. A shipped note (2026-11-01) says broadcast
travels over OgreConsole, which stays on one PC; a raid on several PCs was reached with a `raw` IRC line instead.

```json
{ "do": "broadcast", "event": "Zom_GreenReport", "sendTo": "igw:{{me}}", "args": ["{{me.ID}}"] }
```

**`fireEvent`**: fires a custom event on this box (`event`, `args`); `broadcast` is the one that reaches others
(inferred).

```json
{ "do": "fireEvent", "event": "Kyrus_EvadeHud" }
```

#### Keeping track

**`setVar`**: keeps a value under `name`. `scope`: `encounter` (this fight, on this box) or `global` (kept outside the
fight; users and other files set them too). `op`: `set` (or left out), `add` (adds `value`, or 1 without one,
inferred), `unset`, `unsetPrefix` (forgets every name starting with `name`). `value` may be computed (section 6).
Read it as `{{encounter.<name>}}` or test it with `varEquals` / `varCompare`.

```json
{ "do": "setVar", "scope": "encounter", "name": "kgNext", "value": "80", "when": [{ "mobHealthPct": { "named": "Captain Krasnok the Immortal", "compare": ">=", "value": 91 } }] }
{ "do": "setVar", "scope": "encounter", "name": "grSideN", "value": { "spotIndex": { "spots": "grRaid", "nearestTo": "{{me}}" } } }
```

**`timer`**: two forms. `name` + `set`: start a countdown of `set` ms (0 resets it), read with `timerExpired` and
`timerLeft`. `event` + `after`: send a custom event to this box after a delay (`"8s"`; a bare number reads as
seconds, inferred); a later timer with the same `key` replaces it.

```json
{ "do": "timer", "name": "kbWin", "set": 10000 }
{ "do": "timer", "event": "Zerada_AssaultCompleted", "after": "5s" }
```

**`flagToon`**: numbered flags on boxes: `set` (`flag`, `value`), `clearAll`, `nextPerson` (pass the flag on). Read
by `toonFlagged` and the for-who `ToonFlagged:<n>`.

```json
{ "do": "flagToon", "op": "set", "forwho": "@Priest1", "flag": 1, "value": true }
```

**`report`** and **`rosterOrder`**: a roll call for a mechanic. `report` `start` opens one, `in` reports `who` into
`list` (each box builds the same list; `broadcast` + `event` tell the others), `complete` marks someone done;
`window` is the report-in time in ms, counted from the first report (a report after it closes starts a new roll call
and wipes the list). `rosterOrder` numbers the list (`op: "alpha"`: by name) and keeps my place in `var`.

```json
{ "do": "report", "op": "in", "list": "theerIA", "who": "{{event.arg1}}", "skipCureCheckboxes": true }
{ "do": "rosterOrder", "list": "theerIA", "var": "thIAIdx" }
```

**`examine`**: `op: "det"` reads a detriment's examine text (`dets` table, `index`) into `var`, for `textContains`.

```json
{ "do": "examine", "op": "det", "dets": "bristlebaneUrge", "index": 1, "var": "fbText" }
```

**`resolve`**: finds one actor and binds it: `find` (`query` or `name`, with `nth: { "nearestTo": [x, y, z],
"rank", "within" }`; without nth the lowest id wins), `as`, `onMissing` (`skip`, `proceed`, `fail`). Read it as
`{{seq.<as>.id}}`. A step that reads a binding nothing filled fails, so stop first when the find can be empty.

```json
{ "do": "resolve", "find": { "query": "Type==\"NoKill NPC\"", "nth": { "nearestTo": [-512.625549, 1.11047, -24.881676] } }, "as": "kA", "onMissing": "skip" }
```

#### Flow and everything else

**`stop`**: ends the list it is in; with `when` it is a guard. In a rule it ends that run only.

```json
{ "do": "stop", "when": [{ "varEquals": { "scope": "encounter", "name": "jsWho", "value": "" } }] }
```

**`stopEvaluating`**: in an onPulse rule, skips the rules after this one for this pulse: rules in file order with
stopEvaluating make an if / else-if chain.

**`template`**: a ready-made mechanic, named in `use`:

| `use` | What it does | Fields seen |
|---|---|---|
| `tankSwap` | Tank swaps: `prepare`, `swapOut`, `swapIn`, `remove`. | `op`, `reason` |
| `removeTankSwap` | Ends the tank swap. | |
| `dispel` | A dispel of `main` / `back` off `mob`. | `op: "ability"`, `mob`, `main`, `back` |
| `getAwayToCure` | Go to my own spot (by the roll call) to be cured away from the group. | `list`, `spots`, `reportIn`, `mode`, `timeout` |
| `returnFromCure` | Come back after the cure and send `completeEvent`. | `list`, `completeEvent` |
| `radialSpread` | Spread out round the camp spot. | `distance`, `spots` (how many), `mode`, `indexVar` |
| `walkToActorAndInteract` | Walk to an actor and use it. | `find`, `as`, `mode`, `limitMs`, `interact` |
| `walkToActor`, `castMonitor` | No shipped file uses them. | |

```json
{ "do": "template", "use": "tankSwap", "op": "prepare", "reason": "Cthurath" }
```

**`ogreBotUIOption`**: sets an OgreBot option (a checkbox `id`) to `value` true or false, or puts it back
(`op: "restore"`). Options a fight writes are put back when it ends; `silent` keeps the console quiet.

```json
{ "do": "ogreBotUIOption", "forwho": "all", "id": "checkbox_settings_castwhilemoving", "value": true, "silent": true }
```

**`raw`**: one InnerSpace console line on this box. Native console commands take the for-who first.

```json
{ "do": "raw", "command": "eq2execute r_particle_priority 1" }
```

**`gameCommand`**: a game slash-command: `command` plus `args`.

```json
{ "do": "gameCommand", "command": "pet", "args": ["attack"] }
```

**`botPause`**: pauses (`value: true`) or resumes (`false`) the bot on this box only.

**`inventory`**: `op: "destroy"`: destroys `count` of an `item` (or `iconId`).

**`loot`**: in a fight file, `op: "assign"` gives an `item` in an open Leader Only loot window `to` a member.

**`choiceWindow`**: `accept` presses OK on a choice pop-up; `enterText` types `text` into it.

```json
{ "do": "inventory", "op": "destroy", "item": "a Luclinite Bomb", "count": 1 }
{ "do": "loot", "op": "assign", "item": "a discarded wrench", "to": "{{encounter.jbWho}}" }
{ "do": "choiceWindow", "op": "enterText", "forwho": "all", "text": "{{encounter.kxMark1}}" }
```

#### Known to the engine, used by no shipped file

| Action | What it does |
|---|---|
| `camera` | `setPitch` (`pitch`) or `reset` the camera. |
| `merchant` | `op: "buy"`: buy `count` of `item` from the merchant `actor`, which must be in reach. |
| `method` | Call an OgreBotAPI method (`call`, `args`, the for-who first): an escape hatch the shipped files moved away from. |
| `replyDialog` | `op: "choose"`: pick the dialog reply that contains `text`. |
| `runscript` | Run a LavishScript script (`script`, `args`). |
| `script` | Call a function (`op: "call"`) or method (`op: "method"`) of a running script. |
| `zoneDoorWindow` | `op: "choose"`: pick a row (`destination`) in an open zone door window. |
| `rotate` | Read by the engine (`over`, `as`, `id`). |

---

## 4. Who runs a step: forwho, sendTo, responders, scope, op, when

| Key | Where | What it means |
|---|---|---|
| `forwho` | any step, trigger or onPulse rule | Which boxes run it. Every box loads a fight file, so this is the usual filter. In a zone file the steps run on the IC character, so it only gates that box. |
| `sendTo` | actions that send a command: in shipped files campSpot, movement, castAbility, actorInteract, ogreBotUIOption, assist, broadcast (needed there), tts, dispel, abilities, heroicOpportunity, threatIgnoreList; and path, reward, groupQuery in zone files | The boxes this box tells to do it. One box decides, the others act. |
| `responders` | cures, curses | Who should do the curing. |
| `scope` | setVar, varEquals, varCompare; count, rank, rosterPick | `encounter` or `global` for saved values; `group` or `raid` for counts, ranks and picks. |
| `op` | many actions | Which form of the action; each action lists its own. |
| `when` | any step, trigger or rule | Conditions that must all hold, on this box, for it to run. |

A for-who is a word or a mix of words. Ogre's rules: `|` means or, `+` means and, a `-` in front means not, and `+`
binds tighter than `|`: `notfighter|fighter+groups:24` is non-fighters, or fighters in raid groups 2 and 4.

| Form | Means | Seen as |
|---|---|---|
| `all` | Every box. | `all` |
| `me`, `{{me}}`, a character name | That box. | `{{me}}`, `{{event.arg1}}`, `{{encounter.surTop}}` |
| `fighter`, `priest`, `mage`, `scout`, `healer` | An archetype. | `fighter` |
| `melee`, `caster` | The composites. | `melee` |
| `warrior`, `crusader`, `brawler`, `cleric`, `druid`, `shaman`, `shaper`, `sorcerer`, `enchanter`, `summoner`, `rogue`, `bard`, `predator`, `animalist` | A class. | `enchanter`, `bard` |
| a subclass | One subclass (ascension classes too). | `guardian`, `troubador`, `elementalist` |
| `not<word>` | Everyone but those. | `notfighter`, `notpriest` |
| `-<word>` | Not those, inside a mix. | `-priest+-fighter`, `-@Priest1` |
| `groupleader` | My group's leader. | `groupleader`, `-groupleader` |
| `igw:<name>` | In a group with that one. | `igw:{{me}}` (my group) |
| `igwbn:<name>` | In a group with that one, but not that one. | `igwbn:{{me}}` |
| `irw:<name>`, `irwbn:<name>`, `irzw:<name>`, `irzwbn:<name>` | In a raid with that one; `bn`: but not that one; `z`: in the same zone (inferred). | `irw:{{me}}`, `irwbn:{{me}}` |
| `not:<name>` | Not that one. | `not:{{me}}`, `irw:{{me}}+not:{{me}}` |
| `groups:<digits>`, `g1` to `g4` | Raid groups. | `groups:1`, `groups:234`, `g2+priest` |
| `@<alias>` | OgreBot's aliases: `@Tank`, `@Bard`, `@Enchanter`, `@Healer1` to `@Healer6`, `@DPS1` to `@DPS6`, and archetype slots `@Fighter1`, `@Priest1`, `@Mage1`, `@Scout1` ... | `@Priest1`, `igw:{{me}}+@healer1` |
| `*Team:<name>` | A ForWho group (`ogre forwhogroups panel`). | |
| `ToonFlagged:<n>` | Boxes carrying flag n (flagToon). | `ToonFlagged:1` |
| `eval_num_me:<expression>` | A test on the box itself (one shipped file; inferred). | `fighter\|groupleader\|eval_num_me:GroupCount==1` |

How a command travels (Ogre's notes on asking the group): a group lives on boxes that share a local relay, so a
group-scoped command (`igw:`) goes over that relay; a raid can span several PCs, so a raid-scoped one (`irw:`) goes
over IRC.

---

## 5. Conditions

`when`, `wait`, `repeat.until`, `awaitWhen`, `activeWhile` and `abortWhen` take conditions:

- A list of condition objects; **all** must hold.
- Each is `{ "<condition>": { ...its keys } }`; one with no keys is `{ "inCombat": {} }`.
- `not`, `or` and `and` take a list: `{ "not": [{ "inCombat": {} }] }`, `{ "or": [ ..., ... ] }`.
- `forwho` may stand beside a condition in one object, to test on some boxes only:
  `{ "not": [{ "toonFlagged": { "flag": 1 } }], "forwho": "notpriest" }`.
- `compare` is one of `==`, `!=`, `<`, `>`, `<=`, `>=`.
- **A misspelt condition name is not caught when the file loads**: it is simply never true.
- A condition compares values as they are; work numbers out with `setVar` first (section 7).

| Condition | Keys | True when |
|---|---|---|
| `count` | `of`, `find`, `compare`, `value`; `prefix`, `scope`, `by`, `is`, `member`, `uncurable` | A count compares with value: actors matching `find` (`of: "actors"`), saved values starting with `prefix` (`vars`), cursed members (`cursed`), or roster members of a kind (`roster`, `by`: Class, Archetype or Role, `is`). |
| `actorNear` | `find`, `within`, `of` / `ofLoc` / `ofActor`, `compare`, `value` | An actor matching find is within m of me, my camp spot, a place or an actor. |
| `actorPresent` | `name` or `id`, `compare`, `count` | An actor is up (or how many are). |
| `actorIs` | `id` + `dead`, `feignDeath`, `aura`, `overlay`, `tooltip`, `tintFlags`, `guild`, `type`, `targetName`, `currentAnimation`, `name` | The actor `id` (a name or an id) is so. |
| `actorTarget` | `id`, `archetype`, `inMyGroup` | The actor is targeting someone in my group, or of an archetype. |
| `actorCoord` | `of`, `axis`, `compare`, `value` | A coordinate of me (or an actor) compares with value. |
| `distance` | `to`, `from`, `compare`, `value`, `valueOf`, `2d` | The distance from `from` (me when left out; a spot, `campSpot` or an actor) to `to` compares with value or with another distance. |
| `nearSpot` | `of`, `spots`, `index`, `within` | I (`me`), my camp spot (`campSpot`) or its base (`campSpotAnchor`) is within m of a spot. |
| `collision` | `from`, `to` | Something blocks the line from `from` to `to`. |
| `groupDistance` | `pick`, `compare`, `value` | The farthest member (`pick: "farthest"`) is within value (inferred). |
| `inMyGroup` | `who` | `who` is in my group. |
| `raidSlot` | `slot` | I am in that raid slot (1 = the raid's first; inferred). |
| `engaged` | `named` | The named is in combat (left out: this file's named, inferred). |
| `mobHealthPct` | `named`, `compare`, `value` | The named's health % compares with value. |
| `namedCasting` | `named`, `abilityId`, `compare`, `value` | The named is casting (that ability) (inferred). |
| `threatToMe` | `named`, `compare`, `value` | My threat on the named compares with value (%). |
| `untoldTier` | `compare`, `value` | This run's Untold tier compares with value. |
| `zone` | `is`, `contains` | The zone's name is, or contains, the text (`contains` takes a list too). |
| `inCombat`, `selfCasting`, `botPaused` | | I am in combat, casting, paused. |
| `atCampSpot`, `campSpotValid`, `campSpotRelative` | | I stand on my camp spot; I have one; I have a relative one (the last two inferred). |
| `assistInControl` | | OgreBot's assist drives my target (inferred). |
| `myStat` | `stat`, `compare`, `value` | One of my values compares: `health`, `IsFD`, `pet`, `cursed`, `noxious`, `arcane`, `trauma`, `elemental` ... |
| `hasDet` | `main` + `back` or `det`, `actor`, `compare`, `value`, `maxEffects` | A detriment is on me (or on `actor`); compare tests its increments. |
| `detTimeLeft` | `main` + `back` or `det`, `actor`, `compare`, `value` | Its seconds left compare with value. |
| `afflicted` | `kind`, `who`, `name`, `uncurable` | Someone carries a detriment of a kind (arcane, elemental, noxious, trauma). |
| `cureCalled` | `kind`, `victim` | A cure was called (inferred). |
| `abilityReady` | `name` / `ability` / `abilityId`, `recastOnly` | My ability is ready. |
| `hasAbility` | `ability` / `abilityId` | I have the ability at all. |
| `maintained` | `ability` | I maintain it. |
| `hasItem`, `itemReady` | `item` (`partial`) | I hold the item; it is ready to use. |
| `curePotionReady`, `dispelReady`, `dispelItemReady` | `type` | My cure potion, dispel or dispel item is ready. |
| `heroicOpportunity` | `state`, `for`, `timeLeft`, `compare`, `value` | The HO is `open`, `solo`, `wheel`, `myStart`, `primed` or `starter`. |
| `lootWindow` | `type`, `item` | A loot window of that type shows the item. |
| `option` | `id`, `value` | An OgreBot option is true or false. |
| `varEquals`, `varCompare` | `scope`, `name`, `value` (`compare`) | A saved value equals (or compares as a number with) value; `""` is not set. |
| `textEquals`, `textContains` | `text`, `value` | A text equals or contains value; use them on `{{chat.message}}`, `{{target.name}}` ... |
| `timerExpired`, `timerLeft` | `name` (`compare`, `value`) | A countdown has run out; its ms left compare with value. |
| `toonFlagged` | `flag` | I carry that flag. |
| `roster` | `list`, `state` | A roll call is `windowOver`, `settled`, `timedOut` or `done`. |
| `ruleState` | `id`, `is` | An onPulse rule is in a state (`inactive`). |
| `jumpRoute` | `is` | My jump route is `running` or `failed`. |
| `moveFinished` | `ms` | My last move is done (the wait word). |

The engine also knows `chatMatch`, `csp`, `flag`, `questStep`, `replyDialog`, `rewardWindow` and `zoneDoorWindow`; no
shipped file uses them.

```json
{ "count": { "of": "actors", "find": { "query": "Name == \"a rusted lever\" && Distance < 30" }, "compare": ">=", "value": 1 } }
{ "hasDet": { "actor": "Zebrun the Torso", "compare": ">=", "value": 8, "main": 353, "back": 33085 } }
{ "nearSpot": { "of": "campSpot", "spots": "gdTaps", "index": "{{encounter.gdTap}}", "within": 1 } }
{ "count": { "of": "roster", "scope": "group", "by": "Archetype", "is": "priest" } }
```

An actor query (`find.query`) uses ISXEQ2's query words, as the shipped files write them: `Name == "..."`,
`Name =- "..."` (contains), `Type == "NamedNPC"`, `Distance < 30`, `Health > 0`, `IsDead`, `Interactable`, `Aura`,
`Overlay`, `TintFlags`, `Tooltip`, `ID == {{seq.c.id}}`, joined with `&&` and `||`. `find` may also be
`{ "name": "..." }`, `{ "tooltip": "..." }` or `{ "overlay": "..." }`.

---

## 6. Values in text, saved values and computed values

Text in `{{ }}` is filled in when the step runs:

| Value | Holds |
|---|---|
| `{{me}}` | My name. `{{me.x}}`, `{{me.ID}}`, `{{me.RaidGroupNum}}`, `{{me.subclass}}`, `{{me.race}}` ...: my values. |
| `{{target.name}}`, `{{target.id}}` | My target. |
| `{{chat.message}}`, `{{chat.speaker}}`, `{{chat.tokenN}}`, `{{chat.nameN}}` | In a text, announcement or chat rule: the line, who said it, the nth word, the nth word cleaned. |
| `{{actor.id}}`, `{{actor.name}}` | In a spawn or despawn rule: the actor. |
| `{{event.arg1}}` ... | In a custom event rule: the values sent with it. |
| `{{encounter.<name>}}` | A value `setVar` kept for this fight. |
| `{{global.<name>}}` | A value kept outside the fight. |
| `{{seq.<as>.id}}`, `.name`, `.x`, `.y`, `.z`, `.loc`, `.distance` | The current one of a forEach, or what `resolve` bound. |
| `{{<param>}}` | In a routine: a parameter. |
| `{{ability}}` | In a castAbility announce: the ability. |
| `{{ic.*}}` | Zone files (section 2.6). |

A field may also hold a **computed value**: an object with one key. Shipped files use them in `setVar.value` above
all, and in `campSpot.index` and `dist`, `flagToon.flag`, `timer.set`, `assist.who`, `autotarget.name`,
`repositionOnCondition.index` and `raw.command`:

| Kind | Gives | Keys |
|---|---|---|
| `calc` | Arithmetic. | `add`, `sub`, `mul`, `div`, `min`, `max`, `round`: a list of values (values may be computed too) |
| `textAfter` | The text after a marker. | `text`, `after`, `trimSuffix`, `firstOf` |
| `textToken` | The nth word of a text. | `text`, `index`, `sep` |
| `textMid` | A piece of a text. | `text`, `start`, `length` |
| `concat` | Texts and values joined. | a list |
| `rank` | My place among a class, or all. | `among`, `scope`, `playersOnly` |
| `rosterPick` | A member picked by class. | `among`, `scope`, `nth`, `playersOnly` |
| `preferredMember` | The nth preferred member of an archetype. | `pool`, `rank` |
| `cursedMember` | A cursed member, by an order of archetypes. | `order`, `groupOnly`, `uncurable` |
| `groupMember` | A member with a property. | `race` |
| `spotIndex` | The number of the spot nearest someone. | `spots`, `nearestTo` |
| `count` | A count, as the count condition counts. | `of`, ... |
| `actorField` | A property of an actor. | `id`, `field` (`targetName`, `TintFlags` ...) |
| `mobHealthPct` | The named's health %. | `named` |
| `itemCount` | How many of an item I hold. | `item` |
| `detIncrements`, `detName`, `detDescription`, `detEffectString` | A detriment's stacks, name, description, a line of its effect text. | `main`, `back`, `actor`, `line` |
| `detIndex` | Which detriment of a detTables list is on me. | `dets`, `prefer` |
| `groupCooldownSpread` | How far apart the group used an ability. | `ability`, `withinMs` |
| `random` | A random number (one shipped file). | |

```json
{ "do": "setVar", "scope": "encounter", "name": "jsTok", "value": { "textToken": { "text": "{{chat.message}}", "index": 9, "sep": " " } } }
{ "do": "setVar", "scope": "encounter", "name": "grSide", "value": { "calc": { "sub": [3, "{{encounter.grSideN}}"] } } }
{ "do": "setVar", "scope": "encounter", "name": "cnWho", "value": { "rosterPick": { "among": "fighter", "scope": "group" } } }
```

---

## 7. What the shipped notes warn about

Ogre's shipped fight files carry notes on mistakes found while writing them. The ones that apply to any file:

- **A binding nothing filled fails the step.** A `{{seq.<as>.*}}` from a `resolve` or `forEach` that found nothing does
  not read as empty: the step that reads it fails. Guard it with a `count` and a `stop` first.
- **Two empty texts are not equal.** `textEquals` never matches when both sides are empty; keep `"0"` rather than `""`
  for a value you will test.
- **Conditions compare values, they do not work them out.** A computed value works in an action's field, not inside
  a `when`, and a coordinate field takes a number or a `{{...}}` value, not a computed one: work it out into a
  variable with `setVar` first.
- **A list can pause between two steps** while a pulse runs, and onPulse rules are checked first. Start a countdown
  before you set the state a rule reads.
- **`repeat until` is checked after each pass**, so a test that must hold before the first pass belongs on the steps.
- **Detriment rules see only this box.** To act on a named's detriment, test `hasDet` with `actor` in an onPulse rule.
- **Detriment numbers**: `main` is the icon, `back` the backdrop; Classic listed them backdrop first.
- **What the fight's end puts back**: options written with `ogreBotUIOption`, the relative camp spot, `noOffensive`,
  what the fight added to AutoTarget. **Not**: `castStack` entries, `cures disable`, a camp spot sent to others. Put
  those back in `onKilled`, which also runs when the group leaves the zone.
- **Camp spots**: a box with no camp spot ignores camp spot moves; a move beyond `howFar` is ignored; `clearRelative`
  goes back to the base spot as it is now; `sendTo` is not taken on `op: "clear"` (use `clearAll`).
- **`movement stopFollow` does not hold a box still**: the camp spot pulls it back on the next pulse. Use `block` and
  `unblock`.
- **`allowConcurrentRuns: false`** drops a second firing while the first still runs.
- **An onPulse rule without `everyPulse`** fires once per change to true, not on every pulse.
- **`{{me}}` in onPulse**: one shipped note says engine values such as `{{me}}` read as empty in an onPulse rule and
  are filled in only for steps run from a trigger. Many other shipped files use `{{me}}` in onPulse
  steps, so this may be out of date; if a value reads empty there, move the step into a trigger.
- **Native console lines** (`raw`, `oc ...`) take the for-who first (Ogre's notes for people coming from Classic).
- **Zone files**: a bare `${...}` makes the file not valid; write `LavishScript["${...}"]`.

ISXJQB instance files, which the Creator also opens, are a different format (steps with a `type` such as `WAYPOINT`,
`OC`, `COMBAT`) that ISXJQB runs; this page does not cover them.
