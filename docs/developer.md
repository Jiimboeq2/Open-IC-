# For developers

## The modules

Every module is a plain ES5 script that adds to one namespace, `IC`, on the object it is given as `window`. In a
browser that is the page's `window`; in Ogre's window it is the private object `OpenIC_LIB`.

Loaded by the page (`creator/index.html`, in this order; in `creator/js` unless the path says otherwise):

| File | Namespace | What it does |
|---|---|---|
| `openic-host.js` | `IC.host` | Stand-ins for the page functions the modules call, dialogs, toasts, and the game bridge. |
| `ic-registry.js`, `ic-steps-move.js`, `ic-steps-fight.js`, `ic-steps-wait.js` | `IC.reg` | The step types of ISXJQB instance files. |
| `ic-pack.js` | `IC.pack` | Field codecs, positions, conditions; words for native conditions. |
| `ic-model.js` | `IC.model` | The open ISXJQB instance file: paths, selection, undo. |
| `ic-validate.js` | `IC.val` | Checks for ISXJQB instance files. |
| `ic-words.js` | `IC.words` | Plain words for OgreBot lines, options, for-who words, searches, values. |
| `ic-icons.js` | `IC.icons` | Which icon a box gets: game icon ids, my class's abilities, who does a job. |
| `ic-oc-picker.js` | `IC.oc` | OgreBot console commands: descriptions and checks. |
| `ic-flowview.js`, `ic-flowparts.js`, `ic-flowpal.js` | `IC.fv` | The flowchart engine, its parts and views, its palette. |
| `ic-flow.js` | `IC.icflow` | An ISXJQB instance file as a flowchart graph. |
| `ic-ogf-words.js`, `ic-ogfight-flow.js` | `IC.ogf` | OgreBot fight files in words and as a graph; edits by JSON path. |
| `ic-snippets.js` | `IC.snip` | Snippets: several steps at once, with unique stepIds. |
| `ic-import.js` | `IC.imp` | Zone-file parts and words; zone steps to ISXJQB steps. |
| `ic-nmap.js`, `ic-nmap-enc.js` | `IC.nmap`, `IC.nenc` | Zone-file blocks and checks; fight-file helpers. |
| `openic-vocab.js` | `IC.vocab` | `data/vocabulary.json`, built by `tools/build-vocab.js`. |
| `openic-zone.js` | `IC.oic` | Native files: kind, new files, the zone graph, words, the checks, the palette, file names, quest lines. |
| `openic-app.js` | `IC.app` | The page itself. |
| `openic-icons.js` | `IC.app` | Game pictures: the Pictures menu (on or off, my class, my group), the picture a box or step gets. |
| `openic-game.js` | `IC.app` | The Use in game menu: the console line in a browser, the bridge in game, Ogre's own check. |
| `openic-browse.js` | `IC.app` | In game, the file window of Open and Save as: the folders Ogre and ISXJQB read, their folders and files, New folder. |
| `openic-edit.js` | `IC.app` | Where a file is written: the Steps view and Jump to; the right side's tabs (Add a step by category, This step as a form with who runs it and the who-does-it backup, File settings). |
| `openic-map.js` | `IC.app` | The Map view: spots seen as the game's map shows them, zoom and drag; in game ISXJQB's saved map of my zone under them, floor by floor. |
| `openic-cond.js` | `IC.app` | When and who, at the top of This step: who does it, Only if (a step's `when`: all or any, `not`, presets and every condition), Repeat (a `repeat` block: times, until, while). |
| `openic-test.js` | `IC.app` | Test in game: the picked steps as a zone file of their own, run, watched, then switched off; a fight file's setup. |
| `creator/data/spell-icons.js` | `IC.iconData` | The ability list: name, icon, backdrop, classes (built by `tools/build-icon-data.js`). |
| `creator/data/item-icons.js` | `IC.iconData` | Item names to their pictures in `creator/assets/item_atlases`. |
| `openic-selftest.js` | `IC.app.selftest` | The self test (`index.html#selftest`). |

In the repository but not loaded by the page (they need a host page that is not ported yet, or ISXJQB's own files):
`ic-ui-core.js`, `ic-ui-form.js`, `ic-ui-list.js`, `ic-ui-picker.js`, `ic-ui-timeline.js`, `ic-panels.js`, `ic-io.js`,
`ic-extras.js`, `ic-flow-ui.js`, `ic-import-ui.js`, `ic-more.js`, `ic-catch.js`. They are the
full step-form editor for ISXJQB instance files (generated forms, the add-step picker, the timeline, the import
dialog) and expect that editor's page layout. Item pictures come from the item sheets in `creator/assets/item_atlases`:
the page makes no network calls.

## Game icons

The icons are EverQuest II's own art (Daybreak Game Company), included for display in the editor:

| Files | What they are |
|---|---|
| `creator/assets/spell_atlases/atlas-1.png` ... `atlas-34.png` | The spell icon sheets: 256 x 256 px, 6 x 6 cells of 42 px. |
| `creator/assets/class_icons/<Class>.webp` | The 26 class icons (70 x 70 px). |
| `creator/assets/item_atlases/atlas-1.png` ... `atlas-4.png` | Item pictures, cut into sheets of the same layout. |
| `creator/data/spell-icons.js` | The ability list: one line per ability (name, icon id, backdrop tile, classes). |
| `creator/data/item-icons.js` | Item names (lower case) to their cell in the item sheets. |
| `creator/css/openic-icons.css` | One class per sheet (`oic-sp-<n>`, `oic-it-<n>`) that names its picture. |

Icon id `n` is on sheet `floor(n / 36) + 1`, in cell `n % 36`: column `cell % 6`, row `floor(cell / 6)`
(`IC.host.cell(n)`). The page's `invItemIcon(item, px, spell)` draws one cell at any size; a spell icon sits on its
backdrop tile (ids 312 to 318, sheet 9). `jbClassIcon(class, px)` draws a class icon.

Which picture a box gets is `IC.icons`' rule (`ic-icons.js`), fed by `openic-icons.js`: `abilPair` (an ability's
icon and backdrop), `abilClasses` (who has it), `itemPair`, `myClass`, `groupClasses`, `canClass` and `dets`. An
ability of my class shows its own icon; an ability of another class shows that class's icon (tooltip
`Who: <Class>`); with no class picked every ability shows its own icon; boxes never get detriment icons
(`dets` is false). The Pictures menu keeps my class and my group in the browser's local storage (`openic.myClass`,
`openic.groupClasses`), and pictures on or off in `openic.abicons`.

