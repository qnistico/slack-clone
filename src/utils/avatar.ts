/**
 * Generates a profile picture URL using DiceBear API
 * Falls back to UI Avatars if needed
 */
export const generateAvatar = (name: string, seed?: string): string => {
  const avatarSeed = seed || name;
  // Using DiceBear's initials style with a nice color palette
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=c084fc,a855f7,9333ea,7c3aed,6b21a8`;
};

/**
 * Alternative avatar generator using UI Avatars
 */
export const generateUIAvatar = (name: string): string => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=9333ea&color=fff&size=128`;
};

/**
 * Get user avatar - returns custom avatar if available, otherwise generates one
 */
export const getUserAvatar = (name: string, customAvatar?: string | null): string => {
  if (customAvatar) {
    return customAvatar;
  }
  return generateAvatar(name);
};
