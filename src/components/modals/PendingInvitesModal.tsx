import { useState, useEffect } from 'react';
import { X, Mail, Check, XIcon } from 'lucide-react';
import type { WorkspaceInvite } from '../../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface PendingInvitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  invites: WorkspaceInvite[];
  onAccept: (inviteId: string, workspaceId: string) => Promise<void>;
  onDecline: (inviteId: string) => Promise<void>;
}

interface InviteWithWorkspace extends WorkspaceInvite {
  workspaceName?: string;
  workspaceIcon?: string;
}

export default function PendingInvitesModal({
  isOpen,
  onClose,
  invites,
  onAccept,
  onDecline,
}: PendingInvitesModalProps) {
  const [invitesWithWorkspace, setInvitesWithWorkspace] = useState<InviteWithWorkspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkspaceDetails = async () => {
      const invitesWithDetails = await Promise.all(
        invites.map(async (invite) => {
          try {
            const workspaceRef = doc(db, 'workspaces', invite.workspaceId);
            const workspaceSnap = await getDoc(workspaceRef);

            if (workspaceSnap.exists()) {
              const workspaceData = workspaceSnap.data();
              return {
                ...invite,
                workspaceName: workspaceData.name,
                workspaceIcon: workspaceData.icon,
              };
            }
          } catch (error) {
            console.error('Failed to load workspace details:', error);
          }
          return {
            ...invite,
            workspaceName: 'Unknown Workspace',
            workspaceIcon: '🏢',
          };
        })
      );
      setInvitesWithWorkspace(invitesWithDetails);
    };

    if (isOpen && invites.length > 0) {
      loadWorkspaceDetails();
    }
  }, [isOpen, invites]);

  if (!isOpen || invites.length === 0) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleAccept = async (inviteId: string, workspaceId: string) => {
    setProcessingInvite(inviteId);
    setLoading(true);
    try {
      await onAccept(inviteId, workspaceId);
      // Remove from local state
      setInvitesWithWorkspace(prev => prev.filter(inv => inv.id !== inviteId));
    } catch (error) {
      console.error('Failed to accept invite:', error);
      alert('Failed to accept invite. Please try again.');
    } finally {
      setLoading(false);
      setProcessingInvite(null);
    }
  };

  const handleDecline = async (inviteId: string) => {
    setProcessingInvite(inviteId);
    setLoading(true);
    try {
      await onDecline(inviteId);
      // Remove from local state
      setInvitesWithWorkspace(prev => prev.filter(inv => inv.id !== inviteId));
    } catch (error) {
      console.error('Failed to decline invite:', error);
      alert('Failed to decline invite. Please try again.');
    } finally {
      setLoading(false);
      setProcessingInvite(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Mail size={24} className="text-purple-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Pending Invitations
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You have {invitesWithWorkspace.length} workspace {invitesWithWorkspace.length === 1 ? 'invitation' : 'invitations'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Invites List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {invitesWithWorkspace.map((invite) => (
              <div
                key={invite.id}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl flex-shrink-0">
                    {invite.workspaceIcon || '🏢'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {invite.workspaceName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      You've been invited to join this workspace
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleAccept(invite.id, invite.workspaceId)}
                        disabled={loading || processingInvite === invite.id}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition font-medium"
                      >
                        <Check size={16} />
                        {processingInvite === invite.id ? 'Accepting...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleDecline(invite.id)}
                        disabled={loading || processingInvite === invite.id}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 transition font-medium"
                      >
                        <XIcon size={16} />
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Accepting an invitation will give you access to all channels in the workspace
          </p>
        </div>
      </div>
    </div>
  );
}
