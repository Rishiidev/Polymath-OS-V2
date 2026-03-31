import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { User, Task, ActionEvent, Settings, FocusSession, ViewType, FeedbackData, UserTraits } from '../types';
import { generateId } from '../utils/helpers';
import { loadFromStorage, saveToStorage, removeFromStorage, pruneEvents } from '../utils/storage';
import { getMicroActions } from '../utils/taskEngine';
import { requestNotificationPermission, startReEngagement, stopReEngagement, startAggressiveNudges, stopAggressiveNudges } from '../utils/notifications';
import { arrayMove } from '@dnd-kit/sortable';

// --- State ---
export interface AppState {
  user: User | null;
  tasks: Task[];
  events: ActionEvent[];
  settings: Settings;
  currentTask: Task | null;
  focusSession: FocusSession | null;
  view: ViewType;
  feedback: FeedbackData | null;
  showSettings: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  focusDuration: 25,
  strictMode: false,
  earlyCompletion: 'ask',
  stuckMode: false,
  taskReminder: true,
  timerCompletion: true,
  reEngagement: true,
  aggressiveNudges: false,
  hardcoreMode: false,
  theme: 'dark',
  accentColor: 'green',
};

function loadInitialState(): AppState {
  const savedUser = loadFromStorage<any>('polymath_user', null);
  const user = savedUser ? {
    ...savedUser,
    skills: savedUser.skills || [],
    adaptationFactor: savedUser.adaptationFactor || 1
  } as User : null;

  return {
    user,
    tasks: loadFromStorage<Task[]>('polymath_tasks', []),
    events: loadFromStorage<ActionEvent[]>('polymath_events', []),
    settings: { ...DEFAULT_SETTINGS, ...loadFromStorage<Partial<Settings>>('polymath_settings', {}) },
    currentTask: loadFromStorage<Task | null>('polymath_current_task', null),
    focusSession: null,
    view: 'home',
    feedback: null,
    showSettings: false,
  };
}

// --- Actions ---
export type AppAction =
  | { type: 'SET_USER'; user: User }
  | { type: 'UPDATE_USER'; updates: Partial<User> }
  | { type: 'SET_TASKS'; tasks: Task[] }
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'COMPLETE_TASK'; task: Task }
  | { type: 'REORDER_TASKS'; activeId: string; overId: string | null }
  | { type: 'START_TASK'; task: Task }
  | { type: 'ABANDON_TASK' }
  | { type: 'LOG_EVENT'; eventType: ActionEvent['type']; task: Task; duration?: number; metadata?: any }
  | { type: 'SET_SETTINGS'; settings: Settings }
  | { type: 'SET_CURRENT_TASK'; task: Task | null }
  | { type: 'SET_VIEW'; view: ViewType }
  | { type: 'SET_FOCUS_SESSION'; session: FocusSession | null }
  | { type: 'COMPLETE_FOCUS'; task: Task }
  | { type: 'ABORT_FOCUS'; task: Task }
  | { type: 'SHOW_FEEDBACK'; feedback: FeedbackData }
  | { type: 'CLEAR_FEEDBACK' }
  | { type: 'SET_SHOW_SETTINGS'; show: boolean }
  | { type: 'RESET_ALL' };

// --- Helpers ---
function createEvent(eventType: ActionEvent['type'], task: Task, duration?: number, metadata?: any): ActionEvent {
  return {
    id: generateId(),
    type: eventType,
    taskType: task.type,
    taskId: task.id,
    timestamp: Date.now(),
    duration,
    metadata,
  };
}

function adjustAdaptation(user: User, eventType: ActionEvent['type']): User {
  if (eventType === 'skipped' || eventType === 'exit_attempt' || eventType === 'focus_abort') {
    return { ...user, adaptationFactor: Math.max(0.5, user.adaptationFactor - 0.1) };
  }
  if (eventType === 'completed' || eventType === 'focus_complete') {
    return { ...user, adaptationFactor: Math.min(2.0, user.adaptationFactor + 0.05) };
  }
  return user;
}

