# Zone files

A zone file tells native OgreBot's instance controller (IC) how to run one zone: where the group walks, which nameds
it fights, what it loots, and how it leaves. This page is a working summary for people who write zone files with
Open IC Creator. Ogre's own documentation is the final word; where this page and Ogre's reload disagree, Ogre is
right.

## Where they go

| Folder (inside InnerSpace's `Scripts` folder) | What it is |
|---|---|
| `Ogre\EQ2\IC\default\` | The files Ogre ships. Updates replace this folder: never save here. |
| `Ogre\EQ2\IC\test\` | Files Ogre is still testing. |
| `OgreSave\EQ2\IC\custom\` | Yours. Folders of your own inside it are fine, at any depth. |

- Every `.json` file under these folders is read. The same file in two folders shows up twice.
- A number at the start of a name (`_01_`) sorts the list.
- Ogre names its files after the zone: spaces become `_`, and `:` `'` `,` `[` `]` and the backtick are left out. A file
  for a single difficulty adds it: `_01_Crypt_of_Valdoon_Heroic.json`. The Creator shows the name its rule gives.
- Queue a file by its path: `ogre ic queue add custom <folder>/<file>.json`, or in a script
  `ISXOgreEQ2.IC:Queue[add,custom,"<folder>/<file>.json"]`.
- After a change, `ogre ic reload` reads every file again and prints one line per problem.

## The top of the file

| Key | Needed | What it does |
|---|---|---|
| `zone` | yes | The zone's name as the game shows it, without the difficulty tag. |
| `variants` | yes | Every difficulty the file covers, as the game writes it: `["[Solo]", "[Heroic]"]`. `[]` for a zone with no tag. |
| `steps` | | The main list of steps. |
| `enter`, `exit` | | Steps before and after `steps`. The run is `enter`, then `steps`, then `exit`. |
| `entrance` | | `{ "loc": [x, y, z], "tolerance": 30 }`: where the zone-in puts you. Wipe recovery walks back from it. Nameds without an entrance load with a warning. |
| `progression` | | `"sequential"` (the default) or `"open"`. Use `open` when a named can be up out of order, or has to be spawned (anything with `spawnWaitMs`). Getting `open` wrong costs a walk; getting `sequential` wrong skips a named. |
| `rerunWholeZoneAfterWipe` | | `true`: after a wipe recovery, run the file again from the top. For zones with teleporters inside. |
| `wipeAttempts` | | How many wipe recoveries before the zone is given up: 0 to 10, 2 when left out. |
| `onWipe`, `afterWipe` | | Your own wipe-recovery steps, and your own steps for a zone given up. `[]` in `onWipe` means no recovery. |
| `fileOptions` | | Up to 3 names for the IC window's File Option boxes, read as `{{ic.options.fileOption1}}` ... |
| `options` | | Your own values, read as `{{ic.zone.options.<name>}}`. |
| `run` | | `{ "iss": "<path>" }` or `{ "json": "<path>" }`: hand the zone to a script or another file. A file has `run` or steps, never both. |
| `enabled` | | `false` hides the file. |
| `expansion`, `author` | | Notes for people. |

A key starting with `_` (for example `_note`) is a note: Ogre never reads it and never warns about it. Any other key
Ogre does not read is a warning on reload.

## Steps

Every step is one of four shapes, and may carry these keys too:

| Key | What it does |
|---|---|
| `stepId` | The step's name. Name each named `named1`, `named2` ..., and the steps that go with it `named1.walk`, `named1.chest`. Skip the boss, the named # start and resuming all go by these names. |
| `onFail` | `fail` ends the list when the step fails; `proceed` goes on. Steps in a list start as `fail`, steps in a loop as `proceed`. |
| `when` | A list of conditions; the step runs only when all hold. A false `when` skips the step without failing. |
| `throttleMs` | Skip the step if it ran less than this long ago (handy in loops). |

The four shapes:

- **`do`**: an action, with its own keys (below).
- **`wait`**: `"ms"` (a pause of `limitMs`), `"atCampSpot"`, or a condition. `limitMs` and `onTimeout` (`proceed` or
  `fail`) are always needed. A `"ms"` wait must use `proceed`.
- **`repeat`**: `{ "times": 3 }`, or `{ "until": <conditions>, "max": 10 }` (`max` is needed), with its own `steps`.
- **`forEach`**: over actors (`"find": { "query": "..." }`), spots (`"spots": [...]`) or saved values
  (`"vars": { "prefix": "...", "groupMember": true }`), with `"as"` and `"max"`, and its own `steps`. Inside,
  `{{seq.<as>.x}}`, `.y`, `.z`, `.loc`, `.id`, `.name` and `.distance` read the current one.

## The way out

Every zone file needs a `zoneOut` step somewhere in `enter`, `steps` or `exit`. Without one, Ogre lists the file in
red and will not queue it. The usual last step is:

```json
{ "stepId": "exit", "do": "zoneOut", "op": "auto" }
```

`auto` walks to the nearest exit named `zone exit`, `exit`, `zone_exit` or `exit_spawned`; `door` clicks the exit
you name; `endOfZone` looks only near the last boss; `none` stays in the zone on purpose. A `zoneOut` that takes the
group out ends its list.

## Values in text

Text in `{{ }}` is filled in when the step runs:

- `{{me}}`: the IC character's name.
- `{{ic.zone.name}}`, `{{ic.zone.variant}}`, `{{ic.zone.fullName}}`, `{{ic.zone.tier}}`, `{{ic.zone.file}}`,
  `{{ic.zone.entrance}}`, `{{ic.zone.options.<name>}}`.
- `{{ic.options.<name>}}`: the IC window's options as `TRUE` / `FALSE` (`skipBoss`, `skipShinies`, `fileOption1` ...).
- `{{ic.run.verdicts.<stepId>}}`: how a step ended (`killed`, `looted`, `zonedOut` ...).
- `{{ic.group.size}}`, `{{ic.group.mode}}` (`group` or `raid`), `{{ic.list.name}}`, `{{ic.list.entry}}`, `{{ic.list.of}}`.
- `{{encounter.<name>}}`: a value saved during the run, for example a `groupQuery` answer.
- LavishScript is written `LavishScript["${Me.Name}"]`. **A bare `${...}` makes the file not valid.**

## Conditions

`when`, `wait` and `repeat.until` take the same conditions fight files use. The ones zone files use most:

```json
{ "count": { "of": "actors", "find": { "query": "Name == \"a rusted lever\" && Distance < 30" }, "compare": ">=", "value": 1 } }
{ "actorNear": { "find": { "query": "Name == \"The Hollow Regent\"" }, "within": 40 } }
{ "zone": { "is": "Crypt of Valdoon [Heroic]" } }
{ "textEquals": { "text": "{{ic.options.fileOption1}}", "value": "TRUE" } }
{ "not": [ ... ] }  { "or": [ ... ] }  { "and": [ ... ] }
```

`data/vocabulary.json` lists every condition and its keys. **Ogre's reload does not catch a misspelt condition**:
the step just never sees it true. The Creator checks every name against the list.

## Checking a file

The Creator checks a zone file as you edit it:

- **Problems** (Ogre would refuse the file or the step): an unknown action, a missing needed key, a value of the
  wrong kind, an `op` that is not one of its choices, a wait without its time, a bare `${...}`, no way out.
- **To check** (it loads, but probably not as meant): a key nothing reads (with the key it probably meant), two
  steps with one `stepId`, an unknown condition, a named without a `stepId`, no entrance, no boss marked,
  `progression` that does not fit a spawn wait.
- **Tips**.

Then save the file into the custom folder and run `ogre ic reload`: its console line
(`N zone(s) from M file(s) - X skipped, Y warning(s)`) is the final word.

## The actions only zone files run

Any fight-file action may also be a zone-file step (see [fight-files.md](fight-files.md)); these thirteen run only
in zone files. Every key, its kind of value and its default:

### `path`

Walk the group along spots, on the nav mesh or camp spot by camp spot.

| Key | Value | Default | Notes |
|---|---|---|---|
| `using` (needed) | `nav`, `campspot` |  | nav walks the mesh; campspot moves the group camp spot by camp spot. |
| `spots` (needed) | a list of [x, y, z] |  | The spots to walk, in order. |
| `groupWithin` | a number above 0 | `10` | How close the group stays (meters). |
| `howClose` | a number above 0 |  | Read by the engine; not in the docs. |
| `spotLimitMs` | a whole number above 0 | `30000` | The time limit at each spot. |
| `onSpotTimeout` | `retry`, `fail`, `proceed` | `"retry"` | What a slow spot does. |
| `waitForCombat` | true, false or an object of its own keys | `true` | Stop and fight what attacks on the way. |
| `fly` | true or false | `false` | Fly between the spots. |
| `waitForStragglers` | true or false | `true` | Wait for the group to catch up. |
| `exitOnActorAggro` | text |  | Stop the walk when this mob attacks. |
| `fromStart` | true or false | `false` | Walk from the first spot even when a later one is nearer. |
| `sendTo` | a for-who (see forWho) |  | Who walks (a for-who); the group when left out. |
| `killWithin` | a number above 0 |  | Fight anything within this many meters on the way. At most 100. |
| `killTypes` | a list | `["NPC"]` | What counts for killWithin: NPC, NamedNPC, Special. |
| `killLimitMs` | a whole number above 0 | `120000` | How long the fights on the way may take. |
| `legM` | a number, 0 or more |  | Read by the engine; not in the docs. |
| `resWithin` | a number |  | Read by the engine; not in the docs. |
| `resLimitMs` | a whole number above 0 |  | Read by the engine; not in the docs. |
| `returnNoProgressMs` | a whole number above 0 |  | Read by the engine; not in the docs. |
| `returnProgressDist` | a number |  | Read by the engine; not in the docs. |
| `returnLimitMs` | a whole number above 0 |  | Read by the engine; not in the docs. |

### `named`

Fight a named: find it, buff up, pull, and record how it went.

| Key | Value | Default | Notes |
|---|---|---|---|
| `name` (needed) | text |  | The mob, exactly as the game names it. |
| `spot` | [x, y, z] |  | Where to fight it. |
| `navTo` | true or false | `false` | Walk to it on the mesh first. |
| `aliases` | a list |  | Other names it goes by. |
| `boss` | true or false | `false` | The zone's last boss: Skip the boss and the boss chest options read it. |
| `spawnWaitMs` | a whole number, 0 or more | `0` | How long to wait for it to spawn. |
| `pullLimitMs` | a whole number above 0 | `30000` | How long the pull may take. |
| `limitMs` | a whole number above 0 | `3600000` | How long the whole fight may take. |
| `scanRadius` | a whole number above 0 | `50` | How far to look for it (meters). |
| `scanHeight` | a whole number above 0 |  | How far up and down to look for it. |
| `prebuffMs` | a whole number, 0 or more | `10000` | How long to let the group buff up first. 0 for no buff-up. |
| `preCastTagMs` | a whole number, 0 or more |  | Time for the pre-cast tag before the pull. Its default is not documented. |
| `waitForCombat` | true or false | `true` | Wait for the fight to end before the next step. |

### `loot`

Loot the chest or pick up the shinies. Never fails the zone.

| Key | Value | Default | Notes |
|---|---|---|---|
| `op` (needed) | `chest`, `shinies` |  | chest or shinies. |
| `within` | a number above 0 | `75` | How far to look (meters). |
| `boss` | true or false | `false` | This is the boss chest. |
| `back` | true or false | `true` | Walk back after looting. |
| `noTrade` | `loot`, `skip` |  | What to do with no-trade items: loot or skip. |
| `windowBaseMs` | a whole number, 0 or more |  | Read by the engine; not in the docs. |
| `windowPerItemMs` | a whole number, 0 or more |  | Read by the engine; not in the docs. |

### `zoneOut`

The way out. Every zone file needs one, in enter, steps or exit.

| Key | Value | Default | Notes |
|---|---|---|---|
| `op` (needed) | `door`, `auto`, `endOfZone`, `none` |  |  |
| `name` | text, or a list of texts |  | Required for door. |
| `destination` | a row text or a 1-based row number |  | A row text or a 1-based row number; the last row when left out. |
| `within` | a number above 0 | `30` |  |
| `walk` | true or false |  | door: false, the others: true. |
| `searchWithin` | a number above 0 | `100` |  |
| `findLimitMs` | a whole number above 0 | `10000` |  |
| `zoneLimitMs` | a whole number above 0 | `40000` |  |
| `groupLimitMs` | a whole number above 0 | `120000` |  |

### `teleporter`

Use a teleporter: click it by name, or walk onto a pad and land.

| Key | Value | Default | Notes |
|---|---|---|---|
| `name` | text |  | Required unless walkOnto is used. |
| `walkOnto` | [x, y, z] |  | A pad to walk onto instead of a name. |
| `landing` | [x, y, z] |  | Where it puts you. |
| `limitMs` | a whole number above 0 | `20000` | How long it may take. |

### `waitForCombat`

Wait for the fight to end.

| Key | Value | Default | Notes |
|---|---|---|---|
| `settleMs` | a whole number, 0 or more | `2000` | Out of combat this long counts as done. |
| `settleWithin` | a number above 0 | `15` | Nothing in combat within this many meters. |
| `noProgressMs` | a whole number above 0 | `15000` | A fight going nowhere this long... |
| `onNoProgress` | `moveOn`, `fail` |  | ...then move on, or fail. |
| `limitMs` | a whole number, 0 or more |  |  |

### `waitForLoot`

Wait for the loot window.

| Key | Value | Default | Notes |
|---|---|---|---|
| `settleMs` | a whole number, 0 or more | `3000` | No loot window this long counts as done. |
| `limitMs` | a whole number, 0 or more | `120000` | 0 = no limit. |
| `onTimeout` | `proceed`, `fail` | `"proceed"` |  |

### `hunt`

Kill a kind of mob until another shows up.

| Key | Value | Default | Notes |
|---|---|---|---|
| `name` (needed) | text |  | Part of a name. |
| `until` (needed) | text |  | An exact name. |
| `untilLine` | text |  | Stop when this line shows. |
| `spots` | a list of [x, y, z] |  | Where to look. |
| `limitMs` | a whole number above 0 | `900000` | How long the hunt may take. |

### `trash`

Clear everything in a circle.

| Key | Value | Default | Notes |
|---|---|---|---|
| `radius` | a number above 0 | `30` | The circle to clear (meters). |
| `types` | a list | `["NPC"]` | What to kill. |
| `until` | text |  | Stop when this mob shows up. |
| `whenEmpty` | `done`, `wait` |  | done when the circle is empty, or wait for more. |
| `quietMs` | a whole number above 0 | `60000` | Only with whenEmpty wait. |
| `move` | `none`, `nav`, `campspot` |  | How to move between fights. |
| `limitMs` | a whole number above 0 | `600000` | Reaching it fails the step. |

### `reward`

Pick a reward from the reward window.

| Key | Value | Default | Notes |
|---|---|---|---|
| `choose` (needed) | text or a whole number |  | The reward: its number or its name. |
| `limitMs` | a whole number above 0 | `5000` |  |
| `sendTo` | a for-who (see forWho) |  | Who picks (a for-who). |

### `groupQuery`

Ask every box a question; the answers are read as {{encounter.<var>.anyYes}} and the like.

| Key | Value | Default | Notes |
|---|---|---|---|
| `var` (needed) | text |  | The name the answers are saved under. |
| `question` (needed) | text |  | itemCount, abilityReady, slotResolve or LavishScript["${...}"]. |
| `item` | text |  | For itemCount. |
| `ability` | text |  | For abilityReady. |
| `slot` | text |  | For slotResolve. |
| `compare` | `==`, `!=`, `<`, `>`, `<=`, `>=` |  |  |
| `value` | any value |  |  |
| `sendTo` | a for-who (see forWho) |  | Who is asked; the group when left out. |
| `limitMs` | a whole number above 0 | `3000` |  |
| `askAgainIfBlank` | true or false |  | Read by the engine; not in the docs. |

### `progress`

Mark a step done or skipped.

| Key | Value | Default | Notes |
|---|---|---|---|
| `op` (needed) | `complete`, `skip` |  | complete or skip. |
| `id` | text |  | The stepId to mark. |

### `recover`

Recover after a wipe (in onWipe / afterWipe).

| Key | Value | Default | Notes |
|---|---|---|---|
| `op` (needed) | `revive`, `evac`, `callGH`, `callHome` |  | revive, evac, callGH or callHome. |
| `limitMs` | a whole number above 0 |  |  |
| `at` | text |  | A revive row. |
