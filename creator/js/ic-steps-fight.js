/* Open IC Creator - ic-steps-fight.js
   Step schemas for ISXJQB instance files: fighting, group and setup steps.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var ORD = 2000;
  function def(s) {
    s.ord = ++ORD;
    if (IC.reg && IC.reg.define) IC.reg.define(s);
    else (IC._pendingDefs = IC._pendingDefs || []).push(s);
  }

  def({
    type: 'COMBAT', aliases: ['KILL'], cat: 'fight', quick: 3, short: 'Fight named', panel: 'encounter', check: combatCheck, icon: '&#9876;', name: 'Fight the named',
    section: true, nested: ['fight_rules'],
    help: 'Targets the named, fights until it dies (up to 10 min), waits for adds, then pulls the chest close.',
    more: 'Skipped if the named is already dead or not there. If the step before is "Group stands and fights here" the fight is held from that spot. If an encounter file exists for this named in this zone, its mechanics run during the fight.',
    label: function (e, U) {
      var x = [], nr = Array.isArray(e.fight_rules) ? e.fight_rules.length : 0;
      if (String(e.no_autotarget) === 'true' || String(e.no_autotarget) === '1') x.push('no auto-target');
      if (e.kill_order) x.push('kill order');
      if (nr) x.push(nr + ' fight rule' + (nr === 1 ? '' : 's'));
      return 'Fight ' + U.name(e.data || e.target) + (x.length ? ' (' + x.join(', ') + ')' : '');
    },
    fields: [
      { key: 'data', kind: 'text', label: 'Named', req: true, essential: true, grab: ['target', 'hover'], alt: 'target',
        help: 'Exact name of the boss. Target it in game and click Target.' },
      { key: 'no_autotarget', kind: 'check', label: "Don't put the boss on auto-target", on: 'true',
        help: 'Target it once instead. Use when something needs everyone to stop hitting it for a while.' },
      { key: 'kill_order', kind: 'names', label: 'Kill these in order', grab: ['target'],
        help: 'Each must die in this order before the step ends. The named is added last if missing.' },
      { key: 'extra_targets', kind: 'names', label: 'Also kill (lower priority)', grab: ['target'],
        help: 'Added to auto-target after the named. The step does not wait for them.' },
      { key: 'position', kind: 'check', label: 'Spread around the boss after the pull', on: 'npc',
        help: 'OgreBot positions the group around the mob 5 s into the fight, even from a camp spot.' },
      { key: 'hp_min', kind: 'int', label: 'Only engage while its health is at least', unit: '%', min: 0, max: 100,
        help: 'With the next field: an HP band. Empty/0 = any health.' },
      { key: 'hp_max', kind: 'int', label: '...and at most', unit: '%', min: 0, max: 100 },
      { key: 'fight_rules', kind: 'steps', label: 'During this fight', branch: 'During this fight', only: 'RULES', unitName: 'rule',
        addLabel: '+ Add a fight rule', help: 'When something happens in the fight (a line, an aura, a spawn, health), do something.' }
    ]
  });

  def({
    type: 'SAY', fightOnly: true, noTest: true, cat: 'fight', icon: '&#128483;', name: 'Say a line in chat',
    help: 'Says a line in group chat (or raid chat, or out loud nearby). Example: JOUST NOW!',
    label: function (e, U) { var m = String(e.mode || ''); return 'Say "' + U.q(e.data, 26) + '"' + (m && m !== 'group' ? ' in ' + m : ''); },
    fields: [
      { key: 'data', kind: 'text', label: 'Line', req: true, essential: true },
      { key: 'mode', kind: 'select', label: 'Where', opts: [['', 'Group chat'], ['raid', 'Raid chat'], ['say', 'Say (nearby)']] }
    ]
  });
  def({
    type: 'CLEARTARGET', fightOnly: true, noTest: true, cat: 'fight', icon: '&#10060;', name: 'Stop targeting',
    help: 'The chosen boxes drop their target (for example to stop hitting a shielded boss).',
    label: function (e, U) { return U.who(e.who || 'all') + ': stop targeting'; },
    newEntry: function () { return { type: 'CLEARTARGET', who: 'all' }; },
    fields: [{ key: 'who', kind: 'who', list: 'jb', label: 'Who', def: 'all', essential: true }]
  });

  def({
    type: 'WAITCOMBAT', cat: 'fight', icon: '&#9203;', name: 'Wait for the fight to end',
    help: 'Waits (up to 5 min) until nobody in the group is fighting, then releases the camp spot.',
    label: function () { return 'Wait for the fight to end'; },
    fields: [{ key: 'data', kind: 'text', label: 'Time limit', rt: false, quiet: true,
      help: 'Not read by the game: this step always waits up to 5 minutes.' }]
  });
  def({
    type: 'WAITFORCOMBAT', cat: 'fight', icon: '&#9889;', name: 'Wait until a fight starts',
    help: 'Waits until I am in combat (or gives up).',
    label: function (e) { return 'Wait for a fight to start (' + (e.data || '60') + ' s max)'; },
    fields: [{ key: 'data', kind: 'int', label: 'Give up after', unit: 's', def: '60', min: 1, max: 3600 }]
  });

  def({
    type: 'CHEST', aliases: ['LOOT'], cat: 'fight', quick: 4, short: 'Loot', icon: '&#9830;', name: 'Loot the chest',
    help: 'Pulls a chest that is more than 3 m away to you, then waits for the loot window to open and close.',
    label: function () { return 'Loot the chest'; },
    fields: [{ key: 'data', kind: 'text', label: 'Note', rt: false, quiet: true, help: 'Not read by the game.' }]
  });
  def({
    type: 'WAITLOOT', cat: 'fight', icon: '&#128176;', name: 'Wait for the loot window',
    help: 'Waits for a loot window to open and close.',
    label: function (e) { return 'Wait for loot (' + (e.data || '8') + ' s)'; },
    fields: [{ key: 'data', kind: 'int', label: 'Wait up to', unit: 's', def: '8', min: 1, max: 600 }]
  });

  def({
    type: 'TARGET', cat: 'fight', icon: '&#127919;', name: 'Auto-target list',
    doHelp: 'In a fight rule: puts a mob on auto-target and everyone targets it, or takes it off, clears the list, or sets the radius.',
    help: 'Adds or removes a mob on the auto-target list, clears the list, or sets the scan radius.',
    label: function (e, U) {
      var a = String(e.action || 'add');
      if (a === 'clear') return 'Clear the auto-target list';
      if (a === 'radius') return 'Auto-target radius ' + (e.radius || '30') + ' m';
      if (a === 'remove') return 'Stop auto-targeting ' + U.name(e.target || e.data);
      if (a === 'list') return 'Auto-target list + ' + U.name(e.target || e.data);
      return 'Target ' + U.name(e.target || e.data);
    },
    fields: [
      { key: 'action', kind: 'select', label: 'Do', def: 'add', essential: true,
        opts: [['add', 'Add and target it'], ['list', 'Add to the list (no target)'], ['remove', 'Remove from the list'], ['clear', 'Clear the whole list'], ['radius', 'Set the scan radius']] },
      { key: 'target', kind: 'text', label: 'Mob', alt: 'data', essential: true, grab: ['target'],
        when: { k: 'action', in: ['', 'add', 'list', 'remove'] }, help: 'Exact name.' },
      { key: 'radius', kind: 'int', label: 'Radius', unit: 'm', min: 1, max: 500,
        when: { k: 'action', in: ['radius'] }, help: 'Default 30.' },
      { key: 'hp_min', kind: 'int', label: 'Only while its health is at least', unit: '%', min: 0, max: 100,
        when: { k: 'action', in: ['', 'add'] } },
      { key: 'hp_max', kind: 'int', label: '...and at most', unit: '%', min: 0, max: 100,
        when: { k: 'action', in: ['', 'add'] } }
    ]
  });

  def({
    type: 'CLEARAREA', cat: 'fight', icon: '&#128481;', name: 'Clear the room',
    help: 'Keeps pulling and killing every mob with this name in range until none are left (10 min cap).',
    label: function (e, U) { return 'Clear ' + U.name(e.data) + ' within ' + (e.radius || '35') + ' m'; },
    fields: [
      { key: 'data', kind: 'text', label: 'Mob name', req: true, essential: true, grab: ['target'] },
      { key: 'radius', kind: 'int', label: 'Within', unit: 'm', def: '35', min: 1, max: 500 }
    ]
  });

  def({
    type: 'PULL', cat: 'fight', icon: '&#127993;', name: 'Buff, then pull a mob',
    help: 'Targets the mob, gives the group 11 s to pre-cast, then lets them engage.',
    label: function (e, U) { return 'Buff, then pull ' + U.name(e.data); },
    fields: [
      { key: 'data', kind: 'text', label: 'Mob', req: true, essential: true, grab: ['target'] },
      { key: 'hp_min', kind: 'int', label: 'Only while its health is at least', unit: '%', min: 0, max: 100 },
      { key: 'hp_max', kind: 'int', label: '...and at most', unit: '%', min: 0, max: 100 }
    ]
  });

  def({
    type: 'PREBUFF', aliases: ['BUFF'], cat: 'fight', icon: '&#9733;', name: 'Buff up before the pull',
    codec: 'prebuff',
    help: 'Gathers the group and opens a pre-cast window, chains AE blockers, or casts one ability.',
    label: function (e) {
      var o = IC.pack.codecs.prebuff.read(e);
      if (o.mode === 'blockers') return 'Chain ' + (o.count || '2') + ' AE blockers' + (o.cancel ? ' (cancel after ' + o.cancel + ' s)' : '');
      if (o.mode === 'cast') return 'Cast ' + (o.ability || '?') + ' (' + IC.reg.U.who(o.who || 'all') + ')';
      if (o.mode === 'precasttag') return 'Pre-cast window 20 s';
      return 'Buff up for ' + (o.secs || '11') + ' s';
    },
    fields: [
      { part: 'mode', kind: 'select', label: 'Kind', essential: true, rerender: true,
        opts: [['timed', 'Pre-cast window (N seconds)'], ['precasttag', 'Pre-cast window (fixed 20 s)'], ['blockers', 'Chain AE blockers'], ['cast', 'Cast one ability']] },
      { part: 'secs', kind: 'int', label: 'Seconds', min: 1, max: 600, when: { part: 'mode', in: ['timed'] }, help: 'Default 11.' },
      { part: 'count', kind: 'int', label: 'How many blockers', min: 1, max: 4, when: { part: 'mode', in: ['blockers'] },
        help: 'The druid\'s Tortoise Shell, the bard\'s Bladedance, the swashbuckler\'s Advance Warning, the channeler\'s Shield of Blackwood -- in that order, the ones in the group; each holds the run while it lasts (30, 30, 15, 5 s). Default 2.' },
      { part: 'cancel', kind: 'int', label: 'Cancel them after', unit: 's', min: 0, max: 600, when: { part: 'mode', in: ['blockers'] },
        help: 'Optional. Stored in the description as cancel:N, which is where the game reads it.' },
      { part: 'ability', kind: 'text', label: 'Ability', when: { part: 'mode', in: ['cast'] }, help: 'Exact ability name.' },
      { part: 'who', kind: 'select', label: 'Who casts', when: { part: 'mode', in: ['cast'] }, allowOther: true,
        opts: [['all', 'Everyone'], ['self', 'Just me']], help: 'Or type one character name (Other).' }
    ]
  });

  def({
    type: 'RUNE', cat: 'fight', icon: '&#128142;', name: 'Swap the belt rune',
    help: 'Swaps the group\'s belt adornment to resist a kind of control effect.',
    label: function (e, U) { var m = /ChangeBeltAdorn\s+\S+\s+"?(\w+)/i.exec(String(e.data || '')); return 'Belt rune: ' + (m ? m[1] : U.q(e.data, 24)); },
    fields: [
      { key: 'data', kind: 'select', label: 'Resist', allowOther: true, essential: true,
        opts: [['oc !ci -ChangeBeltAdorn igw:${Me.Name} stun', 'Stun'], ['oc !ci -ChangeBeltAdorn igw:${Me.Name} stifle', 'Stifle'],
               ['oc !ci -ChangeBeltAdorn igw:${Me.Name} mez', 'Mesmerize'], ['oc !ci -ChangeBeltAdorn igw:${Me.Name} fear', 'Fear']],
        help: 'Other = type any command.' }
    ]
  });

  var PASS_OVER = /^(COMMENT|WAIT|OC|TARGET|CMD|PREBUFF|WIPE_RECOVERY|RUNE|SCRIPT|ISS|WAITSCRIPT|WAITCOMBAT|WAITFOR|WAITUNTIL|IF|WHILE|LOOP)$/;
  function combatCheck(e, prev) {
    for (var j = prev.length - 1; j >= 0; j--) {
      var t = String((prev[j] && prev[j].type) || '');
      if (t === 'CAMPSPOT' || t === 'CAMPSPOT_WHO') return [];
      if (t === 'OC') {
        var d = String(prev[j].data || '').toLowerCase();
        if (d.indexOf('-changecampspotwho') >= 0 || d.indexOf('-ccsfw') >= 0) return [];
      }
      if (PASS_OVER.test(t)) continue;
      break;
    }
    return [{ level: 'info', msg: 'Fought at the mob (no "Group stands and fights here" right before it). Add one to hold a spot during the fight.' }];
  }

  def({
    type: 'CAST', aliases: ['CASTWHO'], cat: 'fight', icon: '&#10024;', name: 'Cast an ability',
    help: 'Has the chosen boxes cast an ability (OgreBot picks who matches).',
    label: function (e, U) {
      var fw = e.who || 'all', ab = e.ability || e.data, Wd = IC.words, jb = !Wd;
      for (var i = 0; !jb && i < IC.reg.WHO_JB.length; i++) if (IC.reg.WHO_JB[i][0] === fw) jb = true;
      var w = jb ? U.who(fw) : Wd.Who(fw), b = Wd && Wd.aeBlocker ? Wd.aeBlocker(ab) : null;
      if (b && /^everyone$/i.test(w)) w = 'The ' + Wd.who(b.cls);
      return w + ' cast ' + U.q(ab, 24) + (e.target ? ' on ' + U.name(e.target) : '');
    },
    newEntry: function () { return { type: 'CAST', who: 'all', ability: '', action: '' }; },
    fields: [
      { key: 'who', kind: 'who', list: 'jb', label: 'Who', def: 'all', essential: true },
      { key: 'ability', kind: 'text', label: 'Ability', req: true, essential: true, alt: 'data', help: 'Exact ability name. Example: Tortoise Shell' },
      { key: 'action', kind: 'select', label: 'How', def: '',
        opts: [['', 'Normal cast'], ['nochecks', 'Skip the usual checks'], ['onplayer', 'On a player'], ['onnpc', 'On an NPC'], ['self', 'Normal cast (saved as self)']] },
      { key: 'target', kind: 'text', label: 'On', grab: ['target'], when: { k: 'action', in: ['onplayer', 'onnpc'] } }
    ]
  });

  def({
    type: 'EVAC', cat: 'fight', icon: '&#128640;', name: 'Evac out',
    help: 'Waits for the fight to clear and 10 s, then evacs the group out (my evac, a group member\'s, or a totem).',
    more: 'If a fight with a named is still going, it waits and re-checks. "Evac now" skips that wait.',
    label: function (e) { var m = String(e.data || '').toLowerCase(); return 'Evac out' + (m.indexOf('force') >= 0 ? ' now' : '') + (m.indexOf('group') >= 0 ? ' (group member)' : ''); },
    fields: [
      { key: 'data', kind: 'select', label: 'How', allowOther: true,
        opts: [['', 'Best way out (default)'], ['self', 'Best way out (my evac first)'], ['group', 'Ask a group member to evac'], ['force', 'Evac now, even mid-fight']] }
    ]
  });

  def({
    type: 'MONITOR', aliases: ['COMBATMONITOR'], cat: 'advanced', hidden: true, icon: '&#128065;', name: 'Watch the fight (one-shot rules)',
    help: 'During a fight, reacts once per rule (a line of text, an effect on me, a distance). For most fights "During the next fight: when... do..." is easier.',
    more: 'Ends when combat ends (or right away if not in combat). Rules are JSON: [{"type":"text","pattern":"Line","action":"nav","target":"x,y,z"}]. Types: text, effect, actor_distance. Actions: nav, stop.',
    label: function () { return 'Watch the fight (rules)'; },
    fields: [
      { key: 'data', kind: 'textarea', label: 'Rules (JSON)', help: 'A JSON list of rules.' },
      { key: 'trigger_type', kind: 'select', label: 'Single rule: type', adv: true,
        opts: [['', '(use the JSON list)'], ['effect', 'Effect on me'], ['actor_distance', 'Actor distance'], ['text', 'A line of text']] },
      { key: 'pattern', kind: 'text', label: 'Single rule: name', adv: true },
      { key: 'action', kind: 'select', label: 'Single rule: do', adv: true, opts: [['', 'stop'], ['stop', 'Stop moving'], ['nav', 'Walk to a spot']] },
      { key: 'coords', kind: 'pos', label: 'Single rule: spot', adv: true, grab: ['pos'] }
    ]
  });

  def({
    type: 'SETUP', cat: 'group', icon: '&#128295;', name: 'Repair and mend at zone-in',
    help: 'Runs the repair / mend sequence (takes about a minute).',
    label: function () { return 'Repair and mend'; },
    fields: [{ key: 'data', kind: 'text', label: 'Note', rt: false, quiet: true, help: 'Not read by the game.' }]
  });
  def({
    type: 'IC_SETUP', cat: 'group', icon: '&#9881;', name: 'Set up the group for this run',
    help: 'Sets the OgreBot options a zone run needs (camp-spot movement, assist, facing).',
    label: function () { return 'Set up the group'; },
    fields: [{ key: 'data', kind: 'text', label: 'Note', rt: false, quiet: true, help: 'Not read by the game.' }]
  });
  def({
    type: 'STARTUP', cat: 'group', icon: '&#9654;', name: 'Scout setup on',
    help: 'Turns on scout extras (disarm-chest looting, out-of-combat scan, hide illusion).',
    label: function () { return 'Scout setup on'; },
    fields: [{ key: 'data', kind: 'text', label: 'Note', rt: false, quiet: true }]
  });
  def({
    type: 'SHUTDOWN', cat: 'group', icon: '&#9632;', name: 'Scout setup off',
    help: 'Turns the scout extras off again.',
    label: function () { return 'Scout setup off'; },
    fields: [{ key: 'data', kind: 'text', label: 'Note', rt: false, quiet: true }]
  });
  def({
    type: 'SETUP_CLASS', cat: 'group', icon: '&#127891;', name: 'Class startup / shutdown routine',
    help: 'If my class is in the list, runs "call Startup_<Class>" (or Shutdown_<Class>).',
    more: 'That function must exist in a running script, otherwise nothing happens.',
    label: function (e) { return (String(e.action || 'startup') === 'shutdown' ? 'Shutdown_' : 'Startup_') + (e.data || '?'); },
    fields: [
      { key: 'data', kind: 'text', label: 'Classes', req: true, essential: true, help: 'One or more, comma separated. Example: Assassin,Brigand' },
      { key: 'action', kind: 'select', label: 'Run', def: 'startup', opts: [['startup', 'Startup'], ['shutdown', 'Shutdown']] }
    ]
  });
  def({
    type: 'SCOUTS_IN', cat: 'group', icon: '&#8618;', name: 'Scouts into melee',
    help: 'Tells the scouts to move into melee range.', label: function () { return 'Scouts into melee'; },
    fields: [{ key: 'data', kind: 'text', label: 'Note', rt: false, quiet: true }]
  });
  def({
    type: 'SCOUTS_OUT', cat: 'group', icon: '&#8617;', name: 'Scouts out of melee',
    help: 'Tells the scouts to move out of melee range.', label: function () { return 'Scouts out of melee'; },
    fields: [{ key: 'data', kind: 'text', label: 'Note', rt: false, quiet: true }]
  });
  def({
    type: 'LOOTMETHOD', cat: 'group', icon: '&#127873;', name: 'Group loot method',
    help: "The group's leader sets the loot method from here on: Leader Only, Free For All, Lottery, Need Before Greed or Round Robin.",
    more: "First in the file it is set as the run starts; before a named, for that fight; inside an event, when it fires. Tools > Loot's own choice is set again at the next run's start.",
    label: function (e) {
      var m = { leader: 'Leader Only', ffa: 'Free For All', lotto: 'Lottery', nbg: 'Need Before Greed', roundrobin: 'Round Robin' }[String(e.data || 'leader').toLowerCase()] || String(e.data || '?');
      var r = { all: 'all items', treasured: 'treasured items and above', legendary: 'legendary items and above', fabled: 'fabled items and above' }[String(e.mode || '').toLowerCase()];
      return 'Loot: ' + m + (r ? ' for ' + r : '');
    },
    fields: [
      { key: 'data', kind: 'select', label: 'Method', def: 'leader', essential: true,
        opts: [['leader', 'Leader Only (our leader assigns it)'], ['ffa', 'Free For All'], ['lotto', 'Lottery'], ['nbg', 'Need Before Greed'], ['roundrobin', 'Round Robin']] },
      { key: 'mode', kind: 'select', label: 'For', def: '',
        opts: [['', 'the items it is set for now'], ['all', 'all items'], ['treasured', 'treasured items and above'], ['legendary', 'legendary items and above'], ['fabled', 'fabled items and above']] }
    ]
  });
  def({
    type: 'ZONERESETALL', cat: 'group', icon: '&#8634;', name: "Reset this zone's lockout (at the start)",
    help: 'Group leader only: resets the zone(s) this run is about to enter, never other lockouts.',
    more: 'Skipped when the run starts inside the zone, when allow_reset is off, or when a named is still up.',
    label: function () { return 'Reset the zone lockout'; },
    fields: [{ key: 'data', kind: 'text', label: 'Note', rt: false, quiet: true }]
  });
  def({
    type: 'RESETZONE', aliases: ['RESET'], cat: 'group', icon: '&#8635;', name: 'Reset a zone',
    help: 'Resets the zone timer on every group box (current zone if empty).',
    label: function (e, U) { return 'Reset zone ' + U.name(e.data, '(current)'); },
    fields: [{ key: 'data', kind: 'text', label: 'Zone', grab: ['zone'], help: 'In-game zone name. Empty = the current zone.' }]
  });
  def({
    type: 'RESETIFABLE', aliases: ['CHECKRESET'], cat: 'group', icon: '&#8635;', name: 'Reset the zone if its timer allows',
    help: 'Resets the zone only when its reuse timer is up; otherwise carries on.',
    label: function (e, U) { return 'Reset if able: ' + U.name(e.data, '(current)'); },
    fields: [{ key: 'data', kind: 'text', label: 'Zone', grab: ['zone'] }]
  });
  def({
    type: 'WAITRESET', aliases: ['WAITRESETTABLE'], cat: 'group', icon: '&#8987;', name: 'Wait out the zone reset timer',
    help: 'Waits until the zone can be reset (keeps the boxes from idling out).',
    label: function (e) { return 'Wait for the reset timer (max ' + (e.data || '120') + ' min)'; },
    fields: [{ key: 'data', kind: 'int', label: 'Wait at most', unit: 'min', def: '120', min: 1, max: 1440 }]
  });
  def({
    type: 'SAMEZONECHECK', cat: 'group', icon: '&#128101;', name: 'Wait until everyone is in this zone',
    help: 'Pulls stragglers into the zone and waits until the whole group is here.',
    label: function (e) { return 'Wait for the group to zone in (' + (e.data || '120') + ' s)'; },
    fields: [{ key: 'data', kind: 'int', label: 'Give up after', unit: 's', def: '120', min: 1, max: 3600 }]
  });
  def({
    type: 'WAITPOWER', cat: 'group', icon: '&#128267;', name: 'Wait for power',
    help: 'Waits the whole timeout. The game does not check power yet, so keep the timeout short.',
    label: function (e) { return 'Wait ' + (e.distance || '60') + ' s (meant for power ' + (e.data || '80') + '%)'; },
    fields: [
      { key: 'data', kind: 'int', label: 'Power at least', unit: '%', def: '80', min: 1, max: 100, help: 'Saved; not checked by the game yet.' },
      { key: 'who', kind: 'select', label: 'Whose power', def: 'self', opts: [['self', 'Mine'], ['group', 'The group\'s']] },
      { key: 'distance', kind: 'int', label: 'Wait', unit: 's', def: '60', min: 1, max: 3600, help: 'The step always waits this long.' }
    ]
  });
})(typeof window !== 'undefined' ? window : this);
