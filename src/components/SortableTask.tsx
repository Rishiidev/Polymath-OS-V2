import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Timer, CheckCircle2, ChevronRight, GripVertical } from 'lucide-react';
import { Task } from '../types';
import { Card } from './Card';

export interface SortableTaskProps {
  task: Task;
  onStart: (task: Task) => void;
}

export const SortableTask = ({ task, onStart }: SortableTaskProps) => {
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
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className={task.completed ? "opacity-50" : ""}>
        <div className="flex items-center gap-3">
          {/* Drag handle — only this receives dnd listeners */}
          <div {...listeners} className="cursor-grab active:cursor-grabbing touch-none text-[var(--text-dimmed)] hover:text-[var(--text-muted)] transition-colors shrink-0">
            <GripVertical size={18} />
          </div>

          {/* Task content — clickable to start */}
          <button
            onClick={() => { if (!task.completed) onStart(task); }}
            className="flex-1 text-left min-w-0"
            disabled={task.completed}
          >
            <p className={`text-lg font-bold leading-tight ${task.completed ? "line-through" : ""}`}>
              {task.text}
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono mt-1">
              <Timer size={12} />
              <span>{Math.round(task.durationSeconds / 60)} MINUTES</span>
            </div>
            {task.tags && task.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {task.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-mono uppercase bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </button>

          {/* Status / Start indicator */}
          {task.completed ? (
            <div className="w-8 h-8 rounded-full bg-[var(--accent-10)] flex items-center justify-center shrink-0">
              <CheckCircle2 className="text-[var(--accent)]" size={20} />
            </div>
          ) : (
            <button
              onClick={() => onStart(task)}
              className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-colors shrink-0"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </Card>
    </div>
  );
};
