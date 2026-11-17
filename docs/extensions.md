# Extensions

Open IC Creator works on its own in a browser. In game it works with native OgreBot, and does more when ISXJQB or
ISXADD is loaded. The in-game window shows which of them it found.

| | Needed? | What the Creator uses it for |
|---|---|---|
| **ISXOgreX** (native OgreBot's core) | needed in game | The window itself (`ISXOgreX.UI`). |
| **ISXOgreEQ2** (native OgreBot for EverQuest II) | needed in game | Reload zone and fight files, check a file by Ogre's own rules, queue and run a zone file, start a fight setup. It is also what runs the files. |
| **ISXJQB** | optional | Run a file with ISXJQB, queue a zone in ISXJQB, and the quest-pack lines that run an instance from a quest. Opens ISXJQB's own instance files. |
| **ISXADD** | optional | A route preview: the path to a spot, drawn on the Spots view, without moving anyone. |

Nothing in the Creator needs the game to open, edit, check or save a file.

## Native OgreBot (needed in game)

In game, `host/OpenIC.iss` opens the window and does what its buttons ask, with the calls Ogre's developer API
reference documents (https://kannkor.github.io/ISXOgre/EQ2/bot/developer/api/; the script names the section above
each call):

| Button | What runs | Section |
|---|---|---|
| Reload zone files | `ISXOgreEQ2.IC:Reload` (the same as `ogre ic reload`) | isxogreeq2/IC |
| Reload fight files | `ISXOgreEQ2.Encounter:Reload` (the same as `ogre encounter reload`) | isxogreeq2/Encounter |
| Check this file by Ogre's own rules | `ISXOgreEQ2.IC:Validate[<base64>]`, then `${ISXOgreEQ2.IC.Validation}`; for a fight file `ISXOgreEQ2.Encounter:Validate` and `.Validation` | isxogreeq2/IC, isxogreeq2/Encounter |
| Queue this zone file | `ISXOgreEQ2.IC:Queue[add,custom,"<path>"]` | isxogreeq2/IC |
| Run this zone file now | `ISXOgreEQ2.IC:Run[custom,"<path>"]` | isxogreeq2/IC |
| Start the fight setup now | `OgreBotAPI.Bot:SetUpFor[igw:${Me.Name},"<named>",TRUE]` | ogrebotapi/Bot |
| Open | `OgreBotAPI.Util.FileExists`, then `jsonvalue:ParseFile` | ogrebotapi/Util |
| Save | `jsonvalue:WriteFile` (saving in game is new: see below) | not in the reference |

In a browser the same buttons show the console line to type instead.

**Check this file by Ogre's own rules** sends the open file, as it is in the editor, to Ogre's own loader; nothing is
saved or reloaded. Ogre's answer (`ok`, `errors`, `warnings` and each issue with its step) is listed under the
page's own checks; click an issue to pick its step.

The window itself uses `ISXOgreX.UI:Open`, `:Set`, `:Close`, `.Value`, `.Window` and the `OgreUI_Opened` /
`OgreUI_Closed` events (sections isxogrex and events). Once the window is open, the script runs
`ISXOgreX.UI:EvalFile` on `host/OpenIC-assets.js`, the spell and item icon sheets and the ability list.

Other things a creator can use from Ogre (see Ogre's developer docs): `ISXOgreEQ2.IC:Options[...]`,
`${ISXOgreEQ2.IC.Running}`, `ogre ic list`, `ogre ic value`, `-ShowAvailableSetups`, `ISXOgreEQ2.Encounter:Fire["<named>"]`,
and command packs of your own in `Scripts\OgreExternal\<Pack>\EQ2\Commands\commands.json`.

**Saving in game** reads the whole file from the window in one go and writes it with `jsonvalue:WriteFile`. It has
not been tried in game for this release; until it has, save from the browser page, or check the file after a save.
The folder you save into must exist.

## ISXJQB (optional)

ISXJQB is another extension for EverQuest II that runs native zone files as well as its own instance files. When it
is loaded:

- **Run this file with ISXJQB** sends `jb ic rundirect "<path>"`. ISXJQB also has `jb ic goto <step#>`,
  `jb ic stop` and `jb ic status`.
- **Queue the zone in ISXJQB** sends `jb ic queue "<zone>" <difficulty>`.
- **Run it from a quest**: the file panel writes the quest-pack steps that run this file from an ISXJQB quest and
  wait for it:

  ```json
  { "type": "command", "command": "TeamRunIC <file>,90,auto", "description": "Run <zone> with the group", "group": false }
  { "type": "command", "command": "RunIC \"<file>\",90", "description": "Run <zone> (each box on its own run)", "group": false }
  ```

  `TeamRunIC` runs it with the group (a raid file keeps the whole group); `RunIC` has each box run it on its own. In a
  pack they usually follow `GroupUp auto,3600` and come before `WaitForJournalStep "<quest>","<step text>",<seconds>`
  and `CheckZone "<zone>"`. In the console the same run is `jb RunIC <file>,<minutes>`.
- The Creator opens ISXJQB's own instance files (`steps` of `{ "type": ..., "data": ... }`): as a flowchart, in
  words, checked, and editable as text.
- A zone file can carry data only ISXJQB reads in keys that start with `_jb`: Ogre ignores every key that starts
  with `_` in a zone file.
- A script can ask ISXJQB first: `${ISXJQB(exists)}`, `${ISXJQB.Version}`.

ISXJQB runs a native zone file by converting it to its own steps, and not every key is read the same way yet. Try a
file in ISXJQB before you rely on it there.

## ISXADD (optional)

When `${ADD.Ready}` is `TRUE`, **Route preview to the picked spot** sends `u1nav path <x,y,z>` and reads the route
back (`${U1Nav.PointCount}`, `${U1Nav.PointX[n]}`, `.PointY[n]`, `.PointZ[n]`). The Spots view draws it as a dashed
line. Nobody moves. ISXADD uses its own meshes, not Ogre's.

These members come from ISXADD's own help and have not been tried with the Creator in game for this release.

## Lines the script marks unverified

`host/OpenIC.iss` marks with `UNVERIFIED` in a comment what Ogre's developer API reference does not cover and what
was not run in game for this release:

- Saving: one `Value` read of the whole file, then `jsonvalue:SetValue` and `jsonvalue:WriteFile` (LavishScript).
- How much text one `ISXOgreX.UI:Set` carries (opening a large file in game).
- How large a file `ISXOgreX.UI:EvalFile` takes (`host/OpenIC-assets.js` is about 4.8 MB; without it the window has
  the class icons and its own symbols).
- How long a base64 argument the Check line can carry (check a very large file after saving it).
- ISXJQB: `jb ic rundirect`, `jb ic queue`.
- ISXADD: `u1nav path` and the `U1Nav` members.

Please report what works.
