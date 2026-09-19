let activeMenu = null;

export function dismissContextMenu() {
  activeMenu?.remove();
  activeMenu = null;
}

/**
 * @param {{ x: number, y: number, items: Array<{ id: string, label: string, disabled?: boolean } | { type: "separator" }>, onAction: (id: string) => void }} opts
 */
export function showContextMenu({ x, y, items, onAction }) {
  dismissContextMenu();

  const menu = document.createElement("div");
  menu.className = "ide-context-menu";
  menu.setAttribute("role", "menu");

  for (const item of items) {
    if (item.type === "separator") {
      const sep = document.createElement("div");
      sep.className = "ide-context-menu-sep";
      sep.setAttribute("role", "separator");
      menu.appendChild(sep);
      continue;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ide-context-menu-item";
    btn.setAttribute("role", "menuitem");
    btn.textContent = item.label;
    btn.disabled = !!item.disabled;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      dismissContextMenu();
      if (!btn.disabled) onAction(item.id);
    });
    menu.appendChild(btn);
  }

  document.body.appendChild(menu);
  activeMenu = menu;

  const rect = menu.getBoundingClientRect();
  const pad = 8;
  let left = x;
  let top = y;
  if (left + rect.width > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
  if (top + rect.height > window.innerHeight - pad) top = window.innerHeight - rect.height - pad;
  menu.style.left = `${Math.max(pad, left)}px`;
  menu.style.top = `${Math.max(pad, top)}px`;

  const onDismiss = () => dismissContextMenu();
  const onKey = (e) => {
    if (e.key === "Escape") onDismiss();
  };

  requestAnimationFrame(() => {
    document.addEventListener("click", onDismiss, { once: true });
    document.addEventListener("contextmenu", onDismiss, { once: true });
    document.addEventListener("keydown", onKey, { once: true });
  });
}
