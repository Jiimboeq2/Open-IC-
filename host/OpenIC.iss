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
; How the window and this script talk (Ogre's docs, bot/developer/build-your-own-window): the window puts its values
; in its own hidden fields and fires one fixed event per action, Event[OpenIC_<Action>]:Execute. This script reads the
; fields with ${ISXOgreX.UI.Value[openic,<id>]} and answers by setting the window's openic-msg-* fields with
; ISXOgreX.UI:Set, which fires their change events in the window.
;
; Big text moves in pieces. A field's value reaches the game whole (the window publishes it), but the LavishScript
; command that USES it carries every character: one command of 33 KB took a game client down, 26 KB did not. So a file
; and Ogre's answer go to the window as "<k>/<n>|<piece>", and a file from the window is written piece by piece, never
; more than OpenIC_Piece characters in one command.
;
; Paths: the window sends a path inside the custom folder of the file's kind (zone files: OgreSave/EQ2/IC/custom,
; fight files: OgreSave/EQ2/Encounters/custom, ISXJQB files: Eq2JCommon), or a full path with / between folders.
; Nothing is ever written under Scripts/Ogre: Ogre's updates replace that folder.
;
; "API:" in a comment names the section of Ogre's developer API reference that documents the call
; (https://kannkor.github.io/ISXOgre/EQ2/bot/developer/api/). "PROVEN" marks a call run in game for this release with
; what it did. Lines marked UNVERIFIED use commands or members that reference does not cover and that were not run in
; game for this release.

; This file's own folder holds the window; the Scripts folder is InnerSpace's. Both are written with forward slashes
; (PROVEN 2026-11-17: ${LavishScript.HomeDirectory} read "C:/Program Files (x86)/InnerSpace"), so the paths built from
; them need no escaping.
; Never write a slash and a star together in this file, not even inside quotes: LavishScript reads it as the start of
; a comment and drops the rest of the script. A folder's contents are "<folder>/\*".
variable string OpenIC_Dir="${Script.CurrentDirectory}"
variable string OpenIC_Scripts="${LavishScript.HomeDirectory}/Scripts"
; a folder to make, asked for by the window (OpenIC_OnMkDir); main() makes it
variable string OpenIC_MkBase=""
variable string OpenIC_MkRel=""
variable string OpenIC_Win="openic"
variable int OpenIC_Seq=0
variable int OpenIC_RouteWait=0
; the most characters one command carries
variable int OpenIC_Piece=6000
; the icon parts: OpenIC-assets-<k>.js, sent one at a time; 0 = none on the way
variable int OpenIC_AssetSent=0
variable int OpenIC_AssetTicks=0
; Ask Ogre (OpenIC_OnVerify): Ogre's log, where it stood before the reload, the file asked about, and the ticks left
; before its lines are read
variable string OpenIC_VerifyLog=""
variable int OpenIC_VerifyFrom=0
variable string OpenIC_VerifyRel=""
variable int OpenIC_VerifyWait=0
; Test in game (OpenIC_OnTest, OpenIC_OnFightTest): ticks left before Ogre's first lines are read, whether a run is
; watched, how long, whether it was seen running; the named of a fight test
variable int OpenIC_TestWait=0
variable bool OpenIC_TestWatch=FALSE
variable int OpenIC_TestTicks=0
variable bool OpenIC_TestSeen=FALSE
variable string OpenIC_FightNamed=""
variable int OpenIC_FightWait=0
variable int OpenIC_FightTicks=0
; which of Ogre's members this Ogre has (OpenIC_ReadTypes, once at the start)
variable bool OpenIC_HasCheck=FALSE
variable bool OpenIC_HasFCheck=FALSE
variable bool OpenIC_HasRunState=FALSE
variable bool OpenIC_HasVerdict=FALSE
variable bool OpenIC_HasNote=FALSE
variable bool OpenIC_HasIsActive=FALSE

objectdef openic_bridge
{
	; A short value the window put in its field openic-arg-<Id>: a kind, a path, a name. Never a file's text (that
	; one is read in pieces, OpenIC_OnSave).
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
		if ${Kind.Equal[ozone]}
			return "${OpenIC_Scripts}/Ogre/EQ2/IC/default/${Rel.Escape}"
		if ${Kind.Equal[ofight]}
			return "${OpenIC_Scripts}/Ogre/EQ2/Encounters/default/${Rel.Escape}"
		return "${Rel.Escape}"
	}

	; Is this folder there? A function's variables are set up when it starts, so a filepath declared below a line that
	; changes the path still holds the path from before (the file browser saw every folder as missing): the finished
	; path comes in here as the argument.
	member:bool DirThere(string Path)
	{
		variable filepath P="${Path}"
		return ${P.PathExists}
	}

	; The folders the window's file browser shows, inside InnerSpace's Scripts folder: my zone files, my fight files,
	; Ogre's own (read only: Ogre's updates replace them), ISXJQB's instance files. "" for any other name.
	member:string RootDir(string Root)
	{
		if ${Root.Equal[zone]}
			return "OgreSave/EQ2/IC/custom"
		if ${Root.Equal[fight]}
			return "OgreSave/EQ2/Encounters/custom"
		if ${Root.Equal[ozone]}
			return "Ogre/EQ2/IC/default"
		if ${Root.Equal[ofight]}
			return "Ogre/EQ2/Encounters/default"
		if ${Root.Equal[jb]}
			return "Eq2JCommon/JB/Instances"
		return ""
	}

	; One short message to the window: "<number>|<text>" in its openic-msg-<channel> field.
	; API: isxogrex, ISXOgreX.UI:Set (a missing value is refused, so a message is never empty).
	; PROVEN 2026-11-17: a 24.6 KB message arrived whole; the window's change events fired (openic-host.js).
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
		; Ogre's own check of a zone file / a fight file: only an Ogre that has it (OpenIC_OnCheck; OpenIC_ReadTypes)
		if ${OpenIC_HasCheck}
			E:Concat[";check=1"]
		else
			E:Concat[";check=0"]
		if ${OpenIC_HasFCheck}
			E:Concat[";fcheck=1"]
		else
			E:Concat[";fcheck=0"]
		This:Say[ext,"${E}"]
	}

	; Where I stand, my zone, my target, my class and my zone's short name: the window's Here buttons, its Map view (the
	; short name finds ISXJQB's saved map) and its icons.
	; PROVEN 2026-11-17 (is1): Zone.ShortName (ISXEQ2, not in Ogre's API reference) reached the window as
	; fprt_guildhall_tier3, and the Map found ISXJQB's saved map by it.
	method SendMe()
	{
		variable string T=""
		if !${ISXEQ2(exists)}
			return
		if !${Me.Name(exists)}
			return
		if ${Target(exists)}
			T:Set["${Target.Name.Escape}"]
		This:Say[me,"${Me.X},${Me.Y},${Me.Z}|${Zone.Name.Escape}|${T.Escape}|${Me.SubClass}|${Zone.ShortName.Escape}"]
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

; Ogre checks a saved file by its own load rules and changes nothing: the window sends the folder (default or custom)
; and the path inside it. Ogre's answer goes back in pieces on the check channel.
; API: isxogreeq2/IC, Validate[tier,path] and Validation; isxogreeq2/Encounter, Validate[root,path] and Validation
; (Validation is JSON: ok, errors, warnings, issues). Its other form, the file's JSON as one base64 argument, is not
; used: for a zone file that is one command of 30 KB and more.
; Not in every Ogre: the ISXOgreEQ2 of 2026-11-16 has neither Validate nor Validation, and calling a method an
; extension does not have ends the script that calls it (with a 33 KB argument it took a game client down). So the
; script asks first: Validation(exists) reads FALSE there and nothing is called.
; PROVEN 2026-11-17: on that Ogre, IC.Validation(exists) read FALSE inside a script and the script went on.
atom(script) OpenIC_OnCheck()
{
	variable string Tier="${OpenIC.Arg[tier]}"
	variable string Rel="${OpenIC.Arg[path]}"
	variable bool Can=FALSE
	variable int Len
	variable int N
	variable int K
	if !${ISXOgreEQ2(exists)}
	{
		OpenIC:Say[say,"err:ISXOgreEQ2 is not loaded: it is Ogre's own check."]
		return
	}
	if ${OpenIC.Arg[kind].Equal[fight]}
	{
		if ${OpenIC_HasFCheck}
			Can:Set[TRUE]
	}
	else
	{
		if ${OpenIC_HasCheck}
			Can:Set[TRUE]
	}
	if !${Can}
	{
		OpenIC:Say[say,"err:This Ogre has no file check yet (ISXOgreEQ2 Validate is newer): Reload lists the problems."]
		return
	}
	if !${Tier.Equal[default]} && !${Tier.Equal[custom]}
	{
		OpenIC:Say[say,"err:Ogre checks a saved file: save it in the custom folder first."]
		return
	}
	if ${Rel.Length} == 0 || ${Rel.Find[..](exists)} || ${Rel.Find[:](exists)}
	{
		OpenIC:Say[say,"err:Not a path inside the ${Tier} folder: ${Rel}"]
		return
	}
	if ${OpenIC.Arg[kind].Equal[fight]}
	{
		; API: isxogreeq2/Encounter, Validate[root,path] and Validation.
		ISXOgreEQ2.Encounter:Validate[${Tier},"${Rel}"]
		Len:Set[${ISXOgreEQ2.Encounter.Validation.Length}]
		N:Set[${Math.Calc[(${Len}+${OpenIC_Piece}-1)/${OpenIC_Piece}].Int}]
		if ${N} < 1
			N:Set[1]
		for (K:Set[1] ; ${K} <= ${N} ; K:Inc)
			OpenIC:Say[check,"${K}/${N}|${ISXOgreEQ2.Encounter.Validation.Mid[${Math.Calc[(${K}-1)*${OpenIC_Piece}+1].Int},${OpenIC_Piece}].Escape}"]
	}
	else
	{
		; API: isxogreeq2/IC, Validate[tier,path] and Validation.
		ISXOgreEQ2.IC:Validate[${Tier},"${Rel}"]
		Len:Set[${ISXOgreEQ2.IC.Validation.Length}]
		N:Set[${Math.Calc[(${Len}+${OpenIC_Piece}-1)/${OpenIC_Piece}].Int}]
		if ${N} < 1
			N:Set[1]
		for (K:Set[1] ; ${K} <= ${N} ; K:Inc)
			OpenIC:Say[check,"${K}/${N}|${ISXOgreEQ2.IC.Validation.Mid[${Math.Calc[(${K}-1)*${OpenIC_Piece}+1].Int},${OpenIC_Piece}].Escape}"]
	}
}

; The file goes to the window in pieces of OpenIC_Piece characters, "<k>/<n>|<piece>"; the window joins them.
atom(script) OpenIC_OnOpen()
{
	variable jsonvalue Doc
	variable string Full="${OpenIC.Full["${OpenIC.Arg[kind]}","${OpenIC.Arg[path]}"]}"
	variable int Len
	variable int N
	variable int K
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
	; PROVEN 2026-11-17: jsonvalue:ParseFile read a 46 KB zone file and its 24.6 KB AsJSON reached the window whole.
	Doc:ParseFile["${Full}"]
	if !${Doc.Type(exists)}
	{
		OpenIC:Say[say,"err:Could not read ${Full}"]
		return
	}
	Len:Set[${Doc.AsJSON.Length}]
	N:Set[${Math.Calc[(${Len}+${OpenIC_Piece}-1)/${OpenIC_Piece}].Int}]
	if ${N} < 1
		N:Set[1]
	for (K:Set[1] ; ${K} <= ${N} ; K:Inc)
		OpenIC:Say[file,"${K}/${N}|${Doc.AsJSON.Mid[${Math.Calc[(${K}-1)*${OpenIC_Piece}+1].Int},${OpenIC_Piece}].Escape}"]
}

; The window's text (JSON in one line) is written in pieces of OpenIC_Piece characters, read back to be sure it is
; whole, then written again in multi-line form. The folder must already exist.
atom(script) OpenIC_OnSave()
{
	variable jsonvalue Doc
	variable file F
	variable string Full="${OpenIC.Full["${OpenIC.Arg[kind]}","${OpenIC.Arg[path]}"]}"
	variable int Len
	variable int P
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
	Len:Set[${ISXOgreX.UI.Value[${OpenIC_Win},openic-arg-text].Length}]
	if ${Len} < 2
	{
		OpenIC:Say[say,"err:Not saved: the window sent no text."]
		return
	}
	; LavishScript's file object, as ISXJQB's own scripts have written files for years.
	; PROVEN 2026-11-17: a 24.7 KB zone file went in 5 pieces and read back equal as data, its text with ${Me.Name},
	; quotes, a backslash, brackets, braces and a semicolon unchanged; Write adds nothing between pieces ("ab"+"cd").
	F:SetFilename["${Full}"]
	F:Open[writeover]
	for (P:Set[1] ; ${P} <= ${Len} ; P:Set[${Math.Calc[${P}+${OpenIC_Piece}].Int}])
		F:Write["${ISXOgreX.UI.Value[${OpenIC_Win},openic-arg-text].Mid[${P},${OpenIC_Piece}].Escape}"]
	F:Close
	Doc:ParseFile["${Full}"]
	if !${Doc.Type(exists)}
	{
		OpenIC:Say[say,"err:Not saved whole: ${Full} does not read back (does its folder exist?)."]
		return
	}
	; PROVEN 2026-11-17: a 24.6 KB zone file written with WriteFile[path,multiline] read back equal as data.
	Doc:WriteFile["${Full}",multiline]
	OpenIC:Say[say,"ok:saved ${Full}"]
}

; The window's file browser: the folders and .json files in one folder (one of RootDir's, and a path inside it), as
; "<root>|<path>|<1 = the folder is there>" then ">D|<folder>" and ">F|<file>|<bytes>" for each (a Windows name holds
; neither | nor >), in pieces on the list channel.
; PROVEN 2026-11-17: filelist's GetDirectories and GetFiles listed Ogre's IC folder and a folder of .json files
; (.File[n] is the name, .File[n].Filename too, .File[n].Size the bytes).
atom(script) OpenIC_OnList()
{
	variable string RootId="${OpenIC.Arg[root]}"
	variable string Rel="${OpenIC.Arg[path]}"
	variable string Folder="${OpenIC.RootDir[${RootId}]}"
	variable string S
	variable filelist D
	variable filelist F
	variable int i
	variable int Len
	variable int N
	variable int K
	if ${Folder.Length} == 0 || ${Rel.Find[..](exists)} || ${Rel.Find[:](exists)}
	{
		OpenIC:Say[say,"err:Not a folder the file browser shows."]
		return
	}
	Folder:Set["${OpenIC_Scripts}/${Folder}"]
	if ${Rel.Length} > 0
		Folder:Concat["/${Rel}"]
	S:Set["${RootId}|${Rel}|"]
	if !${OpenIC.DirThere["${Folder}"]}
		S:Concat["0"]
	else
	{
		S:Concat["1"]
		D:GetDirectories["${Folder}/\*"]
		for (i:Set[1] ; ${i} <= ${D.Files} && ${i} <= 500 ; i:Inc)
			S:Concat[">D|${D.File[${i}]}"]
		F:GetFiles["${Folder}/\*.json"]
		for (i:Set[1] ; ${i} <= ${F.Files} && ${i} <= 500 ; i:Inc)
			S:Concat[">F|${F.File[${i}].Filename}|${F.File[${i}].Size}"]
	}
	Len:Set[${S.Length}]
	N:Set[${Math.Calc[(${Len}+${OpenIC_Piece}-1)/${OpenIC_Piece}].Int}]
	if ${N} < 1
		N:Set[1]
	for (K:Set[1] ; ${K} <= ${N} ; K:Inc)
		OpenIC:Say[list,"${K}/${N}|${S.Mid[${Math.Calc[(${K}-1)*${OpenIC_Piece}+1].Int},${OpenIC_Piece}].Escape}"]
}

; The window's New folder: a folder inside one of the browser's own folders (never Ogre's), made by main() on its next
; turn, one folder at a time, each one that is missing (OpenIC_MakeDirs).
; PROVEN 2026-11-17: filepath:MakeSubdirectory made a folder, and FileExists[<its name>] read TRUE after.
atom(script) OpenIC_OnMkDir()
{
	variable string RootId="${OpenIC.Arg[root]}"
	variable string Rel="${OpenIC.Arg[path]}"
	variable string NewName="${OpenIC.Arg[name]}"
	if !${RootId.Equal[zone]} && !${RootId.Equal[fight]} && !${RootId.Equal[jb]}
	{
		OpenIC:Say[say,"err:Ogre's own folders are read only: make the folder in your own."]
		return
	}
	if ${Rel.Find[..](exists)} || ${Rel.Find[:](exists)} || ${NewName.Find[..](exists)} || ${NewName.Find[/](exists)} || ${NewName.Find[:](exists)}
	{
		OpenIC:Say[say,"err:That folder name cannot be used."]
		return
	}
	OpenIC_MkBase:Set["${OpenIC_Scripts}"]
	OpenIC_MkRel:Set["${OpenIC.RootDir[${RootId}]}"]
	if ${Rel.Length} > 0
		OpenIC_MkRel:Concat["/${Rel}"]
	if ${NewName.Length} > 0
		OpenIC_MkRel:Concat["/${NewName}"]
}

; Makes OpenIC_MkRel inside OpenIC_MkBase one folder at a time, then says how it went (the window lists again).
function OpenIC_MakeDirs()
{
	variable string At="${OpenIC_MkBase}"
	variable string Rel="${OpenIC_MkRel}"
	variable string Seg
	variable int N=1
	OpenIC_MkRel:Set[""]
	do
	{
		Seg:Set["${Rel.Token[${N},/]}"]
		if ${Seg.Length} == 0 || ${Seg.Equal[NULL]}
			break
		call OpenIC_MakeOne "${At}" "${Seg}"
		At:Concat["/${Seg}"]
		N:Inc
	}
	while ${N} <= 16
	if ${OpenIC.DirThere["${At}"]}
		OpenIC:Say[say,"ok:folder made: ${Rel}"]
	else
		OpenIC:Say[say,"err:Could not make the folder ${Rel}"]
}

function OpenIC_MakeOne(string Base, string Sub)
{
	variable filepath P="${Base}"
	if !${P.FileExists["${Sub}"]}
		P:MakeSubdirectory["${Sub}"]
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
	; UNVERIFIED (ISXJQB, not in Ogre's API reference; not run in game for this release): jb ic rundirect with a full
	; path (ISXJQB's usage line: "jb ic rundirect <file> [diff] [step#]"; a path with a drive letter is used as it is).
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
	; UNVERIFIED (ISXJQB, not in Ogre's API reference; not run in game for this release): "jb ic queue <name> [diff]"
	; (ISXJQB's usage line); the window sends the zone as ISXJQB's files name it (- for :) and the variant in lower
	; case, without its brackets.
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
	OpenIC_RouteWait:Set[40]
}

; ISXJQB's saved map of a zone, when ISXJQB has one (its map saves a zone the first time JB Map is open there): in
; Scripts/Eq2JCommon/JB/Data, jqbmap_zone_<zone short name>.js holds the zone's floors and where each one's edges are,
; and jqbmap_art_<floor>.js one floor's picture. The window asks for one file at a time (openic-arg-kind: zone or art,
; openic-arg-name: the zone's short name as ISXJQB writes it, or a floor's key), this runs it in the page and says
; "<kind>|<name>|1" on the window's map channel, or "<kind>|<name>|0" when ISXJQB has no such file. A name can not
; climb out of that folder. The files are ISXJQB's: this only reads them.
; PROVEN 2026-11-17 (is1, a guild hall): the zone file (4 floors) and the floor's picture ran in the page, the Map drew
; the picture under the spots in about 0.25 s, the floors were offered.
atom(script) OpenIC_OnMap()
{
	variable string Kind="${OpenIC.Arg[kind]}"
	variable string Name="${OpenIC.Arg[name]}"
	variable filepath D="${OpenIC_Scripts}/Eq2JCommon/JB/Data"
	if !${Kind.Equal[zone]} && !${Kind.Equal[art]}
		return
	if ${Name.Length} == 0 || ${Name.Find[/](exists)} || ${Name.Find[..](exists)} || ${Name.Find[:](exists)}
		return
	if !${D.FileExists[jqbmap_${Kind}_${Name}.js]}
	{
		OpenIC:Say[map,"${Kind}|${Name}|0"]
		return
	}
	; API: isxogrex, ISXOgreX.UI:EvalFile[path] runs a .js file in the UI page (as OpenIC_SendAssetPart does).
	; PROVEN 2026-11-17: EvalFile ran files of 256 KB to 4 MB (the icon parts); ISXJQB's map files are at most a few
	; hundred KB.
	ISXOgreX.UI:EvalFile["${OpenIC_Scripts}/Eq2JCommon/JB/Data/jqbmap_${Kind}_${Name}.js"]
	OpenIC:Say[map,"${Kind}|${Name}|1"]
}

; The Validate panel's Ask Ogre, for a zone file saved in one of IC's folders, with an Ogre that has no IC:Validate:
; Ogre reloads its zone files (the same as Reload) and this reads what it said about this one file. Reload prints only
; its count line on the console; each problem goes to Ogre's log as "<tier>/<path>: <message>", so the log is read from
; where it stood before the reload. IC:List then prints the loaded files that claim the zone: this file among them
; means it loaded, and another one there for the same difficulty is the one a queue by name may pick. The window's
; fields: path (inside the tier's folder), tier (custom or default), zone (one plain word of the zone's name: List's
; filter matches the zone name only, and nothing with an apostrophe in it -- PROVEN 2026-11-17, is1).
; Not used: IC:Check, which also starts Ogre's zone-reset flow (it opens the game's zone reset window to read timers).
; PROVEN 2026-11-17 (is1), end to end from the window: a DTV zone file "loaded as Val'Zyroth Ness: Puppeteer's
; Playground [Solo]" with Ogre's one line about it (no entrance) out of the log; the converted Gerion file loaded and
; was shown claiming the same zone and difficulty as Ogre's own Rage of Cthurath/_09_Gerion_Realm_of_Conquest.json.
atom(script) OpenIC_OnVerify()
{
	variable string Rel="${OpenIC.Arg[path]}"
	variable string Tier="${OpenIC.Arg[tier]}"
	; never a variable named after a top-level object (Zone, Me, Target ...): the script ends (it did, here, 2026-11-17)
	variable string ZoneName="${OpenIC.Arg[zone]}"
	variable file L
	if !${ISXOgreEQ2(exists)}
	{
		OpenIC:Say[say,"err:ISXOgreEQ2 is not loaded."]
		return
	}
	if !${Tier.Equal[custom]} && !${Tier.Equal[default]}
		return
	OpenIC_VerifyRel:Set["${Tier}/${Rel}"]
	OpenIC_VerifyLog:Set["${LavishScript.HomeDirectory}/x64/Extensions/ISXDK35/ISXOgreEQ2.${Session}.log"]
	OpenIC_VerifyFrom:Set[0]
	L:SetFilename["${OpenIC_VerifyLog}"]
	L:Open[readonly]
	if ${L.Open}
	{
		OpenIC_VerifyFrom:Set[${L.Size}]
		L:Close
	}
	else
		OpenIC_VerifyLog:Set[""]
	; API: isxogreeq2 IC, ISXOgreEQ2.IC:Reload (prints "N zone(s) from M file(s) - X skipped, Y warning(s)") and
	; ISXOgreEQ2.IC:List[filter] (prints every loaded zone file that matches, and a count).
	; PROVEN 2026-11-17 (ISXOgreEQ2 of 2026-11-16): redirect caught IC:Reload's count line and IC:List's
	; "[custom] <path>  ->  <zone> [<difficulty>]" and "1 of 63 zone file(s) matching" lines, each with colour codes.
	redirect "${OpenIC_Dir}/openic-verify-r.txt" ISXOgreEQ2.IC:Reload
	; unquoted: List takes quote marks as part of its filter (PROVEN 2026-11-17: List["Playground"] 0 files, List[Playground] 1)
	redirect "${OpenIC_Dir}/openic-verify-l.txt" ISXOgreEQ2.IC:List[${ZoneName}]
	OpenIC_VerifyWait:Set[2]
}

; A second after Ask Ogre: the count line, the files that claim the zone, and this file's lines from Ogre's log since
; the reload, one message each on the window's verify channel ("begin|<tier>/<path>", "s|", "l|", "p|", "end|").
; PROVEN 2026-11-17: a file's Size, Seek[n] and Read (a line at a time, quotes and brackets kept with .Escape; an empty
; line first after a seek, NULL at the end) on a test file; Ogre's log held one "<tier>/<path>: <message>" line per
; problem of the reload, steps counted from 1, and can be read while Ogre writes it.
function OpenIC_SendVerify()
{
	variable file F
	variable string T
	variable int G=0
	OpenIC:Say[verify,"begin|${OpenIC_VerifyRel.Escape}"]
	F:SetFilename["${OpenIC_Dir}/openic-verify-r.txt"]
	F:Open[readonly]
	if ${F.Open}
	{
		while !${F.EOF} && ${G:Inc} <= 50
		{
			T:Set["${F.Read.Escape}"]
			if ${T.Find[skipped](exists)}
				OpenIC:Say[verify,"s|${T.Escape}"]
		}
		F:Close
	}
	G:Set[0]
	F:SetFilename["${OpenIC_Dir}/openic-verify-l.txt"]
	F:Open[readonly]
	if ${F.Open}
	{
		while !${F.EOF} && ${G:Inc} <= 80
		{
			T:Set["${F.Read.Escape}"]
			if ${T.Find[ -> ](exists)} || ${T.Find[matching](exists)}
				OpenIC:Say[verify,"l|${T.Escape}"]
		}
		F:Close
	}
	if ${OpenIC_VerifyLog.Length} > 0
	{
		G:Set[0]
		F:SetFilename["${OpenIC_VerifyLog}"]
		F:Open[readonly]
		if ${F.Open}
		{
			; PROVEN 2026-11-17: Seek[n] moved a read file to byte n; Read went on from there.
			F:Seek[${OpenIC_VerifyFrom}]
			while !${F.EOF} && ${G:Inc} <= 4000
			{
				T:Set["${F.Read.Escape}"]
				if ${T.Find["${OpenIC_VerifyRel}:"](exists)}
					OpenIC:Say[verify,"p|${T.Escape}"]
			}
			F:Close
		}
	}
	else
		OpenIC:Say[verify,"nolog|"]
	OpenIC:Say[verify,"end|"]
}

; Test in game, a zone file's steps: the window saves the steps to test as a small zone file of their own in
; custom/_Open IC test/ (ending in a zoneOut with op none, so it stays in the zone), then asks for this: Ogre reloads
; its zone files and runs that file. What Ogre printed goes to the window on its test channel, then once a second the
; run's state, until it ends ("out|", "state|<RunState>|<Verdict>|<Note>", "end|...").
; API: isxogreeq2 IC, Run[tier,relPath] (it refuses with a console line when you are not in the world, a run is under
; way, IC is paused, no profile is loaded, or the file will not load; it travels to the file's zone first, so the
; window only offers a test while you stand in it), Stop, and the members Running, RunState, Verdict and Note.
; UNVERIFIED for this release: no test run yet (the box was in a guild hall); the members are read only when this Ogre
; has them (OpenIC_ReadTypes: the Ogre of 2026-11-16 has Running, RunState, Verdict and Note).
atom(script) OpenIC_OnTest()
{
	variable string Rel="${OpenIC.Arg[path]}"
	if !${ISXOgreEQ2(exists)}
	{
		OpenIC:Say[say,"err:ISXOgreEQ2 is not loaded."]
		return
	}
	if ${Rel.Length} == 0 || ${Rel.Find[..](exists)}
		return
	redirect "${OpenIC_Dir}/openic-test.txt" ISXOgreEQ2.IC:Reload
	redirect -append "${OpenIC_Dir}/openic-test.txt" ISXOgreEQ2.IC:Run[custom,"${Rel}"]
	OpenIC_TestTicks:Set[0]
	OpenIC_TestSeen:Set[FALSE]
	OpenIC_TestWatch:Set[FALSE]
	OpenIC_TestWait:Set[2]
}

atom(script) OpenIC_OnTestStop()
{
	if !${ISXOgreEQ2(exists)}
		return
	; API: isxogreeq2 IC, Stop: the run stops where it stands (a steps zone at its current step, without its exit).
	ISXOgreEQ2.IC:Stop
	OpenIC:Say[say,"ok:Asked Ogre to stop the run."]
}

; What Ogre printed for the test's reload and run, then the watch starts.
function OpenIC_SendTestOut()
{
	variable file F
	variable string T
	variable int G=0
	F:SetFilename["${OpenIC_Dir}/openic-test.txt"]
	F:Open[readonly]
	if ${F.Open}
	{
		while !${F.EOF} && ${G:Inc} <= 60
		{
			T:Set["${F.Read.Escape}"]
			if ${T.Find[Ogre](exists)}
				OpenIC:Say[test,"out|${T.Escape}"]
		}
		F:Close
	}
	OpenIC_TestWatch:Set[TRUE]
}

; Once a second while a test runs: the run's state; it ends when the run is over, or after 30 minutes.
function OpenIC_TestTick()
{
	variable string RunNow="unknown"
	variable string Vd=""
	variable string Nt=""
	variable bool Busy=FALSE
	variable bool Over=FALSE
	OpenIC_TestTicks:Inc
	if ${OpenIC_HasRunState}
		RunNow:Set["${ISXOgreEQ2.IC.RunState}"]
	if ${OpenIC_HasVerdict}
		Vd:Set["${ISXOgreEQ2.IC.Verdict}"]
	if ${OpenIC_HasNote}
		Nt:Set["${ISXOgreEQ2.IC.Note.Escape}"]
	if ${RunNow.Equal[running]} || ${RunNow.Equal[launching]} || ${RunNow.Equal[zoning in]}
		Busy:Set[TRUE]
	if ${Busy}
		OpenIC_TestSeen:Set[TRUE]
	if ${OpenIC_TestTicks} > 3600
		Over:Set[TRUE]
	if ${RunNow.Equal[unknown]} && ${OpenIC_TestTicks} > 6
		Over:Set[TRUE]
	if ${OpenIC_TestSeen} && !${Busy}
		Over:Set[TRUE]
	if !${OpenIC_TestSeen} && ${OpenIC_TestTicks} > 16
		Over:Set[TRUE]
	if ${Over}
	{
		OpenIC_TestWatch:Set[FALSE]
		OpenIC:Say[test,"end|${RunNow}|${Vd}|${Nt.Escape}"]
		return
	}
	OpenIC:Say[test,"state|${RunNow}|${Vd}|${Nt.Escape}"]
}

; Test in game, a fight file (saved where Ogre reads it): Ogre reloads its fight files, and three seconds later sets up
; for the named, the same as Start the fight setup now; then once a second, for two minutes, whether a fight file for
; that named is setting up or running ("fight|<TRUE or FALSE>").
; API: isxogreeq2 Encounter, Reload (in the background: it ends every setup in progress) and the member IsActive[mob];
; ogrebotapi Bot, SetUpFor (the named must be up in this zone, and Enable Heroic or Raid Setups ticked).
; UNVERIFIED for this release: no fight test run yet (no named up); IsActive is read only when this Ogre has it
; (OpenIC_ReadTypes: the Ogre of 2026-11-16 does).
atom(script) OpenIC_OnFightTest()
{
	if !${ISXOgreEQ2(exists)}
	{
		OpenIC:Say[say,"err:ISXOgreEQ2 is not loaded."]
		return
	}
	OpenIC_FightNamed:Set["${OpenIC.Arg[named]}"]
	if ${OpenIC_FightNamed.Length} == 0
		return
	ISXOgreEQ2.Encounter:Reload
	OpenIC_FightTicks:Set[0]
	OpenIC_FightWait:Set[6]
}

function OpenIC_FightTick()
{
	variable string Act="unknown"
	variable bool Over=FALSE
	OpenIC_FightTicks:Inc
	if ${OpenIC_HasIsActive}
		Act:Set["${ISXOgreEQ2.Encounter.IsActive["${OpenIC_FightNamed}"]}"]
	OpenIC:Say[test,"fight|${Act}"]
	if ${OpenIC_FightTicks} > 120
		Over:Set[TRUE]
	if ${Act.Equal[unknown]} && ${OpenIC_FightTicks} > 4
		Over:Set[TRUE]
	if ${Over}
	{
		OpenIC_FightNamed:Set[""]
		OpenIC:Say[test,"fightend|${Act}"]
	}
}

; The route ISXADD found, as "x,y,z;x,y,z;...": at most 180 points, so the message stays one short command.
; UNVERIFIED (ISXADD, not in Ogre's API reference): the members U1Nav.PointCount and U1Nav.PointX / PointY /
; PointZ[n] (ISXADD's help), counted from 1.
function OpenIC_SendRoute()
{
	variable int i
	variable int N=0
	variable string Pts=""
	if ${U1Nav.PointCount(exists)}
		N:Set[${U1Nav.PointCount}]
	for (i:Set[1] ; ${i} <= ${N} && ${i} <= 180 ; i:Inc)
	{
		if ${i} > 1
			Pts:Concat[";"]
		Pts:Concat["${U1Nav.PointX[${i}].Int},${U1Nav.PointY[${i}].Int},${U1Nav.PointZ[${i}].Int}"]
	}
	OpenIC:Say[route,"${Pts}"]
}

; ------------------------------------------------------------------ the window itself

; API: isxogrex, ISXOgreX.UI:Open[name,path,helpPath].
atom(script) OpenIC_OpenWindow()
{
	ISXOgreX.UI:Open[${OpenIC_Win},"${OpenIC_Dir}/OpenIC.html","${OpenIC_Dir}/OpenIC.md"]
}

; API: isxogrex, ISXOgreX.UI:EvalFile[path] runs a .js file in the UI page. The icon sheets and the ability list come
; in parts, OpenIC-assets-1.js, -2.js ...: one EvalFile is one message to Ogre's UI process and a message over its
; limit is dropped whole. Each part reports "<k>/<n>" in the window's openic-assets-got field, and the next one goes
; only then (OpenIC_AssetTick). Without them the window still works, with fewer icons.
; PROVEN 2026-11-17: EvalFile ran files of 256 KB to 4 MB; a 4.8 MB one never arrived ("to-exe ring full ... DROPPED").
atom(script) OpenIC_SendAssetPart()
{
	ISXOgreX.UI:EvalFile["${OpenIC_Dir}/OpenIC-assets-${OpenIC_AssetSent}.js"]
	OpenIC_AssetTicks:Set[0]
}

; Twice a second while parts are on the way: the window said the last one is in, so the next goes; 20 s without a
; word, they stop.
function OpenIC_AssetTick()
{
	variable string Got="${ISXOgreX.UI.Value[${OpenIC_Win},openic-assets-got]}"
	variable int K=${Int[${Got.Token[1,/]}]}
	variable int N=${Int[${Got.Token[2,/]}]}
	if ${K} == ${OpenIC_AssetSent} && ${N} > 0
	{
		if ${K} >= ${N}
		{
			OpenIC_AssetSent:Set[0]
			return
		}
		OpenIC_AssetSent:Inc
		OpenIC_SendAssetPart
		return
	}
	OpenIC_AssetTicks:Inc
	if ${OpenIC_AssetTicks} > 40
	{
		echo "Open IC Creator: the game icons stopped at part ${OpenIC_AssetSent}; the window works without them."
		OpenIC_AssetSent:Set[0]
	}
}

; API: events, OgreUI_Opened. Once the window is up: the extensions, where I stand, and the game icons.
atom(script) OpenIC_OnOpened(string name)
{
	if !${name.Equal[${OpenIC_Win}]}
		return
	OpenIC:SendExt
	OpenIC:SendMe
	OpenIC_AssetSent:Set[1]
	OpenIC_SendAssetPart
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

; Which of Ogre's members this Ogre has, read once: `lstype` lists a type's members and methods and prints no error, while
; asking for a member the type lacks prints one on the console every time, (exists) or not ("No such 'ogreeq2ic' member
; 'Validation'": the owner saw four of them each time the window opened).
; PROVEN 2026-11-17 (is1, ISXOgreEQ2 of 2026-11-16): redirect caught "Members of type ogreeq2ic" (Loaded RunId RunState
; Value State MaxWait FileOptionLabel ZoneEnd Running Zone Note Paused Verdict FileOption FileArgs), then "Methods of type
; ogreeq2ic", and the same for ogreeq2encounter (Loaded ActiveCount IsActive Current Sequences): no Validation in either.
function OpenIC_ReadTypes()
{
	variable file F
	variable string T
	variable string Kind=""
	variable int G=0
	redirect "${OpenIC_Dir}/openic-types.txt" lstype ogreeq2ic
	redirect -append "${OpenIC_Dir}/openic-types.txt" lstype ogreeq2encounter
	F:SetFilename["${OpenIC_Dir}/openic-types.txt"]
	F:Open[readonly]
	if !${F.Open}
		return
	while !${F.EOF} && ${G:Inc} <= 200
	{
		T:Set["${F.Read.Escape}"]
		if ${T.Find[Members of type ogreeq2ic](exists)}
			Kind:Set[ic]
		elseif ${T.Find[Members of type ogreeq2encounter](exists)}
			Kind:Set[enc]
		elseif ${T.Find[Methods of type](exists)}
			Kind:Set[""]
		elseif ${Kind.Equal[ic]}
		{
			if ${T.Find[Validation](exists)}
				OpenIC_HasCheck:Set[TRUE]
			if ${T.Find[RunState](exists)}
				OpenIC_HasRunState:Set[TRUE]
			if ${T.Find[Verdict](exists)}
				OpenIC_HasVerdict:Set[TRUE]
			if ${T.Find[Note](exists)}
				OpenIC_HasNote:Set[TRUE]
		}
		elseif ${Kind.Equal[enc]}
		{
			if ${T.Find[Validation](exists)}
				OpenIC_HasFCheck:Set[TRUE]
			if ${T.Find[IsActive](exists)}
				OpenIC_HasIsActive:Set[TRUE]
		}
	}
	F:Close
}

function main()
{
	variable int MeTick=0
	if !${ISXOgreX(exists)}
	{
		echo "Open IC Creator: ISXOgreX is not loaded. Load it first: ext ISXOgreX"
		return
	}
	if ${ISXOgreEQ2(exists)}
		call OpenIC_ReadTypes
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
	LavishScript:RegisterEvent[OpenIC_List]
	LavishScript:RegisterEvent[OpenIC_MkDir]
	LavishScript:RegisterEvent[OpenIC_Map]
	LavishScript:RegisterEvent[OpenIC_Verify]
	LavishScript:RegisterEvent[OpenIC_Test]
	LavishScript:RegisterEvent[OpenIC_TestStop]
	LavishScript:RegisterEvent[OpenIC_FightTest]
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
	Event[OpenIC_List]:AttachAtom[OpenIC_OnList]
	Event[OpenIC_MkDir]:AttachAtom[OpenIC_OnMkDir]
	Event[OpenIC_Map]:AttachAtom[OpenIC_OnMap]
	Event[OpenIC_Verify]:AttachAtom[OpenIC_OnVerify]
	Event[OpenIC_Test]:AttachAtom[OpenIC_OnTest]
	Event[OpenIC_TestStop]:AttachAtom[OpenIC_OnTestStop]
	Event[OpenIC_FightTest]:AttachAtom[OpenIC_OnFightTest]
	Event[OgreUI_Opened]:AttachAtom[OpenIC_OnOpened]
	Event[OgreUI_Closed]:AttachAtom[OpenIC_OnClosed]
	OpenIC_OpenWindow

	; Twice a second: the icon parts on the way and a folder the window asked for; once a second: where I stand (the window's Here buttons), and a
	; route preview when one was asked for.
	; API: isxogrex, ISXOgreX.UI.Window[name] (NULL when no window by that name is open).
	while TRUE
	{
		if ${OpenIC_AssetSent} > 0
			call OpenIC_AssetTick
		if ${OpenIC_MkRel.Length} > 0
			call OpenIC_MakeDirs
		MeTick:Inc
		if ${MeTick} >= 2
		{
			MeTick:Set[0]
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
		}
		; Ask Ogre: Ogre's lines about the file, a second after its reload (OpenIC_OnVerify)
		if ${OpenIC_VerifyWait} > 0
		{
			OpenIC_VerifyWait:Dec
			if ${OpenIC_VerifyWait} == 0
				call OpenIC_SendVerify
		}
		; Test in game: what Ogre printed, then the run's state once a second (OpenIC_OnTest)
		if ${OpenIC_TestWait} > 0
		{
			OpenIC_TestWait:Dec
			if ${OpenIC_TestWait} == 0
				call OpenIC_SendTestOut
		}
		if ${OpenIC_TestWatch} && ${MeTick} == 0
			call OpenIC_TestTick
		; a fight test: the setup three seconds after the reload, then whether it runs (OpenIC_OnFightTest)
		if ${OpenIC_FightWait} > 0
		{
			OpenIC_FightWait:Dec
			if ${OpenIC_FightWait} == 0
			{
				; API: ogrebotapi Bot, SetUpFor[fw,what,restart] (as OpenIC_OnSetUp).
				OgreBotAPI.Bot:SetUpFor[igw:${Me.Name},"${OpenIC_FightNamed}",TRUE]
				OpenIC:Say[test,"fight|asked"]
			}
		}
		elseif ${OpenIC_FightNamed.Length} > 0 && ${MeTick} == 0
			call OpenIC_FightTick
		wait 5
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
	Event[OpenIC_List]:DetachAtom[OpenIC_OnList]
	Event[OpenIC_MkDir]:DetachAtom[OpenIC_OnMkDir]
	Event[OpenIC_Map]:DetachAtom[OpenIC_OnMap]
	Event[OpenIC_Verify]:DetachAtom[OpenIC_OnVerify]
	Event[OpenIC_Test]:DetachAtom[OpenIC_OnTest]
	Event[OpenIC_TestStop]:DetachAtom[OpenIC_OnTestStop]
	Event[OpenIC_FightTest]:DetachAtom[OpenIC_OnFightTest]
	Event[OgreUI_Opened]:DetachAtom[OpenIC_OnOpened]
	Event[OgreUI_Closed]:DetachAtom[OpenIC_OnClosed]
	; API: isxogrex, ISXOgreX.UI:Close[name].
	ISXOgreX.UI:Close[${OpenIC_Win}]
}
