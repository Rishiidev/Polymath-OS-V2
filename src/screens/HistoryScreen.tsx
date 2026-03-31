import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';

export const HistoryScreen = () => {
  const { state, dispatch } = useApp();

  const eventIcon = (type: string) => {
    switch (type) {
      case 'completed': case 'focus_complete': return <CheckCircle2 size={16} className="text-[var(--accent)]" />;
      case 'skipped': case 'exit_attempt': case 'focus_abort': return <AlertCircle size={16} className="text-red-500" />;
      default: return <Clock size={16} className="text-[var(--text-muted)]" />;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 flex flex-col font-sans">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'home' })} className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-3xl font-black tracking-tighter">HISTORY</h2>
      </header>

      <div className="space-y-3">
        {state.events.length === 0 && (
          <Card>
            <p className="text-[var(--text-muted)] text-sm italic text-center py-4">No events yet. Start taking action!</p>
          </Card>
        )}
        {[...state.events].reverse().map(event => (
          <div key={event.id}>
          <Card>
            <div className="flex items-center gap-3">
              {eventIcon(event.type)}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{event.type.replace(/_/g, ' ')}</p>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  {new Date(event.timestamp).toLocaleString()} • {event.taskType}
                </p>
              </div>
            </div>
          </Card>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
