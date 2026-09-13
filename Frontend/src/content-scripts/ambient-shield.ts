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
export const MAX_ACTIVE_AMBIENT_ALERTS = 3;

function ensureHost(): ShadowRoot {
  if (!hostElement || !document.contains(hostElement)) {
    hostElement = document.createElement('vigil-ambient-shield');
    hostElement.style.all = 'initial';
    hostElement.style.position = 'fixed';
    hostElement.style.bottom = '20px';
    hostElement.style.right = '20px';
    hostElement.style.zIndex = '2147483647';
    hostElement.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    
    // Strict closed Shadow DOM prevents host page scripts from inspecting or tampering with the shield
    shadowRoot = hostElement.attachShadow({ mode: 'closed' });
    
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

  // Enforce bounded alert ceiling: evict oldest alert if queue is full
  if (activeAlerts.size >= MAX_ACTIVE_AMBIENT_ALERTS) {
    const oldestKey = activeAlerts.keys().next().value;
    if (oldestKey) {
      dismissAmbientAlert(oldestKey);
    }
  }

  const shadow = ensureHost();
  const container = shadow.querySelector('.vigil-container')!;

  const card = document.createElement('div');
  const isWarning = options.type === 'CREDENTIAL_WARNING' || options.type === 'DARK_PATTERN';
  const isNotice = options.type === 'CANARY_BREAKAGE';
  card.className = `vigil-card ${isWarning ? 'warning' : isNotice ? 'notice' : ''}`;

  const iconText = options.type === 'CRITICAL_SECURITY' ? '🚨' : isWarning ? '⚠️' : '🛡️';

  // 1. Header
  const header = document.createElement('div');
  header.className = 'vigil-header';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'vigil-title';

  const iconSpan = document.createElement('span');
  iconSpan.textContent = iconText;

  const titleSpan = document.createElement('span');
  titleSpan.textContent = options.title;

  titleDiv.appendChild(iconSpan);
  titleDiv.appendChild(titleSpan);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'vigil-close';
  closeBtn.title = 'Dismiss';
  closeBtn.textContent = '✕';

  header.appendChild(titleDiv);
  header.appendChild(closeBtn);
  card.appendChild(header);

  // 2. Body
  const bodyDiv = document.createElement('div');
  bodyDiv.className = 'vigil-body';
  bodyDiv.textContent = options.message;
  card.appendChild(bodyDiv);

  // 3. Details (if any)
  if (options.details) {
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'vigil-details';
    detailsDiv.textContent = options.details;
    card.appendChild(detailsDiv);
  }

  // 4. Actions
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'vigil-actions';

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'vigil-btn vigil-btn-secondary';
  dismissBtn.id = 'dismiss-btn';
  dismissBtn.textContent = 'Dismiss';
  actionsDiv.appendChild(dismissBtn);

  let primaryBtn: HTMLButtonElement | null = null;
  if (options.primaryActionLabel) {
    primaryBtn = document.createElement('button');
    primaryBtn.className = 'vigil-btn vigil-btn-primary';
    primaryBtn.id = 'primary-btn';
    primaryBtn.textContent = options.primaryActionLabel;
    actionsDiv.appendChild(primaryBtn);
  }
  card.appendChild(actionsDiv);

  // Attach handlers
  const dismiss = () => {
    card.remove();
    activeAlerts.delete(options.id);
    if (options.onDismiss) options.onDismiss();
  };

  closeBtn.addEventListener('click', dismiss);
  dismissBtn.addEventListener('click', dismiss);

  if (primaryBtn) {
    primaryBtn.addEventListener('click', () => {
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

/**
 * Completely clears all ambient alerts and resets the host element.
 * Call on tab navigation to prevent stale alerts across origin/navigation boundaries.
 */
export function clearAmbientAlerts(): void {
  for (const [, card] of activeAlerts.entries()) {
    try {
      card.remove();
    } catch {}
  }
  activeAlerts.clear();
  if (hostElement && hostElement.parentNode) {
    try {
      hostElement.remove();
    } catch {}
    hostElement = null;
    shadowRoot = null;
  }
}
