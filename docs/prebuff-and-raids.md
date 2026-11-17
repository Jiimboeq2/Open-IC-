# Pre-buffs and raids

How native OgreBot files express "buff up before the pull" and raid-sized groups, and what is not settled yet.

## Buffing up before a named

### 1. On the `named` step (the built-in way)

The zone file's `named` step gives the group time to buff before it pulls:

| Key | Default | What it does |
|---|---|---|
| `prebuffMs` | `10000` | How long to let the group buff up first. `0` for no buff-up. |
| `preCastTagMs` | not documented | The time for the pre-cast tag before the pull. Test its default before you rely on it. |

There is no separate "buff up" step in zone files. Ogre's shipped files leave both keys out and get the 10 second
default.

### 2. Casts just before the named

Put cast steps right before the `named` step. Name them under the named so Skip the boss and named # keep them:

```json
{ "stepId": "named2.ward", "do": "castAbility", "ability": "Tortoise Shell", "sendTo": "igw:{{me}}" },
{ "stepId": "named2", "do": "named", "name": "The Hollow Regent", "boss": true }
```

### 3. The fight file's own setup, started early

A fight file's `setup` runs on every box when its setup starts (per-class casts, cast-stack changes, camp spots).
To have it run before the pull, a zone-file step starts it by hand:

```json
{ "stepId": "named2.setup", "do": "raw", "command": "oc !ci -SetUpFor igw:{{me}} \"The Hollow Regent\"" }
```

Setup steps that buff, from shipped fight files:

```json
{ "do": "castAbility", "forwho": "guardian", "ability": "Focus Offensive" }
{ "do": "castStack", "op": "set", "match": "entry", "forwho": "all", "ability": "Absorb magic", "value": false }
```

### 4. Cast-stack tags

- In a fight file: `{ "do": "castStack", "op": "set", "match": "tag", "forwho": "enchanter", "ability": "<tag>", "value": true }`
  turns the rows with that tag on (`match: "entry"` matches one row by its ability instead).
- From the console: `-AbilityTag` is another name for `-AbilityTagEmbargo` (`who tag seconds type args`). With the
  type `Allow`, the tagged abilities may fire only while the tag is on, and **Enable Tag Allow** must be ticked on
  each box, or nothing fires. A zone file can tick it with an `ogreBotUIOption` step.

### 5. Wait until someone has it ready

Ask the group in a loop, then let the first box with a yes cast it (`groupQuery` runs in zone files only):

```json
{ "stepId": "ward.ask", "repeat": { "until": { "varEquals": { "scope": "encounter", "name": "ward.anyYes", "value": "TRUE" } }, "max": 30 },
  "steps": [
    { "stepId": "ward.ask.q", "do": "groupQuery", "var": "ward", "question": "abilityReady", "ability": "Bladedance" },
    { "stepId": "ward.ask.gap", "wait": "ms", "limitMs": 2000, "onTimeout": "proceed" } ] },
{ "stepId": "ward.cast", "forEach": { "vars": { "prefix": "ward.yes.", "groupMember": true }, "as": "caster", "max": 1 },
  "steps": [ { "stepId": "ward.cast.one", "do": "castAbility", "ability": "Bladedance", "sendTo": "{{seq.caster.name}}" } ] }
```

The Creator has this as the snippet "Wait until someone's ability is ready".

### Not pre-buffs

- OgreBot's Pre-Cast tab: "cast this before that ability", during a fight.
- `-Rebuff`: it cancels buffs.
- `checkbox_autohunt_prebuff`: Auto-Hunt only.

## Raids

### Zone files

- None of Ogre's shipped zone files is for a raid, and none uses `irw:` or `{{ic.group.mode}}`.
- The docs say a run moves the whole group. **Whether IC moves a whole raid is not documented: test it before you
  rely on it.**
- A file can still check the mode: `"when": [{ "textEquals": { "text": "{{ic.group.mode}}", "value": "raid" } }]`.
- A raid zone is just a variant string, as the game writes it: `[Raid]`, `[Challenge Raid]`, `[X2 Raid]` ... There is
  no x4 tier.

### Fight files

Raid mechanics live in fight files. Ogre ships about 380 raid fight files. The tools they use:

- **Who** words for raid groups: `groups:1` to `groups:4`, several at once (`groups:12`, `groups:34`), and with a role
  (`fighter+groups:1`, `enchanter+groups:34`); the whole raid (`irw:{{me}}`); preferred members (`@Priest1`,
  `@Scout1`, `@Mage1`, `@Healer1`); flagged boxes (`ToonFlagged:1`); teams (`*Team:<name>`).
- **Per-group spots**: one camp spot per raid group, for example
  `{ "do": "campSpot", "op": "setLoc", "forwho": "fighter+groups:1", "loc": [x, y, z] }` and the same for `groups:2`.
- `spotTables` (lists of spots per role), the condition `raidSlot`, `report` (`in` / `complete` / `start`), `roster`,
  `rosterPick`, `flagToon` with `nextPerson` (pass a job along), `rosterOrder`.
- Variables with `"scope": "raid"`.
- From the console: `-CS_Set_Formation_MonkeyInMiddleRaid`.

In the Creator these are ordinary steps and for-who words: it reads, draws and checks them, and passes every
for-who word through as written.
