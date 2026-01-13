import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateStatus: (status: User['status'], statusText?: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  login: (user) => set({ currentUser: user, isAuthenticated: true }),
  logout: () => set({ currentUser: null, isAuthenticated: false }),
  updateStatus: (status, statusText) =>
    set((state) => ({
      currentUser: state.currentUser
        ? { ...state.currentUser, status, statusText }
        : null,
    })),
}));
