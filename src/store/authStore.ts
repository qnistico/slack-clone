import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/index';
import { onAuthChange, logOut as firebaseLogout } from '../services/authService';
import { setUserOnline, setUserOffline } from '../services/presenceService';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  updateStatus: (status: User['status'], statusText?: string) => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      isLoading: true,

      login: (user) => {
        set({ currentUser: user, isAuthenticated: true, isLoading: false });
        // Set user as online in Firebase
        setUserOnline(user.id).catch(() => {});
      },

      logout: async () => {
        const user = get().currentUser;
        if (user) {
          // Try to set offline, but don't block logout if it fails
          try {
            await setUserOffline(user.id);
          } catch {
          }
        }
        await firebaseLogout();
        set({ currentUser: null, isAuthenticated: false });
      },

      updateStatus: async (status, statusText = '') => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        try {
          // Update Firestore (use setDoc with merge to create if doesn't exist)
          const userRef = doc(db, 'users', currentUser.id);
          await setDoc(
            userRef,
            {
              status,
              statusText,
            },
            { merge: true }
          );

          // Update local state
          set((state) => ({
            currentUser: state.currentUser
              ? { ...state.currentUser, status, statusText }
              : null,
          }));
        } catch {
        }
      },

      initialize: () => {
        // Listen for auth state changes
        onAuthChange((user) => {
          if (user) {
            set({ currentUser: user, isAuthenticated: true, isLoading: false });
            setUserOnline(user.id).catch(() => {});
          } else {
            set({ currentUser: null, isAuthenticated: false, isLoading: false });
          }
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
