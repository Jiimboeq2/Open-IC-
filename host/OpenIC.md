---
title: Open IC Creator
---
Make and change OgreBot's two kinds of file, see them as boxes and in plain English, and find what would stop Ogre loading them.

- A **zone file** is a whole run through one zone: walk, fight the nameds, loot, leave. Ogre's Instance Controller runs it step by step.
- A **fight file** is what the group does during one named's fight. Ogre starts it by itself when that named is in range.

### Files
- **New** - start a zone file or a fight file.
- **Open** - a file window: pick a folder at the top (My zone files, My fight files, Ogre's zone files, Ogre's fight files, ISXJQB instance files), click a folder to go in, click a file to open it.
- **Save** - writes the file back where it came from, reads it back to be sure it is whole, then says saved.
- **Save as** - the same file window: pick the folder (**New folder** makes one), type the name, **Save here**.
- Ogre's own files are read only (Ogre's updates replace them). Open one, change it, and **Save as** puts your copy in your own folder. A fight file at the same path in My fight files is laid over Ogre's.

### The four views
- **Chart** - the steps as boxes, in the order they run. Click a box to change it; drag one onto a + to move it; click a chip at the bottom to add a step.
- **Plain English** - every step written out as a sentence.
- **File text** - the file exactly as Ogre reads it. Change it, then **Apply**.
- **Map** - every spot the file walks to, seen from above. The square is you.

### Buttons on the right of the bar
- **Problems** - what would stop Ogre loading the file. Click it for the list under the chart; click a line to jump to its step.
- **Use in game** - reload your files in Ogre, run or queue this zone file, start a fight's setup; the ISXJQB and ISXADD extras when they are loaded.
- **Icons** - whose ability icons to show. Your class's abilities show their own icon; another class's show that class's icon (hover it: it says who). Until you pick, the class you play counts.

### The right side
- With nothing picked: the file's settings (zone, difficulty, entrance) and the lines that run it from an ISXJQB quest.
- With a step picked: what it does, its problems, its text (change it, then **Apply**), the settings it can have, and **Here** / **My target** to fill a spot or a name from the game.

### Use in game
- **Reload** zone or fight files in Ogre: the console lists every problem Ogre finds.
- **Check this file by Ogre's own rules** - Ogre checks the file as saved. It is off when the Ogre loaded has no file check yet: **Reload** lists the problems then.
- **Queue** or **Run** the zone file (save it in My zone files first).
- **ISXJQB** (when loaded) - run the file with `jb ic rundirect`, or queue the zone.
- **ISXADD** (when loaded) - a route preview to the picked spot, drawn on the Map.
