import { Task, Blocker, Skill } from '../types';
import { TASK_TEMPLATES, STUCK_TEMPLATES, SKILL_TASK_TEMPLATES, VAGUE_WORDS, ACTION_VERBS } from '../constants';
import { generateId } from './helpers';

export const getMicroActions = (goal: string, blocker: Blocker, skills: Skill[] = [], adaptationFactor: number = 1): Task[] => {
  const now = Date.now();
  const sortedSkills = [...skills].sort((a, b) => a.lastUsed - b.lastUsed);
  const activeSkills = sortedSkills.slice(0, Math.min(skills.length, 2));

  const tasks: Task[] = [];

  if (activeSkills.length > 0) {
    const selectedSkill = activeSkills[Math.floor(Math.random() * activeSkills.length)];
    const intensityFactor = selectedSkill.intensity === 'low' ? 0.5 : selectedSkill.intensity === 'medium' ? 1 : 1.5;
    const templates = SKILL_TASK_TEMPLATES[selectedSkill.name.toLowerCase()] || SKILL_TASK_TEMPLATES.default;
    const text = templates[Math.floor(Math.random() * templates.length)];

    tasks.push({
      id: generateId(),
      text,
      durationSeconds: Math.floor(180 * adaptationFactor * intensityFactor),
      type: 'planned',
      completed: false,
      timestamp: now,
      skillId: selectedSkill.id
    });
  }

  // FIX BUG #1: Spread to avoid mutating the TASK_TEMPLATES constant
  const templates = [...TASK_TEMPLATES[blocker]];
  const shuffled = templates.sort(() => 0.5 - Math.random());

  tasks.push(...shuffled.slice(0, 2).map((text): Task => ({
    id: generateId(),
    text,
    durationSeconds: Math.floor(180 * adaptationFactor),
    type: 'planned',
    completed: false,
    timestamp: now
  })));

  return tasks;
};

export const validateTaskInput = (text: string, durationMinutes?: number): { valid: boolean; error?: string } => {
  const trimmed = text.trim();
  if (!trimmed) return { valid: false, error: "Task description cannot be empty." };

  const lower = trimmed.toLowerCase();
  const hasActionVerb = ACTION_VERBS.some(v => lower.includes(v));
  if (!hasActionVerb) return { valid: false, error: "Start with a clear action verb (e.g., 'Write', 'Call', 'Fix', 'Read')." };

  const hasVagueWord = VAGUE_WORDS.find(w => lower.includes(w));
  if (hasVagueWord) return { valid: false, error: `The word '${hasVagueWord}' is too vague. Make it a specific, physical action.` };

  if (trimmed.length < 10) return { valid: false, error: "Task is too short. Describe the specific physical action you will take." };
  if (trimmed.length > 60) return { valid: false, error: "Task is too long. Keep it under 60 characters to maintain focus." };

  if (durationMinutes !== undefined) {
    if (durationMinutes < 1) return { valid: false, error: "Duration must be at least 1 minute." };
    if (durationMinutes > 30) return { valid: false, error: "Duration cannot exceed 30 minutes. Break it down." };
  }

  return { valid: true };
};

export const getStuckTask = (): Task => ({
  id: generateId(),
  text: STUCK_TEMPLATES[Math.floor(Math.random() * STUCK_TEMPLATES.length)],
  durationSeconds: 120,
  type: 'stuck',
  completed: false,
  timestamp: Date.now()
});

// FIX BUG #4: Dynamic fallback action instead of hardcoded string
export const getFallbackAction = (originalTask: Task): string => {
  const fallbacks: Record<string, string> = {
    write: "Open your document and type the first word.",
    code: "Open your editor and write one line of code.",
    read: "Open the book or article and read the first paragraph.",
    call: "Open your contacts and find the person's name.",
    send: "Open the app and start composing the message.",
    clean: "Pick up one item and put it in its place.",
    fix: "Identify the smallest part of the problem.",
    build: "Open the project and review the next step.",
    design: "Open your design tool and draw one shape.",
    draw: "Pick up your pen and make one mark."
  };

  const lower = originalTask.text.toLowerCase();
  for (const [verb, fallback] of Object.entries(fallbacks)) {
    if (lower.includes(verb)) return fallback;
  }
  return "Spend 30 seconds preparing your workspace for this task.";
};
