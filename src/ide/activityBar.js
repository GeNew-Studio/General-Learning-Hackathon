export const ACTIVITY = {
  explorer: {
    label: "檔案總管",
    sidebarTitle: "EXPLORER",
  },
  run: {
    label: "執行與偵錯",
    sidebarTitle: "RUN",
  },
  chat: {
    label: "AI 聊天",
    sidebarTitle: "CHAT",
  },
};

export function activityIcon(id) {
  if (id === "explorer") {
    return `<svg class="act-icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 2.5A1.5 1.5 0 0 1 3.5 1h3.086a1.5 1.5 0 0 1 1.06.44L8.5 2.5 9.94 1.44A1.5 1.5 0 0 1 11 1h3.5A1.5 1.5 0 0 1 16 2.5v11A1.5 1.5 0 0 1 14.5 15h-13A1.5 1.5 0 0 1 0 13.5v-11z"/></svg>`;
  }
  if (id === "run") {
    return `<svg class="act-icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4 2.5v11l9-5.5-9-5.5z"/></svg>`;
  }
  return `<svg class="act-icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 2.5A1.5 1.5 0 0 1 3.5 1h9A1.5 1.5 0 0 1 14 2.5v7A1.5 1.5 0 0 1 12.5 11H6l-2.5 2v-2H3.5A1.5 1.5 0 0 1 2 9.5v-7z"/></svg>`;
}