In game, the window (`host/OpenIC.html`) carries the class icons inline as data URIs. The two lists (part 1) and the
spell and item sheets as data URIs (the other parts, a style element each) are in `host/OpenIC-assets-<k>.js`, each
under 900 KB: one `ISXOgreX.UI:EvalFile` is one message to Ogre's UI process, and a message over its limit is dropped
whole (a single 4.8 MB pack never arrived; 4 MB did). `OpenIC.iss` runs part 1 once the window is open; each part
reports `<k>/<n>` in the window's `openic-assets-got` field, and the script sends the next one only then (20 s without
a word and it stops). The last part calls `IC.app.iconsLoaded()`, which redraws. Until then, and if they never
arrive, the window draws the class icons and its own symbols.

## The flowchart graph

`IC.fv.render(host, graph, opts)` draws a graph into any element and returns a handle (`fit`, `zoom`, `reveal`,
`update`, `mode`).

```
graph  = { lanes: [lane], links: [{ from, to, label }], parts?, split?, chain? }
lane   = { id, title, sub, role, seq, items: [item] }
item   = node   { t: 'n', id, ref, role, icon, title, sub, tags: [{ t, role }], ix, iy,
                  sel, err, warn, small, fixed, noActs, nodrag, noSlot, noSlotAfter, tog: { key, open, count } }
       | if     { t: 'if', id, node, yes: branch, no: branch }
       | loop   { t: 'loop', id, node, body: branch, doneLabel }
       | group  { t: 'grp', id, node, open, seq, items }
branch = { label, role, seq, items }
roles  = action move cond loop alt state start end sec note
```

`seq` is the host's handle for "a list you can insert into" (the Creator uses a JSON path such as `'["steps"]'`);
`ix` / `iy` are the first and last index in that list a box stands for, so a + lands at the file's own index.

Options: `onSelect(ref)`, `onInsert(seq, index)`, `onAct(act, ref, node)` (`up`, `down`, `dup`, `del`),
`onMove(ref, seq, index, node)`, `onDropNew(key, seq, index)`, `onPick(key, slot)`, `onToggle(key)`, `onView(view)`,
`onMode()`, `palette: [{ key, label, role, icon, more }]`, `view` (kept by the host between draws), `foldTools`,
`palFold`, `legendRoles`, `emptyText`, and `gameIcon(gi, px)`, `abilIcon(name)`, `iconById(id, back)` and
`onAbIcons(on)` when the host has game icons.

