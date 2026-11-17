# For developers

## The modules

Every module is a plain ES5 script that adds to one namespace, `IC`, on the object it is given as `window`. In a
browser that is the page's `window`; in Ogre's window it is the private object `OpenIC_LIB`.

Loaded by the page (`creator/index.html`, in this order):

| File | Namespace | What it does |
|---|---|---|
| `openic-host.js` | `IC.host` | Stand-ins for the page functions the modules call, dialogs, toasts, and the game bridge. |
| `ic-registry.js`, `ic-steps-move.js`, `ic-steps-fight.js`, `ic-steps-wait.js` | `IC.reg` | The step types of ISXJQB instance files. |
| `ic-pack.js` | `IC.pack` | Field codecs, positions, conditions; words for native conditions. |
| `ic-model.js` | `IC.model` | The open ISXJQB instance file: paths, selection, undo. |
| `ic-validate.js` | `IC.val` | Checks for ISXJQB instance files. |
| `ic-words.js` | `IC.words` | Plain words for OgreBot lines, options, for-who words, searches, values. |
| `ic-icons.js` | `IC.icons` | Which icon a box gets (game icon ids; the page shows glyphs instead). |
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
| `openic-selftest.js` | `IC.app.selftest` | The self test (`index.html#selftest`). |

In the repository but not loaded by the page (they need a host page that is not ported yet, or ISXJQB's own files):
`ic-ui-core.js`, `ic-ui-form.js`, `ic-ui-list.js`, `ic-ui-picker.js`, `ic-ui-timeline.js`, `ic-panels.js`, `ic-io.js`,
`ic-extras.js`, `ic-flow-ui.js`, `ic-import-ui.js`, `ic-more.js`, `ic-catch.js`. They are the
full step-form editor for ISXJQB instance files (generated forms, the add-step picker, the timeline, the import
dialog) and expect that editor's page layout. Item pictures are not included: the page makes no network calls.

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
`palFold`, `legendRoles`, `emptyText`, and `gameIcon(gi, px)` / `abilIcon(name)` when the host has game icons.

`graph.parts` with `graph.split` (one lane per part) gives the Overview, One part and Side by side views.

## The page functions the modules call

`openic-host.js` provides: `sendCommand`, `requestFileWith`, `requestDirWith`, `lazyLoadJS`, `colToast`, `jbAlert`,
`jbConfirm`, `jbPrompt`, `invItemIcon`, `jbClassIcon`, `escHtml`, `escJs`, `unescJs`, `jbTipAttr`, `jbDispName`,
`_getPos`, `_getTarget`, `jbDropdown`, `jbVal`, `jbSetVal`, `jbSetOptions`. In a browser they are page globals; in
Ogre's window each module receives them as parameters (`tools/build-window.js`), so nothing is added to the page
Ogre's windows share.

## The game bridge

Page to script: the page sets hidden fields `openic-arg-<name>` with `ogreUISet('openic', id, value)`, then calls
`ogreCall('cmd', 'Event[OpenIC_<Action>]:Execute')`. Actions: `Hello`, `Reload`, `Open`, `Save`, `Queue`, `Run`,
`SetUp`, `JbRun`, `JbQueue`, `Route`. Fields: `kind`, `path`, `text`, `named`, `zone`, `variant`, `loc`.

Script to page: `ISXOgreX.UI:Set[openic,openic-msg-<channel>,"<n>|<text>"]`, which fires the field's change event.
Channels: `ext` (which extensions are loaded), `me` (`x,y,z|zone|target`), `file` (an opened file's JSON), `say`
(`ok:` / `warn:` / `err:` and a message), `route` (`x,y,z;x,y,z;...`).

`tests/test-bridge.js` checks that the page and `host/OpenIC.iss` agree on all of these.

## Building

| Command | What it does |
|---|---|
| `node tools/build-vocab.js` | `data/vocabulary.json` to `creator/js/openic-vocab.js`. |
| `node tools/build-window.js` | `creator/` to `host/OpenIC.html`, the in-game window. Run it after any change in `creator/`. |
| `node tools/strip-comments.js <in.js> [out.js]` | Removes comments from a JavaScript file (literals stay as they are). |

## Tests

| Command | What it checks |
|---|---|
| `node tests/run-all.js` | Everything below that needs only Node. |
| `node tests/test-strip.js` | The comment stripper, and that each module has only its header comment. |
| `node tests/test-engine.js` | The modules without a page: kinds, graphs, words, checks, palettes, quest lines. |
| `node tests/test-bridge.js` | The page and `host/OpenIC.iss` agree; the window is self-contained. |
| `node tests/test-repo.js` | Built files are up to date; ASCII; no private paths; no planner. |
| `node tests/test-corpus.js --scripts "<InnerSpace>\Scripts"` | Every zone and fight file Ogre ships: read, drawn, checked with no error. |
| `node tests/browser-selftest.js` | The page's self test in headless Edge or Chrome (Node 22 or newer). |
| `node tests/fake-ogre.js out.html` then `node tests/browser-selftest.js --page out.html` | The in-game window in a stand-in for Ogre's host. |
