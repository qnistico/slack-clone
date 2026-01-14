import React from 'react';

export const formatMessageContent = (content: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  // Regex patterns for formatting
  const patterns = [
    { regex: /\*([^*]+)\*/g, component: (text: string) => <strong key={key++}>{text}</strong> }, // Bold
    { regex: /_([^_]+)_/g, component: (text: string) => <em key={key++}>{text}</em> }, // Italic
    { regex: /`([^`]+)`/g, component: (text: string) => <code key={key++} className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono text-purple-600 dark:text-purple-400">{text}</code> }, // Code
    { regex: /@(\w+)/g, component: (text: string) => <span key={key++} className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 rounded font-medium">@{text}</span> }, // Mention
  ];

  // Combine all patterns into a single regex
  const combinedRegex = new RegExp(
    patterns.map(p => p.regex.source).join('|'),
    'g'
  );

  let match;
  while ((match = combinedRegex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    // Determine which pattern matched and apply formatting
    if (match[1] !== undefined) {
      // Bold
      parts.push(<strong key={key++}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      // Italic
      parts.push(<em key={key++}>{match[2]}</em>);
    } else if (match[3] !== undefined) {
      // Code
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono text-purple-600 dark:text-purple-400">
          {match[3]}
        </code>
      );
    } else if (match[4] !== undefined) {
      // Mention
      parts.push(
        <span key={key++} className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 rounded font-medium">
          @{match[4]}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts.length > 0 ? parts : content;
};
