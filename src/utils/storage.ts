const MAX_EVENTS = 500;

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return fallback;
    return JSON.parse(saved) as T;
  } catch {
    console.warn(`Failed to parse localStorage key "${key}", using fallback.`);
    return fallback;
  }
}

export function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save to localStorage key "${key}":`, e);
  }
}

export function removeFromStorage(key: string): void {
  localStorage.removeItem(key);
}

// FIX BUG #12: Prune events to prevent unbounded growth
export function pruneEvents<T>(events: T[], maxCount: number = MAX_EVENTS): T[] {
  if (events.length <= maxCount) return events;
  return events.slice(-maxCount);
}

export function clearAllData(): void {
  localStorage.clear();
}
