# Changelog

## 0.1.0 - 2026-11-17

The first public version.

- The Creator's modules, opened up: the flowchart engine and its views, plain words for OgreBot zone files, fight
  files and console lines, the ISXJQB instance-file model and checks, snippets, zone-file blocks and checks.
- A page that runs in any browser and, built into one file, as a native Ogre window: open, new, flowchart, words,
  JSON, spots, checks, undo and redo, save.
- Checks for native zone and fight files from a shipped vocabulary (`data/vocabulary.json`): actions, ops, keys with
  their kinds and defaults, conditions, values. Ogre's own shipped zone and fight files check with no error.
- `host/OpenIC.iss`: opens the window in game and runs its buttons: reload zone and fight files, queue and run a zone
  file, start a fight setup; with ISXJQB, run a file or queue a zone; with ISXADD, a route preview.
- The quest-pack lines that run a file from an ISXJQB quest (`TeamRunIC`, `RunIC`).
- Docs for zone files, fight files, pre-buffs and raids, the extensions, and developers; a made-up example zone file
  and fight file.
- Tools: the vocabulary and window builders, and a comment stripper. Tests for all of it, a browser self test, and
  a stand-in for Ogre's window host.
- Not included: the auto solver and the map planner.
