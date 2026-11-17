/* Open IC Creator - ic-steps-move.js
   Step schemas for ISXJQB instance files: moving, doors, NPCs and objects.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var ORD = 1000;
  function def(s) {
    s.ord = ++ORD;
    if (IC.reg && IC.reg.define) IC.reg.define(s);
    else (IC._pendingDefs = IC._pendingDefs || []).push(s);
  }

  def({
    type: 'WAYPOINT', cat: 'move', quick: 2, short: 'Move group', icon: '&#10148;', name: 'Move the group to a spot',
    doHelp: 'In a fight rule: moves the group\'s camp spot here. The fight goes on; nothing waits.',
    help: 'The whole group walks here, fights anything on them, waits for everyone, then goes on.',
    more: 'The group counts as arrived within 5 m and gives up after 30 s if blocked. Unless "just passing through" is picked, it also waits for combat to end and for everyone to be within 30 m before the next step.',
    label: function (e, U) {
      var m = String(e.mode || '').toLowerCase();
      return 'Move group to ' + U.pos(e.data) + (m === 'quick' ? ' (passing through)' : (m === 'ogrenav' ? ' (zone mesh)' : ''));
    },
    fields: [
      { key: 'data', kind: 'pos', label: 'Spot', req: true, essential: true, grab: ['pos'],
        help: 'Where the group walks to. Click Pos while standing there. Example: 12.5,-3.0,140.2' },
      { key: 'mode', kind: 'select', label: 'On the way', def: undefined, essential: true, doHide: true,
        opts: [['', 'Stop and fight anything that pulls'], ['quick', 'Just passing through (no fight waits)'], ['ogrenav', 'Follow the zone mesh (OgreNav, host leads)']],
        help: '"Just passing through" skips the combat and group waits for this hop.' },
      { key: 'radius', kind: 'number', label: 'Arrive radius', unit: 'm', rt: false, quiet: true,
        help: 'Not read by the game: a group move always counts as arrived within 5 m.' },
      { key: 'wp', kind: 'int', label: 'Waypoint number (log only)', adv: true, store: 'number',
        help: 'Only printed in the movement debug log.' }
    ]
  });

  def({
    type: 'CAMPSPOT', cat: 'move', quick: 1, short: 'Camp spot', icon: '&#128205;', name: 'Group stands and fights here',
    doHelp: 'In a fight rule: moves the group\'s camp spot here. The fight goes on; nothing waits.',
    help: 'The group walks here and holds this spot; a fight right after this step is fought from here.',
    more: 'Waits for any fight to end before moving, walks the group here, waits for the fight here to end and for everyone to arrive, then holds for the optional extra seconds. A "Fight the named" step right after this one is fought from this spot.',
    label: function (e, U) { return 'Group holds ' + U.pos(e.data) + (e.hold && +e.hold > 0 ? ' then waits ' + e.hold + ' s' : ''); },
    fields: [
      { key: 'data', kind: 'pos', label: 'Spot', req: true, essential: true, grab: ['pos'],
        help: 'Click Pos while standing on the spot. Example: -53.2,-0.3,-11.7' },
      { key: 'distance', kind: 'int', label: 'Counts as arrived within', unit: 'm', def: '5', min: 1, max: 100, doHide: true,
        help: 'How close everyone must get. Default 5.' },
      { key: 'hold', kind: 'int', label: 'Wait after arriving', unit: 's', min: 0, max: 3600, doHide: true,
        help: 'Extra seconds to stand here before the next step. 0 or empty = none.' },
      { key: 'radius', kind: 'number', label: 'Radius', unit: 'm', rt: false, quiet: true,
        help: 'Not read by the game (it uses "Counts as arrived within").' },
      { key: 'wp', kind: 'int', label: 'Waypoint number (log only)', adv: true, store: 'number' }
    ]
  });

  def({
    type: 'CAMPSPOT_WHO', cat: 'move', icon: '&#128101;', name: 'Send part of the group to a spot',
    doHelp: 'In a fight rule: moves only the chosen boxes\' camp spot here (for example the healers).',
    help: 'Moves only the chosen boxes (for example the healers) to a spot. Does not wait for them.',
    label: function (e, U) { return U.who(e.who, IC.reg.WHO_OGRE) + ' to ' + U.pos(e.data); },
    fields: [
      { key: 'who', kind: 'who', list: 'ogre', label: 'Who', def: 'igw:${Me.Name}+priest', essential: true,
        help: 'Which boxes move. Custom: any OgreBot who-text.' },
      { key: 'data', kind: 'pos', label: 'Spot', req: true, essential: true, grab: ['pos'] }
    ]
  });

  def({
    type: 'NAV', cat: 'move', icon: '&#9654;', name: 'Walk there (just me)', codec: 'nav',
    help: 'Only the box running the zone walks there on the navigation mesh. Use "Move the group" for the group.',
    label: function (e, U) { return 'Walk (me only) to ' + U.pos(IC.pack.codecs.nav.read(e).pos); },
    fields: [
      { part: 'pos', kind: 'pos', label: 'Spot', req: true, essential: true, grab: ['pos'],
        help: 'Example: 12.5,-3.0,140.2. Needs a navigation mesh for the zone.' },
      { key: 'wp', kind: 'int', label: 'Waypoint number (log only)', adv: true, store: 'number' }
    ]
  });

  def({
    type: 'MOVETOACTOR', cat: 'move', icon: '&#127939;', name: 'Walk to an NPC or object (just me)',
    help: 'The runner walks to where the named actor stands. Skipped if it is not there.',
    label: function (e, U) { return 'Walk to ' + U.name(e.data); },
    fields: [
      { key: 'data', kind: 'text', label: 'NPC / object', req: true, essential: true, grab: ['target', 'hover'],
        help: 'Exact in-game name. Example: an egg' },
      { key: 'wp', kind: 'int', label: 'Waypoint number (log only)', adv: true, store: 'number' }
    ]
  });

  def({
    type: 'POSITION', cat: 'move', icon: '&#8635;', name: 'Stand behind / in front of a mob',
    help: 'Moves the group to a spot around a named mob (behind by default).',
    label: function (e, U) { return 'Stand ' + (e.mode || 'behind') + ' ' + U.name(e.target || e.data); },
    fields: [
      { key: 'target', kind: 'text', label: 'Mob', req: true, essential: true, grab: ['target'], alt: 'data',
        help: 'Exact name of the mob to stand around.' },
      { key: 'mode', kind: 'select', label: 'Where', def: 'behind',
        opts: [['behind', 'Behind it'], ['front', 'In front of it'], ['relative', 'At an angle']] },
      { key: 'distance', kind: 'number', label: 'Distance', unit: 'm', def: '5', min: 0, max: 100 },
      { key: 'angle', kind: 'number', label: 'Angle', unit: 'deg', min: -360, max: 360,
        when: { k: 'mode', in: ['relative'] }, help: 'Degrees from the mob\'s facing: 0 = in front, 180 = behind.' }
    ]
  });

  def({
    type: 'YOYO_SAVE', cat: 'move', icon: '&#9875;', name: 'Remember this spot (for a joust)',
    help: 'Saves where the runner stands so "Go back to the remembered spot" can return there.',
    label: function (e, U) { return 'Remember spot' + (e.data ? ' "' + U.q(e.data, 20) + '"' : ''); },
    fields: [{ key: 'data', kind: 'text', label: 'Label', help: 'Optional name for the log.' }]
  });
  def({
    type: 'YOYO_PATH', cat: 'move', icon: '&#10227;', name: 'Walk a path of points (joust path)',
    help: 'Walks the chosen boxes through a list of points, with an optional action at each one.',
    more: 'Each point routes the boxes there; if the runner is included it walks too. Actions: wait N seconds, click / double-click / hail an actor, or apply a verb. Can return to the remembered spot at the end.',
    label: function (e, U) { var n = (e.path_waypoints || []).length; return 'Walk ' + n + ' point' + (n === 1 ? '' : 's') + ' (' + U.who(e.who, IC.reg.WHO_OGRE) + ')'; },
    newEntry: function () { return { type: 'YOYO_PATH', who: 'igw:${Me.Name}', mode: 'axis', path_waypoints: [] }; },
    fields: [
      { key: 'who', kind: 'who', list: 'ogre', label: 'Who walks', def: 'igw:${Me.Name}' },
      { key: 'mode', kind: 'select', label: 'Runner walks by', def: 'axis',
        opts: [['axis', 'Straight lines'], ['navmesh', 'Navigation mesh']] },
      { key: 'distance', kind: 'int', label: 'Counts as arrived within', unit: 'm', min: 1, max: 100,
        help: 'Per point. Default 5.' },
      { key: 'condition', kind: 'check', label: 'Go back to the remembered spot at the end', on: 'true',
        help: 'Needs a "Remember this spot" step before this one.' },
      { key: 'path_waypoints', kind: 'list', label: 'Points', addPos: true, item: [
        { key: 'x', kind: 'xyz', label: 'Spot', grab: ['pos'] },
        { key: 'action', kind: 'select', label: 'Then', def: 'walk',
          opts: [['walk', 'Just walk'], ['wait', 'Wait'], ['click', 'Click'], ['doubleclick', 'Double-click'], ['hail', 'Hail'], ['applyverb', 'Apply verb']] },
        { key: 'target', kind: 'text', label: 'Actor', when: { k: 'action', in: ['click', 'doubleclick', 'hail'] } },
        { key: 'verb', kind: 'text', label: 'Verb', when: { k: 'action', in: ['applyverb'] } },
        { key: 'duration', kind: 'int', label: 'Seconds', when: { k: 'action', in: ['wait'] } },
        { key: 'who', kind: 'text', label: 'Who (this point only)' },
        { key: 'wait_after', kind: 'int', label: 'Pause after (s)' }
      ] }
    ]
  });
  def({
    type: 'YOYO_RETURN', cat: 'move', icon: '&#8617;', name: 'Go back to the remembered spot',
    help: 'Walks the group back to the spot saved by "Remember this spot".',
    label: function () { return 'Back to the remembered spot'; },
    fields: [{ key: 'distance', kind: 'int', label: 'Counts as arrived within', unit: 'm', min: 1, max: 100, help: 'Default 4.' }]
  });

  def({
    type: 'JUMP', cat: 'move', icon: '&#11014;', name: 'Jump',
    help: 'Jumps N times, one second apart.',
    label: function (e) { return 'Jump x' + (e.data || '1'); },
    fields: [{ key: 'data', kind: 'int', label: 'Times', def: '1', min: 1, max: 50 }]
  });
  def({
    type: 'KEY_HOLD', cat: 'advanced', icon: '&#9000;', name: 'Hold a key', codec: 'keyHold',
    help: 'Holds a keyboard key down for a while on the runner, then lets go.',
    label: function (e) { var o = IC.pack.codecs.keyHold.read(e), ms = Number(o.ms || 1000); return 'Hold key ' + (o.key || '?') + ' for ' + (isFinite(ms) ? Math.round(ms) / 1000 + ' s' : o.ms + ' ms'); },
    fields: [
      { part: 'key', kind: 'text', label: 'Key', req: true, essential: true, help: 'InnerSpace key name. Example: end' },
      { part: 'ms', kind: 'int', label: 'For', unit: 'ms', min: 1, max: 600000, help: 'Default 1000.' }
    ]
  });
  def({
    type: 'MOUSE_CLICK', cat: 'advanced', icon: '&#128433;', name: 'Click the screen',
    help: 'Left-clicks a screen position (empty = the middle of the screen).',
    label: function (e) { return 'Click screen at ' + (e.data || 'center'); },
    fields: [{ key: 'data', kind: 'text', label: 'Screen X,Y', pattern: '^\\s*$|^\\d+\\s*,\\s*\\d+$',
      help: 'Pixels, like 960,540. Leave empty for the center.' }]
  });

  def({
    type: 'CLICK', aliases: ['DOUBLECLICK'], cat: 'use', icon: '&#128073;', name: 'Use a door or object',
    help: 'Uses an object by name: applies the verb if one is set, otherwise double-clicks it.',
    more: 'With a verb (for example "use") the object is found by name, which works for zone doors like zone_to_halls_of_fate.',
    label: function (e, U) { return (e.verb ? U.q(e.verb, 24) + ' ' : 'Double-click ') + U.name(e.data); },
    fields: [
      { key: 'data', kind: 'text', label: 'Object', req: true, essential: true, grab: ['hover', 'target'],
        help: 'Exact name. Hover the object in game and click Hover. Example: zone_to_halls_of_fate' },
      { key: 'verb', kind: 'text', label: 'Verb', essential: true, pick: 'verb',
        help: 'Optional. Example: use, open, Teleport. Empty = double-click.' }
    ]
  });

  def({
    type: 'APPLYVERB', aliases: ['VERB'], cat: 'use', icon: '&#9995;', name: 'Use a verb on an object (after the fight)',
    codec: 'actorVerb',
    help: 'Waits for combat to clear (up to 30 s), then applies a verb to the object.',
    label: function (e, U) { var o = IC.pack.codecs.actorVerb.read(e); return (o.verb || 'Use') + ' ' + U.name(o.actor); },
    fields: [
      { part: 'actor', kind: 'text', label: 'Object', req: true, essential: true, grab: ['hover', 'target'] },
      { part: 'verb', kind: 'text', label: 'Verb', req: true, essential: true, pick: 'verb', help: 'Example: open' },
      { key: 'verb', kind: 'text', label: 'Verb (copy)', rt: false, quiet: true,
        help: 'Not read: this step takes the verb from "Verb" above.' }
    ]
  });

  def({
    type: 'ACTOR', cat: 'use', icon: '&#128072;', name: 'Interact with an object',
    help: 'Double-clicks, right-clicks or hails an actor, or applies a custom verb.',
    label: function (e, U) { return (e.interact || 'Double-click') + ' ' + U.name(e.data); },
    fields: [
      { key: 'data', kind: 'text', label: 'Object', req: true, essential: true, grab: ['hover', 'target'] },
      { key: 'interact', kind: 'select', label: 'How', def: '', allowOther: true,
        opts: [['', 'Double-click'], ['rightclick', 'Right-click'], ['hail', 'Hail']],
        help: 'Pick "Other" to type a verb such as Teleport.' },
      { key: 'expect_zoning', kind: 'check', label: 'This zones us (wait for the zone)', store: 'bool', on: true }
    ]
  });

  def({
    type: 'INTERACT', cat: 'use', icon: '&#128070;', name: 'Double-click an object (or the zone exit)',
    help: 'Double-clicks the object. Type zone_exit to use the zone exit.',
    label: function (e, U) { return 'Double-click ' + U.name(e.target || e.data); },
    fields: [
      { key: 'target', kind: 'text', label: 'Object', req: true, essential: true, grab: ['hover', 'target'], alt: 'data' },
      { key: 'expect_zoning', kind: 'check', label: 'This zones us (wait for the zone)', store: 'bool', on: true }
    ]
  });

  def({
    type: 'HAIL', aliases: ['HAILACTOR'], cat: 'use', icon: '&#128075;', name: 'Hail an NPC',
    help: 'Targets the NPC and hails it.',
    label: function (e, U) { return 'Hail ' + U.name(e.target || e.data); },
    fields: [{ key: 'target', kind: 'text', label: 'NPC', req: true, essential: true, grab: ['target', 'hover'], alt: 'data' }]
  });
  def({
    type: 'TALK', cat: 'use', icon: '&#128172;', name: 'Talk to an NPC (pick replies)', codec: 'talk',
    help: 'Hails the NPC, then clicks the reply options in order.',
    label: function (e, U) { var o = IC.pack.codecs.talk.read(e); return 'Talk to ' + U.name(o.npc) + (o.replies ? ' (' + o.replies + ')' : ''); },
    fields: [
      { part: 'npc', kind: 'text', label: 'NPC', req: true, essential: true, grab: ['target', 'hover'] },
      { part: 'replies', kind: 'text', label: 'Replies', essential: true, pattern: '^\\s*$|^\\d+(\\s*,\\s*\\d+)*$',
        help: 'Option numbers in order, like 1,3,2. Empty = just hail.' },
      { part: 'close', kind: 'check', label: 'Close the window after', on: 'close' }
    ]
  });

  def({
    type: 'ZONEDOOR', cat: 'use', icon: '&#128682;', name: 'Use the zone door',
    help: 'Picks an entry in the zone-door window (the zone to enter).',
    more: 'Skipped automatically when the run starts inside the zone.',
    label: function (e, U) { return 'Zone door: ' + U.name(e.data, '(default)'); },
    fields: [
      { key: 'data', kind: 'text', label: 'Zone to pick', essential: true,
        help: 'The text of the entry in the door window. Example: The Fabled Halls of Fate' },
      { key: 'expect_zoning', kind: 'check', label: 'Wait for the zone to load', store: 'bool', on: true }
    ]
  });
  def({
    type: 'ZONEOUT', cat: 'use', icon: '&#128694;', name: 'Leave through the exit door',
    help: 'Uses the zone exit for the group and waits (up to 60 s) for the zone change.',
    label: function () { return 'Leave through the exit'; }, fields: []
  });

  def({
    type: 'WAITCHOICE', cat: 'use', icon: '&#10067;', name: 'Wait for a choice window',
    help: 'Waits until a choice window opens (optionally one containing some text).',
    label: function (e, U) { return 'Wait for a choice window' + (e.data ? ' "' + U.q(e.data, 20) + '"' : ''); },
    fields: [
      { key: 'data', kind: 'text', label: 'Window text contains', help: 'Optional.' },
      { key: 'distance', kind: 'int', label: 'Give up after', unit: 's', min: 1, max: 3600, help: 'Default 30.' }
    ]
  });
  def({
    type: 'CHOICE', aliases: ['SELECTCHOICE'], cat: 'use', icon: '&#9745;', name: 'Pick a choice-window option',
    help: 'Clicks option N in the open choice window.',
    label: function (e) { return 'Pick choice ' + (e.data || '1'); },
    fields: [{ key: 'data', kind: 'int', label: 'Option', def: '1', min: 1, max: 9 }]
  });
})(typeof window !== 'undefined' ? window : this);
