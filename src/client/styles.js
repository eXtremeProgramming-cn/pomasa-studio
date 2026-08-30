// pomasa-studio styles — self-contained design kit on DSW alias tokens.
// Every color is a --dsw-alias-* token so light/dark follow the host.
// Type/space/radius/state are tuned to feel like a library, not ad-hoc.
export const CSS = `
.ps-root {
  color: var(--dsw-alias-label-primary);
  font-size: 15px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  font-feature-settings: "cv02", "cv03", "cv04";
}
.ps-root *, .ps-root *::before, .ps-root *::after { box-sizing: border-box; }
.ps-root button, .ps-root input, .ps-root textarea, .ps-root select {
  font: inherit; color: inherit;
}
.ps-root a { color: var(--dsw-alias-brand-primary); text-decoration: none; }
.ps-root a:hover { text-decoration: underline; }

/* ---------- typography scale ---------- */
.ps-h1 { font-size: 24px; font-weight: 650; letter-spacing: -0.02em; margin: 0 0 4px; }
.ps-h2 { font-size: 18px; font-weight: 600; letter-spacing: -0.01em; margin: 0 0 6px; }
.ps-sub { color: var(--dsw-alias-label-dimmed); font-size: 14px; margin: 0 0 24px; }
.ps-muted { color: var(--dsw-alias-label-dimmed); font-size: 14px; }
.ps-caption { color: var(--dsw-alias-label-caption); font-size: 12.5px; }

/* ---------- surfaces ---------- */
.ps-card {
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  padding: 18px 20px;
}
.ps-card.clickable { cursor: pointer; transition: border-color 150ms, box-shadow 150ms; }
.ps-card.clickable:hover { border-color: var(--dsw-alias-border-l3); box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06); }
.ps-card-title { font-size: 15px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
.ps-card-desc { color: var(--dsw-alias-label-dimmed); font-size: 13.5px; line-height: 1.55; margin: 0 0 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ps-card-footer { display: flex; gap: 10px; align-items: center; margin-top: 14px; flex-wrap: wrap; }

/* ---------- buttons ---------- */
.ps-btn {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease;
  user-select: none;
  white-space: nowrap;
}
.ps-btn:hover { background: var(--dsw-alias-bg-layer-3, var(--dsw-alias-interactive-bg-hover)); border-color: var(--dsw-alias-border-l3); }
.ps-btn:active { transform: translateY(0.5px); }
.ps-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.ps-btn.primary { background: var(--dsw-alias-brand-primary); border-color: transparent; color: #fff; font-weight: 550; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12); }
.ps-btn.primary:hover { background: var(--dsw-alias-button-primary-hover, var(--dsw-alias-brand-primary)); filter: brightness(1.06); }
.ps-btn.ghost { background: transparent; border-color: transparent; color: var(--dsw-alias-label-dimmed); }
.ps-btn.ghost:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); border-color: transparent; }
.ps-btn-danger { color: var(--dsw-alias-state-error-primary) !important; }
.ps-btn-danger:hover { background: var(--dsw-alias-interactive-bg-hover-danger) !important; filter: none !important; box-shadow: none !important; }
.ps-btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.ps-btn:disabled:hover { background: inherit; filter: none; }

/* ---------- badges / status ---------- */
.ps-badge {
  display: inline-flex; align-items: center; gap: 6px;
  border-radius: 999px; padding: 2px 10px;
  font-size: 12.5px; font-weight: 500;
  border: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-dimmed);
  background: var(--dsw-alias-bg-layer-2);
}
.ps-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.ps-badge.running { color: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-border-l3); }
.ps-badge.generating { color: var(--dsw-alias-state-warn-primary); }
.ps-badge.completed, .ps-badge.ok { color: var(--dsw-alias-state-success-primary); }
.ps-badge.failed, .ps-badge.err { color: var(--dsw-alias-state-error-primary); }
.ps-badge.idle { color: var(--dsw-alias-label-dimmed); }

/* ---------- list grid (legacy) ---------- */
.ps-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }

/* ---------- empty states ---------- */
.ps-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 56px 24px; text-align: center; gap: 10px; color: var(--dsw-alias-label-dimmed); border: 1px dashed var(--dsw-alias-border-l2); border-radius: 14px; background: var(--dsw-alias-bg-layer-1); }
.ps-empty-glyph { font-size: 36px; line-height: 1; opacity: 0.5; }
.ps-empty-title { font-size: 16px; font-weight: 600; color: var(--dsw-alias-label-primary); }

/* ---------- forms ---------- */
.ps-field { margin-bottom: 16px; }
.ps-field label { display: block; font-size: 13.5px; font-weight: 500; color: var(--dsw-alias-label-primary); margin-bottom: 6px; }
.ps-field .hint { color: var(--dsw-alias-label-caption); font-size: 12.5px; margin-top: 5px; }
.ps-input, .ps-textarea, .ps-select {
  width: 100%;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  outline: none;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}
.ps-input::placeholder, .ps-textarea::placeholder { color: var(--dsw-alias-label-caption); }
.ps-input:hover, .ps-textarea:hover, .ps-select:hover { border-color: var(--dsw-alias-border-l3); }
.ps-input:focus, .ps-textarea:focus, .ps-select:focus { border-color: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent); }
.ps-textarea { min-height: 88px; resize: vertical; line-height: 1.55; }
.ps-form-row { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); }
.ps-form-row > * { min-width: 0; }

/* ---------- stage strip ---------- */
.ps-stages { display: flex; gap: 4px; overflow-x: auto; background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; padding: 4px; }
.ps-stage { flex: 1 1 0; min-width: 116px; padding: 10px 12px; cursor: pointer; border-radius: 8px; transition: background 140ms ease; position: relative; }
.ps-stage:hover { background: var(--dsw-alias-interactive-bg-hover); }
.ps-stage.on { background: var(--dsw-alias-bg-layer-2); box-shadow: inset 0 0 0 1.5px var(--dsw-alias-state-business-primary); }
.ps-stage-on { position: absolute; top: 0; left: 8px; right: 8px; height: 2.5px; border-radius: 0 0 4px 4px; }
.ps-stage-name { font-size: 13.5px; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.ps-stage-name:hover { text-decoration: underline; }
.ps-stage-count { font-size: 12px; color: var(--dsw-alias-label-caption); }

/* ---------- footer action / shell panel ---------- */
/* footer launcher is a real button: floating-pill surface when closed,
   business-primary accent when the workbench panel is open (both DSH tokens) */
.ps-footer-action { cursor: pointer; padding: 7px 12px; font-size: 14px; font-weight: 600; color: var(--dsw-alias-label-primary); display: inline-flex; align-items: center; justify-content: center; gap: 7px; transition: background 150ms, color 150ms, border-color 150ms; border-radius: 8px; margin: 2px 8px; white-space: nowrap; background: var(--dsw-alias-button-floating-fill); border: 1px solid var(--dsw-alias-border-l2); }
.ps-footer-action:hover { background: var(--dsw-alias-button-floating-hover); }
.ps-footer-glyph { font-size: 12px; line-height: 1; opacity: 0.8; }
.ps-footer-action .ps-footer-glyph { color: var(--dsw-alias-state-business-primary); }
.ps-footer-action.on { background: var(--dsw-alias-state-business-primary); border-color: transparent; color: var(--dsw-alias-brand-primary-invert, #fff); }
.ps-footer-action.on .ps-footer-glyph { color: inherit; opacity: 1; }
.ps-footer-action.on:hover { background: var(--dsw-alias-button-info-hover, var(--dsw-alias-state-business-primary)); filter: brightness(1.05); }

/* shell.overlay workbench panel — bounded to the center column, the DSH
   sidebar stays visible and clickable underneath (click-through root). */
.ps-shell-root { position: absolute; inset: 0; display: flex; pointer-events: none; }
.ps-shell-nav { flex: 0 0 264px; }
.ps-shell-panel { flex: 1; min-width: 0; pointer-events: auto; background: var(--dsw-alias-bg-base); border-left: 1px solid var(--dsw-alias-border-l2); display: flex; min-height: 0; overflow: hidden; }

/* ---------- modal ---------- */
.ps-modal-backdrop { position: fixed; inset: 0; background: var(--dsw-alias-bg-mask-2, rgba(0, 0, 0, 0.4)); display: flex; align-items: center; justify-content: center; z-index: 60; padding: 24px; }
.ps-modal { background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l2); border-radius: 14px; width: min(760px, 100%); max-height: 82vh; display: flex; flex-direction: column; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.22); }
.ps-modal-wide { width: min(980px, 100%); max-height: 88vh; }
.ps-artifact-body { max-height: 72vh; }
.ps-modal-head { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.ps-modal-body { padding: 20px 26px; overflow: auto; line-height: 1.7; font-size: 14.5px; }
.ps-modal-body h1, .ps-modal-body h2, .ps-modal-body h3 { line-height: 1.3; margin: 1.1em 0 0.45em; }
.ps-modal-body h1 { font-size: 21px; } .ps-modal-body h2 { font-size: 18px; } .ps-modal-body h3 { font-size: 15px; }
.ps-modal-body p { margin: 0 0 0.85em; }
.ps-code { background: var(--dsw-alias-bg-layer-2); padding: 1px 6px; border-radius: 5px; font-size: 13px; }
.ps-pre { background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; padding: 14px; overflow: auto; font-size: 13px; line-height: 1.6; }

/* ---------- artifact cards ---------- */
.ps-artlist { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.ps-art { cursor: pointer; transition: border-color 150ms, box-shadow 150ms; }
.ps-art:hover { border-color: var(--dsw-alias-border-l3); box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06); }
.ps-art.on { border-color: var(--dsw-alias-brand-primary); }
.ps-art-title { font-size: 14.5px; font-weight: 600; margin: 0 0 2px; letter-spacing: -0.01em; }
.ps-art-sub { font-size: 13px; color: var(--dsw-alias-label-dimmed); margin-bottom: 6px; }
.ps-art-sum { font-size: 13.5px; color: var(--dsw-alias-label-primary-dimmed, var(--dsw-alias-label-dimmed)); margin-bottom: 10px; line-height: 1.55; }
.ps-art-meta { display: flex; gap: 12px; font-size: 12px; color: var(--dsw-alias-label-caption); }

/* ---------- viewer ---------- */
.ps-viewer { border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; background: var(--dsw-alias-bg-layer-1); overflow: hidden; }
.ps-viewer-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 18px; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.ps-viewer-body { padding: 20px 26px; max-height: 560px; overflow: auto; line-height: 1.7; font-size: 14.5px; }
.ps-viewer-body h1, .ps-viewer-body h2, .ps-viewer-body h3, .ps-viewer-body h4 { line-height: 1.3; margin: 1.2em 0 0.5em; font-weight: 600; }
.ps-viewer-body h1 { font-size: 22px; } .ps-viewer-body h2 { font-size: 19px; } .ps-viewer-body h3 { font-size: 16px; } .ps-viewer-body h4 { font-size: 14.5px; }
.ps-viewer-body p { margin: 0 0 0.9em; }
.ps-viewer-body ul, .ps-viewer-body ol { padding-left: 22px; margin: 0 0 0.9em; }
.ps-viewer-body hr { border: none; border-top: 1px solid var(--dsw-alias-border-l2); margin: 1.2em 0; }
.ps-viewer-body blockquote { margin: 0 0 0.9em; padding: 4px 16px; border-left: 3px solid var(--dsw-alias-border-l3); color: var(--dsw-alias-label-dimmed); }
.ps-viewer-body table { border-collapse: collapse; margin: 0 0 0.9em; }
.ps-viewer-body th, .ps-viewer-body td { border: 1px solid var(--dsw-alias-border-l2); padding: 6px 12px; font-size: 13.5px; }
.ps-viewer-body th { background: var(--dsw-alias-bg-layer-2); font-weight: 600; }

/* ---------- log panel ---------- */
.ps-log-panel { border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; background: var(--dsw-alias-bg-layer-1); overflow: hidden; }
.ps-log-head { display: flex; align-items: center; gap: 10px; padding: 12px 18px; cursor: pointer; user-select: none; font-size: 14px; font-weight: 550; }
.ps-log-head:hover { background: var(--dsw-alias-interactive-bg-hover); }
.ps-log-body { border-top: 1px solid var(--dsw-alias-border-l2); padding: 14px 18px; max-height: 260px; overflow: auto; background: var(--dsw-alias-bg-layer-2); font-size: 12.5px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; word-break: break-word; }

/* ---------- toolbar / notice ---------- */
.ps-toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }
.ps-toolbar .spacer { flex: 1; }
.ps-notice { border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; font-size: 13.5px; }
.ps-notice.ok { background: var(--dsw-alias-state-success-tertiary, transparent); color: var(--dsw-alias-state-success-primary); border: 1px solid var(--dsw-alias-border-l2); }
.ps-notice.err { color: var(--dsw-alias-state-error-primary); border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-interactive-bg-hover-danger); }

/* ---------- detail two-column panel ---------- */
.ps-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 20px; }
@media (max-width: 900px) { .ps-panel { grid-template-columns: 1fr; } }

/* ---------- run selector rows ---------- */
.ps-unit-row { display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; transition: background 140ms ease, border-color 140ms ease; }
.ps-unit-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.ps-unit-row.on { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-border-l2); }

/* ================= workbench ================= */
/* The workbench must STRETCH inside whatever flex/block container hosts it
   (shell panel or the session view area): as a flex item, default
   flex:0 1 auto sizes to content and clips the right half. */
.ps-workbench { display: flex; height: 100%; width: 100%; flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden; }
/* The .ps-root * reset never applies here (the workbench mounts outside any
   .ps-root wrapper), so establish border-box for the whole subtree — without
   it, width:100% + padding overflows (negative auto margins) and clips.
   NOTE: this CSS lives in a JS template literal — a stray backtick anywhere
   inside would terminate it early and silently strip all later styles. */
.ps-workbench, .ps-workbench *, .ps-workbench *::before, .ps-workbench *::after { box-sizing: border-box; }
[data-conversation-scroll]:has(.ps-workbench) > [data-composer-seat] { display: none !important; }
[data-conversation-scroll] > [data-slot="conversation.session"] > div:has(.ps-workbench) { flex: 1 1 0 !important; }

/* --- left navigation --- */
.ps-nav { flex: 0 0 280px; min-width: 0; border-right: 1px solid var(--dsw-alias-border-l2); display: flex; flex-direction: column; background: var(--dsw-alias-bg-base); }
.ps-nav-head { padding: 18px 16px 12px; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.ps-nav-title { display: flex; align-items: center; gap: 10px; }
.ps-nav-title .name { font-size: 15px; font-weight: 650; letter-spacing: -0.01em; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ps-nav-title .ps-btn { flex: none; }
.ps-nav-head .ps-sub { margin: 4px 0 0; font-size: 12.5px; color: var(--dsw-alias-label-caption); }
.ps-nav-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 8px; }

.ps-nav-row { position: relative; display: block; width: 100%; text-align: left; padding: 8px 10px 8px 14px; border-radius: 8px; cursor: pointer; transition: background 140ms ease; border: none; background: transparent; margin-bottom: 2px; }
.ps-nav-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.ps-nav-row.on { background: var(--dsw-alias-bg-layer-2); }
.ps-nav-row.on::before { content: ''; position: absolute; left: 4px; top: 9px; bottom: 9px; width: 3px; border-radius: 3px; background: var(--dsw-alias-state-business-primary); }
.ps-nav-top { display: flex; align-items: center; gap: 8px; min-width: 0; }
.ps-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex: none; }
.ps-dot.running { color: var(--dsw-alias-brand-primary); }
.ps-dot.generating { color: var(--dsw-alias-state-warn-primary); }
.ps-dot.failed { color: var(--dsw-alias-state-error-primary); }
.ps-dot.completed { color: var(--dsw-alias-state-success-primary); }
.ps-dot.idle { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-caption)); }
.ps-nav-name { font-size: 14px; font-weight: 550; color: var(--dsw-alias-label-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }
.ps-nav-del { margin-left: auto; opacity: 0; padding: 2px 8px; font-size: 12px; }
.ps-nav-row:hover .ps-nav-del { opacity: 1; }
.ps-nav-meta { margin: 3px 0 0 15px; font-size: 12px; color: var(--dsw-alias-label-caption); display: flex; gap: 10px; flex-wrap: wrap; }
.ps-nav-empty { padding: 24px 12px; text-align: center; color: var(--dsw-alias-label-caption); font-size: 13px; }

/* --- nav footer: language switch --- */
.ps-nav-foot { display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; border-top: 1px solid var(--dsw-alias-border-l2); }
.ps-lang-label { font-size: 12px; color: var(--dsw-alias-label-caption); }
.ps-lang-opts { display: flex; gap: 2px; }
.ps-lang-opt { border: 1px solid transparent; background: transparent; color: var(--dsw-alias-label-caption); border-radius: 6px; padding: 2px 8px; font-size: 12px; cursor: pointer; transition: background 140ms ease, color 140ms ease; user-select: none; }
.ps-lang-opt:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.ps-lang-opt.on { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); font-weight: 550; }

/* --- main panes --- */
.ps-main { flex: 1; min-width: 0; overflow-y: auto; }
.ps-main-inner { max-width: 1180px; width: 100%; margin: 0 auto; padding: 20px 28px 56px; }

/* right-pane empty states */
.ps-empty-hero { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 12px; padding: 48px 28px; }
.ps-hero-glyph { font-size: 44px; line-height: 1; opacity: 0.5; }
.ps-empty-hero h2 { font-size: 20px; font-weight: 650; letter-spacing: -0.01em; margin: 4px 0 0; }
.ps-empty-hero p { color: var(--dsw-alias-label-dimmed); font-size: 14.5px; line-height: 1.65; max-width: 440px; margin: 0; }
.ps-empty-hero .ps-caption { margin-top: 4px; }
.ps-empty-hero.quiet { opacity: 0.8; }
.ps-meme { width: 200px; height: 200px; object-fit: contain; margin-bottom: 2px; user-select: none; pointer-events: none; -webkit-mask-image: radial-gradient(ellipse closest-side, #000 52%, transparent 76%); mask-image: radial-gradient(ellipse closest-side, #000 52%, transparent 76%); }

/* --- detail info bar --- */
.ps-info-bar { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; border-bottom: 1px solid var(--dsw-alias-border-l2); padding-bottom: 16px; margin-bottom: 20px; }
.ps-info-bar > div:first-child { min-width: 0; flex: 1 1 auto; }
.ps-info-bar h2 { font-size: 20px; font-weight: 650; letter-spacing: -0.01em; margin: 0; }
.ps-info-caption { font-size: 12.5px; color: var(--dsw-alias-label-caption); margin-top: 3px; }
.ps-info-bar .spacer { flex: 1; }

@media (max-width: 820px) {
  .ps-workbench { flex-direction: column; overflow: auto; }
  .ps-nav { flex: none; width: 100%; border-right: none; border-bottom: 1px solid var(--dsw-alias-border-l2); max-height: 38vh; }
  .ps-main { overflow: visible; }
}
`