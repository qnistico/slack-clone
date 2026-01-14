interface SkeletonProps {
  className?: string;
  shimmer?: boolean;
}

// Base skeleton element with shimmer animation
export function Skeleton({ className = '', shimmer = false }: SkeletonProps) {
  return (
    <div
      className={`${shimmer ? 'skeleton-shimmer' : 'animate-pulse bg-gray-200 dark:bg-gray-700'} rounded ${className}`}
    />
  );
}

// Message skeleton - mimics message layout
export function MessageSkeleton() {
  return (
    <div className="flex gap-3 p-2">
      {/* Avatar */}
      <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        {/* Name and time */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        {/* Message content - variable lines */}
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-3/4 max-w-sm" />
      </div>
    </div>
  );
}

// Multiple message skeletons
export function MessageListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex-1 overflow-hidden p-4 space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeleton key={i} />
      ))}
    </div>
  );
}

// Channel item skeleton
export function ChannelSkeleton() {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <Skeleton className="w-4 h-4 rounded" />
      <Skeleton className="h-4 flex-1 max-w-[120px]" />
    </div>
  );
}

// Sidebar skeleton
export function SidebarSkeleton() {
  return (
    <div className="w-full lg:w-64 bg-purple-900 p-4 space-y-6">
      {/* Workspace header */}
      <div className="flex items-center gap-2 pb-4 border-b border-purple-800">
        <Skeleton className="w-8 h-8 rounded bg-purple-700" />
        <Skeleton className="h-5 flex-1 bg-purple-700" />
      </div>

      {/* Search button skeleton */}
      <Skeleton className="h-10 w-full bg-purple-800" />

      {/* Channels section */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20 bg-purple-700" />
        {Array.from({ length: 4 }).map((_, i) => (
          <ChannelSkeleton key={i} />
        ))}
      </div>

      {/* DMs section */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28 bg-purple-700" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5">
            <Skeleton className="w-6 h-6 rounded bg-purple-700" />
            <Skeleton className="h-4 flex-1 max-w-[100px] bg-purple-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

// User list skeleton
export function UserListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Channel header skeleton
export function ChannelHeaderSkeleton() {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-8" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="w-8 h-8 rounded" />
      </div>
    </div>
  );
}

// Full page loading skeleton
export function PageSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mini navbar skeleton */}
      <div className="hidden lg:flex flex-col w-16 bg-purple-950 items-center py-4 space-y-4">
        <Skeleton className="w-10 h-10 rounded-xl bg-purple-800" />
        <Skeleton className="w-10 h-10 rounded-xl bg-purple-800" />
        <Skeleton className="w-10 h-10 rounded-xl bg-purple-800" />
      </div>

      {/* Sidebar skeleton */}
      <div className="hidden lg:block">
        <SidebarSkeleton />
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        <ChannelHeaderSkeleton />
        <MessageListSkeleton count={8} />
        {/* Input skeleton */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Workspace card skeleton for home page
export function WorkspaceCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

// Thread panel skeleton
export function ThreadPanelSkeleton() {
  return (
    <div className="w-full lg:w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="w-8 h-8 rounded" />
      </div>
      {/* Parent message */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <MessageSkeleton />
      </div>
      {/* Replies */}
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <MessageSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Activity notification skeleton
export function ActivityNotificationSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <div className="relative flex-shrink-0">
        <Skeleton className="w-10 h-10 rounded-lg" shimmer />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <Skeleton className="h-4 w-24" shimmer />
          <Skeleton className="h-3 w-12" shimmer />
        </div>
        <Skeleton className="h-3 w-32" shimmer />
        <Skeleton className="h-3 w-48" shimmer />
      </div>
    </div>
  );
}

// Activity panel skeleton
export function ActivityPanelSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {Array.from({ length: count }).map((_, i) => (
        <ActivityNotificationSkeleton key={i} />
      ))}
    </div>
  );
}

// DM conversation item skeleton
export function DMItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <div className="relative flex-shrink-0">
        <Skeleton className="w-8 h-8 rounded-lg" shimmer />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800">
          <Skeleton className="w-full h-full rounded-full" />
        </div>
      </div>
      <Skeleton className="h-4 flex-1 max-w-[100px]" shimmer />
    </div>
  );
}

// Search results skeleton
export function SearchResultSkeleton() {
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="w-6 h-6 rounded" shimmer />
        <Skeleton className="h-4 w-24" shimmer />
        <Skeleton className="h-3 w-16" shimmer />
      </div>
      <Skeleton className="h-4 w-full" shimmer />
      <Skeleton className="h-4 w-3/4" shimmer />
    </div>
  );
}

// Search results list skeleton
export function SearchResultsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {Array.from({ length: count }).map((_, i) => (
        <SearchResultSkeleton key={i} />
      ))}
    </div>
  );
}

// Profile card skeleton
export function ProfileCardSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {/* Avatar and header */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-lg" shimmer />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-32" shimmer />
          <div className="flex items-center gap-2">
            <Skeleton className="w-2.5 h-2.5 rounded-full" />
            <Skeleton className="h-4 w-16" shimmer />
          </div>
        </div>
      </div>
      {/* Details */}
      <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Skeleton className="w-5 h-5 rounded" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3 w-12" shimmer />
            <Skeleton className="h-4 w-40" shimmer />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-5 h-5 rounded" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3 w-20" shimmer />
            <Skeleton className="h-4 w-28" shimmer />
          </div>
        </div>
      </div>
    </div>
  );
}

// Call modal skeleton
export function CallModalSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <Skeleton className="w-24 h-24 rounded-full" shimmer />
      <div className="space-y-2 text-center">
        <Skeleton className="h-6 w-32 mx-auto" shimmer />
        <Skeleton className="h-4 w-24 mx-auto" shimmer />
      </div>
      <div className="flex gap-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <Skeleton className="w-12 h-12 rounded-full" />
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
    </div>
  );
}
