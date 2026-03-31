
export type Blocker = 'procrastination' | 'overthinking' | 'inconsistency';

export interface UserTraits {
  discipline: number;
  courage: number;
  consistency: number;
}

export interface Skill {
  id: string;
  name: string;
  intensity: 'low' | 'medium' | 'high';
  lastUsed: number;
  goalHint: string;
}

export interface User {
  name: string;
  goal: string;
  blocker: Blocker;
  traits: UserTraits;
  onboarded: boolean;
  skills: Skill[];
  adaptationFactor: number; // 0.5 to 2.0, affects task duration/complexity
}

export interface Settings {
  focusDuration: 15 | 25 | 45;
  strictMode: boolean;
  earlyCompletion: 'ask' | 'always' | 'lock';
  stuckMode: boolean;
  taskReminder: boolean;
  timerCompletion: boolean;
  reEngagement: boolean;
  aggressiveNudges: boolean;
  name: string;
  skills: string[];
  hardcoreMode: boolean;
  theme: 'dark' | 'light';
  accentColor: 'green' | 'blue' | 'orange' | 'purple';
  goal: string;
  blocker: string;
}

export interface Task {
  id: string;
  text: string;
  durationSeconds: number;
  type: 'planned' | 'stuck' | 'first' | 'user';
  completed: boolean;
  timestamp: number;
  skillId?: string;
  tags?: string[];
}

export type FocusExitReason = string;

export interface FocusSession {
  id: string;
  outcome: string;
  durationMinutes: number;
  startTime: number;
  completed: boolean;
  exitReason?: FocusExitReason;
  skillId?: string;
}

export interface ActionEvent {
  id: string;
  type: 'started' | 'completed' | 'skipped' | 'exit_attempt' | 'focus_start' | 'focus_complete' | 'focus_abort';
  taskType: Task['type'];
  taskId: string;
  timestamp: number;
  duration?: number;
  metadata?: any;
}