`graph.parts` with `graph.split` (one lane per part) gives the Overview, One part and Side by side views.

## The page functions the modules call

`openic-host.js` provides: `sendCommand`, `requestFileWith`, `requestDirWith`, `lazyLoadJS`, `colToast`, `jbAlert`,
`jbConfirm`, `jbPrompt`, `invItemIcon`, `jbClassIcon`, `escHtml`, `escJs`, `unescJs`, `jbTipAttr`, `jbDispName`,
`_getPos`, `_getTarget`, `jbDropdown`, `jbVal`, `jbSetVal`, `jbSetOptions`. In a browser they are page globals; in
Ogre's window each module receives them as parameters (`tools/build-window.js`), so nothing is added to the page
Ogre's windows share.

## The game bridge

Page to script: the page sets hidden fields `openic-arg-<name>` with `ogreUISet('openic', id, value)`, then calls
`ogreCall('cmd', 'Event[OpenIC_<Action>]:Execute')`. Actions: `Hello`, `Reload`, `Check`, `Open`, `Save`, `Queue`,
`Run`, `SetUp`, `JbRun`, `JbQueue`, `Route`, `List`, `MkDir`, `Map`, `Verify` (Ask Ogre by a reload: `tier`, `path`,
`zone`), `Test` (`path` of the saved test file), `TestStop`, `FightTest` (`named`). Fields: `kind`, `path`, `text` (the file's JSON
in one line, for `Save`), `tier` (`default` or `custom`, for `Check`), `root` and `name` (the file window's folder and
a new folder's name, for `List` and `MkDir`; for `Map`, `kind` is `zone` or `art` and `name` a zone token or a floor
key), `named`, `zone`, `variant`, `loc`.

Script to page: `ISXOgreX.UI:Set[openic,openic-msg-<channel>,"<n>|<text>"]`, which fires the field's change event.
Channels: `ext` (which extensions are loaded, and `check` / `fcheck`: whether this Ogre has its own file check),
`me` (`x,y,z|zone|target|class|zone short name`), `file` (an opened file's JSON), `say` (`ok:` / `warn:` / `err:` and
a message), `route` (`x,y,z;x,y,z;...`), `check` (Ogre's `Validation` JSON: `ok`, `errors`, `warnings`, `issues`),
`list` (one folder: `<root>|<path>|<1 = there>` then `>D|<folder>` and `>F|<file>|<bytes>`; a Windows name holds
neither `|` nor `>`), `map` (`<kind>|<name>|1` when the file ran in the page, `|0` when ISXJQB has none), `verify`
(one line a message: `begin|<tier>/<path>`, `s|` Ogre's count line, `l|` a loaded file that claims the zone, `p|` a
line of Ogre's log about this file, `nolog|`, `end|`), `test` (`out|` what Ogre printed, `state|` and
`end|<RunState>|<Verdict>|<Note>`, `fight|` and `fightend|<IsActive>`). Ogre's printed lines carry colour codes (BEL
and a letter), which the page takes out.

Ask Ogre with an Ogre that has no `Validate`: `IC:Reload` prints only its count line on the console (`redirect`
catches it); the line for each problem goes to Ogre's log, `x64\Extensions\ISXDK35\ISXOgreEQ2.<session>.log`, as
`<tier>/<path>: <message>` (steps counted from 1), so the script notes the log's size before the reload and reads from
there (`file:Seek`). `IC:List[<zone>]` prints the loaded files that claim the zone. `IC:Check` is not used: it also
starts Ogre's zone-reset flow, which opens the game's zone reset window to read the timers.

The chart scrolls the native way. Ogre's windows are drawn by Ultralight, where the wheel did not reach the page's own
handler; so the canvas sits in a scroll layer (`.fv-scroll`, kept away from its edges and a little larger than the
chart so its bars are clipped) and every native scroll is folded into the chart's own view (`scrolled` in
`ic-flowview.js`). Ctrl+wheel zooms where the wheel does reach the page; the - and + buttons always do.

