import { UserTraits } from '../types';

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const calculateLevel = (traits: UserTraits) => {
  const total = traits.discipline + traits.courage + traits.consistency;
  return Math.floor(total / 5) + 1;
};

export const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};
