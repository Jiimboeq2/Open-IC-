---
title: Open IC Creator
---
Write and change OgreBot's two kinds of file: every step in plain words, any step changed in a form, and what would stop Ogre loading the file.

- A **zone file** is a whole run through one zone: walk, fight the nameds, loot, leave. Ogre's Instance Controller runs it step by step on one box, the IC character; the walks, the nameds, the loot, the teleporters and the way out take the group along.
- A **fight file** is what the group does during one named's fight. Every box that has it runs it, each for itself; Ogre starts it when that named is in range.

### Files
- **New** - start a zone file or a fight file.
- **Open** - a file window: pick a folder at the top (My zone files, My fight files, Ogre's zone files, Ogre's fight files, ISXJQB instance files), click a folder to go in, click a file to open it.
- **Save** - writes the file back where it came from, reads it back to be sure it is whole, then says saved.
- **Save as** - the same file window: pick the folder (**New folder** makes one), type the name, **Save here**.
- Ogre's own files are read only (Ogre's updates replace them). Open one, change it, and **Save as** puts your copy in your own folder. A fight file at the same path in My fight files is laid over Ogre's.

### The four views
- **Steps** - every step in order, numbered, in plain words, by named. **Jump to** at the top goes straight to a named or the way out. Click a step to change it on the right; **Up**, **Down**, **Copy**, **Delete** and **Add a step after it** sit under the picked step.
- **Chart** - the steps as boxes in the order they run. The wheel scrolls; **-** / **+** zoom, **Fit** shows the width; drag the chart to move it, drag a box onto a + to move the box; click a + to add a step there. The chips at the top jump to a named.
- **File text** - the file exactly as Ogre reads it. Change it, then **Apply**.
- **Map** - every spot the file walks to, seen from above the way the game's map shows it; the nameds are numbered, the square is you. **-** / **+** zoom, a drag moves the map, **Fit** shows all of it. ISXJQB's saved map of the zone you stand in lies under the spots; for a zone it has not saved yet, open JB Map there once (`jb map`). A zone with floors shows the floor you stand on: click a floor's name to see another.

### The right side
- **Add a step** - every action Ogre has, by what it is for (Moving, Fighting, Loot, Clicks and talk, Waiting, Messages, Bot and group, Logic, The way out, Ready-made), or found by a word. A click adds it after the picked step, or where you clicked a + in the Chart.
- **This step** - what it does and **who runs it**, its problems, then its settings as a form, each with a line on what it does; an op list says what each op does. **More settings** holds the rest. **The step as text** takes any change (**Apply**). **Here** and **My target** fill a spot or a name from the game.
- **File settings** - the zone, its difficulty tags, the entrance (**Entrance: here**), nameds in any order, run the whole zone again after a wipe, the file name Ogre wants, and the lines that run it from an ISXJQB quest.

### When and who (at the top of This step)
- **Who does it** / **Send it to** - everyone, one box (the tank, the first healer ...), an archetype, a class or a raid group; or type it (`|` or, `+` and, `-` not). For an archetype, a class or a role, **If the group has no ...** adds a backup: pick who does it instead, then **Add**. The step then runs only when the group has one, and a copy for the other box, right after it, only when the group has none.
- **Only if** - the step runs only when its conditions hold, and is skipped otherwise (a skip is not a failure). **+ Add a condition** lists the common ones first (the group has a class, something is near, I am in combat, the named's health, a detriment, a saved value ...) and then every condition Ogre has. Each one shows in words with its settings; **not** turns it round; with two or more, pick **all of these** or **any one of these**.
- **Repeat** - once, a number of times, until something is true (it runs, then checks), or while something is true (checked before it starts and after each pass), at most so many times. The step goes inside a repeat block; **Once** takes it out again.

### Test in game
- With a step of a zone file picked, while you stand in its zone: **This step**, **Through the next named**, or **From the start to here** (or through this named). Ogre runs whole zone files only, so the steps go into a small test file of their own (`custom\_OpenIC_test.json`, ending with a way out that stays in the zone); Ogre reloads and runs it, the state shows over the checks (**Stop it** stops the run), and afterwards the test file is switched off so it never runs by itself. A step that reads a value an earlier step saved can fail on its own.
- A fight file: **Use in game > Test this fight file now** reloads the fight files and sets up for the named; it shows whether the fight file is running. The named must be up in this zone.

### On the bar
- **Validate** - the file checked as you edit: what would stop Ogre loading it, and what Ogre's reload would miss. Click it for the list under the view; click a line to jump to its step. Under the list, **Ask Ogre about this file** gets Ogre's own word on the saved file: its Validate when your Ogre has it, otherwise Ogre reloads your zone files and the page reads what it said about this one (loaded or not, each problem on its step, and any other file that claims the same zone and difficulty).
- **Use in game** - reload your files in Ogre, run or queue this zone file, start a fight's setup; the ISXJQB and ISXADD extras when they are loaded.
- **Pictures** - the pictures on the steps: on or off, and whose ability pictures show (every class's, or one class's: another class's ability then shows that class's picture). They never change the file.
- **A-** / **A+** - smaller or bigger text.

### Use in game
- **Reload** zone or fight files in Ogre: the console lists every problem Ogre finds.
- **Ask Ogre about this file** - the same as under the Validate list.
- **Queue** or **Run** the zone file (save it in My zone files first).
- **ISXJQB** (when loaded) - run the file with `jb ic rundirect`, or queue the zone.
- **ISXADD** (when loaded) - a route preview to the picked spot, drawn on the Map.