ISXJQB's saved map: its JB Map writes `Scripts\Eq2JCommon\JB\Data\jqbmap_zone_<zone>.js` (it sets
`window.__jqbmapZone`: the zone's `floors`, each with a `key`, its edges `min_x` / `max_x` / `min_z` / `max_z`, a
height band `hmin` / `hmax`, an `avail` rect and a `prio`, and `exits`) and `jqbmap_art_<floor key>.js` (it sets
`window.__jqbmapArt[<key>]` to a JPEG or PNG data URI). `<zone>` is the zone's short name kept to `a-z 0-9 _ -` in
lower case (ISXJQB's `ZoneToken`). `Map` runs one of them in the page with `ISXOgreX.UI:EvalFile`, after checking it
is there; the page waits for the value (5 s at most) and asks for the next. A picture's left edge is `max_x`, its
right edge `min_x`, its top `min_z`: the game's map has x growing to the left. A spot is on the floor whose height
band and rect hold it, the highest `prio` winning, as ISXJQB's own map picks it.

The file window's folders (`root`), inside InnerSpace's Scripts folder: `zone` OgreSave\EQ2\IC\custom, `fight`
OgreSave\EQ2\Encounters\custom, `ozone` Ogre\EQ2\IC\default and `ofight` Ogre\EQ2\Encounters\default (Ogre's own:
read only, never written, no New folder), `jb` Eq2JCommon\JB\Instances. The script lists with LavishScript's
`filelist` (`GetDirectories["<folder>/\*"]`, `GetFiles["<folder>/\*.json"]`) and makes folders with
`filepath:MakeSubdirectory`. Two LavishScript traps, both met here: a slash and a star together start a comment even
inside quotes (so `/\*`), and a function's variables are set up when it starts (a `filepath` declared below a line
that changes its path keeps the old path: `OpenIC.DirThere` takes the finished path as an argument).

Big text crosses in pieces. A field's value reaches the game whole, but the LavishScript command that uses it
carries every character, and one command of 33 KB took a game client down. So no command carries more than
`OpenIC_Piece` (6,000) characters of a file: the script sends `file` and `check` as `<k>/<n>|<piece>`, which the page
joins (`IC.host.PIECED`), and `Save` reads the window's text with `.Mid[...]` and writes it with LavishScript's
`file:Write`, piece by piece, then reads the file back before it says saved.

Ogre's own check (`ISXOgreEQ2.IC:Validate` / `ISXOgreEQ2.Encounter:Validate`) is newer than some Ogres, and calling a
method an extension does not have ends the script that calls it. The script reads `Validation(exists)` first, tells
the page (`check` / `fcheck` in `ext`), and calls nothing without it.

`host/OpenIC.iss` notes above each Ogre call the section of Ogre's developer API reference that documents it
(`API: ...`), marks `UNVERIFIED` what that reference does not cover, and `PROVEN` (with the date and what it did)
what was run in game.

`tests/test-bridge.js` checks that the page and `host/OpenIC.iss` agree on all of these.

## Building

| Command | What it does |
|---|---|
| `node tools/build-vocab.js` | `data/vocabulary.json` to `creator/js/openic-vocab.js`. |
| `node tools/build-icon-data.js [--spells <list>]` | `creator/css/openic-icons.css`; with `--spells`, `creator/data/spell-icons.js` from a tab-separated ability list. |
| `node tools/build-window.js` | `creator/` to `host/OpenIC.html`, the in-game window, and `host/OpenIC-assets-<k>.js`, its icon sheets and lists in parts of under 900 KB. Run it after any change in `creator/`. |
| `node tools/strip-comments.js <in.js> [out.js]` | Removes comments from a JavaScript file (literals stay as they are). |

## Tests

| Command | What it checks |
|---|---|
| `node tests/run-all.js` | Everything below that needs only Node. |
| `node tests/test-strip.js` | The comment stripper, and that each module has only its header comment. |
| `node tests/test-engine.js` | The modules without a page: kinds, graphs, words, checks, palettes, quest lines. |
| `node tests/test-edit.js` | Who runs a step in words; who-words Ogre does not have; ISXJQB mechanics files; the op picker's words; ISXJQB's map files, floors and the floor a spot is on. |
| `node tests/test-icons.js` | The icon files are all there; the cell math; my class's ability shows its cell, another class's its class icon, no detriment icon. |
| `node tests/test-bridge.js` | The page and `host/OpenIC.iss` agree; Ogre's calls cite the API reference; the window is self-contained. |
| `node tests/test-repo.js` | Built files are up to date; ASCII; the game art notice; no private paths; no planner. |
| `node tests/test-corpus.js --scripts "<InnerSpace>\Scripts"` | Every zone and fight file Ogre ships: read, drawn, checked with no error. |
| `node tests/browser-selftest.js` | The page's self test in headless Edge or Chrome (Node 22 or newer). |
| `node tests/fake-ogre.js out.html` then `node tests/browser-selftest.js --page out.html` | The in-game window in a stand-in for Ogre's host. |
