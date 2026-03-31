/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  closestCenter 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Zap, 
  Target, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Timer, 
  X, 
  ChevronRight,
  Trophy,
  Flame,
  Shield,
  ChevronLeft,
  Info,
  Plus,
  Trash2,
  Brain,
  Clock,
  Lock,
  History,
  UserCircle
} from 'lucide-react';
import { User, Task, ActionEvent, Blocker, UserTraits, Skill, FocusSession, Settings } from './types';
import { TASK_TEMPLATES, STUCK_TEMPLATES, INSIGHTS, SKILL_TASK_TEMPLATES, VAGUE_WORDS, ACTION_VERBS, FOCUS_DURATIONS } from './constants';

// --- Utils ---
const generateId = () => Math.random().toString(36).substring(2, 9);

const calculateLevel = (traits: UserTraits) => {
  const total = traits.discipline + traits.courage + traits.consistency;
  return Math.floor(total / 5) + 1;
};

const getMicroActions = (goal: string, blocker: Blocker, skills: Skill[] = [], adaptationFactor: number = 1): Task[] => {
  // Skill Rotation Logic: Max 1-2 skills per day, prioritize neglected skills
  const now = Date.now();
  const sortedSkills = [...skills].sort((a, b) => a.lastUsed - b.lastUsed);
  const activeSkills = sortedSkills.slice(0, Math.min(skills.length, 2));

  const tasks: Task[] = [];
  
  // 1 task from selected skill(s)
  if (activeSkills.length > 0) {
    const selectedSkill = activeSkills[Math.floor(Math.random() * activeSkills.length)];
    // Intensity factor: Low=0.5, Medium=1, High=1.5
    const intensityFactor = selectedSkill.intensity === 'low' ? 0.5 : selectedSkill.intensity === 'medium' ? 1 : 1.5;
    
    // Generate task based on skill
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

  // 2 system tasks
  const templates = TASK_TEMPLATES[blocker];
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

const validateTaskInput = (text: string, durationMinutes?: number): { valid: boolean; error?: string } => {
  const trimmed = text.trim();
  if (!trimmed) return { valid: false, error: "Task description cannot be empty." };

  const lower = trimmed.toLowerCase();
  
  // Rule: Specific & Actionable (must contain an action verb)
  const hasActionVerb = ACTION_VERBS.some(v => lower.includes(v));
  if (!hasActionVerb) return { valid: false, error: "Start with a clear action verb (e.g., 'Write', 'Call', 'Fix', 'Read')." };
  
  // Rule: No vague words
  const hasVagueWord = VAGUE_WORDS.find(w => lower.includes(w));
  if (hasVagueWord) return { valid: false, error: `The word '${hasVagueWord}' is too vague. Make it a specific, physical action (e.g., 'Write 1 paragraph' instead of 'Improve writing').` };
  
  // Rule: Length
  if (trimmed.length < 10) return { valid: false, error: "Task is too short. Describe the specific physical action you will take." };
  if (trimmed.length > 60) return { valid: false, error: "Task is too long. Keep it under 60 characters to maintain focus." };
  
  if (durationMinutes !== undefined) {
    if (durationMinutes < 1) return { valid: false, error: "Duration must be at least 1 minute." };
    if (durationMinutes > 30) return { valid: false, error: "Duration cannot exceed 30 minutes. Break it down into smaller, more actionable tasks." };
  }

  return { valid: true };
};

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  className?: string;
  disabled?: boolean;
}) => {
  const variants = {
    primary: 'bg-[#D4FF00] text-black hover:bg-[#E5FF4D]',
    secondary: 'bg-[#1A1A1A] text-white hover:bg-[#2A2A2A]',
    outline: 'border border-[#333] text-white hover:bg-[#1A1A1A]',
    danger: 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-4 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string, key?: string | number }) => (
  <div className={`bg-[#121212] border border-[#1A1A1A] rounded-[32px] p-6 ${className}`}>
    {children}
  </div>
);

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  confirmText, 
  onConfirm,
  cancelText = "Cancel",
  variant = "primary",
  children
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  description: string; 
  confirmText: string; 
  onConfirm: () => void;
  cancelText?: string;
  variant?: 'primary' | 'danger';
  children?: React.ReactNode;
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 text-white font-sans">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-[#121212] border border-[#1A1A1A] rounded-[40px] p-8 w-full max-w-sm shadow-2xl"
          >
            <h3 className="text-2xl font-black tracking-tighter mb-2">{title}</h3>
            <p className="text-gray-400 mb-8 leading-relaxed">{description}</p>
            {children}
            <div className="flex flex-col gap-3">
              <Button onClick={onConfirm} variant={variant === 'danger' ? 'danger' : 'primary'}>
                {confirmText}
              </Button>
              <Button onClick={onClose} variant="outline">
                {cancelText}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  // --- State ---
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('polymath_user');
    if (saved) {
      const parsedUser = JSON.parse(saved);
      return {
        ...parsedUser,
        skills: parsedUser.skills || [],
        adaptationFactor: parsedUser.adaptationFactor || 1
      };
    }
    return null;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('polymath_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [view, setView] = useState<'home' | 'traits' | 'skills' | 'focus_setup' | 'focus_session' | 'history'>('home');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('polymath_settings');
    return saved ? JSON.parse(saved) : {
      focusDuration: 25,
      strictMode: false,
      earlyCompletion: 'ask',
      stuckMode: false,
      taskReminder: true,
      timerCompletion: true,
      reEngagement: true,
      aggressiveNudges: false,
      name: '',
      skills: [],
      hardcoreMode: false,
      theme: 'dark',
      accentColor: 'green',
      goal: '',
      blocker: 'procrastination'
    };
  });
  const [events, setEvents] = useState<ActionEvent[]>(() => {
    const saved = localStorage.getItem('polymath_events');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentTask, setCurrentTask] = useState<Task | null>(() => {
    const saved = localStorage.getItem('polymath_current_task');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('polymath_settings', JSON.stringify(settings));
    document.documentElement.className = settings.theme;
    document.documentElement.style.setProperty('--accent-color', settings.accentColor === 'green' ? '#D4FF00' : settings.accentColor === 'blue' ? '#3B82F6' : settings.accentColor === 'orange' ? '#F97316' : '#A855F7');
  }, [settings]);

  useEffect(() => {
    if (currentTask) {
      localStorage.setItem('polymath_current_task', JSON.stringify(currentTask));
    } else {
      localStorage.removeItem('polymath_current_task');
    }
  }, [currentTask]);

  const [focusSession, setFocusSession] = useState<FocusSession | null>(null);
  const [showFeedback, setShowFeedback] = useState<{ trait: keyof UserTraits, value: number, text: string } | null>(null);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<Partial<User>>({
    traits: { discipline: 0, courage: 0, consistency: 0 },
    skills: [],
    adaptationFactor: 1
  });

  useEffect(() => {
    const savedTask = localStorage.getItem('polymath_current_task');
    if (savedTask) {
      const task = JSON.parse(savedTask);
      const startTime = localStorage.getItem(`task_start_${task.id}`);
      if (startTime) {
        const elapsed = Math.floor((Date.now() - parseInt(startTime, 10)) / 1000);
        if (elapsed < task.durationSeconds) {
          setSoftAccountability(task);
        }
      }
    }
  }, []);

  // Modals
  const [customTaskModal, setCustomTaskModal] = useState(false);
  const [abandonModal, setAbandonModal] = useState(false);
  const [completeModal, setCompleteModal] = useState<Task | null>(null);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [exitReasonModal, setExitReasonModal] = useState(false);
  const [softAccountability, setSoftAccountability] = useState<Task | null>(null);

  const insight = useMemo(() => INSIGHTS[Math.floor(Date.now() / 86400000) % INSIGHTS.length], []);

  // --- Persistence ---
  useEffect(() => {
    if (user) localStorage.setItem('polymath_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('polymath_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('polymath_events', JSON.stringify(events));
  }, [events]);

  // --- Handlers ---
  const logEvent = (type: ActionEvent['type'], task: Task, duration?: number, metadata?: any) => {
    const event: ActionEvent = {
      id: generateId(),
      type,
      taskType: task.type,
      taskId: task.id,
      timestamp: Date.now(),
      duration,
      metadata
    };
    setEvents(prev => [...prev, event]);

    // Adaptation Logic
    if (type === 'skipped' || type === 'exit_attempt' || type === 'focus_abort') {
      setUser(prev => prev ? { ...prev, adaptationFactor: Math.max(0.5, prev.adaptationFactor - 0.1) } : null);
    }
    if (type === 'completed' || type === 'focus_complete') {
      setUser(prev => prev ? { ...prev, adaptationFactor: Math.min(2.0, prev.adaptationFactor + 0.05) } : null);
    }
  };

  const startTask = (task: Task) => {
    setCurrentTask(task);
    logEvent('started', task);
  };

  const completeTask = (task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: true } : t));
    setCurrentTask(null);
    logEvent('completed', task);

    // Update skill lastUsed if task had a skillId
    if (task.skillId) {
      setUser(prev => prev ? {
        ...prev,
        skills: prev.skills.map(s => s.id === task.skillId ? { ...s, lastUsed: Date.now() } : s)
      } : null);
    }

    // Identity Engine Logic
    let trait: keyof UserTraits = 'discipline';
    let value = 1;
    let feedbackText = "You honored your commitment and executed the planned action. +1 Discipline.";

    if (task.type === 'stuck' || task.type === 'first') {
      trait = 'courage';
      feedbackText = "You faced resistance and acted anyway. +1 Courage.";
    }
    
    // Check consistency (all daily tasks)
    const dailyTasks = tasks.filter(t => t.type === 'planned' || t.type === 'user');
    const completedDaily = dailyTasks.filter(t => t.completed || t.id === task.id);
    if (completedDaily.length === dailyTasks.length && dailyTasks.length > 0 && (task.type === 'planned' || task.type === 'user')) {
      // Consistency bonus
      trait = 'consistency';
      feedbackText = "You completed all daily actions. +1 Consistency.";
      setUser(prev => prev ? {
        ...prev,
        traits: { ...prev.traits, consistency: prev.traits.consistency + 1 }
      } : null);
    }

    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        traits: { ...prev.traits, [trait]: prev.traits[trait] + value }
      };
    });

    setShowFeedback({ trait, value, text: feedbackText });
    setTimeout(() => setShowFeedback(null), 4000);
  };

  const handleStuck = () => {
    const stuckTask: Task = {
      id: generateId(),
      text: STUCK_TEMPLATES[Math.floor(Math.random() * STUCK_TEMPLATES.length)],
      durationSeconds: 120, // 2 minutes
      type: 'stuck',
      completed: false,
      timestamp: Date.now()
    };
    startTask(stuckTask);
  };

  const handleOnboardingSubmit = () => {
    const newUser: User = {
      name: onboardingData.name || 'User',
      goal: onboardingData.goal || '',
      blocker: onboardingData.blocker || 'procrastination',
      traits: { discipline: 0, courage: 0, consistency: 0 },
      skills: [],
      adaptationFactor: 1,
      onboarded: true
    };
    setUser(newUser);
    
    // Generate initial tasks
    const initialTasks = getMicroActions(newUser.goal, newUser.blocker, newUser.skills, newUser.adaptationFactor);
    setTasks(initialTasks);

    // Trigger FIRST ACTION
    const firstAction: Task = {
      id: 'first-action',
      text: "Commit to your goal: Write down the very first physical step you need to take.",
      durationSeconds: 120,
      type: 'first',
      completed: false,
      timestamp: Date.now()
    };
    startTask(firstAction);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex(t => t.id === active.id);
        const newIndex = items.findIndex(t => t.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // --- Views ---

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col font-sans">
        <AnimatePresence mode="wait">
          {onboardingStep === 0 && (
            <motion.div 
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col justify-center gap-8"
            >
              <div className="space-y-4">
                <div className="w-16 h-16 bg-[#D4FF00] rounded-2xl flex items-center justify-center mb-6">
                  <Zap className="text-black w-8 h-8" />
                </div>
                <h1 className="text-5xl font-black tracking-tighter leading-tight">
                  POLYMATH OS<br/>
                  <span className="text-[#D4FF00]">ACTION ENGINE</span>
                </h1>
                <p className="text-gray-400 text-lg max-w-xs">
                  A system that forces execution when you feel stuck.
                </p>
              </div>
              <Button onClick={() => setOnboardingStep(1)}>
                Initialize System <ArrowRight size={20} />
              </Button>
            </motion.div>
          )}

          {onboardingStep === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-center gap-8"
            >
              <div className="space-y-2">
                <span className="text-[#D4FF00] font-mono text-sm uppercase tracking-widest">01 / Identity</span>
                <h2 className="text-3xl font-bold">What is your name?</h2>
              </div>
              <input 
                autoFocus
                type="text"
                placeholder="Name"
                className="bg-transparent border-b-2 border-[#333] py-4 text-3xl focus:border-[#D4FF00] outline-none transition-colors"
                onChange={(e) => setOnboardingData(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && setOnboardingStep(2)}
              />
              <Button onClick={() => setOnboardingStep(2)} disabled={!onboardingData.name}>
                Next <ArrowRight size={20} />
              </Button>
            </motion.div>
          )}

          {onboardingStep === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-center gap-8"
            >
              <div className="space-y-2">
                <span className="text-[#D4FF00] font-mono text-sm uppercase tracking-widest">02 / Purpose</span>
                <h2 className="text-3xl font-bold">What is your main goal?</h2>
              </div>
              <textarea 
                autoFocus
                placeholder="e.g. Build a SaaS, Run a Marathon..."
                className="bg-transparent border-b-2 border-[#333] py-4 text-2xl focus:border-[#D4FF00] outline-none transition-colors resize-none h-32"
                onChange={(e) => setOnboardingData(prev => ({ ...prev, goal: e.target.value }))}
              />
              <Button onClick={() => setOnboardingStep(3)} disabled={!onboardingData.goal}>
                Next <ArrowRight size={20} />
              </Button>
            </motion.div>
          )}

          {onboardingStep === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-center gap-8"
            >
              <div className="space-y-2">
                <span className="text-[#D4FF00] font-mono text-sm uppercase tracking-widest">03 / Resistance</span>
                <h2 className="text-3xl font-bold">What is your biggest blocker?</h2>
              </div>
              <div className="grid gap-4">
                {(['procrastination', 'overthinking', 'inconsistency'] as Blocker[]).map(b => (
                  <button
                    key={b}
                    onClick={() => setOnboardingData(prev => ({ ...prev, blocker: b }))}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${
                      onboardingData.blocker === b 
                        ? 'border-[#D4FF00] bg-[#D4FF00]/5 text-white' 
                        : 'border-[#1A1A1A] text-gray-500'
                    }`}
                  >
                    <span className="capitalize font-bold text-xl">{b}</span>
                  </button>
                ))}
              </div>
              <Button onClick={handleOnboardingSubmit} disabled={!onboardingData.blocker}>
                Activate Engine <ArrowRight size={20} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (currentTask) {
    return (
      <>
        <ActionScreen 
          task={currentTask} 
          onComplete={(t) => setCompleteModal(t)} 
          onExit={() => setAbandonModal(true)} 
        />
        
        <Modal 
          isOpen={abandonModal}
          onClose={() => setAbandonModal(false)}
          title="ABANDON ACTION?"
          description="Momentum is fragile. If you stop now, the resistance wins. Are you sure?"
          confirmText="Abandon Action"
          variant="danger"
          onConfirm={() => {
            logEvent('exit_attempt', currentTask);
            setCurrentTask(null);
            setAbandonModal(false);
          }}
        />

        <Modal 
          isOpen={!!completeModal}
          onClose={() => setCompleteModal(null)}
          title="CONFIRM COMPLETION"
          description="Confirm that you have physically executed this action. No shortcuts."
          confirmText="Confirm Completion"
          onConfirm={() => {
            if (completeModal) completeTask(completeModal);
            setCompleteModal(null);
          }}
        />

        <Modal 
          isOpen={!!softAccountability}
          onClose={() => {
            setSoftAccountability(null);
            setCurrentTask(null);
            localStorage.removeItem('polymath_current_task');
          }}
          title="You left midway. Continue?"
          description="Momentum is fragile. If you stop now, the resistance wins."
          confirmText="Resume"
          onConfirm={() => {
            setSoftAccountability(null);
          }}
          variant="primary"
        >
          <Button 
            variant="outline" 
            className="w-full mt-4" 
            onClick={() => {
              setSoftAccountability(null);
              setCurrentTask(null);
              localStorage.removeItem('polymath_current_task');
              localStorage.removeItem(`task_start_${softAccountability?.id}`);
            }}
          >
            Restart
          </Button>
        </Modal>
      </>
    );
  }

  if (view === 'traits') {
    return <IdentityEngineScreen user={user} onBack={() => setView('home')} />;
  }

  if (view === 'history') {
    return <HistoryScreen events={events} tasks={tasks} onBack={() => setView('home')} />;
  }

  if (view === 'skills') {
    return (
      <SkillsScreen 
        user={user} 
        onBack={() => setView('home')} 
        onUpdateUser={(updated) => setUser(updated)} 
      />
    );
  }

  if (view === 'focus_setup') {
    return (
      <FocusSetupScreen 
        onBack={() => setView('home')} 
        skills={user?.skills || []}
        onStart={(session) => {
          setFocusSession(session);
          setView('focus_session');
        }}
      />
    );
  }

  if (view === 'focus_session' && focusSession) {
    return (
      <FocusSessionScreen 
        session={focusSession}
        settings={settings}
        skillName={user?.skills.find(s => s.id === focusSession.skillId)?.name}
        onComplete={() => {
          // Award points for focus session
          setUser(prev => prev ? {
            ...prev,
            traits: { ...prev.traits, discipline: prev.traits.discipline + 3 }
          } : null);
          setShowFeedback({ trait: 'discipline', value: 3, text: "Deep work session completed. Exceptional focus. +3 Discipline." });
          const dummyTask: Task = { id: 'focus', text: 'Focus Session', durationSeconds: focusSession.durationMinutes * 60, type: 'planned', completed: true, timestamp: Date.now() };
          logEvent('focus_complete', dummyTask);
          setTimeout(() => setShowFeedback(null), 4000);
          setView('home');
          setFocusSession(null);
        }}
        onExit={() => {
          // Log exit reason
          const dummyTask: Task = { id: 'focus', text: 'Focus Session', durationSeconds: focusSession.durationMinutes * 60, type: 'planned', completed: false, timestamp: Date.now() };
          logEvent('focus_abort', dummyTask);
          setView('home');
          setFocusSession(null);
        }}
      />
    );
  }

  const level = calculateLevel(user.traits);

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleExport = () => {
    const data = {
      tasks,
      history: events,
      traits: user?.traits,
      settings
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'polymath_data.json';
    a.click();
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#D4FF00] selection:text-black">
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        settings={settings} 
        setSettings={setSettings} 
        onReset={handleReset} 
        onExport={handleExport} 
      />
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#D4FF00] rounded-xl flex items-center justify-center">
            <Zap className="text-black w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black tracking-tighter text-lg leading-none">POLYMATH</h1>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Action Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setView('traits')}
            className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-gray-400 hover:text-[#D4FF00] hover:bg-[#2A2A2A] transition-colors"
            title="Identity Engine"
          >
            <Trophy size={20} />
          </button>
          <button 
            onClick={() => setView('history')}
            className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-gray-400 hover:text-[#D4FF00] hover:bg-[#2A2A2A] transition-colors"
            title="History"
          >
            <History size={20} />
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-gray-400 hover:text-[#D4FF00] hover:bg-[#2A2A2A] transition-colors"
              title="Settings"
            >
              <UserCircle size={20} />
            </button>
            {/* Removed old dropdown */}
          </div>
        </div>
      </header>

      <main className="p-6 space-y-8 pb-32">
        {/* Focus Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-gray-500">
            <div className="flex items-center gap-2">
              <Target size={16} />
              <span className="text-xs font-mono uppercase tracking-widest">Focus of the Day</span>
            </div>
            <button 
              onClick={() => setView('focus_setup')}
              className="flex items-center gap-1 text-[#D4FF00] text-[10px] font-mono uppercase tracking-widest hover:opacity-80"
            >
              <Clock size={12} /> Deep Work
            </button>
          </div>
          <p className="text-2xl font-medium leading-tight italic text-gray-200">
            "{insight}"
          </p>
        </section>

        {/* Skills Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500">
              <Brain size={16} />
              <span className="text-xs font-mono uppercase tracking-widest">Active Skills</span>
            </div>
            <button 
              onClick={() => setView('skills')}
              className="text-[#D4FF00] text-[10px] font-mono uppercase tracking-widest hover:opacity-80"
            >
              Manage
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.skills.length > 0 ? (
              user.skills.map(skill => (
                <div key={skill.id} className="px-3 py-1 bg-[#1A1A1A] border border-[#333] rounded-full text-xs font-bold text-gray-300">
                  {skill.name}
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-600 italic">No skills defined. Add some to personalize actions.</p>
            )}
          </div>
        </section>

        {/* Actions Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500">
              <Zap size={16} />
              <span className="text-xs font-mono uppercase tracking-widest">Daily Micro-Actions</span>
            </div>
            <button 
              onClick={() => setCustomTaskModal(true)}
              className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[#D4FF00] hover:bg-[#D4FF00] hover:text-black transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          
          <div className="space-y-4">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={tasks.filter(t => t.type === 'planned' || t.type === 'user').map(t => t.id)} strategy={verticalListSortingStrategy}>
                {tasks.filter(t => t.type === 'planned' || t.type === 'user').map((task) => (
                  <SortableTask key={task.id} task={task} onStart={startTask} />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </section>

        {/* Traits Preview Button */}
        <button 
          onClick={() => setView('traits')}
          className="w-full flex items-center justify-between p-6 bg-[#121212] border border-[#1A1A1A] rounded-[32px] group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#D4FF00]/10 flex items-center justify-center text-[#D4FF00]">
              <Trophy size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold">Identity Engine</p>
              <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">View your evolution</p>
            </div>
          </div>
          <ChevronRight className="text-gray-500 group-hover:text-[#D4FF00] transition-colors" />
        </button>

        {/* Main Controls */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent pt-12">
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <Button 
              variant="secondary" 
              className="flex-1"
              onClick={handleStuck}
            >
              <AlertCircle size={20} /> I'm Stuck
            </Button>
            <Button 
              className="flex-1"
              onClick={() => {
                const nextTask = tasks.find(t => !t.completed);
                if (nextTask) startTask(nextTask);
                else {
                  // Custom alert modal could go here
                  alert("Daily actions complete. You've built momentum.");
                }
              }}
            >
              Do It Now <Zap size={20} fill="currentColor" />
            </Button>
          </div>
        </div>
      </main>

      {/* Feedback Overlay */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="fixed inset-0 flex items-center justify-center z-[200] p-6 cursor-pointer"
            onClick={() => setShowFeedback(null)}
          >
            <div className="bg-[#D4FF00] text-black p-8 rounded-[40px] shadow-[0_0_60px_rgba(212,255,0,0.4)] flex flex-col items-center gap-4 text-center max-w-sm border-4 border-white/20">
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 0.8, ease: "easeInOut", repeat: Infinity }}
                className="w-20 h-20 bg-black/10 rounded-full flex items-center justify-center"
              >
                <Trophy size={40} />
              </motion.div>
              <div>
                <h3 className="text-3xl font-black tracking-tighter uppercase">
                  {showFeedback.trait === 'discipline' ? 'DISCIPLINE UPGRADED' : 
                   showFeedback.trait === 'courage' ? 'COURAGE UPGRADED' : 'CONSISTENCY UPGRADED'}
                </h3>
                <p className="font-bold opacity-80 leading-tight mt-3 text-lg">
                  {showFeedback.text}
                </p>
              </div>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="bg-black text-white px-6 py-3 rounded-full text-lg font-mono font-bold overflow-hidden whitespace-nowrap mt-2 shadow-inner"
              >
                +{showFeedback.value} {showFeedback.trait.toUpperCase()}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Task Modal */}
      <CustomTaskModal 
        isOpen={customTaskModal} 
        onClose={() => setCustomTaskModal(false)}
        onAdd={(task) => {
          setTasks(prev => [task, ...prev]);
          setCustomTaskModal(false);
        }}
      />

      {/* Abandon Action Modal */}
      <Modal
        isOpen={abandonModal}
        onClose={() => setAbandonModal(false)}
        title="ABANDON ACTION?"
        description="Momentum is fragile. If you stop now, the resistance wins. Are you sure?"
        confirmText="Abandon Action"
        onConfirm={() => {
          setAbandonModal(false);
          if (currentTask) {
            logEvent('focus_abort', currentTask);
            setCurrentTask(null);
            setView('home');
          }
        }}
        variant="danger"
      />

      {/* Complete Task Modal */}
      <Modal
        isOpen={!!completeModal}
        onClose={() => setCompleteModal(null)}
        title="CONFIRM COMPLETION"
        description="Confirm that you have physically executed this action. No shortcuts."
        confirmText="Confirm Completion"
        onConfirm={() => {
          if (completeModal) {
            completeTask(completeModal);
            setCompleteModal(null);
          }
        }}
        variant="primary"
      />
    </div>
  );
}

const SettingsModal = ({ isOpen, onClose, settings, setSettings, onReset, onExport }: { isOpen: boolean, onClose: () => void, settings: Settings, setSettings: (s: Settings) => void, onReset: () => void, onExport: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-6 text-white font-sans">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="relative bg-[#121212] border border-[#1A1A1A] rounded-t-[40px] sm:rounded-[40px] p-8 w-full max-w-md shadow-2xl h-[90vh] sm:h-auto overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black tracking-tighter">Settings</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="space-y-8">
              <section>
                <h4 className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-4">🎨 Appearance</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Theme</span>
                    <button onClick={() => setSettings({...settings, theme: settings.theme === 'dark' ? 'light' : 'dark'})} className="text-sm bg-[#1A1A1A] px-3 py-1 rounded-full">{settings.theme === 'dark' ? 'Dark' : 'Light'}</button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Accent Color</span>
                    <div className="flex gap-2">
                      {(['green', 'blue', 'orange', 'purple'] as const).map(c => (
                        <button key={c} onClick={() => setSettings({...settings, accentColor: c})} className={`w-6 h-6 rounded-full ${c === 'green' ? 'bg-[#D4FF00]' : c === 'blue' ? 'bg-blue-500' : c === 'orange' ? 'bg-orange-500' : 'bg-purple-500'} ${settings.accentColor === c ? 'ring-2 ring-white' : ''}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-4">⚡ Execution</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Focus Duration</span>
                    <div className="flex bg-[#1A1A1A] rounded-full p-1">
                      {[15, 25, 45].map(d => (
                        <button key={d} onClick={() => setSettings({...settings, focusDuration: d as any})} className={`px-4 py-1 rounded-full text-xs ${settings.focusDuration === d ? 'bg-[#D4FF00] text-black' : 'text-gray-400'}`}>{d}m</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Strict Mode</span>
                    <input type="checkbox" checked={settings.strictMode} onChange={e => {
                      if (e.target.checked) {
                        if (confirm('Enable Strict Mode? You will not be able to skip tasks.')) {
                          setSettings({...settings, strictMode: true});
                        }
                      } else {
                        setSettings({...settings, strictMode: false});
                      }
                    }} className="appearance-none w-10 h-6 bg-[#1A1A1A] rounded-full relative cursor-pointer checked:bg-[#D4FF00] transition-colors" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Early Completion</span>
                    <select value={settings.earlyCompletion} onChange={e => setSettings({...settings, earlyCompletion: e.target.value as any})} className="bg-[#1A1A1A] rounded-full px-3 py-1 text-xs">
                      <option value="ask">Ask</option>
                      <option value="always">Allow Anytime</option>
                      <option value="lock">Lock until timer</option>
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-4">🔔 Notifications</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Task Reminder</span>
                    <input type="checkbox" checked={settings.taskReminder} onChange={e => setSettings({...settings, taskReminder: e.target.checked})} className="appearance-none w-10 h-6 bg-[#1A1A1A] rounded-full relative cursor-pointer checked:bg-[#D4FF00] transition-colors" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Timer Completion</span>
                    <input type="checkbox" checked={settings.timerCompletion} onChange={e => setSettings({...settings, timerCompletion: e.target.checked})} className="appearance-none w-10 h-6 bg-[#1A1A1A] rounded-full relative cursor-pointer checked:bg-[#D4FF00] transition-colors" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Re-engagement</span>
                    <input type="checkbox" checked={settings.reEngagement} onChange={e => setSettings({...settings, reEngagement: e.target.checked})} className="appearance-none w-10 h-6 bg-[#1A1A1A] rounded-full relative cursor-pointer checked:bg-[#D4FF00] transition-colors" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Aggressive Nudges</span>
                    <input type="checkbox" checked={settings.aggressiveNudges} onChange={e => setSettings({...settings, aggressiveNudges: e.target.checked})} className="appearance-none w-10 h-6 bg-[#1A1A1A] rounded-full relative cursor-pointer checked:bg-[#D4FF00] transition-colors" />
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-4">🧠 Personal</h4>
                <div className="space-y-4">
                  <input type="text" value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} placeholder="Name" className="w-full bg-[#1A1A1A] rounded-full px-4 py-2 text-sm" />
                  <input type="text" value={settings.goal} onChange={e => setSettings({...settings, goal: e.target.value})} placeholder="Goal" className="w-full bg-[#1A1A1A] rounded-full px-4 py-2 text-sm" />
                  <div className="flex flex-wrap gap-2">
                    {settings.skills.map(skill => (
                      <span key={skill} className="bg-[#1A1A1A] text-gray-300 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                        {skill}
                        <button onClick={() => setSettings({...settings, skills: settings.skills.filter(s => s !== skill)})}><X size={12}/></button>
                      </span>
                    ))}
                    {settings.skills.length < 5 && (
                      <input type="text" placeholder="+ Add Skill" onKeyDown={e => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          setSettings({...settings, skills: [...settings.skills, e.currentTarget.value]});
                          e.currentTarget.value = '';
                        }
                      }} className="bg-transparent text-sm text-gray-500 placeholder-gray-600 focus:outline-none" />
                    )}
                  </div>
                </div>
              </section>

              <section>
                <details className="group">
                  <summary className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-4 cursor-pointer list-none flex justify-between items-center">
                    <span>⚙️ Advanced</span>
                    <span className="group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Hardcore Mode</span>
                      <input type="checkbox" checked={settings.hardcoreMode} onChange={e => {
                        if (e.target.checked) {
                          if (confirm('WARNING: Hardcore Mode overrides all other settings and has no easy exits. Are you sure?')) {
                            setSettings({...settings, hardcoreMode: true});
                          }
                        } else {
                          setSettings({...settings, hardcoreMode: false});
                        }
                      }} className="appearance-none w-10 h-6 bg-[#1A1A1A] rounded-full relative cursor-pointer checked:bg-[#D4FF00] transition-colors" />
                    </div>
                  </div>
                </details>
              </section>

              <section className="border-t border-[#1A1A1A] pt-8">
                <button onClick={onExport} className="w-full text-left text-sm text-gray-300 hover:text-white mb-4">Export Data</button>
                <button onClick={onReset} className="w-full text-left text-sm text-red-500 hover:text-red-400">Reset All Data</button>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const CustomTaskModal = ({ isOpen, onClose, onAdd }: { isOpen: boolean, onClose: () => void, onAdd: (t: Task) => void }) => {
  const [text, setText] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmedText = text.trim();
    const validation = validateTaskInput(trimmedText, durationMinutes);
    if (!validation.valid) {
      setError(validation.error || "Invalid task.");
      return;
    }

    onAdd({
      id: generateId(),
      text: trimmedText,
      durationSeconds: durationMinutes * 60,
      type: 'user',
      completed: false,
      timestamp: Date.now(),
      tags: tags.split(',').map(t => t.trim()).filter(t => t !== '')
    });
    setText('');
    setDurationMinutes(15);
    setTags('');
    setError(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-6 text-white font-sans">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="relative bg-[#121212] border border-[#1A1A1A] rounded-t-[40px] sm:rounded-[40px] p-8 w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black tracking-tighter">ADD ACTION</h3>
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Task Description</label>
                <textarea 
                  autoFocus
                  placeholder="e.g. Write 5 lines of code for the login page."
                  className="w-full bg-[#1A1A1A] border border-[#333] rounded-2xl p-4 text-white outline-none focus:border-[#D4FF00] transition-colors resize-none h-24"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setError(null);
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Duration (Minutes)</label>
                <input 
                  type="number"
                  min="1"
                  max="30"
                  className="w-full bg-[#1A1A1A] border border-[#333] rounded-2xl p-4 text-white outline-none focus:border-[#D4FF00] transition-colors"
                  value={durationMinutes}
                  onChange={(e) => {
                    setDurationMinutes(Number(e.target.value));
                    setError(null);
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Tags (comma separated)</label>
                <input 
                  type="text"
                  placeholder="e.g. work, coding, urgent"
                  className="w-full bg-[#1A1A1A] border border-[#333] rounded-2xl p-4 text-white outline-none focus:border-[#D4FF00] transition-colors"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>

                {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

              <div className="p-4 bg-[#D4FF00]/5 border border-[#D4FF00]/10 rounded-2xl">
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#D4FF00] mb-2">Requirements</p>
                <ul className="text-[10px] text-gray-400 space-y-1">
                  <li>• Must start with an action verb</li>
                  <li>• Must be specific and physical</li>
                  <li>• No vague words (better, more, try)</li>
                  <li>• Under 30 minutes</li>
                </ul>
              </div>

              <Button onClick={handleAdd} className="w-full">
                Add to Engine
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


const SkillsScreen = ({ user, onBack, onUpdateUser }: { user: User, onBack: () => void, onUpdateUser: (u: User) => void }) => {
  const [name, setName] = useState('');
  const [goalHint, setGoalHint] = useState('');
  const [intensity, setIntensity] = useState<'low' | 'medium' | 'high'>('medium');

  const addSkill = () => {
    if (!name.trim() || user.skills.length >= 5) return;
    const skill: Skill = {
      id: generateId(),
      name: name.trim(),
      goalHint: goalHint.trim(),
      intensity,
      lastUsed: 0
    };
    onUpdateUser({
      ...user,
      skills: [...user.skills, skill]
    });
    setName('');
    setGoalHint('');
    setIntensity('medium');
  };

  const removeSkill = (id: string) => {
    onUpdateUser({
      ...user,
      skills: user.skills.filter(s => s.id !== id)
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-black text-white p-6 flex flex-col font-sans"
    >
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-3xl font-black tracking-tighter">SKILL ENGINE</h2>
      </header>

      <div className="space-y-8 flex-1">
        <div className="space-y-4">
          <p className="text-gray-400 leading-relaxed">
            Define up to 5 skills you want to develop.
          </p>
          
          <div className="space-y-2">
            <input 
              type="text"
              placeholder="Skill Name (e.g. Coding)"
              className="w-full bg-[#1A1A1A] border border-[#333] rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D4FF00] transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input 
              type="text"
              placeholder="What does getting better mean? (optional)"
              className="w-full bg-[#1A1A1A] border border-[#333] rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D4FF00] transition-colors"
              value={goalHint}
              onChange={(e) => setGoalHint(e.target.value)}
            />
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map(i => (
                <button 
                  key={i} 
                  onClick={() => setIntensity(i)}
                  className={`flex-1 py-2 rounded-xl text-xs font-mono uppercase ${intensity === i ? 'bg-[#D4FF00] text-black' : 'bg-[#1A1A1A] text-gray-400'}`}
                >
                  {i}
                </button>
              ))}
            </div>
            <Button onClick={addSkill} disabled={!name.trim() || user.skills.length >= 5} className="w-full py-3">
              <Plus size={20} /> Add Skill
            </Button>
          </div>
          {user.skills.length >= 5 && <p className="text-red-500/60 text-[10px] font-mono uppercase tracking-widest">Max skills reached (5/5)</p>}
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-gray-500">Active Skills</h3>
          <div className="space-y-3">
            {user.skills.map(skill => (
              <div key={skill.id} className="flex items-center justify-between p-4 bg-[#121212] border border-[#1A1A1A] rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D4FF00]/10 flex items-center justify-center text-[#D4FF00]">
                    <Brain size={20} />
                  </div>
                  <div>
                    <p className="font-bold">{skill.name}</p>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">{skill.intensity} intensity</p>
                  </div>
                </div>
                <button 
                  onClick={() => removeSkill(skill.id)}
                  className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {user.skills.length === 0 && (
              <div className="p-8 border border-dashed border-[#333] rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                <Brain size={32} className="text-gray-700" />
                <p className="text-gray-500 text-sm italic">No skills added yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FocusSetupScreen = ({ onBack, onStart, skills }: { onBack: () => void, onStart: (s: FocusSession) => void, skills: Skill[] }) => {
  const [duration, setDuration] = useState(25);
  const [outcome, setOutcome] = useState('');
  const [skillId, setSkillId] = useState<string | undefined>(skills[0]?.id);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="min-h-screen bg-black text-white p-6 flex flex-col font-sans"
    >
      <header className="flex items-center gap-4 mb-12">
        <button onClick={onBack} className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-3xl font-black tracking-tighter">DEEP WORK</h2>
      </header>

      <div className="flex-1 flex flex-col gap-12 max-w-md mx-auto w-full">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-gray-500">Select Duration</label>
            <div className="grid grid-cols-3 gap-3">
              {FOCUS_DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`py-4 rounded-2xl font-black text-xl border-2 transition-all ${
                    duration === d 
                      ? 'border-[#D4FF00] bg-[#D4FF00] text-black' 
                      : 'border-[#1A1A1A] text-gray-500'
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-gray-500">Select Skill</label>
            <select 
              className="w-full bg-[#1A1A1A] border border-[#333] rounded-2xl px-4 py-3 text-white outline-none focus:border-[#D4FF00] transition-colors"
              value={skillId}
              onChange={(e) => setSkillId(e.target.value)}
            >
              {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-gray-500">Defined Outcome</label>
            <textarea 
              autoFocus
              placeholder="What will be physically different after this session?"
              className="w-full bg-[#1A1A1A] border border-[#333] rounded-2xl p-6 text-xl text-white outline-none focus:border-[#D4FF00] transition-colors resize-none h-40"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 bg-[#D4FF00]/5 border border-[#D4FF00]/10 rounded-[32px] flex gap-4">
          <Lock className="text-[#D4FF00] shrink-0" size={20} />
          <p className="text-xs text-gray-400 leading-relaxed">
            Entering Deep Work locks the system. You are committing to this outcome. Leaving early requires a justification.
          </p>
        </div>

        <Button 
          onClick={() => onStart({ 
            id: generateId(),
            durationMinutes: duration, 
            outcome,
            startTime: Date.now(),
            completed: false,
            skillId
          })} 
          disabled={!outcome.trim()}
          className="w-full py-6 text-xl"
        >
          Enter Focus Mode <Zap size={24} fill="currentColor" />
        </Button>
      </div>
    </motion.div>
  );
};

const HoldToExitButton = ({ onExit }: { onExit: () => void }) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startHold = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsHolding(true);
    setProgress(0);
    const startTime = Date.now();
    
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min((elapsed / 2000) * 100, 100);
      setProgress(p);
      
      if (p >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsHolding(false);
        onExit();
      }
    }, 16);
  };

  const stopHold = () => {
    setIsHolding(false);
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <div className="flex items-center gap-3">
      {isHolding && (
        <span className="text-xs font-mono text-red-500 uppercase tracking-widest animate-pulse">
          Hold to quit
        </span>
      )}
      <button 
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onContextMenu={(e) => e.preventDefault()}
        className="relative w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white overflow-hidden group touch-none select-none"
        style={{ WebkitTouchCallout: 'none' }}
      >
        <div 
          className="absolute bottom-0 left-0 right-0 bg-red-500/40"
          style={{ height: `${progress}%` }}
        />
        <X size={24} className={`relative z-10 transition-colors ${isHolding ? 'text-red-500' : 'group-hover:text-red-400'}`} />
      </button>
    </div>
  );
};

const HoldToConfirmButton = ({ onConfirm, label }: { onConfirm: () => void, label: string }) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startHold = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsHolding(true);
    setProgress(0);
    const startTime = Date.now();
    
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min((elapsed / 2000) * 100, 100);
      setProgress(p);
      
      if (p >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsHolding(false);
        onConfirm();
      }
    }, 16);
  };

  const stopHold = () => {
    setIsHolding(false);
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <button 
      onPointerDown={startHold}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full py-6 rounded-full bg-[#D4FF00] text-black font-black text-xl overflow-hidden group touch-none select-none"
      style={{ WebkitTouchCallout: 'none' }}
    >
      <div 
        className="absolute bottom-0 left-0 right-0 bg-black/20"
        style={{ height: `${progress}%` }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {isHolding ? "Confirming..." : label}
      </span>
    </button>
  );
};

const FocusSessionScreen = ({ session, onComplete, onExit, settings, skillName }: { session: FocusSession, onComplete: () => void, onExit: () => void, settings: Settings, skillName?: string }) => {
  const [timeLeft, setTimeLeft] = useState(session.durationMinutes * 60);
  const [showExitReason, setShowExitReason] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    const handleActivity = () => setLastActivity(Date.now());
    window.addEventListener('pointermove', handleActivity);
    return () => window.removeEventListener('pointermove', handleActivity);
  }, []);

  useEffect(() => {
    if (!settings.aggressiveNudges) return;
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > 30000) {
        alert("Are you still there? Stay focused!");
        setLastActivity(Date.now());
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [lastActivity, settings.aggressiveNudges]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 800);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleExit = () => {
    if (settings.strictMode) {
      if (confirm("Strict Mode is enabled. Are you sure you want to skip this task?")) {
        onExit();
      }
    } else {
      onExit();
    }
  };

  const handleComplete = () => {
    if (settings.earlyCompletion === 'lock' && timeLeft > 0) {
      alert("Early completion is locked until the timer ends.");
      return;
    }
    if (settings.earlyCompletion === 'ask' && timeLeft > 0) {
      if (confirm("Are you sure you want to complete early?")) {
        onComplete();
      }
      return;
    }
    onComplete();
  };

  useEffect(() => {
    if (countdown > 0) return;
    if (timeLeft <= 0) {
      onComplete();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onComplete, countdown]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft / (session.durationMinutes * 60)) * 100;
  const percentDone = Math.round(100 - progress);

  const getAccountabilityMessage = () => {
    if (percentDone < 30) return "No distractions. Execute.";
    if (percentDone < 60) return "Stay with it. Keep pushing.";
    if (percentDone < 90) return "Don't quit now. You're in deep.";
    return "Almost there. Finish strong.";
  };

  if (showExitReason) {
    return (
      <div className="fixed inset-0 bg-black text-white font-sans z-[200] p-8 flex flex-col justify-center gap-8">
        <h2 className="text-4xl font-black tracking-tighter leading-tight">LEAVE FOCUS MODE?</h2>
        <p className="text-gray-400 text-lg">You are in Deep Work. Exiting now means breaking your commitment. Are you sure you want to abandon this session?</p>
        
        <div className="flex flex-col gap-3">
          <Button 
            onClick={() => handleExit()} 
            variant="danger"
          >
            Confirm Exit
          </Button>
          <Button onClick={() => setShowExitReason(false)} variant="outline">
            Back to Focus
          </Button>
        </div>
      </div>
    );
  }

  if (countdown > 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black text-white font-sans z-[150] flex flex-col items-center justify-center p-8"
      >
        <p className="text-gray-500 font-mono uppercase tracking-widest mb-4">Entering Deep Work</p>
        <motion.div 
          key={countdown}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          className="text-9xl font-black tabular-nums text-[#D4FF00]"
        >
          {countdown}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black text-white font-sans z-[150] flex flex-col p-8 overflow-hidden"
    >
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-2 text-[#D4FF00]">
          <Lock size={20} />
          <span className="font-mono font-bold tracking-widest uppercase">Deep Work Active</span>
        </div>
        {skillName && (
          <div className="text-xs font-mono uppercase tracking-widest text-gray-500">
            Skill: {skillName}
          </div>
        )}
        <HoldToExitButton onExit={() => setShowExitReason(true)} />
      </div>

      <div className="flex-1 flex flex-col justify-center gap-12 max-w-md mx-auto w-full">
        <div className="space-y-4 text-center">
          <h2 className="text-xs font-mono uppercase tracking-widest text-gray-500">Target Outcome</h2>
          <p className="text-3xl font-bold leading-tight italic">
            "{session.outcome}"
          </p>
        </div>

        <div className="relative aspect-square flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle 
              cx="50" cy="50" r="45" 
              className="stroke-[#1A1A1A] fill-none" 
              strokeWidth="2" 
            />
            <motion.circle 
              cx="50" cy="50" r="45" 
              className="stroke-[#D4FF00] fill-none" 
              strokeWidth="6" 
              strokeDasharray="282.743"
              animate={{ strokeDashoffset: 282.743 - (progress / 100) * 282.743 }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </svg>
          <div className="flex flex-col items-center z-10">
            <div className="text-8xl font-black tabular-nums tracking-tighter">
              {formatTime(timeLeft)}
            </div>
            <div className="text-lg font-mono text-gray-500 uppercase tracking-widest mt-2">
              {percentDone}% done
            </div>
          </div>
        </div>

        <div className="text-center text-[#D4FF00] font-mono text-sm tracking-widest uppercase animate-pulse">
          {getAccountabilityMessage()}
        </div>
      </div>

      <div className="mt-auto pb-8 flex flex-col items-center gap-4">
        <Button 
          className="w-full" 
          onClick={handleComplete}
        >
          Outcome Achieved <CheckCircle2 size={20} />
        </Button>
      </div>
    </motion.div>
  );
};

const HistoryScreen = ({ events, tasks, onBack }: { events: ActionEvent[], tasks: Task[], onBack: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-black text-white p-6 flex flex-col font-sans"
    >
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-3xl font-black tracking-tighter">HISTORY</h2>
      </header>
      <div className="space-y-4">
        {events.slice().reverse().map(event => {
          const task = tasks.find(t => t.id === event.taskId);
          return (
            <div key={event.id} className="p-4 bg-[#121212] border border-[#1A1A1A] rounded-2xl flex justify-between items-center">
              <div>
                <p className="font-bold">{task?.text || 'Unknown Task'}</p>
                <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">{event.type}</p>
              </div>
              <p className="text-xs text-gray-500 font-mono">{new Date(event.timestamp).toLocaleDateString()}</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

const IdentityEngineScreen = ({ user, onBack }: { user: User, onBack: () => void }) => {
  const level = calculateLevel(user.traits);
  const totalPoints = user.traits.discipline + user.traits.courage + user.traits.consistency;
  const nextLevelPoints = level * 5;
  const progressToNext = (totalPoints % 5) / 5 * 100;

  const traitInfo = [
    {
      id: 'courage',
      label: 'Courage',
      icon: <Shield className="text-blue-400" />,
      value: user.traits.courage,
      description: "Acting despite fear, resistance, or feeling 'stuck'. You gain Courage every time you break paralysis and execute an unplanned action.",
      color: 'bg-blue-400/10'
    },
    {
      id: 'discipline',
      label: 'Discipline',
      icon: <Flame className="text-orange-400" />,
      value: user.traits.discipline,
      description: "Doing what you planned to do, when you planned to do it. You gain Discipline by following through on your daily micro-actions.",
      color: 'bg-orange-400/10'
    },
    {
      id: 'consistency',
      label: 'Consistency',
      icon: <Zap className="text-[#D4FF00]" />,
      value: user.traits.consistency,
      description: "The power of showing up every single day. You gain Consistency by clearing your entire daily action engine.",
      color: 'bg-[#D4FF00]/10'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-black text-white p-6 flex flex-col font-sans"
    >
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-3xl font-black tracking-tighter">IDENTITY ENGINE</h2>
      </header>

      {/* Level Card */}
      <div className="mb-8 p-8 bg-[#D4FF00] text-black rounded-[40px] flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs font-mono font-bold uppercase tracking-widest opacity-60">Current Level</p>
            <h3 className="text-6xl font-black tracking-tighter leading-none">{level}</h3>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono font-bold uppercase tracking-widest opacity-60">Total Points</p>
            <p className="text-2xl font-black">{totalPoints}</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-mono font-bold uppercase tracking-widest opacity-60">
            <span>Progress to Level {level + 1}</span>
            <span>{totalPoints % 5} / 5</span>
          </div>
          <div className="h-2 bg-black/10 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              className="h-full bg-black"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6 flex-1">
        {traitInfo.map((trait) => (
          <Card key={trait.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${trait.color}`}>
                  {trait.icon}
                </div>
                <h3 className="text-xl font-bold">{trait.label}</h3>
              </div>
              <div className="text-2xl font-black">{trait.value}</div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              {trait.description}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-12 p-6 bg-[#D4FF00]/5 border border-[#D4FF00]/20 rounded-[32px] flex gap-4">
        <Info className="text-[#D4FF00] shrink-0" size={20} />
        <p className="text-xs text-gray-400 leading-relaxed">
          These traits represent your evolution from a thinker to a doer. They are not just numbers; they are proof of your resistance-breaking history.
        </p>
      </div>
    </motion.div>
  );
};

const TraitBadge = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) => (
  <div className="flex flex-col items-end">
    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">
      {icon} {label}
    </div>
    <div className="text-lg font-black leading-none">{value}</div>
  </div>
);

const SortableTask = ({ task, onStart }: { task: Task, onStart: (t: Task) => void, key?: string }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className={task.completed ? "opacity-50" : ""}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className={`text-lg font-bold leading-tight ${task.completed ? "line-through" : ""}`}>
              {task.text}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
              <Timer size={12} />
              <span>{Math.round(task.durationSeconds / 60)} MINUTES</span>
            </div>
            {task.tags && task.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {task.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-mono uppercase bg-[#1A1A1A] text-gray-400 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          {task.completed ? (
            <div className="w-8 h-8 rounded-full bg-[#D4FF00]/10 flex items-center justify-center">
              <CheckCircle2 className="text-[#D4FF00]" size={20} />
            </div>
          ) : (
            <button 
              onClick={() => onStart(task)}
              className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center hover:bg-[#D4FF00] hover:text-black transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </Card>
    </div>
  );
};

const ActionScreen = ({ task, onComplete, onExit }: { task: Task, onComplete: (t: Task) => void, onExit: () => void }) => {
  const [startTime, setStartTime] = useState<number>(() => {
    const saved = localStorage.getItem(`task_start_${task.id}`);
    return saved ? parseInt(saved, 10) : Date.now();
  });
  
  useEffect(() => {
    localStorage.setItem(`task_start_${task.id}`, startTime.toString());
  }, [startTime, task.id]);

  const [screen, setScreen] = useState<'executing' | 'confirming' | 'fallback'>('executing');
  const [timeLeft, setTimeLeft] = useState(task.durationSeconds);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 800);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (countdown > 0 || screen !== 'executing') return;
    
    const checkTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, task.durationSeconds - elapsed);
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        setScreen('confirming');
      }
    };
    
    checkTimer();
    const timer = setInterval(checkTimer, 1000);
    return () => clearInterval(timer);
  }, [startTime, task.durationSeconds, countdown, screen]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = Math.min(100, ((task.durationSeconds - timeLeft) / task.durationSeconds) * 100);
  const percentDone = Math.round(progress);

  const getAccountabilityMessage = () => {
    if (percentDone < 30) return "Lock in. Focus.";
    if (percentDone < 60) return "Stay with it.";
    if (percentDone < 90) return "Don't quit now.";
    return "Almost there. Finish strong.";
  };

  if (countdown > 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black text-white font-sans z-50 flex flex-col items-center justify-center p-8"
      >
        <p className="text-gray-500 font-mono uppercase tracking-widest mb-4">Locking in</p>
        <motion.div 
          key={countdown}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          className="text-9xl font-black tabular-nums"
        >
          {countdown}
        </motion.div>
      </motion.div>
    );
  }

  if (screen === 'confirming') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black text-white font-sans z-50 flex flex-col items-center justify-center p-8 text-center"
      >
        <h2 className="text-5xl font-black tracking-tighter mb-12">Did you actually do it?</h2>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <Button onClick={() => {
            onComplete(task);
          }} className="w-full py-6 text-xl">
            ✅ Yes, I did it
          </Button>
          <Button onClick={() => setScreen('fallback')} variant="outline" className="w-full py-6 text-xl">
            ❌ Not yet
          </Button>
        </div>
      </motion.div>
    );
  }

  if (screen === 'fallback') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black text-white font-sans z-50 flex flex-col items-center justify-center p-8 text-center"
      >
        <h2 className="text-3xl font-black tracking-tighter mb-6">Do this smaller version</h2>
        <p className="text-gray-400 mb-12">
          Original: "{task.text}"<br/>
          Fallback: "Open contacts and type his name"
        </p>
        <Button onClick={onExit} variant="outline" className="w-full">
          Back to Dashboard
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black text-white font-sans z-50 flex flex-col p-8"
    >
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-2 text-[#D4FF00]">
          <Timer size={20} />
          <span className="font-mono font-bold tracking-widest uppercase">Executing</span>
        </div>
        <HoldToExitButton onExit={onExit} />
      </div>

      <div className="flex-1 flex flex-col justify-center gap-4 max-w-md mx-auto w-full">
        <div className="space-y-4 text-center">
          <h2 className="text-4xl font-black tracking-tighter leading-tight">
            {task.text}
          </h2>
          <p className="text-gray-500 text-lg">
            Focus entirely on this one micro-action. Do not look away.
          </p>
        </div>

        <div className="relative aspect-square flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle 
              cx="50" cy="50" r="45" 
              className="stroke-[#1A1A1A] fill-none" 
              strokeWidth="4" 
            />
            <motion.circle 
              cx="50" cy="50" r="45" 
              className="stroke-[#D4FF00] fill-none" 
              strokeWidth="4" 
              strokeDasharray="282.743"
              animate={{ strokeDashoffset: 282.743 - (progress / 100) * 282.743 }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </svg>
          <div className="flex flex-col items-center z-10">
            <div className="text-7xl font-black tabular-nums tracking-tighter">
              {formatTime(timeLeft)}
            </div>
            <div className="text-lg font-mono text-gray-500 uppercase tracking-widest mt-1">
              {percentDone}% done
            </div>
          </div>
        </div>

        <div className="text-center text-[#D4FF00] font-mono text-sm tracking-widest uppercase animate-pulse">
          {getAccountabilityMessage()}
        </div>
      </div>

      <div className="mt-auto pb-8">
        <HoldToConfirmButton onConfirm={() => onComplete(task)} label="Mark as Done" />
      </div>
    </motion.div>
  );
};
