; OpenIC.iss - opens Open IC Creator in a native Ogre window (ISXOgreX.UI) and answers the window's buttons.
;
;   run OpenIC/host/OpenIC
;
; (with this repository copied to InnerSpace\Scripts\OpenIC). Close the window with its X and the script ends.
;
; Needs:    ISXOgreX for the window (ext ISXOgreX), and ISXOgreEQ2 (native OgreBot) for the zone-file and
;           fight-file actions.
; Optional: ISXJQB (jb ic rundirect, jb ic queue) and ISXADD (u1nav path route preview). The window shows which
;           of them are loaded.
;
; How the window and this script talk (Ogre's docs, bot/developer/build-your-own-window.md): the window puts its
; values in its own hidden fields and fires one fixed event per action, Event[OpenIC_<Action>]:Execute. This script
; reads the fields with ${ISXOgreX.UI.Value[openic,<id>]} and answers by setting the window's openic-msg-* fields
; with ISXOgreX.UI:Set, which fires their change events in the window.
;
; Paths: the window sends a path inside the custom folder of the file's kind (zone files: OgreSave/EQ2/IC/custom,
; fight files: OgreSave/EQ2/Encounters/custom, ISXJQB files: Eq2JCommon), or a full path with / between folders.
; Nothing is ever written under Scripts/Ogre: Ogre's updates replace that folder.
;
; "API:" in a comment names the section of Ogre's developer API reference that documents the call
; (https://kannkor.github.io/ISXOgre/EQ2/bot/developer/api/). Lines marked UNVERIFIED use commands or members that
; reference does not cover and that were not run in game for this release.

; This file is Scripts/OpenIC/host/OpenIC.iss, so the Scripts folder is two folders up. ${Script.CurrentDirectory}
; is written with forward slashes (Ogre's docs), so the paths built from it need no escaping.
variable string OpenIC_Dir="${Script.CurrentDirectory}"
variable string OpenIC_Scripts="${Script.CurrentDirectory}/../.."
variable string OpenIC_Win="openic"
variable int OpenIC_Seq=0
variable int OpenIC_RouteWait=0

objectdef openic_bridge
{
	; A value the window put in its field openic-arg-<Id>.
	; API: isxogrex, ISXOgreX.UI.Value[name,id] (NULL until the window is open; after our own Set a read waits for it).
	member:string Arg(string Id)
	{
		return "${ISXOgreX.UI.Value[${OpenIC_Win},openic-arg-${Id}].Escape}"
	}

	; A path from the window: a full path as it is, else inside the custom folder of its kind. "" when the path
	; climbs out of its folder (..).
	member:string Full(string Kind, string Rel)
	{
		if ${Rel.Find[..](exists)}
			return ""
		if ${Rel.Find[:](exists)} || ${Rel.Left[1].Equal[/]}
			return "${Rel.Escape}"
		if ${Kind.Equal[zone]}
			return "${OpenIC_Scripts}/OgreSave/EQ2/IC/custom/${Rel.Escape}"
		if ${Kind.Equal[fight]}
			return "${OpenIC_Scripts}/OgreSave/EQ2/Encounters/custom/${Rel.Escape}"
		if ${Kind.Equal[jb]}
			return "${OpenIC_Scripts}/Eq2JCommon/${Rel.Escape}"
		return "${Rel.Escape}"
	}

	; One message to the window: "<number>|<text>" in its openic-msg-<channel> field.
	; API: isxogrex, ISXOgreX.UI:Set (a missing value is refused, so a message is never empty).
	method Say(string Channel, string Text)
	{
		OpenIC_Seq:Inc
		ISXOgreX.UI:Set[${OpenIC_Win},openic-msg-${Channel},"${OpenIC_Seq}|${Text.Escape}"]
	}

	; Which extensions are loaded.
	method SendExt()
	{
		variable string E="ogrex=1"
		if ${ISXEQ2(exists)}
			E:Concat[";eq2=1"]
		else
			E:Concat[";eq2=0"]
		if ${ISXOgreEQ2(exists)}
			E:Concat[";ogreeq2=1"]
		else
			E:Concat[";ogreeq2=0"]
		if ${OgreBotAPI(exists)}
			E:Concat[";bot=1"]
		else
			E:Concat[";bot=0"]
		if ${ISXJQB(exists)}
			E:Concat[";jqb=1"]
		else
			E:Concat[";jqb=0"]
		if ${ADD(exists)} && ${ADD.Ready}
			E:Concat[";add=1"]
		else
			E:Concat[";add=0"]
		This:Say[ext,"${E}"]
	}

	; Where I stand, my zone, my target and my class: the window's Here buttons, its Spots view and its icons.
	method SendMe()
	{
		variable string T=""
		if !${ISXEQ2(exists)}
			return
		if !${Me.Name(exists)}
			return
		if ${Target(exists)}
			T:Set["${Target.Name.Escape}"]
		This:Say[me,"${Me.X},${Me.Y},${Me.Z}|${Zone.Name.Escape}|${T.Escape}|${Me.SubClass}"]
	}
}
variable openic_bridge OpenIC

; ------------------------------------------------------------------ the window's actions

atom(script) OpenIC_OnHello()
{
	OpenIC:SendExt
	OpenIC:SendMe
}

atom(script) OpenIC_OnReload()
{
	if !${ISXOgreEQ2(exists)}
	{
		OpenIC:Say[say,"err:ISXOgreEQ2 is not loaded: native OgreBot runs the zone and fight files."]
		return
	}
	if ${OpenIC.Arg[kind].Equal[fight]}
	{
		; API: isxogreeq2/Encounter, Reload (the same as "ogre encounter reload").
		ISXOgreEQ2.Encounter:Reload
		OpenIC:Say[say,"ok:Fight files reloaded: the console lists any problem."]
	}
	else
	{
		; API: isxogreeq2/IC, Reload (the same as "ogre ic reload").
		ISXOgreEQ2.IC:Reload
		OpenIC:Say[say,"ok:Zone files reloaded: the console lists any problem."]
	}
}

; Ogre checks the open file by its own load rules and changes nothing: the window sends the file's JSON as base64.
; API: isxogreeq2/IC, Validate and Validation; isxogreeq2/Encounter, Validate and Validation (a single argument is
; the base64 text of the file's JSON; Validation is JSON: ok, errors, warnings, issues).
; UNVERIFIED: how long a base64 argument one command line can carry; check a large file by saving it first.
atom(script) OpenIC_OnCheck()
{
	if !${ISXOgreEQ2(exists)}
	{
		OpenIC:Say[say,"err:ISXOgreEQ2 is not loaded: it is Ogre's own check."]
		return
	}
	if ${OpenIC.Arg[kind].Equal[fight]}
	{
		; API: isxogreeq2/Encounter, Validate and Validation. UNVERIFIED: how long the base64 argument may be.
		ISXOgreEQ2.Encounter:Validate[${OpenIC.Arg[b64]}]
		OpenIC:Say[check,"${ISXOgreEQ2.Encounter.Validation.Escape}"]
	}
	else
	{
		; API: isxogreeq2/IC, Validate and Validation. UNVERIFIED: how long the base64 argument may be.
		ISXOgreEQ2.IC:Validate[${OpenIC.Arg[b64]}]
		OpenIC:Say[check,"${ISXOgreEQ2.IC.Validation.Escape}"]
	}
}

atom(script) OpenIC_OnOpen()
{
	variable jsonvalue Doc
	variable string Full="${OpenIC.Full["${OpenIC.Arg[kind]}","${OpenIC.Arg[path]}"]}"
	if ${Full.Length} == 0
	{
		OpenIC:Say[say,"err:That path climbs out of its folder."]
		return
	}
	; API: ogrebotapi/Util, FileExists.
	if ${OgreBotAPI(exists)}
	{
		if !${OgreBotAPI.Util.FileExists["${Full}"]}
		{
			OpenIC:Say[say,"err:There is no file ${Full}"]
			return
		}
	}
	Doc:ParseFile["${Full}"]
	if !${Doc.Type(exists)}
	{
		OpenIC:Say[say,"err:Could not read ${Full}"]
		return
	}
	; UNVERIFIED: how long a text one ISXOgreX.UI:Set can carry; a very large file may not arrive whole.
	OpenIC:Say[file,"${Doc.AsJSON.Escape}"]
}

atom(script) OpenIC_OnSave()
{
	variable jsonvalue Doc
	variable string Full="${OpenIC.Full["${OpenIC.Arg[kind]}","${OpenIC.Arg[path]}"]}"
	if ${Full.Length} == 0
	{
		OpenIC:Say[say,"err:Not saved: that path climbs out of its folder."]
		return
	}
	if ${Full.Find[/Scripts/Ogre/](exists)}
	{
		OpenIC:Say[say,"err:Not saved: Ogre's updates replace Scripts/Ogre. Save under Scripts/OgreSave."]
		return
	}
	; UNVERIFIED: a whole file through one Value read, then jsonvalue:SetValue and jsonvalue:WriteFile["<path>",multiline]
	; (LavishScript, not in Ogre's API reference; WriteFile as the ISXJQB scripting guide shows it, ParseFile as Ogre's
	; own scripts use it). The folder must already exist. Saving from a browser does not depend on any of this.
	Doc:SetValue["${OpenIC.Arg[text].Escape}"]
	if !${Doc.Type(exists)}
	{
		OpenIC:Say[say,"err:Not saved: the game could not read the file's text."]
		return
	}
	Doc:WriteFile["${Full}",multiline]
	OpenIC:Say[say,"ok:saved ${Full}"]
}

atom(script) OpenIC_OnQueue()
{
	if !${ISXOgreEQ2(exists)}
	{
		OpenIC:Say[say,"err:ISXOgreEQ2 is not loaded."]
		return
	}
	; API: isxogreeq2/IC, Queue (add,<tier>,<path>).
	ISXOgreEQ2.IC:Queue[add,custom,"${OpenIC.Arg[path]}"]
	OpenIC:Say[say,"ok:Queued custom/${OpenIC.Arg[path]}"]
}

atom(script) OpenIC_OnRun()
{
	if !${ISXOgreEQ2(exists)}
	{
		OpenIC:Say[say,"err:ISXOgreEQ2 is not loaded."]
		return
	}
	; API: isxogreeq2/IC, Run[tier,relPath]: starts one zone file, not the list; it refuses with a console line when
	; you are not in the world, a run is under way, IC is paused, no profile is loaded, or the file will not load.
	ISXOgreEQ2.IC:Run[custom,"${OpenIC.Arg[path]}"]
	OpenIC:Say[say,"ok:Asked Ogre to run custom/${OpenIC.Arg[path]}: the console says if it refused."]
}

atom(script) OpenIC_OnSetUp()
{
	; API: ogrebotapi/Bot, SetUpFor[fw,what,restart]: the named's fight setup on the next pulse, for my group.
	OgreBotAPI.Bot:SetUpFor[igw:${Me.Name},"${OpenIC.Arg[named]}",TRUE]
	OpenIC:Say[say,"ok:Fight setup asked for ${OpenIC.Arg[named]}"]
}

atom(script) OpenIC_OnJbRun()
{
	variable string Full="${OpenIC.Full["${OpenIC.Arg[kind]}","${OpenIC.Arg[path]}"]}"
	if !${ISXJQB(exists)}
	{
		OpenIC:Say[say,"err:ISXJQB is not loaded."]
		return
	}
	; UNVERIFIED (ISXJQB, not in Ogre's API reference): jb ic rundirect with a full path (ISXJQB's command list gives
	; "jb ic rundirect <file> [diff] [step#]").
	jb ic rundirect "${Full}"
	OpenIC:Say[say,"ok:ISXJQB is running ${Full}"]
}

atom(script) OpenIC_OnJbQueue()
{
	if !${ISXJQB(exists)}
	{
		OpenIC:Say[say,"err:ISXJQB is not loaded."]
		return
	}
	; UNVERIFIED (ISXJQB, not in Ogre's API reference): the difficulty word ISXJQB takes after the zone name
	; ("jb ic queue <name> [diff] [force]"); the window sends the variant in lower case, without its brackets.
	jb ic queue "${OpenIC.Arg[zone]}" ${OpenIC.Arg[variant]}
	OpenIC:Say[say,"ok:Queued in ISXJQB: ${OpenIC.Arg[zone]}"]
}

atom(script) OpenIC_OnRoute()
{
	if !${ADD(exists)}
	{
		OpenIC:Say[say,"err:ISXADD is not loaded."]
		return
	}
	if !${ADD.Ready}
	{
		OpenIC:Say[say,"err:ISXADD is not ready yet."]
		return
	}
	; UNVERIFIED (ISXADD, not in Ogre's API reference): "u1nav path <x,y,z>" plans a route without moving anyone;
	; main() reads it back (OpenIC_SendRoute).
	u1nav path ${OpenIC.Arg[loc]}
	OpenIC_RouteWait:Set[20]
}

; The route ISXADD found, as "x,y,z;x,y,z;...".
; UNVERIFIED (ISXADD, not in Ogre's API reference): the members U1Nav.PointCount and U1Nav.PointX / PointY /
; PointZ[n] (ISXADD's help), counted from 1.
function OpenIC_SendRoute()
{
	variable int i
	variable int N=0
	variable string Pts=""
	if ${U1Nav.PointCount(exists)}
		N:Set[${U1Nav.PointCount}]
	for (i:Set[1] ; ${i} <= ${N} && ${i} <= 400 ; i:Inc)
	{
		if ${i} > 1
			Pts:Concat[";"]
		Pts:Concat["${U1Nav.PointX[${i}]},${U1Nav.PointY[${i}]},${U1Nav.PointZ[${i}]}"]
	}
	OpenIC:Say[route,"${Pts}"]
}

; ------------------------------------------------------------------ the window itself

; API: isxogrex, ISXOgreX.UI:Open[name,path,helpPath].
atom(script) OpenIC_OpenWindow()
{
	ISXOgreX.UI:Open[${OpenIC_Win},"${OpenIC_Dir}/OpenIC.html","${OpenIC_Dir}/OpenIC.md"]
}

; API: events, OgreUI_Opened. Once the window is up: the extensions, where I stand, and the game icons.
; API: isxogrex, ISXOgreX.UI:EvalFile[path] runs a .js file in the UI page: OpenIC-assets.js holds the icon sheets
; and the ability list, kept out of the window file so the window stays small.
; UNVERIFIED: how large a file EvalFile takes; without it the window still works, with fewer icons.
atom(script) OpenIC_OnOpened(string name)
{
	if !${name.Equal[${OpenIC_Win}]}
		return
	OpenIC:SendExt
	OpenIC:SendMe
	ISXOgreX.UI:EvalFile["${OpenIC_Dir}/OpenIC-assets.js"]
}

; API: events, OgreUI_Closed. A UI reload closes every window: open ours again. Closed with its X: the script ends.
atom(script) OpenIC_OnClosed(string name, string reason)
{
	if !${name.Equal[${OpenIC_Win}]}
		return
	if ${reason.Equal[reload]}
		OpenIC_OpenWindow
	else
		Script:End
}

function main()
{
	if !${ISXOgreX(exists)}
	{
		echo "Open IC Creator: ISXOgreX is not loaded. Load it first: ext ISXOgreX"
		return
	}
	LavishScript:RegisterEvent[OpenIC_Hello]
	LavishScript:RegisterEvent[OpenIC_Reload]
	LavishScript:RegisterEvent[OpenIC_Check]
	LavishScript:RegisterEvent[OpenIC_Open]
	LavishScript:RegisterEvent[OpenIC_Save]
	LavishScript:RegisterEvent[OpenIC_Queue]
	LavishScript:RegisterEvent[OpenIC_Run]
	LavishScript:RegisterEvent[OpenIC_SetUp]
	LavishScript:RegisterEvent[OpenIC_JbRun]
	LavishScript:RegisterEvent[OpenIC_JbQueue]
	LavishScript:RegisterEvent[OpenIC_Route]
	Event[OpenIC_Hello]:AttachAtom[OpenIC_OnHello]
	Event[OpenIC_Reload]:AttachAtom[OpenIC_OnReload]
	Event[OpenIC_Check]:AttachAtom[OpenIC_OnCheck]
	Event[OpenIC_Open]:AttachAtom[OpenIC_OnOpen]
	Event[OpenIC_Save]:AttachAtom[OpenIC_OnSave]
	Event[OpenIC_Queue]:AttachAtom[OpenIC_OnQueue]
	Event[OpenIC_Run]:AttachAtom[OpenIC_OnRun]
	Event[OpenIC_SetUp]:AttachAtom[OpenIC_OnSetUp]
	Event[OpenIC_JbRun]:AttachAtom[OpenIC_OnJbRun]
	Event[OpenIC_JbQueue]:AttachAtom[OpenIC_OnJbQueue]
	Event[OpenIC_Route]:AttachAtom[OpenIC_OnRoute]
	Event[OgreUI_Opened]:AttachAtom[OpenIC_OnOpened]
	Event[OgreUI_Closed]:AttachAtom[OpenIC_OnClosed]
	OpenIC_OpenWindow

	; Once a second: where I stand (the window's Here buttons), and a route preview when one was asked for.
	; API: isxogrex, ISXOgreX.UI.Window[name] (NULL when no window by that name is open).
	while TRUE
	{
		if ${ISXOgreX.UI.Window[${OpenIC_Win}](exists)}
			OpenIC:SendMe
		if ${OpenIC_RouteWait} > 0
		{
			OpenIC_RouteWait:Dec
			if ${U1Nav.PointCount(exists)}
			{
				if ${U1Nav.PointCount} > 0
					OpenIC_RouteWait:Set[0]
			}
			if ${OpenIC_RouteWait} == 0
				call OpenIC_SendRoute
		}
		wait 10
	}
}

atom atexit()
{
	Event[OpenIC_Hello]:DetachAtom[OpenIC_OnHello]
	Event[OpenIC_Reload]:DetachAtom[OpenIC_OnReload]
	Event[OpenIC_Check]:DetachAtom[OpenIC_OnCheck]
	Event[OpenIC_Open]:DetachAtom[OpenIC_OnOpen]
	Event[OpenIC_Save]:DetachAtom[OpenIC_OnSave]
	Event[OpenIC_Queue]:DetachAtom[OpenIC_OnQueue]
	Event[OpenIC_Run]:DetachAtom[OpenIC_OnRun]
	Event[OpenIC_SetUp]:DetachAtom[OpenIC_OnSetUp]
	Event[OpenIC_JbRun]:DetachAtom[OpenIC_OnJbRun]
	Event[OpenIC_JbQueue]:DetachAtom[OpenIC_OnJbQueue]
	Event[OpenIC_Route]:DetachAtom[OpenIC_OnRoute]
	Event[OgreUI_Opened]:DetachAtom[OpenIC_OnOpened]
	Event[OgreUI_Closed]:DetachAtom[OpenIC_OnClosed]
	; API: isxogrex, ISXOgreX.UI:Close[name].
	ISXOgreX.UI:Close[${OpenIC_Win}]
}
