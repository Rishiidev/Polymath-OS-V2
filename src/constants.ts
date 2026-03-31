
import { Blocker } from './types';

export const TASK_TEMPLATES: Record<Blocker, string[]> = {
  procrastination: [
    "Open your workspace and sit down for 60 seconds.",
    "Write exactly one sentence about your next step.",
    "Set a timer for 2 minutes and just start.",
    "Clear your desk of exactly three items.",
    "Open the document or tool you need right now."
  ],
  overthinking: [
    "Write down the 'worst case' in 5 words.",
    "Pick the first option that came to mind and commit for 3 minutes.",
    "Close all tabs except the one you need.",
    "Explain your goal out loud in 15 seconds.",
    "Do 10 jumping jacks to break the thought loop."
  ],
  inconsistency: [
    "Perform your goal-related action for just 120 seconds.",
    "Mark your progress on a physical piece of paper.",
    "Put your phone in another room for 5 minutes.",
    "Review your main goal and say it out loud.",
    "Commit to the smallest possible version of your task."
  ]
};

export const STUCK_TEMPLATES = [
  "Breathe deeply for 30 seconds.",
  "Stand up and stretch for 1 minute.",
  "Drink a glass of water immediately.",
  "Write one word related to your goal.",
  "Close your eyes and visualize the first step for 30 seconds."
];

export const INSIGHTS = [
  "Action is the only cure for fear.",
  "Momentum is built, not found.",
  "Thinking is the enemy of execution.",
  "Small wins create giant leaps.",
  "Discipline is choosing between what you want now and what you want most."
];

export const SKILL_TASK_TEMPLATES: Record<string, string[]> = {
  coding: ["Write 5 lines of code.", "Refactor one function.", "Read 2 pages of documentation."],
  writing: ["Write 50 words.", "Outline one chapter.", "Edit one paragraph."],
  fitness: ["Do 10 pushups.", "Stretch for 2 minutes.", "Plan your next workout."],
  default: ["Spend 5 minutes on this skill.", "Research one key concept.", "Practice one basic move."]
};

export const VAGUE_WORDS = ["better", "more", "improve", "learn", "study", "try", "think", "understand"];
export const ACTION_VERBS = ["write", "code", "draw", "read", "build", "design", "call", "send", "clean", "fix"];

export const FOCUS_DURATIONS = [15, 25, 45];