// --- Reducer ---
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.user };

    case 'UPDATE_USER':
      return state.user ? { ...state, user: { ...state.user, ...action.updates } } : state;

    case 'SET_TASKS':
      return { ...state, tasks: action.tasks };

    case 'ADD_TASK':
      return { ...state, tasks: [action.task, ...state.tasks] };

    case 'START_TASK': {
      const event = createEvent('started', action.task);
      return {
        ...state,
        currentTask: action.task,
        events: pruneEvents([...state.events, event]),
      };
    }

    case 'COMPLETE_TASK': {
      const { task } = action;
      const newTasks = state.tasks.map(t => t.id === task.id ? { ...t, completed: true } : t);
      const event = createEvent('completed', task);
      const newEvents = pruneEvents([...state.events, event]);

      if (!state.user) {
        return { ...state, tasks: newTasks, events: newEvents, currentTask: null };
      }

      let newUser = adjustAdaptation(state.user, 'completed');

      // Update skill lastUsed
      if (task.skillId) {
        newUser = {
          ...newUser,
          skills: newUser.skills.map(s => s.id === task.skillId ? { ...s, lastUsed: Date.now() } : s)
        };
      }

      // Identity Engine: determine trait award
      let trait: keyof UserTraits = 'discipline';
      const value = 1;
      let feedbackText = "You honored your commitment and executed the planned action. +1 Discipline.";

      if (task.type === 'stuck' || task.type === 'first') {
        trait = 'courage';
        feedbackText = "You faced resistance and acted anyway. +1 Courage.";
      }

      // Check consistency (all daily tasks completed?)
      const dailyTasks = newTasks.filter(t => t.type === 'planned' || t.type === 'user');
      const completedDaily = dailyTasks.filter(t => t.completed);
      if (completedDaily.length === dailyTasks.length && dailyTasks.length > 0
          && (task.type === 'planned' || task.type === 'user')) {
        // FIX BUG #2: Only award consistency once (replaces discipline/courage, no double award)
        trait = 'consistency';
        feedbackText = "You completed all daily actions. +1 Consistency.";
      }

      newUser = {
        ...newUser,
        traits: { ...newUser.traits, [trait]: newUser.traits[trait] + value }
      };

      return {
        ...state,
        tasks: newTasks,
        events: newEvents,
        user: newUser,
        currentTask: null,
        feedback: { trait, value, text: feedbackText },
      };
    }

    case 'REORDER_TASKS': {
      // FIX BUG #3: Null check on overId
      const { activeId, overId } = action;
      if (!overId || activeId === overId) return state;
      const oldIndex = state.tasks.findIndex(t => t.id === activeId);
      const newIndex = state.tasks.findIndex(t => t.id === overId);
      if (oldIndex === -1 || newIndex === -1) return state;
      return { ...state, tasks: arrayMove(state.tasks, oldIndex, newIndex) };
    }

    case 'ABANDON_TASK': {
      if (!state.currentTask) return state;
      const event = createEvent('exit_attempt', state.currentTask);
      let newUser = state.user;
      if (newUser) newUser = adjustAdaptation(newUser, 'exit_attempt');
      return {
        ...state,
        currentTask: null,
        events: pruneEvents([...state.events, event]),
        user: newUser,
      };
    }

    case 'LOG_EVENT': {
      const event = createEvent(action.eventType, action.task, action.duration, action.metadata);
      let newUser = state.user;
      if (newUser) newUser = adjustAdaptation(newUser, action.eventType);
      return {
        ...state,
        events: pruneEvents([...state.events, event]),
        user: newUser,
      };
    }

    case 'SET_SETTINGS':
      return { ...state, settings: action.settings };

    case 'SET_CURRENT_TASK':
      return { ...state, currentTask: action.task };

    case 'SET_VIEW':
      return { ...state, view: action.view };

    case 'SET_FOCUS_SESSION':
      return { ...state, focusSession: action.session };

    case 'COMPLETE_FOCUS': {
      if (!state.user) return state;
      const event = createEvent('focus_complete', action.task);
      const newUser = {
        ...adjustAdaptation(state.user, 'focus_complete'),
        traits: { ...state.user.traits, discipline: state.user.traits.discipline + 3 }
      };
      return {
        ...state,
        user: newUser,
        events: pruneEvents([...state.events, event]),
        focusSession: null,
        view: 'home' as ViewType,
        feedback: { trait: 'discipline', value: 3, text: "Deep work session completed. Exceptional focus. +3 Discipline." },
      };
    }

    case 'ABORT_FOCUS': {
      const event = createEvent('focus_abort', action.task);
      let newUser = state.user;
      if (newUser) newUser = adjustAdaptation(newUser, 'focus_abort');
      return {
        ...state,
        events: pruneEvents([...state.events, event]),
        user: newUser,
        focusSession: null,
        view: 'home' as ViewType,
      };
    }

    case 'SHOW_FEEDBACK':
      return { ...state, feedback: action.feedback };

    case 'CLEAR_FEEDBACK':
      return { ...state, feedback: null };

    case 'SET_SHOW_SETTINGS':
      return { ...state, showSettings: action.show };

    case 'RESET_ALL':
      return loadInitialState();

    default:
      return state;
  }
}

