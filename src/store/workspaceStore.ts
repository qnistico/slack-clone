import { create } from 'zustand';
import type { Workspace } from '../types';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  addWorkspace: (workspace: Workspace) => void;
  setCurrentWorkspace: (workspaceId: string) => void;
  getCurrentWorkspace: () => Workspace | undefined;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspaceId: null,
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
  setCurrentWorkspace: (workspaceId) =>
    set({ currentWorkspaceId: workspaceId }),
  getCurrentWorkspace: () => {
    const state = get();
    return state.workspaces.find((w) => w.id === state.currentWorkspaceId);
  },
}));
