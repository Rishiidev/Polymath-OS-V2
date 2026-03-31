// ── Web Notifications Utility ───────────────────────────────────────
// Bug #14: Wire notification settings to the Web Notifications API

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function sendNotification(title: string, body: string, tag?: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Only notify when app is in background (tab hidden)
  if (!document.hidden) return;

  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: tag || 'polymath',
      silent: false,
    });
  } catch {
    // Silently fail — some environments block constructing Notifications
  }
}

// ── Timer completion notification ──
export function notifyTimerComplete(taskText: string) {
  sendNotification(
    '⏱️ Timer Complete',
    `You finished: ${taskText}. Time to claim your reward.`,
    'timer-complete'
  );
}

// ── Task reminder (call after N seconds of inactivity during a task) ──
let reminderTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleTaskReminder(taskText: string, delayMs: number = 60_000) {
  clearTaskReminder();
  reminderTimer = setTimeout(() => {
    sendNotification(
      '🔥 Stay Focused',
      `You're working on: ${taskText}. Keep pushing.`,
      'task-reminder'
    );
  }, delayMs);
}

export function clearTaskReminder() {
  if (reminderTimer) {
    clearTimeout(reminderTimer);
    reminderTimer = null;
  }
}

// ── Re-engagement (fires when user leaves the app idle) ──
let reEngagementTimer: ReturnType<typeof setTimeout> | null = null;

export function startReEngagement(delayMs: number = 30 * 60 * 1000) {
  stopReEngagement();
  reEngagementTimer = setTimeout(() => {
    sendNotification(
      '👊 Come Back',
      'Your actions are waiting. Even 2 minutes of execution beats zero.',
      're-engagement'
    );
  }, delayMs);
}

export function stopReEngagement() {
  if (reEngagementTimer) {
    clearTimeout(reEngagementTimer);
    reEngagementTimer = null;
  }
}

// ── Aggressive nudge (short interval pings) ──
let nudgeInterval: ReturnType<typeof setInterval> | null = null;

export function startAggressiveNudges(intervalMs: number = 10 * 60 * 1000) {
  stopAggressiveNudges();
  nudgeInterval = setInterval(() => {
    const nudges = [
      "Stop scrolling. Open Polymath. Do one action.",
      "You said you'd change. Prove it. One task.",
      "Discipline is built in the moments you don't feel like it.",
      "2 minutes. That's all it takes. Go.",
    ];
    sendNotification(
      '⚡ Execute',
      nudges[Math.floor(Math.random() * nudges.length)],
      'aggressive-nudge'
    );
  }, intervalMs);
}

export function stopAggressiveNudges() {
  if (nudgeInterval) {
    clearInterval(nudgeInterval);
    nudgeInterval = null;
  }
}
