/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { FeedbackOverlay } from './components/FeedbackOverlay';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ActionScreen } from './screens/ActionScreen';
import { FocusSetupScreen } from './screens/FocusSetupScreen';
import { FocusSessionScreen } from './screens/FocusSessionScreen';
import { IdentityEngineScreen } from './screens/IdentityEngineScreen';
import { SkillsScreen } from './screens/SkillsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsModal } from './screens/SettingsModal';
import { Modal } from './components/Modal';
import { Task } from './types';

function AppShell() {
  const { state, dispatch } = useApp();
  const [softAccountability, setSoftAccountability] = useState<Task | null>(null);

  // FIX BUG #6: Handle soft accountability on mount (single effect, no race)
  useEffect(() => {
    if (state.currentTask) {
      const startTime = localStorage.getItem(`task_start_${state.currentTask.id}`);
      if (startTime) {
        const elapsed = Math.floor((Date.now() - parseInt(startTime, 10)) / 1000);
        if (elapsed < state.currentTask.durationSeconds) {
          setSoftAccountability(state.currentTask);
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Not onboarded
  if (!state.user) return <OnboardingScreen />;

  // Active task
  if (state.currentTask) {
    return (
      <>
        <ActionScreen />
        <Modal
          isOpen={!!softAccountability}
          onClose={() => {
            setSoftAccountability(null);
            dispatch({ type: 'ABANDON_TASK' });
          }}
          title="You left midway. Continue?"
          description="Momentum is fragile. If you stop now, the resistance wins."
          confirmText="Resume"
          onConfirm={() => setSoftAccountability(null)}
          cancelText="Restart"
        />
      </>
    );
  }

  // Focus session active
  if (state.view === 'focus_session' && state.focusSession) {
    return <FocusSessionScreen />;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {state.view === 'traits' && <IdentityEngineScreen key="traits" />}
        {state.view === 'skills' && <SkillsScreen key="skills" />}
        {state.view === 'history' && <HistoryScreen key="history" />}
        {state.view === 'focus_setup' && <FocusSetupScreen key="focus_setup" />}
        {state.view === 'home' && <HomeScreen key="home" />}
      </AnimatePresence>

      <SettingsModal />

      <FeedbackOverlay
        feedback={state.feedback}
        onDismiss={() => dispatch({ type: 'CLEAR_FEEDBACK' })}
      />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
