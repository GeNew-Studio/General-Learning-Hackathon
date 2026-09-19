const KEY = "vibeblog.journal";

export function createJournal({ lessonId, lessonTitle, level }) {
  const data = {
    lessonId,
    lessonTitle,
    level,
    startedAt: new Date().toISOString(),
    completedAt: null,
    entries: [],
  };

  return {
    data,
    setLevel(next) {
      data.level = next;
    },
    add(entry) {
      const last = data.entries[data.entries.length - 1];
      if (last && last.stepId === entry.stepId) {
        if (entry.choice) last.choice = entry.choice;
        if (entry.patch) last.patch = entry.patch;
        return;
      }
      data.entries.push({
        ...entry,
        at: new Date().toISOString(),
      });
    },
    complete() {
      data.completedAt = new Date().toISOString();
    },
  };
}

export function saveJournal(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function loadJournal() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
