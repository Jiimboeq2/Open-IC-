---
title: Open IC Creator
---
Make and edit OgreBot zone files (the instance controller) and fight files, see them as a flowchart and in plain words, and check them before Ogre reads them.

### Files
- **New zone file** and **New fight file** start a file; **Open** reads one from the custom folders.
- **Save** writes the file through the script. A zone file goes in `Scripts\OgreSave\EQ2\IC\custom`, a fight file in `Scripts\OgreSave\EQ2\Encounters\custom`. Nothing is written under `Scripts\Ogre`.
- Save writes the file, reads it back to be sure it is whole, then says saved. The folder must already exist.

### Views
- **Flowchart** - click a box to pick it, drag a box onto a + to move it, click a chip at the bottom to add a step.
- **Words** - every step in plain words.
- **JSON** - the whole file as text: edit it, then **Apply**.
- **Spots** - every spot the file names, seen from above, with you on it.

### Icons
- **Class** - pick your class, and the classes in your group if you like. Your class's abilities show their own icon; an ability of another class shows that class's icon (its tooltip says who). Until you pick one, the class you play counts.
- **Ability icons** (above the flowchart) turns the icons off.
- The icons are EverQuest II's own art. The spell and item sheets load a moment after the window opens.

### The right side
- With nothing picked: the file's settings (zone, variants, entrance) and the lines that run it from an ISXJQB quest.
- With a step picked: its words, its problems, its text (edit, then **Apply**), the keys it can have, and **Here** / **My target** buttons.

### In game menu
- **Reload** zone or fight files in Ogre: the console lists every problem Ogre finds.
- **Check this file by Ogre's own rules** - Ogre checks the file as saved (save it first) and its answer is listed with the checks. It is off when the Ogre loaded has no file check yet: **Reload** lists the problems then.
- **Queue** or **Run** the zone file (it must be saved in the custom folder first).
- **ISXJQB** (when loaded) - run the file with `jb ic rundirect`, or queue the zone.
- **ISXADD** (when loaded) - a route preview to the picked spot, drawn on the Spots view.
