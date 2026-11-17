/* Open IC Creator - ic-oc-picker.js
   OgreBot command picker (IC.oc): native OgreBot commands written for-who first, with plain-words descriptions
   and checks of an "oc" console line.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var O = IC.oc = IC.oc || {};
  function str(v) { return v == null ? '' : String(v); }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  function $(id) { return (typeof document !== 'undefined') ? document.getElementById(id) : null; }
  function esc(s) { return IC.form && IC.form.esc ? IC.form.esc(s) : str(s); }
  function tip(t) { return IC.form && IC.form.tip ? IC.form.tip(t) : ''; }

  var cats = [
    { id: 'common', name: 'Common', expanded: true, cmds: [
      { label: 'LetsGo', cmd: 'oc !ci -LetsGo igw:${Me.Name}', tip: 'Removes movement holds (Hold Up, the camp spot): the group follows again' },
      { label: 'Pause', cmd: 'oc !ci -Pause igw:${Me.Name}', tip: 'Pause all bot actions until resumed' },
      { label: 'Resume', cmd: 'oc !ci -Resume igw:${Me.Name}', tip: 'Resume all bot actions after a pause' },
      { label: 'PetOff', cmd: 'oc !ci -PetOff igw:${Me.Name}', tip: 'Call the combat pets back' },
      { label: 'Repair Gear', cmd: 'oc !ci -RepairGear igw:${Me.Name}', tip: 'Repair all equipped gear (RepairGear is the only repair command -- "Mend" is a colloquial alias that maps here)' },
      { label: 'CampSpot Here', cmd: 'oc !ci -ChangeCampSpotWho igw:${Me.Name} POSHERE', tip: 'Set camp position for this session to current location', pos: true },
      { label: 'Come2Me', cmd: 'oc !ci -Come2Me igw:${Me.Name} ${Me.Name}', tip: 'My group moves to me (native: who moves first, then who to move to)', args: [{ label: 'Come to', grab: 'target', person: true }] }
    ]},
    { id: 'movement', name: 'Movement', cmds: [
      { label: 'LetsGo', cmd: 'oc !ci -LetsGo igw:${Me.Name}', tip: 'Resume movement' },
      { label: 'HoldUp', cmd: 'oc !ci -HoldUp igw:${Me.Name}', tip: 'Turns auto follow off' },
      { label: 'CampSpot Here', cmd: 'oc !ci -ChangeCampSpotWho igw:${Me.Name} POSHERE', tip: 'Set camp to current position', pos: true },
      { label: 'ForceFollow', cmd: 'oc !ci -ForceFollow igw:${Me.Name}', tip: 'Force the group to follow their follow target' },
      { label: 'Come2Me', cmd: 'oc !ci -Come2Me igw:${Me.Name} ${Me.Name}', tip: 'My group moves to me (native: who moves first, then who to move to)', args: [{ label: 'Come to', grab: 'target', person: true }] },
      { label: 'NoMove', cmd: 'oc !ci -NoMove igw:${Me.Name}', tip: 'Stops moving in the fight (into melee range, behind the mob) until LetsGo clears it' },
      { label: 'Run', cmd: 'oc !ci -Run igw:${Me.Name}', tip: 'Run (not walk). Native has no run/walk toggle: Run sets run, a box already running is left alone' },
      { label: 'Walk', cmd: 'oc !ci -Walk igw:${Me.Name}', tip: 'Walk (not run). Sets walk; a box already walking is left alone' },
      { label: 'Walk There (mesh)', cmd: 'oc !ci -NavTo igw:${Me.Name} POSHERE', tip: 'Walk to the spot on the nav mesh (here; edit the x y z under Advanced). Stops with OgreBot', pos: true },
      { label: 'Stop Mesh Walk', cmd: 'oc !ci -NavStop igw:${Me.Name}', tip: 'Stops the mesh walk in progress' },
      { label: 'Move There (no target)', cmd: 'oc !ci -MoveToAreaNoTarget igw:${Me.Name} POSHERE', tip: 'Moves to x y z with or without a target (the height is ignored)', pos: true },
      { label: 'Waypoint Here', cmd: 'oc !ci -Waypoint igw:${Me.Name} POSHERE', tip: 'Sets a waypoint at x y z', pos: true },
      { label: 'Stand Up', cmd: 'oc !ci -stand igw:${Me.Name}', tip: 'Stand up (after feign death)' },
      { label: 'Jump', cmd: 'oc !ci -Jump igw:${Me.Name}', tip: 'Jump' },
      { label: 'Face Heading', cmd: 'oc !ci -FaceAngle igw:${Me.Name} VALUE', tip: 'Face a heading angle (replace VALUE)', args: [{ label: 'Heading', unit: 'deg', num: true }] },
      { label: 'Free Concentration', cmd: 'oc !ci -GetToConcentration igw:${Me.Name} 4', tip: 'Frees concentration until this much (4) is available', args: [{ label: 'Until this much is free', num: true }] },
      { label: 'Mount Up', cmd: 'oc !ci -Force_MountOn igw:${Me.Name}', tip: 'Cancels and recasts your mount' },
      { label: 'Dismount', cmd: 'oc !ci -Force_MountOff igw:${Me.Name}', tip: 'Gets off the mount' },
      { label: 'Land Flying Mount', cmd: 'oc !ci -LandFlyingMount igw:${Me.Name}', tip: 'Lands a flying mount' },
      { label: 'Follow Closer', cmd: 'oc !ci -OFolDecDistance igw:${Me.Name}', tip: 'Decreases the OgreFollow distance' },
      { label: 'Follow Farther', cmd: 'oc !ci -OFolIncDistance igw:${Me.Name}', tip: 'Increases the OgreFollow distance' },
      { label: 'Follow Me', more: true, cmd: 'oc !ci -ogrefollow igw:${Me.Name} ${Me.Name} 8 200', tip: 'My group follows me with OgreBot\'s own follow, 8 m behind, from up to 200 m away',
        args: [{ label: 'Follow', grab: 'target', person: true }, { label: 'Stay within', unit: 'm', num: true }, { label: 'From up to', unit: 'm', num: true }] },
      { label: 'Jump a Gap', more: true, cmd: 'oc !ci -Set_CampSpotJump_Handle igw:${Me.Name} "STARTSPOT" "JUMPSPOT" "LANDSPOT" "DONESPOT"',
        tip: 'My group lines up at the first spot, runs at the landing spot and jumps at the jump spot, then camps at the last spot (0,0,0 = where it lands)' },
      { label: 'Fly / Swim Up', more: true, cmd: 'oc !ci -FlyUp igw:${Me.Name}', tip: 'Starts flying (or swimming) up until Stop Flying. It is not an on / off switch' },
      { label: 'Fly / Swim Down', more: true, cmd: 'oc !ci -FlyDown igw:${Me.Name}', tip: 'Starts flying (or swimming) down until Stop Flying' },
      { label: 'Stop Flying', more: true, cmd: 'oc !ci -FlyStop igw:${Me.Name}', tip: 'Stops flying (or swimming) up or down' },
      { label: 'Crouch', more: true, cmd: 'oc !ci -Crouch igw:${Me.Name}', tip: 'Presses the crouch key' },
      { label: 'Auto-Run Key', more: true, cmd: 'oc !ci -AutoRun igw:${Me.Name}', tip: 'Presses the auto-run key (press it again to stop)' }
    ]},
    { id: 'joust', name: 'Joust', cmds: [
      { label: 'Joust Out', cmd: 'oc !ci -joustout igw:${Me.Name}', tip: 'Joust out: with the camp spot on, step out to it' },
      { label: 'Joust In', cmd: 'oc !ci -joustin igw:${Me.Name}', tip: 'Joust in: with the camp spot on, go back in (if allowed)' },
      { label: 'Joust Off (casters)', cmd: 'oc !ci -joustoff igw:${Me.Name}+caster', tip: 'The casters in my group may not joust in (they stay out)' },
      { label: 'Joust On (melee)', cmd: 'oc !ci -jouston igw:${Me.Name}+melee', tip: 'Lets the melee in my group joust in again (it does not move them)' }
    ]},
    { id: 'combat', name: 'Combat', cmds: [
      { label: 'PetOff', cmd: 'oc !ci -PetOff igw:${Me.Name}', tip: 'Call the pets back' },
      { label: 'PetAttack', cmd: 'oc !ci -PetAttack igw:${Me.Name}', tip: 'Pets attack the current target' },
      { label: 'PetAssist', cmd: 'oc !ci -PetAssist igw:${Me.Name}', tip: 'Pets assist target' },
      { label: 'PetGetLost', cmd: 'oc !ci -PetGetLost igw:${Me.Name}', tip: 'Dismiss pet entirely (get lost)' },
      { label: 'CancelCasting', cmd: 'oc !ci -CancelCasting igw:${Me.Name}', tip: 'Cancel the currently casting spell' },
      { label: 'Evac', cmd: 'oc !ci -Evac igw:${Me.Name}', tip: 'Anyone with an evacuate ability uses it' },
      { label: 'Assist Target', cmd: 'oc !ci -AssistForWho igw:${Me.Name} TARGETNAME', tip: 'My group assists TARGETNAME (-AssistForWho: the for-who first, then who to assist)', args: [{ label: 'Assist', grab: 'target', person: true }] },
      { label: 'Interrupt', cmd: 'oc !ci -Cast_Interrupt igw:${Me.Name} TARGETNAME', tip: 'Casts an interrupt on a mob (name or id)' },
      { label: 'Dispel (any)', cmd: 'oc !ci -DispellNPCWithAny igw:${Me.Name} TARGETNAME', tip: 'Dispels the NPC with an ability or an item' },
      { label: 'Dispel (item)', cmd: 'oc !ci -DispellNPCWithItem igw:${Me.Name} TARGETNAME', tip: 'Dispels the NPC with a dispel item' },
      { label: 'Dispel (spell)', cmd: 'oc !ci -DispellNPCWithSpell igw:${Me.Name} TARGETNAME', tip: 'Dispels the NPC with a class dispel ability' },
      { label: 'No Offensive On', cmd: 'oc !ci -SetNoOffensive igw:${Me.Name} TRUE', tip: 'Stops ALL offensive actions (casts and auto-attack) until turned off' },
      { label: 'No Offensive Off', cmd: 'oc !ci -SetNoOffensive igw:${Me.Name} FALSE', tip: 'Offensive actions again' },
      { label: 'No Offensive On Mob', cmd: 'oc !ci -AddNoOffensiveOn igw:${Me.Name} TARGETNAME', tip: 'Adds a mob to the no-offensive list (exact name)' },
      { label: 'Attack Mob Again', cmd: 'oc !ci -RemoveNoOffensiveOn igw:${Me.Name} TARGETNAME', tip: 'Removes a mob from the no-offensive list' },
      { label: 'Clear No-Offensive List', cmd: 'oc !ci -ClearNoOffensiveOn igw:${Me.Name}', tip: 'Clears the no-offensive list' },
      { label: 'No Defensive On', cmd: 'oc !ci -SetNoDefensive igw:${Me.Name} TRUE', tip: 'Turns "no defensive" on' },
      { label: 'No Defensive Off', cmd: 'oc !ci -SetNoDefensive igw:${Me.Name} FALSE', tip: 'Turns "no defensive" off' },
      { label: 'Bow Abilities Off', cmd: 'oc !ci -SetNoReqBowAbilities igw:${Me.Name} TRUE', tip: 'Turns abilities that need a bow off' },
      { label: 'Bow Abilities On', cmd: 'oc !ci -SetNoReqBowAbilities igw:${Me.Name} FALSE', tip: 'Turns abilities that need a bow back on' },
      { label: 'Threat Ignore Add', cmd: 'oc !ci -ThreatFighterIgnoreList_Add igw:${Me.Name} PLAYERNAME', tip: 'Adds to the fighters\' threat-ignore list' },
      { label: 'Threat Ignore Remove', cmd: 'oc !ci -ThreatFighterIgnoreList_Remove igw:${Me.Name} PLAYERNAME', tip: 'Removes from the fighters\' threat-ignore list' },
      { label: 'Threat Ignore Clear', cmd: 'oc !ci -ThreatFighterIgnoreList_Clear igw:${Me.Name}', tip: 'Clears the fighters\' threat-ignore list' },
      { label: 'Auto-Hunt Off', cmd: 'oc !ci -autohunt igw:${Me.Name} off', tip: 'Stops the Auto-Hunt driver' },
      { label: 'Target', cmd: 'oc !ci -Target igw:${Me.Name} TARGETNAME', tip: 'My group targets a mob or player by name (part of a name works)' },
      { label: 'Drop Targets', more: true, cmd: 'oc !ci -NoTarget igw:${Me.Name}', tip: 'My group clears its targets (it also stops a Come2Me)' }
    ]},
    { id: 'killlist', name: 'Kill list (auto-target)', cmds: [
      { label: 'AutoTarget On', cmd: 'oc !ci -AutoTarget_Enable igw:${Me.Name}', tip: 'Lets Auto-Target run again after AutoTarget Off (it does not tick the Auto-Target box: see AutoTarget Box On)' },
      { label: 'AutoTarget Off', cmd: 'oc !ci -AutoTarget_Disable igw:${Me.Name}', tip: 'Pauses Auto-Target until AutoTarget On (the box stays ticked)' },
      { label: 'AutoTarget Box On', cmd: 'oc !ci -AutoTargetToggle igw:${Me.Name} TRUE', tip: 'Ticks the Auto-Target box' },
      { label: 'AutoTarget Box Off', cmd: 'oc !ci -AutoTargetToggle igw:${Me.Name} FALSE', tip: 'Unticks the Auto-Target box' },
      { label: 'Out-of-combat Scan On', cmd: 'oc !ci -AutoTargetOCSToggle igw:${Me.Name} TRUE', tip: 'Auto-Target also scans out of combat' },
      { label: 'Out-of-combat Scan Off', cmd: 'oc !ci -AutoTargetOCSToggle igw:${Me.Name} FALSE', tip: 'Auto-Target scans in combat only' },
      { label: 'AutoTarget Add', cmd: 'oc !ci -AutoTarget_AddActor igw:${Me.Name} TARGETNAME', tip: 'Add actor to auto-target list' },
      { label: 'AutoTarget Remove', cmd: 'oc !ci -AutoTarget_RemoveActor igw:${Me.Name} TARGETNAME', tip: 'Removes every auto-target entry with that name' },
      { label: 'AutoTarget Clear', cmd: 'oc !ci -AutoTarget_ClearActors igw:${Me.Name}', tip: 'Clear auto-target actor list' },
      { label: 'Scan Radius 50', cmd: 'oc !ci -AutoTarget_SetScanRadius igw:${Me.Name} 50', tip: 'Auto-target looks this far around (edit the number)', args: [{ label: 'Look within', unit: 'm', num: true }] },
      { label: 'Scan Height 5', cmd: 'oc !ci -AutoTarget_SetScanHeight igw:${Me.Name} 5', tip: 'Auto-target looks this far up and down', args: [{ label: 'Up and down', unit: 'm', num: true }] },
      { label: 'Load Kill List', cmd: 'oc !ci -LoadAutoTargetList igw:${Me.Name} LISTNAME', tip: 'Loads a saved auto-target list (native: the for-who first, then the list)' },
      { label: 'Target Lock (my target)', cmd: 'oc !ci -targetlock igw:${Me.Name} ${Target.ID}', tip: 'Locks targeting to my current target, above auto-target and assist, until cleared' },
      { label: 'Target Lock Off', cmd: 'oc !ci -targetlock igw:${Me.Name} off', tip: 'Releases the target lock' }
    ]},
    { id: 'settings', name: 'Settings & Modes', cmds: [
      { label: 'Pause', cmd: 'oc !ci -Pause igw:${Me.Name}', tip: 'Pause all bot actions' },
      { label: 'Resume', cmd: 'oc !ci -Resume igw:${Me.Name}', tip: 'Resume all bot actions' },
      { label: 'SetUpFor Intercept', cmd: 'oc !ci -OgreBotAPI igw:${Me.Name} SetUpFor_Intercept', tip: 'Sets up tank intercept. Native has no -SetUpFor_Intercept command; its OgreBotAPI SetUpFor_Intercept works as before (DOCS ogrebotapi.md), reached through -OgreBotAPI' },
      { label: 'Dispels On', cmd: 'oc !ci -Enable_Dispells igw:${Me.Name}', tip: 'Turns dispels on (unticks No Dispels). Native has no console command for the old dispel set-up (only OgreBotAPI.Abilities:SetUpForDispells in a script)' },
      { label: 'Disable Cures', cmd: 'oc !ci -ChangeOgreBotUIOption igw:${Me.Name} checkbox_settings_disablecaststack_cure TRUE', tip: 'Ticks Disable CS_Cure: cast-stack cures are skipped (called-for cures still go out)' },
      { label: 'Enable Cures', cmd: 'oc !ci -ChangeOgreBotUIOption igw:${Me.Name} checkbox_settings_disablecaststack_cure FALSE', tip: 'Unticks Disable CS_Cure: cures from the cast stack again' },
      { label: 'Disable Stuns', cmd: 'oc !ci -ChangeOgreBotUIOption igw:${Me.Name} checkbox_settings_nostuns TRUE', tip: 'Ticks No Stuns: no abilities the game marks as stuns' },
      { label: 'Enable Stuns', cmd: 'oc !ci -ChangeOgreBotUIOption igw:${Me.Name} checkbox_settings_nostuns FALSE', tip: 'Unticks No Stuns' },
      { label: 'Disable Dispells', cmd: 'oc !ci -Disable_Dispells igw:${Me.Name}', tip: 'Turns dispels off (ticks No Dispels)' },
      { label: 'Disable Interrupts', cmd: 'oc !ci -Disable_Interrupts igw:${Me.Name}', tip: 'Turns interrupts off' },
      { label: 'Enable Interrupts', cmd: 'oc !ci -Enable_Interrupts igw:${Me.Name}', tip: 'Turns interrupts on' },
      { label: 'Watch NPC Casts On', cmd: 'oc !ci -ChangeOgreBotUIOption igw:${Me.Name} checkbox_settings_npc_cast_monitoring TRUE', tip: 'Ticks NPC Cast Monitoring: the bot watches nearby mobs\' casts (zone and fight files react to them)' },
      { label: 'Watch NPC Casts Off', cmd: 'oc !ci -ChangeOgreBotUIOption igw:${Me.Name} checkbox_settings_npc_cast_monitoring FALSE', tip: 'Unticks NPC Cast Monitoring' },
      { label: 'Disable AOEs', cmd: 'oc !ci -Set_DisableAllAOEs_AllParams igw:${Me.Name} TRUE', tip: 'Turns AE abilities off (add -AllowEncounters under Advanced to keep encounter AEs)' },
      { label: 'Enable AOEs', cmd: 'oc !ci -Set_DisableAllAOEs_AllParams igw:${Me.Name} FALSE', tip: 'Turns AE abilities back on' },
      { label: 'Cast Stack Tag On', cmd: 'oc !ci -ChangeCastStackListBoxItemByTag igw:${Me.Name} TAGNAME TRUE', tip: 'Turns the cast-stack entries with this tag on' },
      { label: 'Cast Stack Tag Off', cmd: 'oc !ci -ChangeCastStackListBoxItemByTag igw:${Me.Name} TAGNAME FALSE', tip: 'Turns the cast-stack entries with this tag off' },
      { label: 'Option Quietly', cmd: 'oc !ci -UplinkOptionSilent igw:${Me.Name} OPTIONID TRUE', tip: 'Changes an OgreBot option without announcing it (option id, then the value)', args: [null, { label: 'Turn it', opts: [['TRUE', 'On'], ['FALSE', 'Off']] }] },
      { label: 'Load Profile', cmd: 'oc !ci -LoadProfile igw:${Me.Name} PROFILENAME', tip: 'Loads an OgreBot profile (native: the for-who first, then the profile)' },
      { label: 'Fight Set-up', cmd: 'oc !ci -SetUpFor igw:${Me.Name} TARGETNAME', tip: 'Starts OgreBot\'s fight set-up for the named (its exact name)', args: [{ label: 'Named', grab: 'target', help: 'Its exact name.' }] },
      { label: 'Show Set-ups', cmd: 'oc !ci -ShowAvailableSetups igw:${Me.Name}', tip: 'Shows the raid or heroic set-ups OgreBot has' }
    ]},
    { id: 'healing', name: 'Healing & Cures', cmds: [
      { label: 'Repair Gear', cmd: 'oc !ci -RepairGear igw:${Me.Name}', tip: 'Repair equipped gear' },
      { label: 'Group Cure', cmd: 'oc !ci -GroupCure igw:${Me.Name}', tip: 'Asks for a group cure' },
      { label: 'Auto Cure', cmd: 'oc !ci -AutoCure igw:${Me.Name} ${Me.Name}', tip: 'Asks my group to cure me (the name after the for-who is who gets cured)', args: [{ label: 'Cure', grab: 'target', person: true }] },
      { label: 'Auto Curse', cmd: 'oc !ci -AutoCurse igw:${Me.Name} ${Me.Name}', tip: 'Asks my group to cure the curse on me', args: [{ label: 'Cure the curse on', grab: 'target', person: true }] },
      { label: 'ImmRes', cmd: 'oc !ci -ImmRes igw:${Me.Name} 2', tip: 'Clerics use Immaculate Revival when 2 are dead (always when a priest or fighter is dead). Native reads the for-who first', args: [{ label: 'When this many are dead', num: true }] },
      { label: 'Cure Potion', cmd: 'oc !ci -AutoItemCure igw:${Me.Name} CURETYPE', tip: 'Each box drinks a Cure potion of that type (Arcane, Elemental, Noxious or Trauma) from its bags' },
      { label: 'Group Cure Watch', cmd: 'oc !ci -AutoGroupCure igw:${Me.Name} PLAYERNAME', tip: 'Asks my group to watch a player for a group cure' },
      { label: 'Cancel Detriment', cmd: 'oc !ci -CancelDetrimental igw:${Me.Name} MAINID BACKDROPID', tip: 'Cancels a detriment by its icon ids (main, backdrop)' },
      { label: 'Restock Cure Potions', cmd: 'oc !ci -CurePotions_Replenish igw:${Me.Name} all', tip: 'Restocks cure potions from the depot (all, Arcane, Trauma, Noxious or Elemental)', args: [{ label: 'Which', opts: [['all', 'Every kind'], ['Arcane', 'Arcane'], ['Elemental', 'Elemental'], ['Noxious', 'Noxious'], ['Trauma', 'Trauma']] }] },
      { label: 'Revive', cmd: 'oc !ci -Revive igw:${Me.Name}', tip: 'Presses the revive button' },
      { label: 'Rez On', cmd: 'oc !ci -Res igw:${Me.Name}', tip: 'Unticks Disable CS_Res: the cast stack rezzes again' },
      { label: 'Rez Off', cmd: 'oc !ci -StopRes igw:${Me.Name}', tip: 'Ticks Disable CS_Res: no rezzes from the cast stack' },
      { label: 'Rez Stone', cmd: 'oc !ci -ResStone igw:${Me.Name}', tip: 'All priests cast their resurrection stone' }
    ]},
    { id: 'abilities', name: 'Abilities & Runes', cmds: [
      { label: 'Belt Stun', cmd: 'oc !ci -ChangeBeltAdorn igw:${Me.Name} stun', tip: 'Swap belt rune to stun resist (ForWho first, AdornType second)' },
      { label: 'Belt Fear', cmd: 'oc !ci -ChangeBeltAdorn igw:${Me.Name} fear', tip: 'Swap belt rune to fear resist' },
      { label: 'Belt Stifle', cmd: 'oc !ci -ChangeBeltAdorn igw:${Me.Name} stifle', tip: 'Swap belt rune to stifle resist' },
      { label: 'Belt Mez', cmd: 'oc !ci -ChangeBeltAdorn igw:${Me.Name} mez', tip: 'Swap belt rune to mez resist' },
      { label: 'CastAbility', cmd: 'oc !ci -CastAbility igw:${Me.Name} "ABILITYNAME"', tip: 'Cast a specific ability (ForWho first, AbilityName second)' },
      { label: 'CastAbility NoChecks', cmd: 'oc !ci -CastAbilityNoChecks igw:${Me.Name} "ABILITYNAME"', tip: 'Cast ability bypassing standard checks' },
      { label: 'Cast On Player', cmd: 'oc !ci -CastAbilityOnPlayer igw:${Me.Name} "ABILITYNAME" PLAYERNAME', tip: 'Casts an ability on a player (base name: Kick, not Kick III)' },
      { label: 'Cast On NPC', cmd: 'oc !ci -CastAbilityOnNPC igw:${Me.Name} "ABILITYNAME" TARGETNAME', tip: 'Casts an ability on an NPC (base name)' },
      { label: 'Cast In Seconds', cmd: 'oc !ci -CastAbilityInSeconds igw:${Me.Name} "ABILITYNAME" 5', tip: 'Casts the ability after 5 seconds', args: [null, { label: 'After', unit: 's', num: true }] },
      { label: 'Cast On Player In Seconds', cmd: 'oc !ci -CastAbilityOnPlayerInSeconds igw:${Me.Name} "ABILITYNAME" PLAYERNAME 5', tip: 'Casts the ability on a player after 5 seconds', args: [null, null, { label: 'After', unit: 's', num: true }] },
      { label: 'Cast On Player NoChecks', cmd: 'oc !ci -CastAbilityOnPlayerNoChecks igw:${Me.Name} "ABILITYNAME" PLAYERNAME', tip: 'Casts an ability on a player with no checks' },
      { label: 'Cast Bulwark Now', cmd: 'oc !ci -CastBulwarkImmediately igw:${Me.Name}', tip: 'Casts Bulwark right away' },
      { label: 'Cast Rescue', cmd: 'oc !ci -CastRescue_AP igw:${Me.Name}', tip: 'Casts a rescue' },
      { label: 'Cast HO Ability', cmd: 'oc !ci -CastHOIconID igw:${Me.Name} "ABILITYNAME"', tip: 'Casts the ability for a heroic-opportunity icon' },
      { label: 'Group Water Breathing', cmd: 'oc !ci -CastGroupWaterBreathing igw:${Me.Name}', tip: 'Casts group water breathing' },
      { label: 'Cancel Water Breathing', cmd: 'oc !ci -CancelGroupWaterBreathing igw:${Me.Name}', tip: 'Cancels group water breathing' },
      { label: 'Hold Ability', cmd: 'oc !ci -AbilityEmbargo igw:${Me.Name} ABILITYID 10', tip: 'These boxes do not cast that ability id for 10 seconds (rotations)', args: [null, { label: 'For', unit: 's', num: true }] },
      { label: 'Lift Ability Hold', cmd: 'oc !ci -AbilityEmbargo_ResetAbilityEmbargo igw:${Me.Name} ABILITYID', tip: 'Clears one ability hold' },
      { label: 'Lift All Ability Holds', cmd: 'oc !ci -AbilityEmbargo_ResetAllAbilityEmbargos igw:${Me.Name}', tip: 'Clears every ability hold' },
      { label: 'Hold Item', cmd: 'oc !ci -ItemEmbargo igw:${Me.Name} ABILITYID 10', tip: 'These boxes do not use that item ability id for 10 seconds', args: [null, { label: 'For', unit: 's', num: true }] },
      { label: 'Cancel On Cast', cmd: 'oc !ci -CancelOnCast igw:${Me.Name} "ABILITYNAME"', tip: 'Fires the Cancel On Cast rows as if this ability had just been cast' },
      { label: 'Track Ability', cmd: 'oc !ci -AbilityTracker_Add igw:${Me.Name} "ABILITYNAME"', tip: 'Adds an ability to the Ability Tracker' },
      { label: 'Rebuff', cmd: 'oc !ci -Rebuff igw:${Me.Name}', tip: 'Cancels all buffs (only abilities in your own spell book)' },
      { label: 'Ascension On', cmd: 'oc !ci -ChangeCastStackListBoxItem igw:${Me.Name} Ascension TRUE', tip: 'Enable Ascension cast-stack section' },
      { label: 'Ascension Off', cmd: 'oc !ci -ChangeCastStackListBoxItem igw:${Me.Name} Ascension FALSE', tip: 'Disable Ascension cast-stack section' },
      { label: 'Cancel Maintained', cmd: 'oc !ci -CancelMaintained igw:${Me.Name} "EFFECTNAME"', tip: 'Cancel a maintained effect by name (native: the for-who first, then the effect)' },
      { label: 'Hold Tagged Abilities', more: true, cmd: 'oc !ci -AbilityTagEmbargo igw:${Me.Name} TAGNAME 10', tip: 'My group holds back the casting-list abilities with this tag for 10 seconds',
        args: [null, { label: 'For', unit: 's', num: true }] },
      { label: 'Allow Tagged Abilities', more: true, cmd: 'oc !ci -AbilityTagEmbargo igw:${Me.Name} TAGNAME 10 Allow',
        tip: 'For 10 seconds my group may cast the casting-list abilities that wait for this tag (the JQB buff-up allows its pre-cast tag this way)',
        args: [null, { label: 'For', unit: 's', num: true }] }
    ]},
    { id: 'positioning', name: 'Positioning & CampSpot', cmds: [
      { label: 'Move2Area Here', cmd: 'oc !ci -Move2Area igw:${Me.Name} POSHERE', tip: 'Move to coordinates (one-shot, no campspot)', pos: true },
      { label: 'FaceActor', cmd: 'oc !ci -FaceActor igw:${Me.Name} TARGETNAME', tip: 'Face a named actor' },
      { label: 'FaceLoc Here', cmd: 'oc !ci -FaceLoc igw:${Me.Name} POSHERE', tip: 'Face toward coordinates', pos: true },
      { label: 'CampSpot Here', cmd: 'oc !ci -ChangeCampSpotWho igw:${Me.Name} POSHERE', tip: 'Set primary camp position to current coords', pos: true },
      { label: 'CampSpot Coords', cmd: 'oc !ci -ChangeCampSpotWho igw:${Me.Name} X Y Z', tip: 'Set primary camp position to specific X Y Z (edit the X Y Z)' },
      { label: 'CS HowClose 2', cmd: 'oc !ci -CS_Set_HowClose igw:${Me.Name} 2', tip: 'Distance counted as \"arrived\" at campspot (default 2)', args: [{ label: 'Within', unit: 'm', num: true }] },
      { label: 'CS HowFar 200', cmd: 'oc !ci -CS_Set_HowFar igw:${Me.Name} 200', tip: 'Max distance; bigger jumps treated as sanity errors (default 200)', args: [{ label: 'Up to', unit: 'm', num: true }] },
      { label: 'CS Move By', cmd: 'oc !ci -CS_Set_ChangeCampSpotBy igw:${Me.Name} 0 0 0', tip: 'Moves the camp spot by x y z (edit the three numbers)', args: [{ label: 'x by', num: true }, { label: 'y by (height)', num: true }, { label: 'z by', num: true }] },
      { label: 'CS Clear', cmd: 'oc !ci -CS_ClearCampSpot igw:${Me.Name}', tip: 'Clear the primary campspot entirely' },
      { label: 'CS Clear All', cmd: 'oc !ci -CS_ClearAll igw:${Me.Name}', tip: 'Clear absolute AND relative -- full reset' },
      { label: 'CS Relative Here', cmd: 'oc !ci -CS_Set_Relative igw:${Me.Name} POSHERE', tip: 'Temporary offset to current position -- clearing returns to absolute', pos: true },
      { label: 'CS Relative By', cmd: 'oc !ci -CS_Set_ChangeRelativeCampSpotBy igw:${Me.Name} 0 0 0', tip: 'Moves the temporary (relative) spot by x y z; clearing it returns to the group spot', args: [{ label: 'x by', num: true }, { label: 'y by (height)', num: true }, { label: 'z by', num: true }] },
      { label: 'CS Clear Relative', cmd: 'oc !ci -CS_ClearRelative igw:${Me.Name}', tip: 'Drop the relative override, return to absolute campspot' },
      { label: 'Behind NPC 5m', cmd: 'oc !ci -SetCS_BehindNPC igw:${Me.Name} ${Actor[ExactName,"TARGETNAME"].ID} 5', tip: 'Camp 5m directly behind named NPC', args: [null, { label: 'Distance', unit: 'm', num: true }] },
      { label: 'InFront NPC 5m', cmd: 'oc !ci -SetCS_InFrontNPC igw:${Me.Name} ${Actor[ExactName,"TARGETNAME"].ID} 5', tip: 'Camp 5m in front of named NPC (180 deg cone)', args: [null, { label: 'Distance', unit: 'm', num: true }] },
      { label: 'Position NPC', cmd: 'oc !ci -SetCS_PositionNPC igw:${Me.Name} ${Actor[ExactName,"TARGETNAME"].ID} 5', tip: 'Fighters front, others back relative to NPC', args: [null, { label: 'Distance', unit: 'm', num: true }] },
      { label: 'Custom Angle NPC', cmd: 'oc !ci -SetCS_NPC igw:${Me.Name} 90 ${Actor[ExactName,"TARGETNAME"].ID} 5', tip: 'Camp at custom angle (0=behind, 180=front) relative to NPC', args: [{ label: 'Angle', unit: 'deg', num: true, help: '0 = behind, 90 = right, 180 = in front, 270 = left.' }, null, { label: 'Distance', unit: 'm', num: true }] },
      { label: 'Circle Formation', cmd: 'oc !ci -CS_Set_Formation_Circle igw:${Me.Name} 5 POSHERE FALSE', tip: 'Arrange group in a circle (dist 5m) around coords -- useful for spread mechanics', pos: true, args: [{ label: 'Distance', unit: 'm', num: true }] },
      { label: 'Monkey In Middle', cmd: 'oc !ci -CS_Set_Formation_MonkeyInMiddle igw:${Me.Name} 5 POSHERE ${Me.Name}', tip: 'One toon in center (me), rest in circle around', pos: true, args: [{ label: 'Distance', unit: 'm', num: true }, null, { label: 'In the middle', grab: 'target', person: true }] },
      { label: 'Monkey In Middle (raid)', cmd: 'oc !ci -CS_Set_Formation_MonkeyInMiddleRaid igw:${Me.Name} fighter 7 POSHERE 5 FALSE', tip: 'Raid formation: the fighters in the middle, the rest on a circle of 5 spots, 7 m out', pos: true, args: [{ label: 'In the middle', opts: [['fighter', 'The tanks'], ['priest', 'The healers'], ['mage', 'The mages'], ['scout', 'The scouts']] }, { label: 'Distance', unit: 'm', num: true }, null, { label: 'Spots on the circle', num: true }] }
    ]},
    { id: 'hos', name: 'Heroic opportunities', cmds: [
      { label: 'HO Start', cmd: 'oc !ci -HO_Start igw:${Me.Name}', tip: 'Starts a heroic opportunity' },
      { label: 'HO Wheel Advance', cmd: 'oc !ci -HO_Wheel_Advance igw:${Me.Name}', tip: 'Advances the HO wheel' },
      { label: 'HO Starter Advance', cmd: 'oc !ci -HO_Starter_Advance igw:${Me.Name}', tip: 'Advances the HO starter' },
      { label: 'HO Cancel Starter', cmd: 'oc !ci -HO_Cancel_Starter igw:${Me.Name}', tip: 'Cancels the HO starter' },
      { label: 'HO Never Press Icon', cmd: 'oc !ci -Set_Disable_HOICon igw:${Me.Name} ICONID', tip: 'Disables a heroic-opportunity icon id' },
      { label: 'HO Allow Icon', cmd: 'oc !ci -Set_Allow_HOICon igw:${Me.Name} ICONID', tip: 'Allows a heroic-opportunity icon id' },
      { label: 'HO Re-enable Icon', cmd: 'oc !ci -Clear_Disable_HOICon igw:${Me.Name} ICONID', tip: 'Re-enables one disabled HO icon' },
      { label: 'HO Re-enable All Icons', cmd: 'oc !ci -Clear_Disable_HOICons igw:${Me.Name}', tip: 'Re-enables every disabled HO icon' },
      { label: 'HO Clear Allowed Icon', cmd: 'oc !ci -Clear_Allow_HOICon igw:${Me.Name} ICONID', tip: 'Removes one allowed HO icon' },
      { label: 'HO Clear Allowed Icons', cmd: 'oc !ci -Clear_Allow_HOICons igw:${Me.Name}', tip: 'Removes every allowed HO icon' },
      { label: 'Do HO On', cmd: 'oc !ci -DoHO_Set_Enable igw:${Me.Name} TRUE', tip: 'Turns "Do HO" on' },
      { label: 'Do HO Off', cmd: 'oc !ci -DoHO_Set_Enable igw:${Me.Name} FALSE', tip: 'Turns "Do HO" off' },
      { label: 'Do HO Reset', cmd: 'oc !ci -DoHO_Reset igw:${Me.Name}', tip: 'Resets "Do HO"' }
    ]},
    { id: 'messages', name: 'Messages & events', cmds: [
      { label: 'Message', cmd: 'oc !ci -Message igw:${Me.Name} MESSAGE', tip: 'Writes a message (with the time) in these boxes\' console' },
      { label: 'Message Every Console', cmd: 'oc !ci -Message_Relay igw:${Me.Name} MESSAGE', tip: 'Writes the message in every session\'s console' },
      { label: 'Say Out Loud', cmd: 'oc !ci -TTS igw:${Me.Name} MESSAGE', tip: 'Speaks the message with text-to-speech' },
      { label: 'Raid Chat Phrase', cmd: 'oc !ci -InjectChat igw:${Me.Name} MESSAGE', tip: 'Acts as if the phrase was said in raid chat' },
      { label: 'Start Event', cmd: 'oc !ci -ExecuteEvent_AP igw:${Me.Name} EVENTNAME', tip: 'Fires an encounter event by name (while that zone\'s encounter is loaded)' },
      { label: 'On-screen Timer', cmd: 'oc !ci -Timer igw:${Me.Name} 30 1 MESSAGE', tip: 'Puts a countdown on screen: 30 seconds, slot 1, with your message', args: [{ label: 'Seconds', num: true }, { label: 'Slot', num: true }] },
      { label: 'Countdown', cmd: 'oc !ci -countdown igw:${Me.Name} 10', tip: 'Starts a countdown of the time given', args: [{ label: 'Time', num: true }] }
    ]},
    { id: 'items', name: 'Items & merchants', cmds: [
      { label: 'Use Item On Player', cmd: 'oc !ci -UseItemOnPlayer igw:${Me.Name} "ITEMNAME" PLAYERNAME', tip: 'Uses an item on a player (exact item name)' },
      { label: 'Unpack', cmd: 'oc !ci -Unpack igw:${Me.Name} "ITEMNAME"', tip: 'Unpacks an item in your bags (add -qty N, -all or -pick under Advanced)' },
      { label: 'Examine Item', cmd: 'oc !ci -ExamineInventoryItem igw:${Me.Name} "ITEMNAME"', tip: 'Examines an inventory item' },
      { label: 'Temp Adorns', cmd: 'oc !ci -TempAdorns igw:${Me.Name} "PROFILE"', tip: 'Applies a saved temp adornment profile: each piece of gear it names gets its adornment, even one that still has it. Profiles are made in OgreBot\'s Temp Adornments window (ogre tempadorns)', args: [{ label: 'Profile', help: 'Its name as saved in OgreBot\'s Temp Adornments window' }] },
      { label: 'Buy From Merchant', cmd: 'oc !ci -BuyFromMerchant igw:${Me.Name} "ITEMNAME" 1', tip: 'Buys 1 of an item from the open merchant', args: [null, { label: 'How many', num: true }] },
      { label: 'Open And Buy', cmd: 'oc !ci -OpenAndBuyFromMerchant igw:${Me.Name} "MERCHANTNAME" "ITEMNAME" 1', tip: 'Opens a merchant by name and buys 1 of an item', args: [null, null, { label: 'How many', num: true }] },
      { label: 'Sell To Merchant', cmd: 'oc !ci -SellToMerchant igw:${Me.Name} "ITEMNAME" 1', tip: 'Sells 1 of an item to the open merchant', args: [null, { label: 'How many', num: true }] },
      { label: 'Scroll Of', cmd: 'oc !ci -ScrollOf igw:${Me.Name} Prowess', tip: 'Uses a Scroll of ___ (Prowess here; Thaumic scrolls work best)', args: [{ label: 'Scroll of', help: 'The word after "Scroll of", like Prowess.' }] },
      { label: 'Heartstone Rekindle', cmd: 'oc !ci -Heartstone_RekindleBond igw:${Me.Name}', tip: 'Uses the Heartstone to rekindle your bond' },
      { label: 'Summon Familiar', cmd: 'oc !ci -Summon_Familiar igw:${Me.Name}', tip: 'Summons your familiar' },
      { label: 'Call of the Veteran', cmd: 'oc !ci -CoV igw:${Me.Name}', tip: 'Uses Call of the Veteran' },
      { label: 'Use Item', cmd: 'oc !ci -UseItem igw:${Me.Name} "ITEMNAME"', tip: 'My group uses an item from their bags (its exact name)' },
      { label: 'Destroy Used-Up Item', more: true, cmd: 'oc !ci -DestroyItem igw:${Me.Name} "ITEMNAME" 0',
        tip: 'Destroys the item when it has no charges left, or no more than the number given (0 = only when used up)', args: [null, { label: 'At most', unit: 'charges', num: true }] },
      { label: 'Open And Buy, Repeat', more: true, cmd: 'oc !ci -OpenAndBuyFromMerchantXTimes igw:${Me.Name} "MERCHANTNAME" "ITEMNAME" 1 2',
        tip: 'Opens a merchant by name and buys 1 of an item, 2 times over', args: [null, null, { label: 'How many each time', num: true }, { label: 'Times', num: true }] }
    ]},
    { id: 'roles', name: 'Flags & mentoring', cmds: [
      { label: 'Flag Toon 1', cmd: 'oc !ci -FlagToon igw:${Me.Name} 1', tip: 'Gives flag 1 to these characters', args: [{ label: 'Flag', num: true }] },
      { label: 'Unflag Toon 1', cmd: 'oc !ci -UnflagToon igw:${Me.Name} 1', tip: 'Takes flag 1 away', args: [{ label: 'Flag', num: true }] },
      { label: 'Unflag All', cmd: 'oc !ci -UnflagAll igw:${Me.Name}', tip: 'Removes every flag' },
      { label: 'Mark Toon', cmd: 'oc !ci -MarkToon igw:${Me.Name}', tip: 'Marks these characters (flag 24): some fights look for the marked toon' },
      { label: 'Unmark Toon', cmd: 'oc !ci -UnmarkToon igw:${Me.Name}', tip: 'Takes the mark away' },
      { label: 'Mentor', cmd: 'oc !ci -Mentor igw:${Me.Name} PLAYERNAME', tip: 'Mentor a player (native: the for-who first, then who to mentor)' },
      { label: 'Unmentor', cmd: 'oc !ci -Unmentor igw:${Me.Name}', tip: 'Stop mentoring' }
    ]},
    { id: 'travel', name: 'Travel & Zoning', cmds: [
      { label: 'CallGH', cmd: 'oc !ci -CallGH igw:${Me.Name}', tip: 'Call to Guild Hall' },
      { label: 'GetToGH', cmd: 'oc !ci -GetToGH igw:${Me.Name}', tip: 'Get to guild hall (via GHPortal if needed)' },
      { label: 'PortalToGH', cmd: 'oc !ci -PortalToGuildHall igw:${Me.Name}', tip: 'Use GH portal to enter' },
      { label: 'ZoneDoor', cmd: 'oc !ci -ZoneDoor igw:${Me.Name} "ZONENAME"', tip: 'Click a zone door and pick the zone (native: the for-who first, then the choice)' },
      { label: 'FastTravel', cmd: 'oc !ci -FastTravel igw:${Me.Name} "ZONENAME"', tip: 'Fast travel to zone' },
      { label: 'TravelBell', cmd: 'oc !ci -TravelBell igw:${Me.Name} "ZONENAME" FALSE LAST_ENTRY', tip: 'Travel to zone via bell' },
      { label: 'TravelSpires', cmd: 'oc !ci -TravelSpires igw:${Me.Name} "ZONENAME" FALSE LAST_ENTRY', tip: 'Travel to zone via spire' },
      { label: 'TravelDruid', cmd: 'oc !ci -TravelDruid igw:${Me.Name} "ZONENAME" FALSE LAST_ENTRY', tip: 'Travel to zone via druid ring' },
      { label: 'Travel Map', cmd: 'oc !ci -Travel igw:${Me.Name} "ZONENAME"', tip: 'Clicks a place on the travel map (a bell\'s map). Commas do not work: use text before or after one' },
      { label: 'Travel Mesh', cmd: 'oc !ci -TravelMesh igw:${Me.Name} "ZONENAME"', tip: 'Plans a route to the zone and travels it, hop by hop' },
      { label: 'Travel Mesh Group', cmd: 'oc !ci -TravelMeshGroup igw:${Me.Name} "ZONENAME"', tip: 'Sends the whole group to the zone (run it on ONE character)' },
      { label: 'Travel Mesh Stop', cmd: 'oc !ci -TravelMeshStop igw:${Me.Name}', tip: 'Stops the route in progress' },
      { label: 'Zone Version OK', cmd: 'oc !ci -Select_Zone_Version igw:${Me.Name}', tip: 'Presses OK in the select-zone-version window' },
      { label: 'Change Zone Copy', cmd: 'oc !ci -ChangeZoneTo igw:${Me.Name} PLAYERNAME', tip: 'Changes your zone copy to the one a group member is in' },
      { label: 'Reset Zone', cmd: 'oc !ci -ResetZone igw:${Me.Name} "ZONENAME"', tip: 'Resets the lockout of the zone you name' },
      { label: 'Zone Special', cmd: 'oc !ci -SpecialZoneSpecific igw:${Me.Name}', tip: 'Clicks the special coded for this zone, else the nearest special' },
      { label: 'Share Zone Quests', cmd: 'oc !ci -ShareQuestsForZone igw:${Me.Name}', tip: 'Shares the quests for the current zone' },
      { label: 'Use the Zone Exit', more: true, cmd: 'oc !ci -Zone igw:${Me.Name}', tip: 'My group tries to zone out at the zone exit (the step "Leave through the exit door" also waits for the zone change)' }
    ]},
    { id: 'loot', name: 'Loot & Dialog', cmds: [
      { label: 'Loot All', cmd: 'oc !ci -LootAll igw:${Me.Name}', tip: 'Loots everything in reach' },
      { label: 'OK Button', cmd: 'oc !ci -OK_Button igw:${Me.Name}', tip: 'Click OK on a pending dialog' },
      { label: 'Close Window', cmd: 'oc !ci -CloseWindow igw:${Me.Name}', tip: 'Close top window' },
      { label: 'Accept Reward', cmd: 'oc !ci -AcceptReward igw:${Me.Name} 1', tip: 'Accept quest reward (choice 1)', args: [{ label: 'Reward', num: true, help: 'Its number in the reward window, 1 = the first.' }] },
      { label: 'Choice 1', cmd: 'oc !ci -ChoiceWindow igw:${Me.Name} 1', tip: 'Pick first choice in ChoiceWindow', args: [{ label: 'Choice', num: true }] },
      { label: 'Choice 2', cmd: 'oc !ci -ChoiceWindow igw:${Me.Name} 2', tip: 'Pick second choice in ChoiceWindow', args: [{ label: 'Choice', num: true }] },
      { label: 'Reply Dialog 1', cmd: 'oc !ci -ReplyDialog igw:${Me.Name} 1', tip: 'Reply dialog option 1', args: [{ label: 'Reply', num: true }] },
      { label: 'Dialog Option 1', cmd: 'oc !ci -ConversationBubble igw:${Me.Name} 1', tip: 'After a hail: pick reply 1 (the native name of the old -OptNum)', args: [{ label: 'Reply', num: true }] },
      { label: 'Hail', cmd: 'oc !ci -Hail igw:${Me.Name} TARGETNAME', tip: 'Hails the NPC', args: [{ label: 'NPC', grab: 'target' }] },
      { label: 'Close Reply Window', cmd: 'oc !ci -ReplyDialogClose igw:${Me.Name}', tip: 'Closes the reply dialog' },
      { label: 'Text Window: Type', cmd: 'oc !ci -InputTextWindow_AddText igw:${Me.Name} MESSAGE', tip: 'Types text into the input-text window' },
      { label: 'Text Window: OK', cmd: 'oc !ci -InputTextWindow_Accept igw:${Me.Name}', tip: 'Accepts the input-text window' },
      { label: 'Text Window: Clear', cmd: 'oc !ci -InputTextWindow_ClearText igw:${Me.Name}', tip: 'Clears the input-text window' },
      { label: 'Use Verb', cmd: 'oc !ci -ApplyVerb igw:${Me.Name} "TARGETNAME" "VERBNAME"', tip: 'Uses a right-click verb (case sensitive) on an actor: native reads the for-who first, then the actor and the verb (ISXJQB does it itself)' },
      { label: 'Use Verb (in turn)', cmd: 'oc !ci -ApplyVerbQueued igw:${Me.Name} "TARGETNAME" "VERBNAME"', tip: 'Uses a right-click verb (case sensitive) on an actor, waits out the cast, in turn with other actions' },
      { label: 'Click Actor (in turn)', cmd: 'oc !ci -Actor_ClickQueued igw:${Me.Name} "TARGETNAME"', tip: 'Clicks an actor by name, waiting its turn' },
      { label: 'Use Verb by Id (in turn)', cmd: 'oc !ci -ApplyVerbIDQueued igw:${Me.Name} ${Actor[ExactName,"TARGETNAME"].ID} "VERBNAME"', tip: 'The same, by the actor id (looked up by exact name when the step runs)' },
      { label: 'Pick Up "?"', cmd: 'oc !ci -Question igw:${Me.Name}', tip: 'Collects the nearest "?" shiny within 10 m' },
      { label: 'Click Resource', cmd: 'oc !ci -Resource igw:${Me.Name}', tip: 'Clicks the nearest resource' },
      { label: 'Altar of the Ancients', cmd: 'oc !ci -AltarOfTheAncients igw:${Me.Name}', tip: 'Prays at the Altar of the Ancients (stand REALLY close)' },
      { label: 'Effigy of Rebirth', cmd: 'oc !ci -ArcannaseEffigyOfRebirth igw:${Me.Name}', tip: 'Uses Arcanna\'se Effigy of Rebirth (stand REALLY close)' },
      { label: 'Click Actor', more: true, cmd: 'oc !ci -Actor_Click igw:${Me.Name} "TARGETNAME"', tip: 'Clicks an actor by name right away (Click Actor (in turn) waits for other actions)' },
      { label: 'Use Verb by Id', more: true, cmd: 'oc !ci -ApplyVerbID igw:${Me.Name} ${Actor[ExactName,"TARGETNAME"].ID} "VERBNAME"',
        tip: 'Uses a right-click verb (case sensitive) on an actor by its id, looked up by exact name when the step runs' },
      { label: 'Click Nearest Special', more: true, cmd: 'oc !ci -Special igw:${Me.Name}', tip: 'Clicks the nearest object the game marks as special (Zone Special prefers the one coded for this zone)' }
    ]},
    { id: 'scripts', name: 'Scripts, quests & values', cmds: [
      { label: 'Run Script', cmd: 'oc !ci -RunScriptOB igw:${Me.Name} SCRIPTNAME', tip: 'Runs a script on these boxes (more words after the name are passed to it)' },
      { label: 'End Script', cmd: 'oc !ci -EndScriptOB igw:${Me.Name} SCRIPTNAME', tip: 'Ends a script on these boxes' },
      { label: 'Ogre Command', cmd: 'oc !ci -OgreCommandOB_AP igw:${Me.Name} COMMAND', tip: 'Does an ogre command on these boxes (the rest of the line)' },
      { label: 'Set Value', cmd: 'oc !ci -set_variable igw:${Me.Name} VARNAME VALUE', tip: 'Sets an OgreBot variable' },
      { label: 'Clear Value', cmd: 'oc !ci -clear_variable igw:${Me.Name} VARNAME', tip: 'Clears an OgreBot variable' },
      { label: 'Clear All Values', more: true, cmd: 'oc !ci -clear_variables igw:${Me.Name}', tip: 'Clears every OgreBot variable on these boxes' },
      { label: 'Accept Quest', cmd: 'oc !ci -AcceptQuest igw:${Me.Name}', tip: 'Accepts the offered quest' },
      { label: 'Share Quest', cmd: 'oc !ci -ShareQuest igw:${Me.Name} "QUESTNAME"', tip: 'Shares a quest (very limited checks)' },
      { label: 'Compare Quest', cmd: 'oc !ci -CompareQuest igw:${Me.Name} "QUESTNAME"', tip: 'Compares the quest step across the group (send it from the box whose step is right)' }
    ]}
  ];
  O.CATS = cats;
  O.LEFT_OUT = {
    '-ZoneResetAll': 'resets EVERY zone lockout and does not ask first; Reset Zone and the step "Reset this zone\'s lockout" do one zone',
    '-RawCommandOB_AP': 'it ended the Classic OgreConsole when tried (09-29); Ogre Command or a Script line step does the same',
    '-SpewStat': 'a report for the person at the keyboard; a run cannot read its answer',
    '-CheckResearch': 'a report for the person at the keyboard (research timers)',
    '-Research_Material_Check': 'a report for the person at the keyboard (research materials)',
    '-JumpKW': 'a double of Jump (Movement:Jump)',
    '-assist': 'a double of Assist Target (Assist:Anchor), whose argument order is not in doubt',
    '-UplinkOptionChange': 'a double of the option buttons (Options:Set)', '-CS_Set_ChangeCampSpot': 'a double of CampSpot Coords (CampSpot:SetLoc)',
    '-AutoTarget_Clear': 'a double of AutoTarget Clear (AutoTarget:Clear)',
    '-DestroyItem_NoChecks': 'destroys the item outright with no charge check; Destroy Used-Up Item is the checked one',
    '-cancelcastnoexport': 'not documented: neither the row nor the docs say how it differs from CastAbility',
    '-set_Internalvariable': 'OgreBot\'s own inside values (its scripts\' state); Set Value is the one for runs',
    '-clear_Internalvariable': 'OgreBot\'s own inside values; Clear Value is the one for runs',
    '-clear_Internalvariables': 'OgreBot\'s own inside values; Clear All Values is the one for runs',
    '-DoHO_Setup': 'not documented: the rest of the line holds arguments the docs do not spell out',
    '-Select_Window_AP': 'not documented: the rest of the line holds arguments the docs do not spell out'
  };

  var REJECTED = {
    'cs-jo-ji': 'the Joust builder below (camp spot + joust off + joust in)', 'cs-jo': 'the Joust builder below',
    'runwalk': 'Run or Walk (native has no toggle)', 'setupfor_intercept': 'SetUpFor Intercept', 'setupfor_dispells': 'Dispels On',
    'disable_cures': 'Disable Cures', 'enable_cures': 'Enable Cures', 'disable_stuns': 'Disable Stuns', 'enable_stuns': 'Enable Stuns',
    'npc_castmonitoring': 'Watch NPC Casts On / Off', 'set_disableallaoes': 'Disable AOEs / Enable AOEs', 'cs_howclose': 'CS HowClose',
    'cs_howfar': 'CS HowFar', 'lootwindowlootall': 'Loot All', 'forcemounton': 'Mount Up', 'forcemountoff': 'Dismount',
    'groupmounton': 'Mount Up', 'groupmountoff': 'Dismount', 'addthreatignore': 'Threat Ignore Add', 'removethreatignore': 'Threat Ignore Remove',
    'setcurepriority': '', 'eq2ex': '', 'summon': '', 'autoattack': '', 'hailtravel': 'Hail, then Dialog Option', 'clicktravel': 'Travel Map',
    'dispell': 'Dispel (spell)', 'autotarget_setrescantime': '', 'endscript': 'End Script', 'runscriptob_ap': 'Run Script',
    'message_nt': 'Message', 'executeevent_json_ap': 'Start Event', 'raid': 'Raid Chat Phrase', 'pull': ''
  };
  O.REJECTED = REJECTED;
  O.rejected = function (cmd) {
    var re = /(?:^|\s)-([A-Za-z][\w-]*)(?=\s|$)/g, m;
    while ((m = re.exec(str(cmd)))) {
      var k = m[1].toLowerCase();
      if (REJECTED.hasOwnProperty(k)) return 'Native OgreBot has no -' + m[1] + (REJECTED[k] ? ': pick ' + REJECTED[k] + ' instead.' : '.');
    }
    return '';
  };

  var _IC_CS_WHO_OPTIONS = [
  {value: 'Auto',                  label: 'Auto (each char anchors at own loc)'},
  {value: 'all',                   label: 'Everyone (all)'},
  {value: 'Fighter',               label: 'Tanks only (Fighter)'},
  {value: 'Priest',                label: 'Healers only (Priest)'},
  {value: 'Mage',                  label: 'Mages only'},
  {value: 'Scout',                 label: 'Scouts only'},
  {value: 'Notfighter',            label: 'Everyone but tanks (Notfighter)'},
  {value: 'Mage|Priest|Scout',     label: 'Ranged callers (Mage|Priest|Scout)'},
  {value: 'igw:${Me.Name}',        label: 'Just me'}
];
  O.CS_WHO = _IC_CS_WHO_OPTIONS;
  var _IC_CS_MODES = [
    { value: 'here',   label: 'Anchor here -- each box anchors where it stands' },
    { value: 'joust',  label: 'Joust setup -- one role steps out to range' },
    { value: 'at',     label: 'At a spot -- x / y / z' },
    { value: 'behind', label: 'Behind a named NPC' },
    { value: 'front',  label: 'In front of a named NPC' },
    { value: 'right',  label: 'Right side of an NPC' },
    { value: 'left',   label: 'Left side of an NPC' },
    { value: 'custom', label: 'Any angle around an NPC' }
  ];
  var presets = [
    {label: 'Anchor Everyone',         cmd: 'oc !c -CampSpot Auto 1 200',                                   tip: 'Each session anchors at its own loc'},
    {label: 'Anchor Tight (1/8)',      cmd: 'oc !c -CampSpot Auto 1 8',                                     tip: 'Tight stack -- max=8m rubber-band'},
    {label: 'Anchor Tanks Only',       cmd: 'oc !c -CampSpot Fighter 1 200',                                tip: 'Only tanks hold position'},
    {label: 'Anchor Healers Only',     cmd: 'oc !c -CampSpot Priest 1 200',                                 tip: 'Only priests hold position'},
    {label: 'Joust: Casters Off',      cmd: 'oc !c -campspot all 1 200 -joustoff Mage|Priest|Scout -joustin all', tip: 'Ranged callers step out, melee stays in'},
    {label: 'Joust: Healers Off',      cmd: 'oc !c -campspot all 1 200 -joustoff Priest -joustin all',      tip: 'Priests step out, melee/scouts stay'},
    {label: 'Joust: All But Tank',     cmd: 'oc !c -campspot Fighter 1 200 -joustoff Notfighter -joustin all', tip: 'Tank holds, everyone else jousts off'},
    {label: 'Anchor at My Loc',        cmd: 'oc !ci -ChangeCampSpotWho all POSHERE',                        tip: 'Everyone anchor at my current coords', pos: true},
    {label: 'Tank to My Loc',          cmd: 'oc !ci -ChangeCampSpotWho Fighter POSHERE',                    tip: 'Tank anchors at my coords', pos: true}
  ];
  O.PRESETS = presets;

  O.placeholder = function (cmd) { var re = IC.reg && IC.reg.OC_PH, m = re ? re.exec(str(cmd)) : null; return m ? m[0] : ''; };

  O.describe = function (cmd) {
    var c = str(cmd).trim();
    for (var i = 0; i < cats.length; i++) {
      for (var j = 0; j < cats[i].cmds.length; j++) {
        var x = cats[i].cmds[j];
        if (x.cmd === c) return 'OgreBot: ' + x.label;
        if (x.pos && c.indexOf(x.cmd.split('POSHERE')[0]) === 0 && x.cmd.split('POSHERE')[0].length > 12) return 'OgreBot: ' + x.label;
      }
    }
    for (var p = 0; p < presets.length; p++) if (presets[p].cmd === c) return 'OgreBot: ' + presets[p].label;
    var w = IC.words && IC.words.ogre ? IC.words.ogre(c) : '';
    if (w && !/^OgreBot: /.test(w)) return 'OgreBot: ' + w;
    var m = /-(\w+)/.exec(c);
    if (m) return 'OgreBot: ' + m[1].replace(/_/g, ' ');
    return 'OgreBot: ' + (c.length > 30 ? c.substring(0, 29) + '...' : c || '(empty)');
  };
  function known(cmd) {
    var c = str(cmd).trim();
    if (!c) return true;
    for (var i = 0; i < cats.length; i++) for (var j = 0; j < cats[i].cmds.length; j++) if (cats[i].cmds[j].cmd === c) return true;
    for (var p = 0; p < presets.length; p++) if (presets[p].cmd === c) return true;
    return !!O.parse(c);
  }
  function hereXyz() { var p = IC.pack.posParse(IC.form.myPos()); return p ? [p.x.toFixed(2), p.y.toFixed(2), p.z.toFixed(2)] : null; }
  function expandPos(tpl) {
    var p = hereXyz();
    if (!p) { if (typeof colToast === 'function') colToast('No position yet.', 'warn'); return tpl; }
    return tpl.replace('POSHERE', p.join(' ')).replace(/"(STARTSPOT|JUMPSPOT|LANDSPOT)"/g, '"' + p.join(',') + '"').replace('"DONESPOT"', '"0,0,0"');
  }
  function hasHere(tpl) { return /\bPOSHERE\b|"(STARTSPOT|JUMPSPOT|LANDSPOT|DONESPOT)"/.test(str(tpl)); }

  var PH = {
    TARGETNAME: { label: 'Mob or object', grab: 'target' }, PLAYERNAME: { label: 'Player', grab: 'target', person: true },
    MERCHANTNAME: { label: 'Merchant', grab: 'target' }, ABILITYNAME: { label: 'Ability', help: 'Its base name: Kick, not Kick III.' },
    EFFECTNAME: { label: 'Effect' }, ZONENAME: { label: 'Zone', grab: 'zone' }, ITEMNAME: { label: 'Item', help: 'Its exact name.' },
    MESSAGE: { label: 'Text' }, SCRIPTNAME: { label: 'Script' }, EVENTNAME: { label: 'Event' }, LISTNAME: { label: 'Kill list' },
    PROFILENAME: { label: 'Profile' }, QUESTNAME: { label: 'Quest' }, VERBNAME: { label: 'Verb', help: 'The right-click word, exactly as the game shows it.' },
    CURETYPE: { label: 'Cure type', opts: ['Arcane', 'Elemental', 'Noxious', 'Trauma'] }, ICONID: { label: 'Icon id', num: true },
    ABILITYID: { label: 'Ability id', num: true }, MAINID: { label: 'Icon id', num: true }, BACKDROPID: { label: 'Backdrop id', num: true },
    OPTIONID: { label: 'Option' }, TAGNAME: { label: 'Tag' }, VARNAME: { label: 'Name' }, VALUE: { label: 'Value' }, COMMAND: { label: 'Ogre command' },
    POSHERE: { label: 'Spot', pos: true }, 'X Y Z': { label: 'Spot', pos: true }, STARTSPOT: { label: 'Line up at', pos: true },
    JUMPSPOT: { label: 'Jump at', pos: true }, LANDSPOT: { label: 'Land at', pos: true }, DONESPOT: { label: 'Then camp at', pos: true, help: '0,0,0 = where it lands.' }
  };
  var WHO = [['igw:${Me.Name}', 'My group (me too)'], ['igwbn:${Me.Name}', 'My group but me'], ['${Me.Name}', 'Just me'],
    ['igw:${Me.Name}+fighter', 'The tanks in my group'], ['igw:${Me.Name}+priest', 'The healers in my group'], ['igw:${Me.Name}+mage', 'The mages in my group'],
    ['igw:${Me.Name}+scout', 'The scouts in my group'], ['igw:${Me.Name}+notfighter', 'My group but the tanks'], ['irw:${Me.Name}', 'My raid (me too)'],
    ['all', 'Every box that hears it'], ['auto', 'Whoever OgreBot\'s For Who window says']];
  O.WHO = WHO;
  function tokq(s) {
    var out = [], cur = '', inQ = false, depth = 0, had = false, q = false;
    s = str(s);
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (c === '"' && depth === 0) { inQ = !inQ; had = true; q = true; continue; }
      if (c === '$' && s.charAt(i + 1) === '{') depth++;
      else if (c === '}' && depth > 0) depth--;
      if (/\s/.test(c) && !inQ && depth === 0) { if (cur || had) out.push({ v: cur, q: q }); cur = ''; had = false; q = false; continue; }
      cur += c;
    }
    if (cur || had) out.push({ v: cur, q: q });
    return out;
  }
  function phOf(v) { return v !== 'X Y Z' && PH.hasOwnProperty(v) ? v : ''; }
  function compile(x) {
    if (x._t) return x._t;
    var T = tokq(x.cmd), out = [], vi = -1, ai = 0, k, t, sp, m;
    for (k = 0; k < T.length; k++) {
      t = T[k];
      if (vi < 0) { out.push({ k: 'lit', v: t.v, q: t.q }); if (/^-[A-Za-z]/.test(t.v)) vi = k; continue; }
      if (k === vi + 1) { out.push({ k: 'who' }); continue; }
      sp = (x.args && x.args[ai]) || null;
      if (t.v === 'X' && T[k + 1] && T[k + 1].v === 'Y' && T[k + 2] && T[k + 2].v === 'Z') { out.push({ k: 'xyz', key: 'a' + ai, ph: 'X Y Z', spec: sp || PH['X Y Z'] }); k += 2; }
      else if (t.v === 'POSHERE') out.push({ k: 'xyz', key: 'a' + ai, ph: 'POSHERE', spec: sp || PH.POSHERE });
      else if (phOf(t.v)) out.push({ k: 'ph', key: 'a' + ai, ph: t.v, q: t.q, spec: sp || PH[t.v] });
      else if (/^\$\{/.test(t.v) && (m = /[A-Z]{5,}/.exec(t.v)) && phOf(m[0])) out.push({ k: 'emb', key: 'a' + ai, ph: m[0], tpl: t.v, spec: sp || PH[m[0]] });
      else if (sp) out.push({ k: 'arg', key: 'a' + ai, def: t.v, q: t.q, spec: sp });
      else out.push({ k: 'lit', v: t.v, q: t.q });
      ai++;
    }
    try { Object.defineProperty(x, '_t', { value: out, configurable: true }); } catch (_e) { x._t = out; }
    return out;
  }
  function isNum(v) { return /^-?(\d+\.?\d*|\.\d+)$/.test(str(v).trim()); }
  function reEsc(s) { return str(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function match(t, L) {
    var j = 0, vals = {}, k, p, a, mm;
    for (k = 0; k < t.length; k++) {
      p = t[k]; a = L[j];
      if (!a) return null;
      if (p.k === 'lit') {
        var lv = p.v.toLowerCase(), av = a.v.toLowerCase();
        if (lv !== av && !(/^!ci?$/.test(lv) && /^!ci?$/.test(av))) return null;
        if (/^!ci?$/.test(av)) vals._bang = a.v;
        j++;
      } else if (p.k === 'who') { vals.who = a.v; j++; }
      else if (p.k === 'xyz') {
        if (a.v === p.ph || a.v === 'POSHERE') { vals[p.key] = ''; j++; continue; }
        if (j + 2 >= L.length) return null;
        var xyz = [L[j].v, L[j + 1].v, L[j + 2].v];
        if (isNum(xyz[0]) && isNum(xyz[1]) && isNum(xyz[2])) vals[p.key] = xyz.join(',');
        else if (xyz.join(' ') === 'X Y Z') vals[p.key] = '';
        else return null;
        j += 3;
      } else if (p.k === 'emb') {
        mm = new RegExp('^' + reEsc(p.tpl).replace(p.ph, '(.+?)') + '$').exec(a.v);
        vals[p.key] = mm ? (mm[1] === p.ph ? '' : mm[1]) : a.v; j++;
      } else { vals[p.key] = (p.k === 'ph' && a.v === p.ph) ? '' : a.v; j++; }
    }
    return j === L.length ? vals : null;
  }
  O.parse = function (line) {
    var s = str(line).trim(), L = tokq(s), v;
    if (!L.length || !/^oc$/i.test(L[0].v)) return null;
    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < cats.length; i++) for (var j = 0; j < cats[i].cmds.length; j++) {
        var x = cats[i].cmds[j];
        if (pass === 0 && x.cmd !== s) continue;
        if ((v = match(compile(x), L))) return { i: i, j: j, x: x, vals: v };
      }
    }
    return null;
  };
  function clean(v) { var s = str(v).trim(); return /^\$\{/.test(s) ? s : s.replace(/"/g, ''); }
  function qt(v, q) { return q ? '"' + v + '"' : v; }
  function xyzOf(v) { var p = IC.pack && IC.pack.posParse ? IC.pack.posParse(str(v)) : null; return p ? [(+p.x).toFixed(2), (+p.y).toFixed(2), (+p.z).toFixed(2)] : null; }
  O.fill = function (x, vals) {
    var t = compile(x), out = [], k, p, v, c;
    vals = vals || {};
    for (k = 0; k < t.length; k++) {
      p = t[k]; v = clean(vals[p.key]);
      if (p.k === 'lit') out.push(qt(/^!ci?$/.test(p.v) && vals._bang ? vals._bang : p.v, p.q));
      else if (p.k === 'who') out.push(clean(vals.who) || 'igw:${Me.Name}');
      else if (p.k === 'xyz') { c = xyzOf(v); out.push(c ? c.join(' ') : p.ph); }
      else if (p.k === 'emb') out.push(v === '' ? p.tpl : (/^\d+$|^\$\{/.test(v) ? v : p.tpl.replace(p.ph, v)));
      else if (p.spec && p.spec.pos) { c = xyzOf(v); out.push(qt(c ? c.join(',') : (v || p.ph), true)); }
      else if (p.k === 'ph') out.push(v === '' ? qt(p.ph, p.q) : qt(v, p.q || /\s/.test(v)));
      else out.push(v === '' ? qt(p.def, p.q) : qt(v, p.q || /\s/.test(v)));
    }
    return out.join(' ');
  };
  O.missing = function (p) {
    var t = compile(p.x), out = [];
    for (var k = 0; k < t.length; k++) if (t[k].key && t[k].k !== 'arg' && t[k].k !== 'lit' && clean(p.vals[t[k].key]) === '') out.push((t[k].spec || {}).label || t[k].ph);
    return out;
  };
  function specOf(x, key) { var t = compile(x); for (var k = 0; k < t.length; k++) if (t[k].key === key) return t[k].spec || {}; return null; }
  function dd(id, opts, cur, onch) {
    if (typeof jbDropdown === 'function') return jbDropdown(id, opts, cur, { fontSize: '10px', style: 'flex:1;min-width:60px;', onchange: onch });
    var h = '<select class="input-text icf-in" id="' + id + '" onchange="' + onch + '">';
    for (var i = 0; i < opts.length; i++) h += '<option value="' + esc(opts[i].value) + '"' + (opts[i].value === cur ? ' selected' : '') + '>' + opts[i].label + '</option>';
    return h + '</select>';
  }
  function gbtn(sc, n, key, kind, lab, t) {
    return '<button class="btn btn-sm icf-grab"' + tip(t) + ' onclick="icOcArgGrab(\'' + sc + '\',' + n + ',\'' + key + '\',\'' + kind + '\')">' + lab + '</button>';
  }
  O.argsHtml = function (sc, n, val) {
    var p = O.parse(val);
    if (!p) return '';
    var t = compile(p.x), id = 'icoa-' + sc + '-' + n, vals = p.vals, cur = str(vals.who), h = '', k, q = '\'' + sc + '\',' + n;
    var row = function (lab, ctl, help) { return '<div class="icf-xrow"><span class="icf-xlab"' + tip(help) + '>' + esc(lab) + '</span>' + ctl + '</div>'; };
    var opts = WHO.map(function (w) { return { value: w[0], label: esc(w[1]) }; }), seen = false;
    for (k = 0; k < WHO.length; k++) if (WHO[k][0] === cur) seen = true;
    if (cur && !seen) opts.push({ value: cur, label: esc('Other: ' + (IC.words && IC.words.who ? IC.words.who(cur) : cur)) });
    h += row('Who does it', dd(id + '-who', opts, cur, 'icOcArgWho(' + q + ')'), 'An OgreBot line reaches every box, mine too; this picks the ones that act on it.');
    for (k = 0; k < t.length; k++) {
      var s = t[k], sp = s.spec || {}, fid = id + '-' + s.key, v = str(vals[s.key]), ctl;
      if (s.k === 'lit' || s.k === 'who') continue;
      if (sp.person && v === '${Me.Name}') v = 'me';
      if (sp.opts) ctl = dd(fid, [{ value: '', label: '(pick one)' }].concat(sp.opts.map(function (o) { return isArr(o) ? { value: o[0], label: esc(o[1]) } : { value: o, label: esc(o) }; })), v, 'icOcArgDd(' + q + ',\'' + s.key + '\')');
      else ctl = '<input type="text" class="input-text icf-in" id="' + fid + '" value="' + esc(v) + '" placeholder="' + (sp.pos || s.k === 'xyz' ? 'x, y, z' : (sp.person ? 'a name, or me' : (sp.num ? 'a number' : ''))) +
        '" onchange="icOcArg(' + q + ',\'' + s.key + '\',this.value)">';
      if (sp.pos || s.k === 'xyz') ctl += gbtn(sc, n, s.key, 'pos', 'Here', 'Where I stand now');
      if (sp.grab === 'target') ctl += gbtn(sc, n, s.key, 'target', 'Target', 'My target\'s name');
      if (sp.grab === 'zone') ctl += gbtn(sc, n, s.key, 'zone', 'Zone', 'The zone I am in');
      h += row((sp.label || s.ph || 'Value') + (sp.unit ? ' (' + sp.unit + ')' : ''), ctl, sp.help);
    }
    return '<div class="icf-ocargs" style="display:flex;flex-direction:column;gap:3px;border:1px solid var(--border-med);border-radius:3px;padding:4px;">' + h + '</div>';
  };
  O.topHtml = function (val) {
    var ph = O.placeholder(val), rj = O.rejected(val), p = ph ? O.parse(val) : null, need = p ? O.missing(p) : [];
    var h = '<div class="icf-say">' + esc(val ? O.describe(val) : 'Pick a command below.') + '</div>';
    if (ph) h += '<div class="icf-msg icf-error">' + esc(need.length ? 'Fill in: ' + need.join(', ') + '.' : 'Replace ' + ph + ' in the command (Advanced) with the real name or value.') + '</div>';
    if (rj) h += '<div class="icf-msg icf-error">' + esc(rj) + '</div>';
    return h;
  };
  function btnHtml(sc, n, i, j, x) {
    return '<span class="oc-cmd-btn" data-ock="' + esc((x.label + ' ' + (x.tip || '')).toLowerCase()) + '"' + tip(x.tip) + ' onclick="icOcPick(\'' + sc + '\',' + n + ',' + i + ',' + j + ')">' + esc(x.label) + '</span>';
  }

  O.widget = function (sc, n, val) {
    var id = 'icf-' + sc + '-' + n, w = 'icoc-' + sc + '-' + n, ph = O.placeholder(val), rj = O.rejected(val), parsed = !!O.parse(val);
    var h = '<div class="icf-oc"><div id="' + w + '-top">' + O.topHtml(val) + '</div><div id="' + w + '-args">' + O.argsHtml(sc, n, val) + '</div>';
    h += '<input type="text" class="input-text icf-in" placeholder="Find a command (joust, cure, door ...)" oninput="icOcFind(\'' + sc + '\',this.value)">';
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i], top = '', more = '', nm = 0;
      for (var j = 0; j < c.cmds.length; j++) {
        if (c.cmds[j].more) { more += btnHtml(sc, n, i, j, c.cmds[j]); nm++; } else top += btnHtml(sc, n, i, j, c.cmds[j]);
      }
      var body = '<div class="icf-ocgrid">' + top + (nm ? '<span class="oc-cmd-btn" id="icocmb-' + sc + '-' + i + '" style="border-color:var(--accent-cyan);color:var(--accent-cyan);"' +
        tip('The less used ones') + ' onclick="icOcMore(\'' + sc + '\',' + i + ')">More... (' + nm + ')</span>' : '') + '</div>';
      if (nm) body += '<div class="icf-ocgrid" id="icocm-' + sc + '-' + i + '" style="display:none;margin-top:3px;">' + more + '</div>';
      h += IC.form.section(sc + 'oc' + i, c.name + ' (' + c.cmds.length + ')', body, !!c.expanded);
    }
    h += IC.form.section(sc + 'ocb', 'Camp spot & joust builder', O.builderHtml(sc, n), false);
    h += IC.form.section(sc + 'ocraw', 'Advanced: the command text', '<input type="text" class="input-text icf-in icf-mono" id="' + id + '" value="' + esc(val) + '" onchange="icOcRaw(\'' + sc + '\',' + n + ')">' +
      '<div class="icf-help">Sent as-is. igw:${Me.Name} = everyone in my group. Native OgreBot reads the for-who first.</div>', !known(val) || (!!ph && !parsed) || !!rj);
    return h + '</div>';
  };
  root.icOcFind = function (sc, text) {
    var t = str(text).toLowerCase().trim();
    for (var i = 0; i < cats.length; i++) {
      var b = $('icsec-' + sc + 'oc' + i), a = $('icsec-a-' + sc + 'oc' + i), fold = $('icocm-' + sc + '-' + i), mb = $('icocmb-' + sc + '-' + i);
      if (!b) continue;
      var btns = b.querySelectorAll ? b.querySelectorAll('.oc-cmd-btn') : [], hit = 0, fhit = 0;
      for (var j = 0; j < btns.length; j++) {
        if (btns[j] === mb) continue;
        var on = !t || str(btns[j].getAttribute('data-ock')).indexOf(t) >= 0;
        btns[j].style.display = on ? '' : 'none';
        if (on) { hit++; if (fold && btns[j].parentNode === fold) fhit++; }
      }
      if (mb) mb.style.display = t ? 'none' : '';
      if (fold) fold.style.display = t ? (fhit ? '' : 'none') : (fold.getAttribute('data-open') ? '' : 'none');
      if (t) { b.style.display = hit ? 'block' : 'none'; if (a) a.innerHTML = hit ? '&#9662;' : '&#9656;'; }
    }
  };
  root.icOcMore = function (sc, i) {
    var fold = $('icocm-' + sc + '-' + i), mb = $('icocmb-' + sc + '-' + i), c = cats[i];
    if (!fold) return;
    var open = !fold.getAttribute('data-open'), nm = 0;
    for (var j = 0; c && j < c.cmds.length; j++) if (c.cmds[j].more) nm++;
    if (open) fold.setAttribute('data-open', '1'); else fold.removeAttribute('data-open');
    fold.style.display = open ? '' : 'none';
    if (mb) mb.textContent = open ? 'Less' : 'More... (' + nm + ')';
  };
  function needs(line) { return (IC.reg && IC.reg.ocFill ? IC.reg.ocFill(line).length > 0 : false) || !!O.rejected(line); }
  function setCmd(sc, n, cmd, keepBoxes) {
    var el = $('icf-' + sc + '-' + n), was = el ? needs(el.value) : false;
    if (el) { el.value = cmd; root.icFieldCommit(sc, n); }
    if (el && sc === 'm' && was !== needs(cmd) && IC.ui && typeof IC.ui.renderForm === 'function') { IC.ui.renderForm(); return; }
    var top = $('icoc-' + sc + '-' + n + '-top'), box = $('icoc-' + sc + '-' + n + '-args');
    if (top) top.innerHTML = O.topHtml(cmd);
    if (box && !keepBoxes) box.innerHTML = O.argsHtml(sc, n, cmd);
  }
  root.icOcPick = function (sc, n, i, j) {
    var x = cats[i] && cats[i].cmds[j]; if (!x) return;
    setCmd(sc, n, (x.pos || hasHere(x.cmd)) ? expandPos(x.cmd) : x.cmd);
  };
  root.icOcRaw = function (sc, n) { var el = $('icf-' + sc + '-' + n); if (el) setCmd(sc, n, str(el.value)); };
  function lineOf(sc, n) { var el = $('icf-' + sc + '-' + n); return el ? str(el.value) : ''; }
  function ddVal(id) { if (typeof jbVal === 'function') return str(jbVal(id)); var el = $(id); return el ? str(el.value) : ''; }
  root.icOcArg = function (sc, n, key, v) {
    var p = O.parse(lineOf(sc, n)); if (!p) return;
    var sp = key === 'who' ? null : specOf(p.x, key);
    v = str(v).trim();
    if (sp && sp.person && /^me$/i.test(v)) v = '${Me.Name}';
    p.vals[key] = v;
    setCmd(sc, n, O.fill(p.x, p.vals), true);
  };
  root.icOcArgWho = function (sc, n) { root.icOcArg(sc, n, 'who', ddVal('icoa-' + sc + '-' + n + '-who')); };
  root.icOcArgDd = function (sc, n, key) { root.icOcArg(sc, n, key, ddVal('icoa-' + sc + '-' + n + '-' + key)); };
  root.icOcArgGrab = function (sc, n, key, kind) {
    var F = IC.form; if (!F || !F.grabValue) return;
    F.grabValue(kind, function (v) {
      if (!v) return;
      var el = $('icoa-' + sc + '-' + n + '-' + key); if (el) el.value = v;
      root.icOcArg(sc, n, key, v);
    });
  };

  var K = 'csbm-';
  O._b = {};
  function scope(sc) { sc = sc || 'm'; K = 'csb' + sc + '-'; return sc; }
  O.builderHtml = function (sc, n) {
    O._b[sc] = n; scope(sc);
    var h = '<div class="cs-builder"><div class="icf-xrow"><span class="icf-xlab">Mode</span>' +
      jbDropdown(K + 'mode', _IC_CS_MODES, 'here', { fontSize: '10px', style: 'width:100%;', onchange: 'icCsBuilderRender(\'' + sc + '\')' }) + '</div>' +
      '<div id="' + K + 'form"></div><div class="icf-name-add"><button class="btn btn-sm btn-success" onclick="icCsBuilderInsert(\'' + sc + '\')">Use this command</button>' +
      '<span id="' + K + 'preview" class="icf-mono icf-help"></span></div><div class="icf-help">Quick presets:</div><div class="icf-ocgrid">';
    for (var i = 0; i < presets.length; i++) {
      h += '<span class="oc-cmd-btn"' + tip(presets[i].tip) + ' onclick="icOcPreset(' + i + ',\'' + sc + '\')">' + esc(presets[i].label) + '</span>';
    }
    setTimeout(function () { try { root.icCsBuilderRender(sc); } catch (_e) {} }, 0);
    return h + '</div></div>';
  };
  root.icOcPreset = function (i, sc) {
    sc = scope(sc);
    var p = presets[i]; if (!p || O._b[sc] == null) return;
    setCmd(sc, O._b[sc], p.pos ? expandPos(p.cmd) : p.cmd);
  };
  root.icCsBuilderRender = function (sc) {
    sc = scope(sc);
    var mode = jbVal(K + 'mode') || 'here', c = $(K + 'form');
    if (!c) return;
    var W = function (id, def) { return jbDropdown(id, _IC_CS_WHO_OPTIONS, def, { fontSize: '10px', style: 'width:100%;' }); };
    var row = function (lab, ctl) { return '<div class="icf-xrow"><span class="icf-xlab">' + lab + '</span>' + ctl + '</div>'; };
    var num = function (id, v, ph) { return '<input type="text" class="input-text icf-in" id="' + id + '" value="' + (v || '') + '" placeholder="' + (ph || '') + '">'; };
    var H = '';
    if (mode === 'here') H = row('Who', W(K + 'who', 'Auto')) + row('Min (m)', num(K + 'min', '1')) + row('Max (m)', num(K + 'max', '200'));
    else if (mode === 'joust') H = row('Steps out', W(K + 'joustoff', 'Mage|Priest|Scout')) + row('Holds the spot', W(K + 'cswho', 'all')) +
      row('Comes back', W(K + 'joustin', 'all')) + row('Min (m)', num(K + 'min', '1')) + row('Max (m)', num(K + 'max', '200'));
    else if (mode === 'at') H = row('X', num(K + 'x', '', 'x')) + row('Y', num(K + 'y', '', 'y (height)')) + row('Z', num(K + 'z', '', 'z')) +
      row('Who', W(K + 'who', 'igw:${Me.Name}')) + '<button class="btn btn-sm" onclick="icCsBuilderFillMyPos(\'' + sc + '\')">Use where I stand</button>';
    else {
      H = row('NPC', '<input type="text" class="input-text icf-in" id="' + K + 'npc" placeholder="exact name"><button class="btn btn-sm icf-grab" onclick="icCsGrabNpc(\'' + sc + '\')">Target</button>') +
        row('Distance', num(K + 'dist', '5'));
      if (mode === 'custom') H += row('Angle (deg)', num(K + 'angle', '0')) + '<div class="icf-help">0 = behind, 90 = right, 180 = in front, 270 = left.</div>';
      H += row('Who', W(K + 'who', 'igw:${Me.Name}'));
    }
    c.innerHTML = H;
  };
  root.icCsGrabNpc = function (sc) { scope(sc); var e = $(K + 'npc'), t = IC.form.myTarget(); if (e && t) e.value = t; else if (e && typeof colToast === 'function') colToast('Target something in the game first.', 'warn'); };
  root.icCsBuilderFillMyPos = function (sc) {
    scope(sc);
    var p = IC.pack.posParse(IC.form.myPos()); if (!p) { if (typeof colToast === 'function') colToast('No position yet -- is the status feed running?', 'warn'); return; }
    var a = ['x', 'y', 'z']; for (var i = 0; i < 3; i++) { var el = $(K + '' + a[i]); if (el) el.value = p[a[i]].toFixed(2); }
  };
  root.icCsBuilderBuild = function (sc) {
    scope(sc);
    var mode = jbVal(K + 'mode') || 'here';
    var v = function (id) { var el = $(id); return el ? str(el.value).trim() : ''; };
    var g = function (id) { return jbVal(id) || v(id); };
    if (mode === 'here') return 'oc !c -CampSpot ' + (g(K + 'who') || 'Auto') + ' ' + (v(K + 'min') || '1') + ' ' + (v(K + 'max') || '200');
    if (mode === 'joust') {
      var jo = g(K + 'joustoff');
      if (!jo) { IC.ui.alert('Joust builder', 'Pick who steps out.'); return ''; }
      return 'oc !c -campspot ' + (g(K + 'cswho') || 'all') + ' ' + (v(K + 'min') || '1') + ' ' + (v(K + 'max') || '200') + ' -joustoff ' + jo + ' -joustin ' + (g(K + 'joustin') || 'all');
    }
    if (mode === 'at') return 'oc !ci -ChangeCampSpotWho ' + (g(K + 'who') || 'igw:${Me.Name}') + ' ' + (v(K + 'x') || '0') + ' ' + (v(K + 'y') || '0') + ' ' + (v(K + 'z') || '0');
    var npc = v(K + 'npc');
    if (!npc) { IC.ui.alert('Camp spot builder', 'Enter the NPC name (target it and click Target).'); return ''; }
    if (!/^\$\{|^\d+$/.test(npc)) npc = '${Actor[ExactName,"' + npc.replace(/"/g, '') + '"].ID}';
    var who = g(K + 'who') || 'igw:${Me.Name}', dist = v(K + 'dist') || '5';
    if (mode === 'behind') return 'oc !ci -SetCS_BehindNPC ' + who + ' ' + npc + ' ' + dist;
    if (mode === 'front') return 'oc !ci -SetCS_InFrontNPC ' + who + ' ' + npc + ' ' + dist;
    if (mode === 'right') return 'oc !ci -SetCS_NPC ' + who + ' 90 ' + npc + ' ' + dist;
    if (mode === 'left') return 'oc !ci -SetCS_NPC ' + who + ' 270 ' + npc + ' ' + dist;
    return 'oc !ci -SetCS_NPC ' + who + ' ' + (v(K + 'angle') || '0') + ' ' + npc + ' ' + dist;
  };
  root.icCsBuilderPreview = function (sc) { scope(sc); var el = $(K + 'preview'); if (el) el.textContent = root.icCsBuilderBuild(sc); };
  root.icCsBuilderInsert = function (sc) {
    sc = scope(sc);
    var cmd = root.icCsBuilderBuild(sc);
    if (cmd && O._b[sc] != null) setCmd(sc, O._b[sc], cmd);
  };

  O.quickHtml = function () {
    var h = '<div class="ic-oc-quick-title">Quick commands (click to add)</div><div class="ic-oc-quick-grid">', c = cats[0];
    for (var j = 0; j < c.cmds.length; j++) {
      h += '<span class="ic-oc-quick-btn"' + tip(c.cmds[j].tip) + ' onclick="icOcQuickPick(0,' + j + ')">' + esc(c.cmds[j].label) + '</span>';
    }
    h += '</div><div style="display:flex;gap:4px;margin-top:2px;align-items:center;">' +
      '<span class="ic-oc-quick-btn" style="border-color:var(--accent-cyan);color:var(--accent-cyan);" onclick="icQuickAdd(\'OC\')">More commands...</span>' +
      '<span style="font-size:var(--fs-8);color:var(--text-secondary);flex:1;text-align:right;cursor:pointer;" onclick="icToggleOcQuick()">close</span></div>';
    return h;
  };
  root.icOcQuickPick = function (i, j) {
    var x = cats[i] && cats[i].cmds[j]; if (!x) return;
    root.icOcQuickAdd((x.pos || hasHere(x.cmd)) ? expandPos(x.cmd) : x.cmd);
  };
  root.icOcQuickAdd = function (cmd) {
    if (IC.ui && IC.ui.addEntry) IC.ui.addEntry({ type: 'OC', data: str(cmd) });
    var el = $('ic-oc-quick'); if (el) el.classList.remove('open');
  };
  root.icOcQuickPosAdd = function (tpl) { root.icOcQuickAdd(expandPos(str(tpl))); };
  root.icToggleOcQuick = function () {
    var el = $('ic-oc-quick');
    if (!el) return;
    if (!el.getAttribute('data-built')) { el.innerHTML = O.quickHtml(); el.setAttribute('data-built', '1'); }
    el.classList.toggle('open');
  };

  var MORE_WORDS = [
    [/-(?:AbilityTagEmbargo|AbilityTagRotate|AbilityTag)\s+("[^"]*"|\S+)\s+("[^"]*"|\S+)(?:\s+("[^"]*"|\S+))?(?:\s+("[^"]*"|\S+))?/i, function (m) {
      var W = IC.words, un = function (s) { return str(s).replace(/^"|"$/g, ''); }, who = W && W.Who ? W.Who(un(m[1])) : 'They';
      var tag = '"' + un(m[2]) + '"', secs = m[3] ? ' for ' + un(m[3]) + ' s' : '';
      return /^allow$/i.test(un(m[4])) ? who + ' may cast the abilities tagged ' + tag + secs : who + ' hold back the abilities tagged ' + tag + secs; }]
  ];
  O.moreWords = function (line) {
    var s = str(line);
    for (var i = 0; i < MORE_WORDS.length; i++) { var m = MORE_WORDS[i][0].exec(s); if (m) return MORE_WORDS[i][1](m); }
    return '';
  };
  function hookWords() {
    var W = IC.words;
    if (!W || typeof W.ogre !== 'function' || W.ogre._ocMore) return;
    var base = W.ogre;
    W.ogre = function (line) { var w = base(line); return !w || /^OgreBot: /.test(w) ? (O.moreWords(line) || w) : w; };
    W.ogre._ocMore = true;
  }
  if (IC.whenReady && !IC.ready) IC.whenReady(hookWords); else hookWords();

  root.icBuildOcCommandPicker = function () { return ''; };
  root.icOcFill = function (cmd) { var s = IC.model && IC.model.selected(); if (s && s.type === 'OC' && IC.ui) IC.ui.setSelectedField('data', cmd); };
  root.icOcFillPos = function (tpl) { root.icOcFill(expandPos(str(tpl))); };
  root.icOcToggleCat = function () {};
})(typeof window !== 'undefined' ? window : this);
