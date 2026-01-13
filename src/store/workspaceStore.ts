import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workspace } from '../types';
import { subscribeToWorkspaces, createWorkspace } from '../services/firestoreService';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  isLoading: boolean;
  addWorkspace: (workspace: Workspace) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspaceId: string) => void;
  getCurrentWorkspace: () => Workspace | undefined;
  createNewWorkspace: (name: string, ownerId: string, icon?: string) => Promise<void>;
  subscribeToUserWorkspaces: (userId: string) => () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      currentWorkspaceId: null,
      isLoading: false,

      addWorkspace: (workspace) =>
        set((state) => {
          // Prevent duplicates
          if (state.workspaces.some((w) => w.id === workspace.id)) {
            return state;
          }
          return {
            workspaces: [...state.workspaces, workspace],
          };
        }),

      setWorkspaces: (workspaces) => set({ workspaces }),

      setCurrentWorkspace: (workspaceId) =>
        set({ currentWorkspaceId: workspaceId }),

      getCurrentWorkspace: () => {
        const state = get();
        return state.workspaces.find((w) => w.id === state.currentWorkspaceId);
      },

      createNewWorkspace: async (name, ownerId, icon) => {
        set({ isLoading: true });
        try {
          await createWorkspace(name, ownerId, icon);
        } catch (error) {
          console.error('Failed to create workspace:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      subscribeToUserWorkspaces: (userId) => {
        return subscribeToWorkspaces(userId, (workspaces) => {
          set({ workspaces });
          // Set current workspace to first one if none selected
          if (!get().currentWorkspaceId && workspaces.length > 0) {
            set({ currentWorkspaceId: workspaces[0].id });
          }
        });
      },
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({
        currentWorkspaceId: state.currentWorkspaceId,
      }),
    }
  )
);
