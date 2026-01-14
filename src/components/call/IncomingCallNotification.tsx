import { Phone, PhoneOff, Video } from 'lucide-react';
import type { CallData } from '../../services/webrtcService';
import { getUserAvatar } from '../../utils/avatar';

interface IncomingCallNotificationProps {
  callData: CallData;
  onAnswer: () => void;
  onDecline: () => void;
}

export default function IncomingCallNotification({
  callData,
  onAnswer,
  onDecline,
}: IncomingCallNotificationProps) {
  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 w-80 border border-gray-200 dark:border-gray-700">
        {/* Caller info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <img
              src={getUserAvatar(callData.callerName)}
              alt={callData.callerName}
              className="w-12 h-12 rounded-full"
            />
            {/* Pulsing indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {callData.callerName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              {callData.type === 'video' ? (
                <>
                  <Video size={14} />
                  Video call
                </>
              ) : (
                <>
                  <Phone size={14} />
                  Voice call
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
          >
            <PhoneOff size={18} />
            Decline
          </button>
          <button
            onClick={onAnswer}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
          >
            <Phone size={18} />
            Answer
          </button>
        </div>
      </div>

      {/* CSS for animation */}
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
