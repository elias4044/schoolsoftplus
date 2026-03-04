/**
 * @file Advanced global toast system inspired by shadcn/ui (with icons, progress, queue, actions)
 * @version 2.0.0
 */

const CSS = `
#toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
  z-index: 9999;
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: #1f1f1f;
  color: #f8f8f8;
  padding: 0.9rem 1rem;
  border-radius: 0.6rem;
  font-family: system-ui, sans-serif;
  font-size: 0.95rem;
  box-shadow: 0 6px 20px rgba(0,0,0,0.25);
  min-width: 280px;
  max-width: 360px;
  opacity: 0;
  transform: translateY(20px) scale(0.95);
  transition: opacity 0.35s ease, transform 0.35s ease;
  border-left: 4px solid transparent;
  position: relative;
}
.toast.show { opacity:1; transform: translateY(0) scale(1);}
.toast:hover { transform: translateY(0) scale(1.02);}
.toast-success { border-left-color: #22c55e; }
.toast-error { border-left-color: #ef4444; }
.toast-warning { border-left-color: #f59e0b; }
.toast-info { border-left-color: #3b82f6; }

.toast-content { flex: 1; }
.toast-title { font-weight: 600; margin-bottom: 0.25rem; }
.toast-desc { font-size: 0.85rem; color: #d1d1d1; line-height: 1.3; }
.toast-close { cursor: pointer; font-size: 1rem; line-height: 1; color: #aaa; transition: color 0.2s; margin-left: 0.25rem;}
.toast-close:hover { color: #fff; }
.toast-icon { width: 20px; height: 20px; flex-shrink: 0; opacity: 0.9; }
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background-color: rgba(255,255,255,0.6);
  border-radius: 2px;
  transition: width linear;
}
.toast-action {
  margin-left: 0.5rem;
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
}
`;

window.addEventListener("load", () => {
  if (!document.querySelector("#toast-container")) {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    const container = document.createElement("div");
    container.id = "toast-container";
    container.setAttribute("aria-live","polite");
    document.body.appendChild(container);
  }
});

const icons = {
  success: `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`,
  error: `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>`,
  warning: `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a1 1 0 00.86 1.5h18.64a1 1 0 00.86-1.5L13.71 3.86a1 1 0 00-1.72 0z" /></svg>`,
  info: `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 20.5A8.5 8.5 0 1112 3.5a8.5 8.5 0 010 17z" /></svg>`
};

const toastQueue = [];
let activeToasts = 0;
const MAX_TOASTS = 4;

window.toast = function(options) {
  if (typeof options === "string") options = { message: options };
  const container = document.querySelector("#toast-container");
  if (!container) return console.error("Toast container not found");

  const { title="", description=options.message||"", type="info", duration=4000, action } = options;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    ${icons[type] || icons.info}
    <div class="toast-content">
      ${title?`<div class="toast-title">${title}</div>`:""}
      <div class="toast-desc">${description}</div>
    </div>
    ${action ? `<button class="toast-action">${action.label}</button>` : ""}
    <div class="toast-close" aria-label="Close">&times;</div>
    <div class="toast-progress"></div>
  `;

  const showToast = () => {
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    activeToasts++;
    
    const closeBtn = toast.querySelector(".toast-close");
    const progressBar = toast.querySelector(".toast-progress");
    let timeout = duration;
    let startTime = Date.now();

    // Animate progress
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const width = Math.max(0, ((timeout - elapsed)/duration)*100);
      progressBar.style.width = width + "%";
      if (width > 0) requestAnimationFrame(animate);
    };
    animate();

    const remove = () => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
        activeToasts--;
        if (toastQueue.length) toastQueue.shift()();
      }, 400);
    };

    closeBtn.addEventListener("click", remove);
    if(action) toast.querySelector(".toast-action").addEventListener("click", ()=>{ action.onClick?.(); remove(); });

    toast.addEventListener("mouseenter", ()=>timeout = duration - (Date.now()-startTime));
    toast.addEventListener("mouseleave", ()=>{ startTime = Date.now(); animate(); });

    setTimeout(remove, duration);
  };

  if (activeToasts >= MAX_TOASTS) toastQueue.push(showToast);
  else showToast();
};

// Extra utility
window.toast.dismissAll = () => {
  document.querySelectorAll("#toast-container .toast").forEach(t => t.remove());
};
