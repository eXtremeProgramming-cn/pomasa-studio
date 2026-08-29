// pomasa-studio styles — every color is a DSW alias token, so light/dark follow the host.
export const CSS = `
.ps-root {
  color: var(--dsw-alias-label-primary);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
.ps-root *, .ps-root *::before, .ps-root *::after { box-sizing: border-box; }
.ps-root button, .ps-root input, .ps-root textarea, .ps-root select {
  font: inherit; color: inherit;
}
.ps-root a { color: var(--dsw-alias-brand-primary); text-decoration: none; }
.ps-root a:hover { text-decoration: underline; }

.ps-h1 { font-size: 28px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
.ps-h2 { font-size: 20px; font-weight: 600; margin: 0 0 4px; }
.ps-sub { color: var(--dsw-alias-label-dimmed); font-size: 15px; margin: 0 0 28px; }
.ps-muted { color: var(--dsw-alias-label-dimmed); font-size: 14px; }
.ps-caption { color: var(--dsw-alias-label-caption); font-size: 13px; }

.ps-card {
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 14px;
  padding: 20px;
}
.ps-card.clickable { cursor: pointer; transition: filter 150ms, border-color 150ms; }
.ps-card.clickable:hover { filter: brightness(1.05); border-color: var(--dsw-alias-border-l3); }

.ps-btn {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  border-radius: 10px;
  padding: 7px 14px;
  font-size: 15px;
  cursor: pointer;
  transition: filter 150ms;
  user-select: none;
}
.ps-btn:hover { filter: brightness(1.07); }
.ps-btn.primary { background: var(--dsw-alias-brand-primary); border-color: transparent; color: #fff; }
.ps-btn.primary:hover { filter: brightness(1.1); }
.ps-btn.ghost { background: transparent; border-color: transparent; color: var(--dsw-alias-label-dimmed); }
.ps-btn.ghost:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); filter: none; }
.ps-btn-danger { color: var(--dsw-alias-state-error-primary) !important; }
.ps-btn-danger:hover { background: var(--dsw-alias-interactive-bg-hover-danger) !important; filter: none !important; }
.ps-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ps-badge {
  display: inline-flex; align-items: center; gap: 6px;
  border-radius: 999px; padding: 2px 10px;
  font-size: 13px; font-weight: 500;
  border: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-dimmed);
  background: var(--dsw-alias-bg-layer-2);
}
.ps-badge .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.ps-badge.running { color: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-border-l3); }
.ps-badge.generating { color: var(--dsw-alias-state-warn-primary); }
.ps-badge.completed, .ps-badge.ok { color: var(--dsw-alias-state-success-primary); }
.ps-badge.failed, .ps-badge.err { color: var(--dsw-alias-state-error-primary); }
.ps-badge.idle { color: var(--dsw-alias-label-dimmed); }

.ps-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.ps-card-title { font-size: 16px; font-weight: 500; margin: 0 0 4px; }
.ps-card-desc { color: var(--dsw-alias-label-dimmed); font-size: 14px; margin: 0 0 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ps-card-footer { display: flex; gap: 10px; align-items: center; margin-top: 14px; flex-wrap: wrap; }

.ps-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 64px 20px; text-align: center; gap: 12px;
  color: var(--dsw-alias-label-dimmed);
  border: 1px dashed var(--dsw-alias-border-l2);
  border-radius: 14px;
}
.ps-empty-glyph { font-size: 42px; opacity: 0.6; }
.ps-empty-title { font-size: 17px; font-weight: 500; color: var(--dsw-alias-label-primary); }

.ps-field { margin-bottom: 18px; }
.ps-field label { display: block; font-size: 14px; font-weight: 500; color: var(--dsw-alias-label-primary); margin-bottom: 6px; }
.ps-field .hint { color: var(--dsw-alias-label-caption); font-size: 13px; margin-top: 4px; }
.ps-input, .ps-textarea, .ps-select {
  width: 100%;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 15px;
  outline: none;
  transition: border-color 150ms;
}
.ps-input:focus, .ps-textarea:focus, .ps-select:focus { border-color: var(--dsw-alias-brand-primary); }
.ps-textarea { min-height: 90px; resize: vertical; line-height: 1.55; }
.ps-form-row { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); }
.ps-form-row > * { min-width: 0; }

/* stage strip */
.ps-stages { display: flex; gap: 0; overflow-x: auto; border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; background: var(--dsw-alias-bg-layer-1); }
.ps-stage {
  flex: 1 1 0; min-width: 120px;
  padding: 12px 14px; cursor: pointer;
  border-right: 1px solid var(--dsw-alias-border-l2);
  transition: background 150ms;
  position: relative;
}
.ps-stage:last-child { border-right: none; }
.ps-stage:hover { background: var(--dsw-alias-interactive-bg-hover); }
.ps-stage.on { background: var(--dsw-alias-bg-layer-2); }
.ps-stage-on { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 12px 12px 0 0; }
.ps-stage-name { font-size: 14px; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.ps-stage-name:hover { text-decoration: underline; }

/* blueprint modal */
.ps-footer-action { cursor: pointer; padding: 8px 12px; font-size: 14px; font-weight: 600; color: var(--dsw-alias-label-primary); display: flex; align-items: center; gap: 8px; transition: background 150ms; border-radius: 8px; margin: 2px 8px; white-space: nowrap; }
.ps-footer-action:hover { background: var(--dsw-alias-interactive-bg-hover); }
.ps-footer-action.on { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-brand-primary); }

/* shell.overlay workbench panel — bounded to the center column, the DSH
   sidebar stays visible and clickable underneath (click-through root). */
.ps-shell-root { position: absolute; inset: 0; display: flex; pointer-events: none; }
.ps-shell-nav { flex: 0 0 264px; }
.ps-shell-panel { flex: 1; min-width: 0; pointer-events: auto; background: var(--dsw-alias-bg-base); border-left: 1px solid var(--dsw-alias-border-l2); display: flex; min-height: 0; overflow: hidden; }
.ps-modal-backdrop { position: fixed; inset: 0; background: var(--dsw-alias-bg-mask-2, rgba(0, 0, 0, 0.4)); display: flex; align-items: center; justify-content: center; z-index: 60; padding: 24px; }
.ps-modal { background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l2); border-radius: 14px; width: min(760px, 100%); max-height: 82vh; display: flex; flex-direction: column; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25); }
.ps-modal-head { display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.ps-modal-body { padding: 20px 24px; overflow: auto; line-height: 1.7; font-size: 15px; }
.ps-modal-body h1, .ps-modal-body h2, .ps-modal-body h3 { line-height: 1.3; margin: 1.1em 0 0.45em; }
.ps-modal-body h1 { font-size: 23px; } .ps-modal-body h2 { font-size: 19px; } .ps-modal-body h3 { font-size: 16px; }
.ps-modal-body p { margin: 0 0 0.85em; }
.ps-modal-body code.ps-code { background: var(--dsw-alias-bg-layer-2); padding: 1px 6px; border-radius: 6px; font-size: 13.5px; }
.ps-modal-body pre.ps-pre { background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; padding: 14px; overflow: auto; font-size: 13.5px; }
.ps-stage-count { font-size: 13px; color: var(--dsw-alias-label-dimmed); }

/* artifact cards */
.ps-artlist { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
.ps-art { cursor: pointer; }
.ps-art.on { border-color: var(--dsw-alias-brand-primary); }
.ps-art-title { font-size: 15px; font-weight: 600; margin: 0 0 2px; }
.ps-art-sub { font-size: 13px; color: var(--dsw-alias-label-dimmed); margin-bottom: 6px; }
.ps-art-sum { font-size: 14px; color: var(--dsw-alias-label-primary-dimmed); margin-bottom: 8px; }
.ps-art-meta { display: flex; gap: 12px; font-size: 12.5px; color: var(--dsw-alias-label-caption); }

/* viewer */
.ps-viewer { border: 1px solid var(--dsw-alias-border-l2); border-radius: 14px; background: var(--dsw-alias-bg-layer-1); overflow: hidden; }
.ps-viewer-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 18px; border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.ps-viewer-body { padding: 20px 24px; max-height: 560px; overflow: auto; line-height: 1.7; font-size: 15px; }
.ps-viewer-body pre.ps-pre { background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; padding: 14px; overflow: auto; font-size: 13.5px; }
.ps-viewer-body code.ps-code { background: var(--dsw-alias-bg-layer-2); padding: 1px 6px; border-radius: 6px; font-size: 13.5px; }
.ps-viewer-body pre.ps-pre code { background: none; padding: 0; }
.ps-viewer-body h1, .ps-viewer-body h2, .ps-viewer-body h3, .ps-viewer-body h4 { line-height: 1.3; margin: 1.2em 0 0.5em; }
.ps-viewer-body h1 { font-size: 24px; } .ps-viewer-body h2 { font-size: 20px; } .ps-viewer-body h3 { font-size: 17px; } .ps-viewer-body h4 { font-size: 15px; }
.ps-viewer-body p { margin: 0 0 0.9em; }
.ps-viewer-body ul { padding-left: 22px; margin: 0 0 0.9em; }
.ps-viewer-body hr { border: none; border-top: 1px solid var(--dsw-alias-border-l2); margin: 1.2em 0; }
.ps-viewer-body blockquote { margin: 0 0 0.9em; padding: 4px 16px; border-left: 3px solid var(--dsw-alias-border-l3); color: var(--dsw-alias-label-dimmed); }
.ps-viewer-body table { border-collapse: collapse; margin: 0 0 0.9em; }
.ps-viewer-body th, .ps-viewer-body td { border: 1px solid var(--dsw-alias-border-l2); padding: 6px 12px; font-size: 14px; }

/* log panel */
.ps-log-panel { border: 1px solid var(--dsw-alias-border-l2); border-radius: 14px; background: var(--dsw-alias-bg-layer-1); overflow: hidden; }
.ps-log-head { display: flex; align-items: center; gap: 10px; padding: 12px 18px; cursor: pointer; user-select: none; }
.ps-log-head:hover { background: var(--dsw-alias-interactive-bg-hover); }
.ps-log-body { border-top: 1px solid var(--dsw-alias-border-l2); padding: 14px 18px; max-height: 260px; overflow: auto; background: var(--dsw-alias-bg-layer-2); font-size: 13px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; word-break: break-word; }

.ps-toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }
.ps-toolbar .spacer { flex: 1; }
.ps-notice { border-radius: 12px; padding: 10px 16px; margin-bottom: 16px; font-size: 14px; }
.ps-notice.ok { background: var(--dsw-alias-state-success-tertiary, transparent); color: var(--dsw-alias-state-success-primary); border: 1px solid var(--dsw-alias-border-l2); }
.ps-notice.err { color: var(--dsw-alias-state-error-primary); border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-interactive-bg-hover-danger); }

.ps-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
@media (max-width: 900px) { .ps-panel { grid-template-columns: 1fr; } }

/* run selector rows */
.ps-unit-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; cursor: pointer; }
.ps-unit-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.ps-unit-row.on { background: var(--dsw-alias-bg-layer-2); }

/* workbench split-pane */
.ps-workbench { display: flex; height: 100%; min-height: 0; overflow: hidden; }
/* Composer seat: hide while the workbench tab is active (dsh-editor precedent).
   Self-scopes because a conversation.view renders only when active. */
[data-conversation-scroll]:has(.ps-workbench) > [data-composer-seat] { display: none !important; }
[data-conversation-scroll] > [data-slot="conversation.session"] > div:has(.ps-workbench) { flex: 1 1 0 !important; }

.ps-nav { flex: 0 0 280px; min-width: 0; border-right: 1px solid var(--dsw-alias-border-l2); display: flex; flex-direction: column; background: var(--dsw-alias-bg-base); }
.ps-nav-head { padding: 16px 16px 10px; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.ps-nav-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ps-nav-title .name { font-size: 17px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ps-nav-head .ps-sub { margin: 4px 0 0; font-size: 13px; color: var(--dsw-alias-label-caption); }
.ps-nav-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 8px 16px; }

.ps-nav-row { position: relative; display: block; width: 100%; text-align: left; padding: 9px 10px 9px 12px; border-radius: 8px; cursor: pointer; transition: background 150ms; border: none; background: transparent; margin-bottom: 2px; }
.ps-nav-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.ps-nav-row.on { background: var(--dsw-alias-bg-layer-2); }
.ps-nav-row.on::before { content: ''; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 3px; background: var(--dsw-alias-state-business-primary); }
.ps-nav-top { display: flex; align-items: center; gap: 8px; min-width: 0; }
.ps-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex: none; }
.ps-dot.running { color: var(--dsw-alias-brand-primary); }
.ps-dot.generating { color: var(--dsw-alias-state-warn-primary); }
.ps-dot.failed { color: var(--dsw-alias-state-error-primary); }
.ps-dot.idle { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-caption)); }
.ps-nav-name { font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }
.ps-nav-del { margin-left: auto; opacity: 0; padding: 2px 8px; font-size: 12px; }
.ps-nav-row:hover .ps-nav-del { opacity: 1; }
.ps-nav-meta { margin: 3px 0 0 16px; font-size: 13px; color: var(--dsw-alias-label-caption); display: flex; gap: 10px; flex-wrap: wrap; }

.ps-main { flex: 1; min-width: 0; overflow-y: auto; }
.ps-main-inner { max-width: 1280px; width: 100%; margin: 0 auto; padding: 20px 24px 48px; }
.ps-empty-pane { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; padding: 24px; }
.ps-empty-pane .ps-empty { width: 100%; max-width: 460px; }

.ps-info-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid var(--dsw-alias-border-l2); padding-bottom: 14px; margin-bottom: 16px; }
.ps-info-bar h2 { font-size: 20px; font-weight: 600; margin: 0; }
.ps-info-bar .spacer { flex: 1; }
.ps-info-caption { font-size: 13px; color: var(--dsw-alias-label-caption); margin-top: 2px; }

@media (max-width: 820px) {
  .ps-workbench { flex-direction: column; overflow: auto; }
  .ps-nav { flex: none; width: 100%; border-right: none; border-bottom: 1px solid var(--dsw-alias-border-l2); max-height: 38vh; }
  .ps-main { overflow: visible; }
}`