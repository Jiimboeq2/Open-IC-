# Extensions

Open IC Creator works on its own in a browser. In game it works with native OgreBot, and does more when ISXJQB or
ISXADD is loaded. The in-game window shows which of them it found.

| | Needed? | What the Creator uses it for |
|---|---|---|
| **ISXOgreX** (native OgreBot's core) | needed in game | The window itself (`ISXOgreX.UI`). |
| **ISXOgreEQ2** (native OgreBot for EverQuest II) | needed in game | Reload zone and fight files, check a file by Ogre's own rules (an Ogre that has that check), queue and run a zone file, start a fight setup. It is also what runs the files. |
| **ISXJQB** | optional | Run a file with ISXJQB, queue a zone in ISXJQB, and the quest-pack lines that run an instance from a quest. Opens ISXJQB's own instance files. |
| **ISXADD** | optional | A route preview: the path to a spot, drawn on the Map, without moving anyone. |

Nothing in the Creator needs the game to open, edit, check or save a file.

## Native OgreBot (needed in game)

In game, `host/OpenIC.iss` opens the window and does what its buttons ask, with the calls Ogre's developer API
reference documents (https://kannkor.github.io/ISXOgre/EQ2/bot/developer/api/; the script names the section above
each call):

| Button | What runs | Section |
|---|---|---|
| Reload zone files | `ISXOgreEQ2.IC:Reload` (the same as `ogre ic reload`) | isxogreeq2/IC |
| Reload fight files | `ISXOgreEQ2.Encounter:Reload` (the same as `ogre encounter reload`) | isxogreeq2/Encounter |
| Check this file by Ogre's own rules | `ISXOgreEQ2.IC:Validate[<tier>,"<path>"]` on the saved file, then `${ISXOgreEQ2.IC.Validation}`; for a fight file `ISXOgreEQ2.Encounter:Validate` and `.Validation`; only when the Ogre loaded has `Validation` | isxogreeq2/IC, isxogreeq2/Encounter |
| Queue this zone file | `ISXOgreEQ2.IC:Queue[add,custom,"<path>"]` | isxogreeq2/IC |
| Run this zone file now | `ISXOgreEQ2.IC:Run[custom,"<path>"]` | isxogreeq2/IC |
| Start the fight setup now | `OgreBotAPI.Bot:SetUpFor[igw:${Me.Name},"<named>",TRUE]` | ogrebotapi/Bot |
| Open | `OgreBotAPI.Util.FileExists`, then `jsonvalue:ParseFile`; the file comes to the window in pieces | ogrebotapi/Util |
| Save | LavishScript's `file:Write`, in pieces, then `jsonvalue:ParseFile` (read back) and `jsonvalue:WriteFile` (multi-line); see below | not in the reference |

In a browser the same buttons show the console line to type instead.

**Check this file by Ogre's own rules** has Ogre check the file as saved: save it in the custom folder first (a file
opened from Ogre's own default folder is checked there as it is). Nothing is reloaded. Ogre's answer (`ok`, `errors`,
`warnings` and each issue with its step) is listed under the page's own checks; click an issue to pick its step.
Not every Ogre has this check: the ISXOgreEQ2 of 2026-11-16 has neither `Validate` nor `Validation`, and calling a
method Ogre does not have ends the script that calls it. The script asks first (`Validation(exists)`); without it the
menu item is off and says so, and **Reload** lists the problems instead. Its other form, the file's JSON as one
base64 argument, is not used: for a zone file that is one command of 30 KB and more.

The window itself uses `ISXOgreX.UI:Open`, `:Set`, `:Close`, `.Value`, `.Window` and the `OgreUI_Opened` /
`OgreUI_Closed` events (sections isxogrex and events). Once the window is open, the script runs
`ISXOgreX.UI:EvalFile` on `host/OpenIC-assets-1.js`, `-2.js` ..., one part at a time (each under 900 KB), the ability
and item lists and the spell and item icon sheets.

Other things a creator can use from Ogre (see Ogre's developer docs): `ISXOgreEQ2.IC:Options[...]`,
`${ISXOgreEQ2.IC.Running}`, `ogre ic list`, `ogre ic value`, `-ShowAvailableSetups`, `ISXOgreEQ2.Encounter:Fire["<named>"]`,
and command packs of your own in `Scripts\OgreExternal\<Pack>\EQ2\Commands\commands.json`.

**Saving in game** writes the file in pieces of 6,000 characters with LavishScript's `file:Write` (one command never
carries a whole file), reads it back to be sure it is whole, then writes it again in multi-line form. The folder you
save into must exist.

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
- **Its saved zone maps under the Map view.** ISXJQB's JB Map saves a zone's floors and their pictures the first time
  it is open in that zone (`Scripts\Eq2JCommon\JB\Data\jqbmap_zone_<zone>.js` and `jqbmap_art_<floor>.js`). In game,
  the Map view asks the script for the zone you stand in, by its short name, and lays the picture of your floor under
  the file's spots; another floor is a click away. The script only reads those files, and only by a name that stays
  in that folder. For a zone with no saved map the view says to open JB Map there once (`jb map`). This works from
  the files on disk: the window does not need ISXJQB loaded at that moment.

ISXJQB runs a native zone file by converting it to its own steps, and not every key is read the same way yet. Try a
file in ISXJQB before you rely on it there.

## ISXADD (optional)

When `${ADD.Ready}` is `TRUE`, **Route preview to the picked spot** sends `u1nav path <x,y,z>` and reads the route
back (`${U1Nav.PointCount}`, `${U1Nav.PointX[n]}`, `.PointY[n]`, `.PointZ[n]`). The Map draws it as a dashed
line. Nobody moves. ISXADD uses its own meshes, not Ogre's.

These members come from ISXADD's own help and have not been tried with the Creator in game for this release.

## Tried in game

On 2026-11-17, with the ISXOgreEQ2 and ISXOgreX of 2026-11-16 (`host/OpenIC.iss` marks these lines `PROVEN`):

- The window opens with `run OpenIC/host/OpenIC`; the page and the script talk both ways (the extensions, where you
  stand, your class).
- The 7 icon parts arrive in turn (34 spell sheets, 4 item sheets, the ability list). `ISXOgreX.UI:EvalFile` ran files
  of 256 KB to 4 MB; a single 4.8 MB pack never arrived ("to-exe ring full ... DROPPED" in `ISXOgreUIHost.log`).
- **Open**: a 46 KB zone file came to the editor whole, in 5 pieces.
- **Save**: the same file went out in 5 pieces and read back equal as data, its text with `${Me.Name}`, quotes, a
  backslash, brackets, braces and a semicolon unchanged.
- **Check**: that Ogre has no `Validate`: `IC.Validation(exists)` read FALSE, the script went on, and nothing was
  called.
- **The file window** (0.3.0): My zone files listed its folders, a folder its files (a folder name with an
  apostrophe too), Ogre's fight files their 18 expansion folders; a click on a file opened it; Save as with **New
  folder** made the folder and saved into it, and the file read back.
- **Buttons after the window is closed and opened again** (0.2.2): a click on Plain English switched the view and New
  opened its question, both before and after a close and open.

Two lessons for anyone extending the script: one LavishScript command carrying 33 KB took a game client down, so keep
any text in a command to a few KB; and calling a method an extension does not have ends the script that calls it.

## Lines the script marks unverified

`host/OpenIC.iss` marks with `UNVERIFIED` in a comment what Ogre's developer API reference does not cover and what
was not run in game for this release:

- ISXJQB: `jb ic rundirect`, `jb ic queue` (their forms are ISXJQB's own usage lines).
- ISXADD: `u1nav path` and the `U1Nav` members.
- The Map's ISXJQB maps (`OpenIC_OnMap`) and the zone's short name it uses (`${Zone.ShortName}`, which Ogre's own
  OgreEffectTracker.iss reads): written when no game client was up. The page's side is driven by the stand-in for
  Ogre (`tests/fake-ogre.js`); the script's side runs only calls proven elsewhere in it (`filepath:FileExists`,
  `ISXOgreX.UI:EvalFile`).

Ogre's `ISXOgreEQ2.IC:Run`, `ISXOgreEQ2.IC:Queue` and `OgreBotAPI.Bot:SetUpFor` are documented and that Ogre has them,
but they start runs and setups, so they were not run for this release. Please report what works.
