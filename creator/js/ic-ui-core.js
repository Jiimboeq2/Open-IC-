/* Open IC Creator - ic-ui-core.js
   Overlay UI core (IC.ui): styles, dialogs, the undo / redo toolbar and keyboard shortcuts.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var U = IC.ui = IC.ui || {};
  function $(id) { return (typeof document !== 'undefined') ? document.getElementById(id) : null; }
  function esc(s) { return IC.form.esc(s); }

  U.ctx = function () { var M = IC.model; return { fmt: M.rtFmt(), diff: M.st.diff, showInactive: M.st.showInactive }; };
  IC.dispName = function (s) { return (typeof jbDispName === 'function') ? jbDispName(s) : s; };

  function multi() { var m = $('jb-modal-message'); if (m) m.style.whiteSpace = 'pre-line'; }
  U.toast = function (msg, kind) { if (typeof colToast === 'function') colToast(msg, kind); };
  U.alert = function (title, msg, cb) {
    if (typeof jbAlert === 'function' && $('jb-modal')) { jbAlert(title, msg, cb); multi(); }
    else { U.toast(title + ': ' + msg, 'warn'); if (cb) cb(); }
  };
  U.confirm = function (title, msg, cb) {
    if (typeof jbConfirm === 'function' && $('jb-modal')) { jbConfirm(title, msg, cb); multi(); }
    else { U.toast(title + ': ' + msg + ' (cancelled: no dialog available)', 'warn'); if (cb) cb(false); }
  };
  U.prompt = function (title, msg, def, cb) {
    if (typeof jbPrompt === 'function' && $('jb-modal')) { jbPrompt(title, msg, def, cb); multi(); }
    else { U.toast(title + ': no input dialog available', 'warn'); if (cb) cb(null); }
  };
  U.echo = function (msg) { if (typeof sendCommand === 'function') sendCommand('exec', 'echo "' + String(msg).replace(/"/g, "'").replace(/\$\{/g, '$ {') + '"'); };

  U.injectStyle = function () {
    if (typeof document === 'undefined' || $('ic-style-v2')) return;
    var css = [
      '#creator-ic:not(.ic-show-inactive) [data-ic-inactive]{display:none !important;}',
      '.ic-sub-tab{white-space:nowrap;}',
      '@media (max-height:600px){#ic-val-list{max-height:108px !important;}}',
      '@media (max-height:470px){#ic-val-list{max-height:64px !important;}}',
      '#ic-file-adv>div{margin-bottom:10px;}',
      '.icf-row{display:grid;grid-template-columns:150px 1fr;gap:1px 8px;align-items:start;margin:3px 0;}',
      '.icf-row.icf-wide{grid-template-columns:1fr;}',
      '.icf-lab{color:var(--text-secondary);font-size:var(--fs-11);padding-top:4px;}',
      '.icf-unit{font-size:var(--fs-9);opacity:.8;}',
      '.icf-req{color:var(--text-warn,#e0a040);margin-left:2px;}',
      '.icf-pdt{font-size:var(--fs-9);color:var(--accent-cyan);}',
      '.icf-ctl{display:flex;gap:4px;align-items:center;flex-wrap:wrap;min-width:0;}',
      '.icf-ctl>.input-text,.icf-ctl>.jb-dropdown{flex:1;min-width:90px;}',
      '.icf-row .icf-help,.icf-row .icf-msg{grid-column:2;}',
      '.icf-row.icf-wide .icf-help,.icf-row.icf-wide .icf-msg{grid-column:1;}',
      '.icf-help{font-size:var(--fs-9);color:var(--text-secondary);opacity:.85;line-height:1.35;}',
      '.icf-msg{font-size:var(--fs-10);line-height:1.3;}',
      '.icf-msg.icf-error{color:var(--text-bad,#e06060);}',
      '.icf-msg.icf-warn{color:var(--text-warn,#e0a040);}',
      '.icf-msg.icf-info{color:var(--accent-cyan);}',
      '.icf-chk{display:flex;gap:6px;align-items:center;font-size:var(--fs-11);color:var(--text-primary);cursor:pointer;}',
      '.icf-ta{width:100%;min-height:46px;font-size:var(--fs-10);}',
      '.icf-mono{font-family:Consolas,monospace;font-size:var(--fs-10);}',
      '.icf-grab{flex:0 0 auto;}',
      '.icf-other{flex-basis:100%;}',
      '.icf-names,.icf-list,.icf-expr,.icf-oc{display:flex;flex-direction:column;gap:3px;width:100%;}',
      '.icf-name-row,.icf-xrow{display:flex;gap:4px;align-items:center;}',
      '.icf-name-row .input-text,.icf-xrow .input-text{flex:1;min-width:60px;}',
      '.icf-ord{width:18px;font-size:var(--fs-10);color:var(--text-secondary);}',
      '.icf-xlab{min-width:110px;font-size:var(--fs-10);color:var(--text-secondary);}',
      '.icf-name-add{display:flex;gap:4px;align-items:center;flex-wrap:wrap;}',
      '.icf-classes{display:grid;grid-template-columns:repeat(4,1fr);gap:2px 8px;width:100%;}',
      '.icf-cls{font-size:var(--fs-10);display:flex;gap:4px;align-items:center;cursor:pointer;}',
      '.icf-say{font-size:var(--fs-11);color:var(--text-primary);}',
      '.icf-li{border:1px solid var(--border-dark);border-radius:3px;padding:3px 6px;}',
      '.icf-li-h{display:flex;gap:4px;align-items:center;font-size:var(--fs-10);margin-bottom:2px;}',
      '.icf-li-h b{flex:1;color:var(--header-gold);}',
      '.icf-li-b{display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;}',
      '.icf-li-f{display:flex;gap:4px;align-items:center;}',
      '.icf-li-f .input-text,.icf-li-f .jb-dropdown{flex:1;min-width:50px;}',
      '.icf-sec{margin-top:6px;border-top:1px dashed var(--border-dark);}',
      '.icf-sec-h{cursor:pointer;font-size:var(--fs-11);color:var(--accent-cyan);padding:3px 0;user-select:none;}',
      '.icf-sec-b{padding:2px 0 2px 6px;}',
      '.icf-ocgrid{display:flex;flex-wrap:wrap;gap:3px;}',
      '.icf-dead{font-size:var(--fs-9);color:color-mix(in srgb, var(--text-bad,#c97b7b) 60%, var(--text-secondary,#8a96a8));font-style:italic;}',
      '.icf-pd{font-size:var(--fs-10);color:var(--text-secondary);background:var(--bg-input);border-radius:3px;padding:4px 8px;margin-bottom:4px;}',
      '.icf-head{display:flex;align-items:center;gap:6px;margin-bottom:2px;}',
      '.icf-icon{font-size:var(--fs-14);width:20px;text-align:center;}',
      '.icf-title{font-size:var(--fs-13);font-weight:bold;color:var(--accent-cyan);}',
      '.icf-num{font-size:var(--fs-10);color:var(--text-secondary);}',
      '.icf-jargon{font-size:var(--fs-9);color:var(--text-secondary);opacity:.7;margin-left:auto;font-family:Consolas,monospace;}',
      '.icf-desc{font-size:var(--fs-10);color:var(--text-secondary);line-height:1.4;margin-bottom:6px;}',
      '.icf-morelink{color:var(--accent-cyan);cursor:pointer;text-decoration:underline;}',
      '.icf-steps{font-size:var(--fs-10);color:var(--text-secondary);display:flex;gap:6px;align-items:center;flex-wrap:wrap;}',
      '.icf-steps-list{margin-top:4px;display:flex;flex-direction:column;gap:2px;}',
      '.icf-steps-item{font-size:var(--fs-10);padding:2px 6px;border-left:2px solid var(--accent-cyan);background:var(--tint-hover,rgba(153,204,255,0.05));cursor:pointer;}',
      '.icf-steps-item:hover{background:var(--tint-on,rgba(153,204,255,0.12));}',
      '.icf-actions{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;}',
      '.ic-tl-dot2{width:9px;height:9px;border-radius:50%;flex-shrink:0;z-index:1;}',
      '.ic-tl-dead .ic-tl-label{text-decoration:line-through;opacity:.6;}',
      '.ic-tl-tag{font-size:var(--fs-8);color:color-mix(in srgb, var(--text-bad,#c97b7b) 60%, var(--text-secondary,#8a96a8));flex-shrink:0;}',
      '.ic-tl-bad{font-size:var(--fs-9);color:var(--text-warn,#e0a040);flex-shrink:0;font-weight:bold;}',
      '.ic-tl-bad.err{color:var(--text-bad,#e06060);}',
      '.ic-tl-num{font-size:var(--fs-8);color:var(--text-secondary);flex-shrink:0;}',
      '.ic-tl-run{flex-shrink:0;cursor:pointer;color:var(--text-ok,#7be07b);opacity:.45;font-size:var(--fs-9);padding:0 3px;}',
      '.ic-tl-run:hover{opacity:1;}',
      '.ic-tl-branch{font-size:var(--fs-9);color:var(--accent-purple,#cc66ff);padding:1px 6px;display:flex;gap:6px;}',
      '.ic-tl-branch span{cursor:pointer;color:var(--accent-cyan);}',
      '.ic-tl-sec .ic-tl-label{color:var(--header-gold);font-weight:bold;}',
      '#ic-truth-banner{display:none;font-size:var(--fs-10);border:1px solid var(--line-bad,#8a5a5a);background:var(--tint-bad,rgba(201,123,123,0.08));border-radius:3px;padding:4px 8px;margin:2px 0;}',
      '#ic-truth-banner .ic-tb-x{float:right;cursor:pointer;color:var(--text-secondary);margin-left:8px;}',
      '#ic-truth-banner .ic-tb-link{color:var(--accent-cyan);cursor:pointer;text-decoration:underline;margin-left:6px;}',
      '#ic-truth-banner ul{margin:3px 0 0 16px;padding:0;}',
      '.ic-wiz-search{width:100%;margin-bottom:4px;}',
      '.ic-wizard-card-jargon{font-size:var(--fs-8);color:var(--text-secondary);opacity:.6;font-family:Consolas,monospace;}',
      '.ic-val-list div{cursor:pointer;padding:1px 0;}',
      '.ic-val-list div:hover{text-decoration:underline;}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'ic-style-v2';
    st.textContent = css;
    document.head.appendChild(st);
  };

  U.loadPrefs = function () {
    try { IC.model.st.showInactive = root.localStorage && localStorage.getItem('ic_show_inactive') === '1'; } catch (_e) { IC.model.st.showInactive = false; }
  };
  U.applyInactiveClass = function () {
    var on = !!IC.model.st.showInactive, box = $('creator-ic'), cb = $('ic-show-inactive');
    if (box) { if (on) box.classList.add('ic-show-inactive'); else box.classList.remove('ic-show-inactive'); }
    if (cb) cb.checked = on;
  };
  U.setShowInactive = function (on) {
    IC.model.st.showInactive = !!on;
    try { if (root.localStorage) localStorage.setItem('ic_show_inactive', on ? '1' : '0'); } catch (_e) {}
    U.applyInactiveClass();
    if (IC.picker && IC.picker.refresh) IC.picker.refresh();
    U.refresh(true);
    U.renderBanner();
  };
  root.icToggleInactive = function (el) { U.setShowInactive(el ? el.checked : !IC.model.st.showInactive); };

  U.bannerHtml = function (scan, showInactive) {
    var loud = [], quiet = [];
    for (var i = 0; i < scan.items.length; i++) (scan.items[i].quiet ? quiet : loud).push(scan.items[i]);
    if (!loud.length && scan.fmt !== 'v3') return '';
    var h = '<span class="ic-tb-x" onclick="icBannerDismiss()">&#10005;</span>';
    if (loud.length) {
      var parts = loud.slice(0, 4).map(function (i) { return esc(i.label) + (i.count > 1 ? ' x' + i.count : ''); });
      h += '<b>Saved but not run by the game:</b> ' + parts.join(' &middot; ') + (loud.length > 4 ? ' &middot; ...' : '') + '. They stay in the file.';
    } else h += '<b>Template file:</b> the game reads fewer fields here than in step-list files.';
    if (!showInactive && loud.length) h += '<span class="ic-tb-link" onclick="icToggleInactive()">Show them</span>';
    h += '<span class="ic-tb-link" onclick="icToggleSec(\'tbd\')">details</span>';
    var det = '<ul>';
    for (var a = 0; a < loud.length; a++) det += '<li>' + esc(loud[a].label) + ' x' + loud[a].count + ' -- ' + esc(loud[a].why) + '</li>';
    for (var b = 0; b < quiet.length; b++) det += '<li style="opacity:.7;">' + esc(quiet[b].label) + ' x' + quiet[b].count + ' -- ' + esc(quiet[b].why) + ' (harmless)</li>';
    det += '</ul>';
    h += '<div id="icsec-tbd" style="display:none;">' + det + '</div>';
    return h;
  };
  U.renderBanner = function () {
    var el = $('ic-truth-banner');
    if (!el) return;
    if (U._bannerDismissed === IC.model.st.path) { el.style.display = 'none'; return; }
    var html = IC.model.st.doc ? U.bannerHtml(IC.model.scan(), IC.model.st.showInactive) : '';
    el.innerHTML = html;
    el.style.display = html ? 'block' : 'none';
  };
  root.icBannerDismiss = function () { U._bannerDismissed = IC.model.st.path; var el = $('ic-truth-banner'); if (el) el.style.display = 'none'; };

  U.updateToolbar = function () {
    var M = IC.model, u = $('ic-undo-btn'), r = $('ic-redo-btn'), d = $('ic-dirty'), c = $('ic-enc-count');
    if (u) u.disabled = !M.canUndo();
    if (r) r.disabled = !M.canRedo();
    if (d) d.style.display = M.dirty() ? 'inline' : 'none';
    if (c) c.textContent = M.editable() ? M.count() + ' steps' : '';
  };
  root.icUndo = function () { U.flush(); if (IC.model.undo()) { U.refresh(true); U.renderBanner(); } else U.toast('Nothing to undo'); };
  root.icRedo = function () { U.flush(); if (IC.model.redo()) { U.refresh(true); U.renderBanner(); } else U.toast('Nothing to redo'); };

  U.flush = function () {
    if (typeof document === 'undefined') return;
    var a = document.activeElement;
    if (a && a.id && /^icf-/.test(a.id) && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) { try { a.blur(); } catch (_e) {} }
  };

  U.changed = function (rerenderForm) {
    IC.model.commit();
    U.refresh(rerenderForm);
  };
  U.refresh = function (rerenderForm) {
    if (IC.tl && IC.tl.render) IC.tl.render();
    if (rerenderForm && U.renderForm) U.renderForm();
    U.updateToolbar();
    if (root.icUpdateBreadcrumb) root.icUpdateBreadcrumb();
  };

  U.bindKeys = function () {
    if (U._keys || typeof document === 'undefined') return;
    U._keys = true;
    document.addEventListener('keydown', function (ev) {
      if (!(ev.ctrlKey || ev.metaKey)) return;
      var box = $('creator-ic');
      if (!box || !box.offsetParent) return;
      var modal = $('jb-modal'); if (modal && modal.style.display && modal.style.display !== 'none') return;
      var a = document.activeElement, tag = a && a.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      var k = String(ev.key || '').toLowerCase();
      if (k === 'z' && !ev.shiftKey) { ev.preventDefault(); root.icUndo(); }
      else if (k === 'y' || (k === 'z' && ev.shiftKey)) { ev.preventDefault(); root.icRedo(); }
    });
  };
})(typeof window !== 'undefined' ? window : this);
