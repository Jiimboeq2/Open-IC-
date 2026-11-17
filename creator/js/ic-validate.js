/* Open IC Creator - ic-validate.js
   Checks for ISXJQB instance-file steps (IC.val): per field, per step and for the whole file, with friendly messages
   at three levels (error, warn, info). Pure logic, no DOM.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var V = IC.val = IC.val || {};

  function str(v) { return v == null ? '' : String(v); }
  function msg(level, text) { return { level: level, msg: text }; }

  V.field = function (f, val, e, s, ctx) {
    if (f.ncond) { var np = IC.pack.nativeCondProblem(val); return np ? msg(np.level, np.msg) : null; }
    var t = str(val).trim();
    var empty = (f.kind === 'names') ? !(val && val.length) : (f.kind === 'check' ? false : t === '');
    if (f.req && empty) {
      return msg('error', 'Needed. ' + (f.help ? f.help : 'Fill this in.'));
    }
    if (empty) return null;
    switch (f.kind) {
      case 'pos': {
        var p = IC.pack.posParse(val);
        if (!p) return msg('error', 'Use three numbers: x,y,z (for example 12.5,-3.0,140.2). Stand on the spot and click Pos.');
        if (IC.pack.posIsZero(p)) return msg('warn', '0,0,0 is a placeholder. Stand on the real spot and click Pos.');
        return null;
      }
      case 'int': {
        if (!/^-?\d+$/.test(t)) return msg('error', f.intMsg || 'Whole numbers only.');
        return range(f, +t);
      }
      case 'number': {
        if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return msg('error', 'Numbers only (like 5 or 2.5).');
        return range(f, +t);
      }
      case 'expr': {
        var pr = IC.pack.exprProblem(val);
        if (pr) return msg('error', pr);
        var ep = IC.pack.exprParse(val), ed = IC.pack.exprById(ep.id);
        if (ed) {
          for (var x = 0; x < ed.fields.length; x++) {
            var fv = String(ep.v[ed.fields[x][0]] == null ? '' : ep.v[ed.fields[x][0]]).trim();
            if (fv === '') return msg('error', 'Fill in "' + ed.fields[x][1] + '".');
            if (ed.fields[x][2] === 'pos' && IC.pack.posIsZero(IC.pack.posParse(fv))) return msg('warn', 'The spot is 0,0,0 (a placeholder). Stand there and click Pos.');
          }
        }
        return null;
      }
      case 'select': {
        if (f.allowOther || !f.opts) return null;
        for (var i = 0; i < f.opts.length; i++) if (str(f.opts[i][0]) === t) return null;
        return msg('warn', '"' + t + '" is not one of the choices the game knows.');
      }
      case 'cond': {
        if (!IC.pack.condKnown(t)) {
          if (/difficulty$/.test(t)) return msg('warn', 'Difficulty checks never match: the game sets no difficulty for these steps.');
          return msg('error', 'The game does not know the check "' + t + '" and treats it as false.');
        }
        return null;
      }
      default:
        if (f.pattern && !(new RegExp(f.pattern)).test(t)) return msg('error', 'Format: ' + (f.help || f.pattern));
        return null;
    }
  };
  function range(f, n) {
    if (f.min != null && n < f.min) return msg('error', 'At least ' + f.min + (f.unit ? ' ' + f.unit : '') + '.');
    if (f.max != null && n > f.max) return msg('error', 'At most ' + f.max + (f.unit ? ' ' + f.unit : '') + '.');
    return null;
  }

  V.visible = function (f, e, s, ctx) {
    var w = f.when;
    if (!w) return true;
    if (typeof w === 'function') return !!w(e, ctx);
    var cur;
    if (w.part) cur = IC.pack.rawGet(e, { part: w.part }, s, ctx);
    else cur = IC.pack.rawGet(e, { key: w.k }, s, ctx);
    cur = str(cur);
    if (w.k === 'condition') cur = IC.pack.COND_ALIAS[cur] || cur;
    if (w.k && w.k !== 'condition' && cur === '' && w.dflt !== undefined) cur = w.dflt;
    if (w['in']) {
      for (var i = 0; i < w['in'].length; i++) {
        var x = w['in'][i];
        if (x === cur || (w.k === 'condition' && (IC.pack.COND_ALIAS[x] || x) === cur)) return true;
      }
      return false;
    }
    if (w.eq !== undefined) return cur === w.eq;
    return true;
  };

  V.step = function (e, ctx, prev) {
    var R = IC.reg, s = R.forEntry(e), out = [], fmt = (ctx && ctx.fmt) || 'v2';
    if (s === R.UNKNOWN) { out.push({ f: null, level: 'warn', msg: 'The game does not know this step type and skips it.' }); return out; }
    if (!R.typeActive(s, fmt)) out.push({ f: null, level: 'warn', msg: 'Saved but not run: the game skips this step.' });
    for (var i = 0; i < s.fields.length; i++) {
      var f = s.fields[i];
      if (!V.visible(f, e, s, ctx)) continue;
      if (!R.fieldActive(s, f, fmt) && !(ctx && ctx.showInactive)) continue;
      if (f.kind === 'list' || f.kind === 'steps' || f.kind === 'json') continue;
      var r = V.field(f, IC.pack.get(e, f, s, ctx), e, s, ctx);
      if (r) out.push({ f: f, level: r.level, msg: r.msg });
    }
    var cr = (s.check && prev !== undefined) ? (s.check(e, prev, ctx) || []) : [];
    for (var c = 0; c < cr.length; c++) out.push({ f: null, level: cr[c].level, msg: cr[c].msg });
    return out;
  };

  V.doc = function () {
    var M = IC.model, out = [], ctx = { fmt: M.rtFmt(), diff: M.st.diff, showInactive: M.st.showInactive };
    if (!M.editable()) return out;
    (function walk(arr, base, only) {
      for (var i = 0; i < arr.length; i++) {
        var e = arr[i], p = base.concat([i]);
        var probs = V.step(e, ctx, arr.slice(0, i));
        if (IC.reg.misplaced(IC.reg.forEntry(e), only)) {
          probs.push({ f: null, level: 'warn', msg: only ? 'A fight rule cannot do this step, so it is skipped. Pick one from its "+ Add what to do" list.'
            : 'Only works inside a fight rule ("Then do" of "During the next fight").' });
        }
        for (var k = 0; k < probs.length; k++) {
          out.push({ path: p, level: probs[k].level, msg: (probs[k].f ? probs[k].f.label + ': ' : '') + probs[k].msg, label: IC.reg.labelFor(e) });
        }
        for (var n = 0; n < IC.reg.NEST.length; n++) {
          var nk = IC.reg.NEST[n];
          if (e && Array.isArray(e[nk])) walk(e[nk], p.concat([nk]), IC.reg.onlyFor(e, nk));
        }
      }
    })(M.list(), [], null);
    return out;
  };
  V.counts = function (list) {
    var c = { error: 0, warn: 0, info: 0 };
    for (var i = 0; i < list.length; i++) c[list[i].level] = (c[list[i].level] || 0) + 1;
    return c;
  };
})(typeof window !== 'undefined' ? window : this);