// --- Context ---
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, loadInitialState);

  // --- Persistence ---
  useEffect(() => {
    if (state.user) saveToStorage('polymath_user', state.user);
  }, [state.user]);

  useEffect(() => {
    saveToStorage('polymath_tasks', state.tasks);
  }, [state.tasks]);

  useEffect(() => {
    saveToStorage('polymath_events', state.events);
  }, [state.events]);

  useEffect(() => {
    saveToStorage('polymath_settings', state.settings);

    // FIX BUG #7/#8: Actually apply theme + accent to CSS variables
    const root = document.documentElement;
    root.className = state.settings.theme;

    const accentConfigs: Record<string, { accent: string; hover: string; text: string; glow: string }> = {
      green:  { accent: '#D4FF00', hover: '#E5FF4D', text: '#000000', glow: 'rgba(212,255,0,0.4)' },
      blue:   { accent: '#3B82F6', hover: '#60A5FA', text: '#ffffff', glow: 'rgba(59,130,246,0.4)' },
      orange: { accent: '#F97316', hover: '#FB923C', text: '#000000', glow: 'rgba(249,115,22,0.4)' },
      purple: { accent: '#A855F7', hover: '#C084FC', text: '#ffffff', glow: 'rgba(168,85,247,0.4)' },
    };
    const cfg = accentConfigs[state.settings.accentColor] || accentConfigs.green;
    root.style.setProperty('--accent', cfg.accent);
    root.style.setProperty('--accent-hover', cfg.hover);
    root.style.setProperty('--accent-text', cfg.text);
    root.style.setProperty('--accent-glow', cfg.glow);
  }, [state.settings]);

  useEffect(() => {
    if (state.currentTask) {
      saveToStorage('polymath_current_task', state.currentTask);
    } else {
      removeFromStorage('polymath_current_task');
    }
  }, [state.currentTask]);

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (state.feedback) {
      const timer = setTimeout(() => dispatch({ type: 'CLEAR_FEEDBACK' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [state.feedback]);

  // FIX BUG #5: Daily task rotation
  const hasCheckedRotation = useRef(false);
  useEffect(() => {
    if (!state.user || hasCheckedRotation.current) return;
    hasCheckedRotation.current = true;

    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    if (state.user.lastTaskDate !== today) {
      // New day! Keep unfinished user-created tasks, regenerate planned
      const keptTasks = state.tasks.filter(t => t.type === 'user' && !t.completed);
      const newPlanned = getMicroActions(
        state.user.goal, state.user.blocker, state.user.skills, state.user.adaptationFactor
      );
      dispatch({ type: 'SET_TASKS', tasks: [...newPlanned, ...keptTasks] });
      dispatch({ type: 'UPDATE_USER', updates: { lastTaskDate: today } });
    }
  }, [state.user]);

  // FIX BUG #14: Notification wiring
  useEffect(() => {
    const { taskReminder, reEngagement, aggressiveNudges } = state.settings;

    // Request permission if any notification toggle is on
    if (taskReminder || reEngagement || aggressiveNudges) {
      requestNotificationPermission();
    }

    // Re-engagement: notify after 30 min idle
    if (reEngagement) {
      startReEngagement(30 * 60 * 1000);
    } else {
      stopReEngagement();
    }

    // Aggressive nudges: notify every 10 min
    if (aggressiveNudges) {
      startAggressiveNudges(10 * 60 * 1000);
    } else {
      stopAggressiveNudges();
    }

    return () => {
      stopReEngagement();
      stopAggressiveNudges();
    };
  }, [state.settings.reEngagement, state.settings.aggressiveNudges, state.settings.taskReminder]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
