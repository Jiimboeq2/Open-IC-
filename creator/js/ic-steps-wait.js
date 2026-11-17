/* Open IC Creator - ic-steps-wait.js
   Step schemas for ISXJQB instance files: waits, checks and loops, advanced steps, fight rules and template blocks.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var ORD = 3000;
  function def(s) {
    s.ord = ++ORD;
    if (IC.reg && IC.reg.define) IC.reg.define(s);
    else (IC._pendingDefs = IC._pendingDefs || []).push(s);
  }
  var ACTOR_CONDS = ['actor_alive', 'actor_dead', 'actor_not_exists', 'actor_exists', 'actor_in_range'];

  def({
    type: 'WAIT', cat: 'wait', quick: 5, short: 'Wait', icon: '&#9202;', name: 'Wait N seconds',
    doHelp: 'In a fight rule: waits before the rule\'s next step. The fight goes on.',
    help: 'Pauses for a number of seconds. Fractions work (0.5 = half a second); 0 = no wait.',
    label: function (e) { var v = String(e.data == null ? '' : e.data).trim(); return v !== '' && +v === 0 ? 'No wait (0 s)' : 'Wait ' + (v || '5') + ' s'; },
    fields: [{ key: 'data', kind: 'number', label: 'Seconds', unit: 's', def: '5', req: true, essential: true, min: 0, max: 3600,
      help: 'Fractions work: 0.5 is half a second. 0 = no wait. Empty or not a number, the game waits 5 s.' }]
  });
  def({
    type: 'WAITGROUP', cat: 'wait', icon: '&#128101;', name: 'Wait for everyone to catch up',
    help: 'Waits until every group member is within N meters (2 min cap).',
    label: function (e) { return 'Wait for the group within ' + (e.data || '10') + ' m'; },
    fields: [{ key: 'data', kind: 'int', label: 'Within', unit: 'm', def: '10', min: 1, max: 500 }]
  });
  def({
    type: 'WAITFOR', aliases: ['WAITUNTIL'], cat: 'wait', quick: 6, short: 'Wait until', icon: '&#8987;', name: 'Wait until...',
    codec: 'waitfor',
    help: 'Holds the run until a condition is true (or the time runs out). Pick the condition from the list.',
    more: 'Builds the same check the game reads, so nobody has to type script. The raw check stays editable under Advanced.',
    label: function (e) { var o = IC.pack.codecs.waitfor.read(e); return 'Wait until ' + IC.pack.exprText(o.expr); },
    fields: [
      { part: 'expr', kind: 'expr', label: 'Wait until', say: 'Waits until', req: true, essential: true },
      { part: 'timeout', kind: 'int', label: 'Give up after', unit: 's', min: 1, max: 86400, essential: true, help: 'Default 30.' }
    ]
  });
  def({
    type: 'WAITACTOR', cat: 'wait', icon: '&#128065;', name: 'Wait for someone to show up', codec: 'nameTimeout',
    help: 'Waits until the named actor is in the zone (skipped if it was already killed this run).',
    label: function (e, U) { var o = IC.pack.codecs.nameTimeout.read(e); return 'Wait for ' + U.name(o.name) + ' to show up'; },
    fields: [
      { part: 'name', kind: 'text', label: 'Who', req: true, essential: true, grab: ['target', 'hover'] },
      { part: 'timeout', kind: 'int', label: 'Give up after', unit: 's', min: 1, max: 86400, help: 'Default 60.' }
    ]
  });
  def({
    type: 'WAITNOACTOR', aliases: ['WAITGONE'], cat: 'wait', icon: '&#128683;', name: 'Wait until something is gone',
    codec: 'noActor',
    help: 'Waits while an actor with this name (and optional type) still exists.',
    label: function (e, U) { var o = IC.pack.codecs.noActor.read(e); return 'Wait until ' + U.name(o.name) + ' is gone'; },
    fields: [
      { part: 'name', kind: 'text', label: 'What', req: true, essential: true, grab: ['target', 'hover'] },
      { part: 'typef', kind: 'text', label: 'Only of type', help: 'Optional. Example: NoKill NPC' },
      { part: 'timeout', kind: 'int', label: 'Give up after', unit: 's', min: 1, max: 86400, help: 'Default 180.' }
    ]
  });
  def({
    type: 'WAITACTORDEAD', aliases: ['WAITDEAD'], cat: 'wait', icon: '&#9760;', name: 'Wait until someone is dead',
    codec: 'nameTimeout',
    help: 'Waits until no living actor has this name. Does not attack it.',
    label: function (e, U) { var o = IC.pack.codecs.nameTimeout.read(e); return 'Wait until ' + U.name(o.name) + ' is dead'; },
    fields: [
      { part: 'name', kind: 'text', label: 'Who', req: true, essential: true, grab: ['target'] },
      { part: 'timeout', kind: 'int', label: 'Give up after', unit: 's', min: 1, max: 86400, help: 'Default 600.' }
    ]
  });
  def({
    type: 'WAITDETRIMENT', aliases: ['WAITBUFF'], cat: 'wait', icon: '&#129514;', name: 'Wait for an effect on me',
    codec: 'detriment',
    help: 'Waits until an effect (by exact name) appears on me, or is gone.',
    label: function (e) { var o = IC.pack.codecs.detriment.read(e); return 'Wait until "' + (o.name || '?') + '" ' + (/^(gone|disappear|false)$/.test(o.mode) ? 'is gone' : 'is on me'); },
    fields: [
      { part: 'name', kind: 'text', label: 'Effect', req: true, essential: true, pick: 'detname', help: 'Its exact name, as the game shows it.' },
      { part: 'mode', kind: 'select', label: 'Wait until it', opts: [['', 'Appears'], ['appear', 'Appears'], ['gone', 'Is gone']] },
      { part: 'timeout', kind: 'int', label: 'Give up after', unit: 's', min: 1, max: 86400, help: 'Default 30.' }
    ]
  });
  def({
    type: 'WAITEFFECT', cat: 'wait', icon: '&#127775;', name: 'Wait for an effect icon on my target',
    codec: 'effectIcon',
    help: 'Waits (30 s max) until an effect with this icon id appears on (or leaves) my target.',
    label: function (e) { var o = IC.pack.codecs.effectIcon.read(e); return 'Wait for icon ' + (o.icon || '?') + (o.mode === 'gone' ? ' to go' : ''); },
    fields: [
      { part: 'icon', kind: 'int', label: 'Icon id', req: true, essential: true, min: 0, max: 999999, pick: 'icon',
        help: 'The effect\'s main icon id (the first number of a detriment\'s icon pair).' },
      { part: 'mode', kind: 'select', label: 'Until it', opts: [['', 'Appears'], ['gone', 'Is gone']] }
    ]
  });
  def({
    type: 'WAITZONE', cat: 'wait', icon: '&#127757;', name: 'Wait for zoning',
    help: 'Waits for a zone change (any, or into the zone named here).',
    more: 'Skipped automatically when the run starts inside the zone.',
    label: function (e, U) { return 'Wait for zoning' + (e.data ? ' into ' + U.q(e.data, 26) : ''); },
    fields: [{ key: 'data', kind: 'text', label: 'Into zone', grab: ['zoneshort'], help: 'Optional zone short name. Example: exp02_dun_halls_of_fate' }]
  });
  def({
    type: 'WAITSCRIPT', cat: 'wait', icon: '&#128220;', name: 'Wait for a routine to finish', codec: 'nameTimeout',
    help: 'Waits until a routine started by "Run a saved routine" has ended.',
    label: function (e, U) { var o = IC.pack.codecs.nameTimeout.read(e); return 'Wait for routine ' + U.name(o.name) + ' to finish'; },
    fields: [
      { part: 'name', kind: 'text', label: 'Routine', req: true, essential: true, help: 'Example: rok_cmc_portal' },
      { part: 'timeout', kind: 'int', label: 'Give up after', unit: 's', min: 1, max: 86400, help: 'Default 120.' }
    ]
  });
  def({
    type: 'MSGBOX', aliases: ['ALERT'], cat: 'wait', icon: '&#128172;', name: 'Show a message',
    doHelp: 'In a fight rule: shows a line in my chat window.',
    help: 'Shows a message box in game for a few seconds.',
    label: function (e, U) { return 'Message: ' + U.q(e.data, 30); },
    fields: [{ key: 'data', kind: 'text', label: 'Message', req: true, essential: true }]
  });

  function condFields(isWhile) {
    return [
      { key: 'condition', kind: 'cond', label: isWhile ? 'Repeat while' : 'Only if', req: true, essential: true, rerender: true },
      { part: 'cname', kind: 'text', label: 'Name', grab: ['target', 'hover'], when: { k: 'condition', in: ACTOR_CONDS } },
      { part: 'cdist', kind: 'number', label: 'Within', unit: 'm', min: 0, max: 1000, when: { k: 'condition', in: ['actor_in_range'] } },
      { part: 'cnum', kind: 'int', label: 'Health below', unit: '%', min: 1, max: 100, when: { k: 'condition', in: ['hp_below'] } },
      { part: 'czone', kind: 'text', label: 'Zone name contains', grab: ['zone'], when: { k: 'condition', in: ['zone_name'] } },
      { part: 'cclasses', kind: 'classes', label: 'Classes', when: { k: 'condition', in: ['group_has_class', 'not_group_has_class'] } },
      { part: 'cexpr', kind: 'expr', label: 'Check', when: { k: 'condition', in: ['ls', 'expr', 'not_ls'] } },
      { part: 'cvar', kind: 'text', label: 'Variable', when: { k: 'condition', in: ['variable', 'not_variable'] },
        help: 'An instance variable (Settings > Instance variables, or a "Set a variable" step).' },
      { part: 'cval', kind: 'text', label: 'Value', when: { k: 'condition', in: ['variable', 'not_variable'] },
        help: 'Empty = set to anything (not empty). Any case.' },
      { part: 'cdiff', kind: 'select', label: 'Difficulty', rt: false, quiet: true, when: { k: 'condition', in: ['difficulty', 'not_difficulty'] },
        opts: [['solo', 'Solo'], ['heroic', 'Heroic'], ['heroic2', 'Untold Heroic'], ['raid', 'Raid']],
        help: 'Never matches: the game does not set a difficulty for these steps.' },
      { part: 'cnative', kind: 'textarea', label: 'Checks (as Ogre writes them)', ncond: true, when: { k: 'condition', in: ['native'] },
        help: 'All of them must be true. Brought over from an Ogre zone file; the step title says them in words. A typo makes the check false.' }
    ];
  }
  function condTruth(e, s, P) {
    var cnd = String(e.condition || '');
    if (/difficulty$/.test(cnd)) return [{ key: 'cond:diff', label: '"' + s.name + '" on difficulty (never matches)', why: 'The game sets no difficulty for these steps' }];
    if (!P.condKnown(cnd)) return [{ key: 'cond:unk:' + cnd, label: '"' + s.name + '" with unknown check "' + cnd + '"', why: 'Unknown checks count as false' }];
    return [];
  }
  def({
    type: 'IF', cat: 'logic', truth: condTruth, icon: '&#10067;', name: 'Only if...', codec: 'cond', nested: ['sub_steps', 'else_steps'],
    help: 'Runs the "Then" steps when the check is true, otherwise the "Otherwise" steps.',
    more: 'The nested steps show indented under this step in the timeline. Select a nested step to edit it.',
    label: function (e) { return 'Only if ' + IC.pack.condText(e); },
    newEntry: function () { return { type: 'IF', data: '', condition: 'in_combat', condition_value: '', sub_steps: [] }; },
    fields: condFields(false).concat([
      { key: 'sub_steps', kind: 'steps', label: 'Then do', branch: 'Then' },
      { key: 'else_steps', kind: 'steps', label: 'Otherwise do', branch: 'Otherwise' },
      { key: 'data', kind: 'text', label: 'Note', rt: false, quiet: true, help: 'Not read by the game.' },
      { key: 'then', kind: 'text', label: 'Then (old editor text)', rt: false, help: 'Old editor format; the game never reads it.' },
      { key: 'else', kind: 'text', label: 'Else (old editor text)', rt: false, help: 'Old editor format; the game never reads it.' }
    ])
  });
  def({
    type: 'WHILE', aliases: ['LOOP'], cat: 'logic', truth: condTruth, icon: '&#128260;', name: 'Repeat while...', codec: 'cond', nested: ['sub_steps'],
    help: 'Repeats the nested steps while the check stays true (stops after the time or round limit).',
    label: function (e) { return 'Repeat while ' + IC.pack.condText(e); },
    newEntry: function () { return { type: 'WHILE', data: '', condition: 'in_combat', condition_value: '', sub_steps: [], timeout: '600' }; },
    fields: condFields(true).concat([
      { key: 'sub_steps', kind: 'steps', label: 'Repeat these', branch: 'Repeat' },
      { key: 'timeout', kind: 'int', label: 'Stop after', unit: 's', min: 1, max: 86400, help: 'Default 600.' },
      { key: 'max_iterations', kind: 'int', label: 'Stop after this many rounds', min: 1, max: 100000, help: 'Empty = no round limit.' },
      { key: 'data', kind: 'text', label: 'Note', rt: false, quiet: true },
      { key: 'action', kind: 'text', label: 'Action (old editor text)', rt: false, help: 'Old editor format; never read.' },
      { key: 'poll_interval', kind: 'int', label: 'Every N s (old editor)', rt: false, help: 'Old editor format; never read.' }
    ])
  });

  def({
    type: 'COMMENT', aliases: ['comment'], cat: 'logic', quick: 7, short: 'Note', noTest: true, section: 'label', icon: '&#9998;', name: 'Note / section label',
    help: 'A label for people reading the file. Does nothing in game. Start it with === to make a section header.',
    label: function (e) { return String(e.data || e.comment || 'Note'); },
    fields: [{ key: 'data', kind: 'text', label: 'Text', essential: true, help: 'Example: === Named 2: Drusella Sathir ===' }]
  });
  def({
    type: 'WIPE_RECOVERY', cat: 'logic', noTest: true, icon: '&#128681;', name: 'Checkpoint (a wipe restarts here)', section: 'anchor',
    help: 'After a wipe the run picks up from here. Also starts a boss section in this editor.',
    more: 'The name is used to skip this boss section when a difficulty wrapper lists it under "skip bosses".',
    label: function (e, U) { return 'Checkpoint: ' + U.name(e.boss || e.data); },
    newEntry: function () { return { type: 'WIPE_RECOVERY', data: '', boss: '', wipe_num: '1' }; },
    fields: [
      { key: 'data', kind: 'text', label: 'Boss name', req: true, essential: true, grab: ['target'],
        help: 'The named this section is for.' },
      { key: 'boss', kind: 'text', label: 'Boss name (editor copy)', quiet: true, rt: false, mirror: 'data',
        help: 'Used by this editor to name the section. Kept in step with the field above.' },
      { key: 'wipe_num', kind: 'int', label: 'Section number', quiet: true, rt: false, help: 'Not read by the game.' }
    ]
  });
  def({
    type: 'OC', cat: 'advanced', icon: '&#9889;', name: 'OgreBot command',
    help: 'Sends an OgreBot command to the group. Pick one from the list, or type your own under Advanced.',
    label: function (e) { return (IC.oc && IC.oc.describe) ? IC.oc.describe(e.data) : 'OgreBot: ' + IC.reg.U.q(e.data, 30); },
    check: function (e) {
      var out = [], need = IC.reg.ocFill ? IC.reg.ocFill(e.data) : [], rj = IC.oc && IC.oc.rejected ? IC.oc.rejected(e.data) : '';
      if (need.length) out.push({ level: 'error', msg: 'Fill in ' + need.join(', ') + ' before this runs.' });
      if (rj) out.push({ level: 'warn', msg: rj });
      return out;
    },
    fields: [{ key: 'data', kind: 'oc', label: 'Command', req: true, essential: true }]
  });
  def({
    type: 'CMD', aliases: ['COMMAND'], cat: 'advanced', icon: '&#62;', name: 'Script line',
    help: 'Runs one console line in game. "call X" lines need a running OgreBot script.',
    label: function (e, U) { return 'Run: ' + U.q(e.data, 34); },
    fields: [{ key: 'data', kind: 'text', label: 'Line', req: true, essential: true, help: 'Example: eq2execute summon' }]
  });
  def({
    type: 'REG', aliases: ['REGISTRY'], cat: 'advanced', icon: '&#9776;', name: 'Run a JQB command',
    help: 'Runs one JQB command by name, with comma-separated values.',
    label: function (e, U) { return 'JQB: ' + U.q(e.data, 34); },
    fields: [{ key: 'data', kind: 'text', label: 'Command', req: true, essential: true, help: 'Name then values, like: HailActor Some NPC,1,1,1' }]
  });
  def({
    type: 'SCRIPT', aliases: ['ISS'], cat: 'advanced', icon: '&#128190;', name: 'Run a saved routine', codec: 'script',
    help: 'Starts a routine (a built-in one first, else a file in JB\\Scripts) and moves on after 2 s.',
    more: 'Pair with "Wait for a routine to finish" when the next steps need it done.',
    label: function (e, U) { var o = IC.pack.codecs.script.read(e); return 'Run routine ' + U.name(o.name); },
    fields: [
      { part: 'name', kind: 'text', label: 'Routine', req: true, essential: true, help: 'Example: rok_cmc_portal' },
      { part: 'args', kind: 'text', label: 'Values', help: 'Optional, separated by |. Only built-in routines receive them.' }
    ]
  });
  def({
    type: 'RUNHELPER', aliases: ['HELPER'], cat: 'advanced', icon: '&#128736;', name: 'Run an OgreBot helper script',
    help: 'Starts an OgreBot side script on the chosen boxes; the run goes on right away.',
    label: function (e, U) { return 'Helper ' + U.q(e.ability || String(e.data || '').split('|')[0], 30); },
    fields: [
      { key: 'who', kind: 'who', list: 'jb', label: 'Who', def: 'self' },
      { key: 'ability', kind: 'text', label: 'Script', req: true, essential: true, help: 'A .iss path. Example: The_Blackscale_Sepulcher_SealScript.iss' },
      { key: 'data', kind: 'text', label: 'Values', help: 'Optional, separated by |.' }
    ]
  });

  def({
    type: 'SETVAR', cat: 'logic', v3full: true, icon: '&#128204;', name: 'Set a variable', codec: 'setvar',
    help: 'Sets an instance variable. "Only if..." and "Repeat while..." can check it; any command can use it as ${JBV_name}.',
    more: 'Variables start with the values under Settings > Instance variables when the run starts.',
    label: function (e, U) { var o = IC.pack.codecs.setvar.read(e); return 'Set ' + U.name(o.vname) + ' = ' + (o.vvalue === '' ? '(empty)' : U.q(o.vvalue, 20)); },
    newEntry: function () { return { type: 'SETVAR', data: '=' }; },
    fields: [
      { part: 'vname', kind: 'text', label: 'Variable', req: true, essential: true, pattern: '^[A-Za-z0-9_]+$',
        help: 'Letters, digits and _ only. Example: shield_phase' },
      { part: 'vvalue', kind: 'text', label: 'Value', essential: true, help: 'Example: done. Empty counts as not set.' }
    ]
  });

  var TRIG = [
    ['says', 'Someone says or emotes a line'],
    ['announce', 'Red text shows on screen'],
    ['spawn', 'A mob or object spawns'],
    ['despawn', 'A mob dies or despawns'],
    ['hp', 'Health drops to N%'],
    ['cast', 'Someone starts casting'],
    ['aura', 'Someone has an aura'],
    ['aura_gone', 'An aura goes away'],
    ['debuff', 'I get a detriment'],
    ['timer', 'Every N seconds']
  ];
  var TRIG_OLD = { boss_says: 'says', chat: 'says', text: 'says', emote: 'says', red_text: 'announce', mob_spawns: 'spawn',
    mob_dies: 'despawn', hp_threshold: 'hp', boss_hp: 'hp', hp_below: 'hp', ability_cast: 'cast', detriment: 'debuff', every: 'timer' };
  function trig(v, dflt) { v = String(v == null ? '' : v).toLowerCase(); return TRIG_OLD[v] || v || dflt; }
  function isT(list) { return function (e) { return list.indexOf(trig(e.trigger_type, 'says')) >= 0; }; }
  function isOr(list) { return function (e) { return list.indexOf(trig(e.or_trigger_type, '')) >= 0; }; }
  function whenText(t, p, v, who, U) {
    var w = who ? U.name(who) : 'the named';
    switch (t) {
      case 'says': return 'a line has "' + U.q(p, 24) + '"';
      case 'announce': return 'red text "' + U.q(p, 24) + '"';
      case 'spawn': return U.name(p) + ' spawns';
      case 'despawn': return U.name(p) + ' is gone';
      case 'hp': return w + ' is at ' + (v || p || '?') + '%';
      case 'cast': return w + ' casts ' + U.q(p, 24);
      case 'aura': return w + ' has aura "' + U.q(p, 20) + '"';
      case 'aura_gone': return w + ' loses aura "' + U.q(p, 20) + '"';
      case 'debuff': return 'I get detriment ' + (p ? String(p).replace(/^\s*(\d+)\s*[:,\/ ]\s*(\d+)\s*$/, '$1 / $2') : '?');
      case 'timer': return 'every ' + (v || p || '?') + ' s';
      default: return t || '?';
    }
  }
  function ruleCheck(e) {
    var t = trig(e.trigger_type, 'says'), out = [], known = false;
    for (var i = 0; i < TRIG.length; i++) if (TRIG[i][0] === t) known = true;
    if (!known) out.push({ level: 'error', msg: 'Unknown "When" ("' + t + '"): the rule never fires. Pick one from the list.' });
    var n = Array.isArray(e.sub_steps) ? e.sub_steps.length : 0;
    if (!n && !(e.action_type && e.action_params)) out.push({ level: 'warn', msg: 'Nothing to do yet: add steps under "Then do".' });
    return out;
  }
  def({
    type: 'ON_EVENT', cat: 'fight', v3full: true, noTest: true, icon: '&#128163;', name: 'During the next fight: when... do...',
    nested: ['sub_steps'], check: function (e) { return ruleCheck(e); },
    help: 'A fight rule: when something happens during the next "Fight the named" (a line, red text, a spawn, health, a cast, an aura), do these steps.',
    more: 'This step takes no time: it is armed and runs from the pull until the named dies. "Fight the named" and named blocks also have their own "During this fight" list. JB Analysis shows the lines, auras and casts of a fight to copy from.',
    label: function (e, U) {
      var t = trig(e.trigger_type, 'says'), n = Array.isArray(e.sub_steps) ? e.sub_steps.length : 0;
      var s = (String(e.data || '').trim() ? U.q(e.data, 20) + ': ' : '') + 'When ' + whenText(t, e.pattern || e.trigger_pattern, e.value, e.target, U);
      if (e.or_trigger_type) s += ' or ' + whenText(trig(e.or_trigger_type, ''), e.or_pattern, e.or_value, e.or_target, U);
      return s + ', do ' + n + ' step' + (n === 1 ? '' : 's') + (String(e.once) === 'true' ? ' (once)' : '');
    },
    newEntry: function () { return { type: 'ON_EVENT', data: '', trigger_type: 'says', pattern: '', sub_steps: [] }; },
    fields: [
      { key: 'trigger_type', kind: 'select', label: 'When', essential: true, rerender: true, opts: TRIG },
      { key: 'pattern', alt: 'trigger_pattern', kind: 'text', label: 'Line has', req: true, essential: true, pick: 'line', when: isT(['says', 'announce']),
        help: 'Part of the line, any case. Several? Separate them with | (any one fires). Example: begins to shield herself' },
      { key: 'pattern', alt: 'trigger_pattern', kind: 'text', label: 'Name', req: true, essential: true, grab: ['target', 'hover'], pick: 'actor', when: isT(['spawn', 'despawn']),
        help: 'Exact name of the mob or object.' },
      { key: 'pattern', alt: 'trigger_pattern', kind: 'text', label: 'Ability', req: true, essential: true, pick: 'ability', when: isT(['cast']),
        help: 'Its id (digits) or its name. Raid React\'s recorder saves the ids a named casts. A name counts only while the caster is your target.' },
      { key: 'pattern', alt: 'trigger_pattern', kind: 'text', label: 'Aura name has', req: true, essential: true, pick: 'aura', when: isT(['aura', 'aura_gone']),
        help: 'Part of the aura name. JB Analysis lists a mob\'s auras.' },
      { key: 'pattern', alt: 'trigger_pattern', kind: 'text', label: 'Detriment', req: true, essential: true, pick: 'det', when: isT(['debuff']), pattern: '^\\s*\\d+\\s*[:,/ ]\\s*\\d+\\s*$',
        help: 'Its icon pair: main / backdrop, for example 512 / 317. The Detriments tab shows them, and its Use in Creator button makes this rule for you.' },
      { key: 'value', kind: 'int', label: 'At or below', unit: '%', req: true, essential: true, min: 1, max: 100, when: isT(['hp']) },
      { key: 'value', kind: 'int', label: 'Every', unit: 's', req: true, essential: true, min: 1, max: 3600, when: isT(['timer']),
        help: 'The first time N seconds after the pull.' },
      { key: 'target', kind: 'text', label: 'Whose', grab: ['target'], when: isT(['hp', 'cast', 'aura', 'aura_gone']),
        help: 'Empty = the named being fought.' },
      { key: 'sub_steps', kind: 'steps', label: 'Then do', branch: 'Then do', only: 'DO', addLabel: '+ Add what to do',
        help: 'In order. "Wait N seconds" pauses between them (the fight goes on).' },
      { key: 'once', kind: 'check', label: 'Only once per fight (a phase)', on: 'true' },
      { key: 'cooldown', kind: 'int', label: 'Not again for', unit: 's', min: 0, max: 3600,
        help: 'Default 2. The steps never overlap: a new trigger waits until the last run has finished.' },
      { key: 'repeat_while', kind: 'check', label: 'Again while the aura stays up', on: 'true', when: isT(['aura']),
        help: 'Runs again (after the cooldown) for as long as the aura is up.' },
      { key: 'who', kind: 'who', list: 'jb', label: 'Who moves and targets', help: 'For the move, camp spot and targeting steps. Empty = everyone.' },
      { key: 'data', kind: 'text', label: 'Rule name', help: 'Shown in the log when it fires. Example: Shield phase' },
      { key: 'or_trigger_type', kind: 'select', label: 'Or when', adv: true, rerender: true, opts: [['', '(nothing else)']].concat(TRIG),
        help: 'A second trigger for the same steps (for example the emote OR the aura).' },
      { key: 'or_pattern', kind: 'text', label: 'Or: line has', adv: true, pick: 'line', when: isOr(['says', 'announce']),
        help: 'Part of the line, any case. Several? Separate them with |.' },
      { key: 'or_pattern', kind: 'text', label: 'Or: name', adv: true, grab: ['target', 'hover'], pick: 'actor', when: isOr(['spawn', 'despawn']),
        help: 'Exact name of the mob or object.' },
      { key: 'or_pattern', kind: 'text', label: 'Or: ability', adv: true, pick: 'ability', when: isOr(['cast']),
        help: 'Its id (digits) or its name.' },
      { key: 'or_pattern', kind: 'text', label: 'Or: aura name has', adv: true, pick: 'aura', when: isOr(['aura', 'aura_gone']),
        help: 'Part of the aura name.' },
      { key: 'or_pattern', kind: 'text', label: 'Or: detriment', adv: true, pick: 'det', when: isOr(['debuff']), pattern: '^\\s*\\d+\\s*[:,/ ]\\s*\\d+\\s*$',
        help: 'Its icon pair: main / backdrop, for example 512 / 317.' },
      { key: 'or_value', kind: 'int', label: 'Or: at or below', unit: '%', adv: true, min: 1, max: 100, when: isOr(['hp']) },
      { key: 'or_value', kind: 'int', label: 'Or: every', unit: 's', adv: true, min: 1, max: 3600, when: isOr(['timer']) },
      { key: 'or_target', kind: 'text', label: 'Or: whose', adv: true, grab: ['target'], when: isOr(['hp', 'cast', 'aura', 'aura_gone']),
        help: 'Empty = the named being fought.' },
      { key: 'action_type', kind: 'select', label: 'Old editor: do', adv: true, quiet: true,
        opts: [['', '(use Then do)'], ['oc', 'Command'], ['nav', 'Move the camp spot'], ['alert', 'Say in group'], ['joust', 'Move the camp spot'], ['kill', 'Kill'], ['custom', 'Command']],
        help: 'Saved by the old editor. Used only when "Then do" is empty.' },
      { key: 'action_params', kind: 'text', label: 'Old editor: details', adv: true, quiet: true }
    ]
  });
  def({
    type: 'PHASE', cat: 'fight', hidden: true, v3full: true, noTest: true, icon: '&#9671;', name: 'Phase (old editor)',
    help: 'Runs once during the next fight when its trigger fires: moves the camp spot, then runs each Actions line. New rules: "During the next fight: when... do...".',
    label: function (e, U) { return 'Phase ' + U.name(e.phase_name) + ': when ' + whenText(trig(e.trigger_type, 'says'), e.trigger_value, e.trigger_value, '', U); },
    fields: [
      { key: 'phase_name', kind: 'text', label: 'Phase' },
      { key: 'trigger_type', kind: 'select', label: 'When', opts: TRIG },
      { key: 'trigger_value', kind: 'text', label: 'Line / name / % / seconds' },
      { key: 'target_role', kind: 'who', list: 'jb', label: 'Who moves' },
      { key: 'campspot', kind: 'pos', label: 'Move the camp spot to', grab: ['pos'] },
      { key: 'actions', kind: 'textarea', label: 'Then run (one command per line)' },
      { key: 'note', kind: 'text', label: 'Note', rt: false, quiet: true, help: 'Not read by the game.' }
    ]
  });
  def({
    type: 'WAITTEXT', cat: 'wait', icon: '&#8986;', name: 'Wait for a line of text', codec: 'textTimeout',
    help: 'Waits until a chat line, an emote or red text has this text (or the time runs out).',
    more: 'Only text that shows after this step starts counts. Several texts? Separate them with | (any one).',
    label: function (e, U) { var o = IC.pack.codecs.textTimeout.read(e); return 'Wait for the line "' + U.q(o.name, 24) + '"'; },
    fields: [
      { part: 'name', kind: 'text', label: 'Line has', req: true, essential: true, help: 'Part of the line, any case. Example: the doors open' },
      { part: 'timeout', kind: 'int', label: 'Give up after', unit: 's', min: 1, max: 86400, help: 'Default 60.' }
    ]
  });

  var PD = { pd: true };
  function pd(f) { for (var k in PD) f[k] = PD[k]; return f; }
  def({
    tpl: 'named_encounter', cat: 'v3', icon: '&#9876;', name: 'Named block (move, buff, fight, loot)', section: 'anchor',
    help: 'Expands to: move the group to the camp, optional rune swap / HO / commands, auto-target, buff, fight, loot, shinies.',
    more: 'Fields marked with the difficulty buttons can differ per difficulty (Solo is the base).',
    label: function (e, U) {
      var n = Array.isArray(e.fight_rules) ? e.fight_rules.length : 0;
      return 'Named block: ' + U.name(e.boss) + (n ? ' (' + n + ' fight rule' + (n === 1 ? '' : 's') + ')' : '');
    },
    nested: ['fight_rules'],
    newEntry: function () { return { template: 'named_encounter', boss: '', camp: [0, 0, 0] }; },
    testAs: function (e) { return e.boss ? { type: 'COMBAT', data: String(e.boss), fight_rules: e.fight_rules } : null; },
    fields: [
      pd({ key: 'boss', kind: 'text', label: 'Named', req: true, essential: true, grab: ['target'] }),
      { key: 'camp', kind: 'pos', label: 'Camp spot', store: 'array', essential: true, grab: ['pos'] },
      pd({ key: 'adds', kind: 'names', label: 'Adds to kill first', store: 'array', grab: ['target'] }),
      pd({ key: 'prebuff', kind: 'check', label: 'Buff before the pull', store: 'bool', on: true, off: false }),
      pd({ key: 'shinies', kind: 'check', label: 'Collect shinies after', store: 'bool', on: true, off: false }),
      { key: 'shinies_radius', kind: 'int', label: 'Shiny radius', unit: 'm', store: 'number', min: 0, max: 500,
        help: 'Every shiny this close is picked up after the fight (0 = none). Empty = 50 when "Collect shinies after" is ticked.' },
      pd({ key: 'combat_style', kind: 'select', label: 'Combat style', def: undefined, opts: [['basic', 'Basic'], ['behind', 'Group behind the mob']] }),
      pd({ key: 'position', kind: 'select', label: 'Position', opts: [['', 'None'], ['behind', 'Behind'], ['front', 'In front'], ['relative', 'At an angle']] }),
      { key: 'position_distance', kind: 'number', label: 'Position distance', unit: 'm' },
      { key: 'position_angle', kind: 'number', label: 'Position angle', unit: 'deg' },
      pd({ key: 'rune_swap', kind: 'select', label: 'Belt rune', opts: [['none', 'No swap'], ['stun', 'Stun'], ['stifle', 'Stifle'], ['mez', 'Mesmerize'], ['fear', 'Fear']] }),
      pd({ key: 'ho_mode', kind: 'select', label: 'Heroic opportunities', opts: [['All', 'All'], ['Disable', 'Off'], ['Scout', 'Scout'], ['Priest', 'Priest'], ['Mage', 'Mage'], ['Fighter', 'Fighter']] }),
      pd({ key: 'pre_oc', kind: 'text', label: 'OgreBot command before' }),
      pd({ key: 'post_oc', kind: 'text', label: 'OgreBot command after' }),
      { key: 'pre_teleporter.actor', kind: 'text', label: 'Teleporter first: object', grab: ['hover', 'target'] },
      { key: 'pre_teleporter.verb', kind: 'text', label: 'Teleporter verb' },
      { key: 'pre_teleporter.wait', kind: 'int', label: 'Teleporter wait', unit: 's' },
      { key: 'fight_rules', kind: 'steps', label: 'During this fight', branch: 'During this fight', only: 'RULES', unitName: 'rule',
        addLabel: '+ Add a fight rule', help: 'When something happens in the fight (a line, an aura, a spawn, health), do something.' },
      { key: 'spawn_wait', kind: 'check', label: 'Wait for the named to spawn', store: 'bool', on: true,
        help: 'Holds up to 3 minutes until it is up, then fights.' },
      { key: 'loot_pause', kind: 'check', label: 'Pause to loot', store: 'bool', on: true, help: 'Waits 5 s after the chest before moving on.' },
      { key: 'label', kind: 'text', label: 'Section note' },
      { key: 'chat_triggers', kind: 'textarea', label: 'Triggers (boss text)', rt: false, help: 'Old editor text; never read. Use "During this fight".' },
      { key: 'debuff_watch', kind: 'textarea', label: 'Debuff watch', rt: false, help: 'Old editor text; never read. Use "During this fight".' },
      { key: 'scan_radius', kind: 'text', label: 'Scan radius', rt: false },
      { key: 'waypoints', kind: 'poslist', label: 'Waypoints', rt: false },
      { key: 'difficulty_note', kind: 'text', label: 'Difficulty note', rt: false },
      { key: 'per_difficulty', kind: 'json', label: 'Old per-difficulty block', rt: false,
        help: 'The game reads the difficulty overrides straight on the block, not here.' }
    ]
  });
  def({
    tpl: 'trash_clear', cat: 'v3', icon: '&#9632;', name: 'Move and clear trash',
    help: 'Moves the group to a spot (or along waypoints) and waits for the fight to end.',
    label: function (e, U) { return 'Clear trash at ' + (e.camp ? U.pos(e.camp) : (e.waypoints || []).length + ' waypoints'); },
    fields: [
      { key: 'camp', kind: 'pos', label: 'Spot', store: 'array', grab: ['pos'] },
      { key: 'waypoints', kind: 'poslist', label: 'Or waypoints' },
      { key: 'label', kind: 'text', label: 'Section note' }
    ]
  });
  def({
    tpl: 'teleporter', cat: 'v3', icon: '&#10024;', name: 'Use a teleporter',
    help: 'Pauses OgreBot, uses the object with the verb, waits, resumes.',
    label: function (e, U) { return 'Teleporter ' + U.name(e.actor); },
    fields: [
      { key: 'actor', kind: 'text', label: 'Object', req: true, essential: true, grab: ['hover', 'target'] },
      { key: 'verb', kind: 'text', label: 'Verb', def: 'Teleport' },
      { key: 'wait_after', kind: 'int', label: 'Wait after', unit: 's', def: '5' },
      { key: 'label', kind: 'text', label: 'Section note' }
    ]
  });
  def({
    tpl: 'zone_in', cat: 'v3', icon: '&#128275;', name: 'Zone-in setup block',
    help: 'Repair, group setup, scout setup, camp spot, pre-cast buffs.',
    label: function () { return 'Zone-in setup'; },
    fields: [{ key: 'label', kind: 'text', label: 'Section note' }]
  });
  def({
    tpl: 'zone_out', cat: 'v3', icon: '&#128682;', name: 'Zone-out block',
    help: 'Clears auto-target, moves the group to the exit, waits for everyone, leaves the zone.',
    label: function () { return 'Zone-out'; },
    fields: [
      { key: 'exit', kind: 'pos', label: 'Exit spot', store: 'array', grab: ['pos'] },
      { key: 'nav', kind: 'poslist', label: 'Or path' },
      { key: 'label', kind: 'text', label: 'Section note' }
    ]
  });
})(typeof window !== 'undefined' ? window : this);
