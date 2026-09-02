// Isolated Ambient In-Situ Warning Shield
// Injected into page DOM inside a closed Shadow DOM container so host CSS cannot tamper with it.

export interface AmbientAlertOptions {
  id: string;
  type: 'CRITICAL_SECURITY' | 'CREDENTIAL_WARNING' | 'DARK_PATTERN' | 'CANARY_BREAKAGE';
  title: string;
  message: string;
  details?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onDismiss?: () => void;
}

let hostElement: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
const activeAlerts = new Map<string, HTMLElement>();

function ensureHost(): ShadowRoot {
  if (!hostElement || !document.contains(hostElement)) {
    hostElement = document.createElement('vigil-ambient-shield');
    hostElement.style.all = 'initial';
    hostElement.style.position = 'fixed';
    hostElement.style.bottom = '20px';
    hostElement.style.right = '20px';
    hostElement.style.zIndex = '2147483647';
    hostElement.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    
    shadowRoot = hostElement.attachShadow({ mode: 'open' });
    
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
      }
      .vigil-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 380px;
        pointer-events: auto;
      }
      .vigil-card {
        background: #ffffff;
        color: #1f2937;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        border-left: 5px solid #ef4444;
        font-size: 13px;
        line-height: 1.5;
        position: relative;
        animation: vigil-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: inherit;
        box-sizing: border-box;
      }
      .vigil-card.warning {
        border-left-color: #f59e0b;
      }
      .vigil-card.notice {
        border-left-color: #3b82f6;
      }
      @keyframes vigil-slide-in {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .vigil-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .vigil-title {
        font-weight: 700;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .vigil-close {
        background: transparent;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        font-size: 16px;
        padding: 2px 6px;
        line-height: 1;
        border-radius: 4px;
      }
      .vigil-close:hover {
        color: #4b5563;
        background: #f3f4f6;
      }
      .vigil-body {
        margin-bottom: 12px;
        color: #4b5563;
      }
      .vigil-details {
        background: #f9fafb;
        padding: 8px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-family: monospace;
        color: #6b7280;
        word-break: break-all;
        margin-bottom: 12px;
        border: 1px solid #e5e7eb;
      }
      .vigil-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .vigil-btn {
        padding: 6px 12px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 12px;
        cursor: pointer;
        border: none;
        transition: background 0.2s;
      }
      .vigil-btn-primary {
        background: #ef4444;
        color: #ffffff;
      }
      .vigil-btn-primary:hover {
        background: #dc2626;
      }
      .vigil-btn-secondary {
        background: #f3f4f6;
        color: #374151;
      }
      .vigil-btn-secondary:hover {
        background: #e5e7eb;
      }
    `;
    shadowRoot.appendChild(style);

    const container = document.createElement('div');
    container.className = 'vigil-container';
    shadowRoot.appendChild(container);

    (document.documentElement || document.body).appendChild(hostElement);
  }
  return shadowRoot!;
}

export function showAmbientAlert(options: AmbientAlertOptions): void {
  // Prevent duplicate alert by ID
  if (activeAlerts.has(options.id)) return;

  const shadow = ensureHost();
  const container = shadow.querySelector('.vigil-container')!;

  const card = document.createElement('div');
  const isWarning = options.type === 'CREDENTIAL_WARNING' || options.type === 'DARK_PATTERN';
  const isNotice = options.type === 'CANARY_BREAKAGE';
  card.className = `vigil-card ${isWarning ? 'warning' : isNotice ? 'notice' : ''}`;

  const icon = options.type === 'CRITICAL_SECURITY' ? '🚨' : isWarning ? '⚠️' : '🛡️';

  card.innerHTML = `
    <div class="vigil-header">
      <div class="vigil-title">
        <span>${icon}</span>
        <span>${escapeHtml(options.title)}</span>
      </div>
      <button class="vigil-close" title="Dismiss">✕</button>
    </div>
    <div class="vigil-body">${escapeHtml(options.message)}</div>
    ${options.details ? `<div class="vigil-details">${escapeHtml(options.details)}</div>` : ''}
    <div class="vigil-actions">
      <button class="vigil-btn vigil-btn-secondary" id="dismiss-btn">Dismiss</button>
      ${options.primaryActionLabel ? `<button class="vigil-btn vigil-btn-primary" id="primary-btn">${escapeHtml(options.primaryActionLabel)}</button>` : ''}
    </div>
  `;

  // Attach handlers
  const dismiss = () => {
    card.remove();
    activeAlerts.delete(options.id);
    if (options.onDismiss) options.onDismiss();
  };

  card.querySelector('.vigil-close')?.addEventListener('click', dismiss);
  card.querySelector('#dismiss-btn')?.addEventListener('click', dismiss);

  if (options.primaryActionLabel) {
    card.querySelector('#primary-btn')?.addEventListener('click', () => {
      if (options.onPrimaryAction) options.onPrimaryAction();
      dismiss();
    });
  }

  container.appendChild(card);
  activeAlerts.set(options.id, card);

  // Auto-dismiss notices after 8 seconds
  if (options.type === 'CANARY_BREAKAGE') {
    setTimeout(() => {
      dismiss();
    }, 8000);
  }
}

export function dismissAmbientAlert(id: string): void {
  const card = activeAlerts.get(id);
  if (card) {
    card.remove();
    activeAlerts.delete(id);
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
