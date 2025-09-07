import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return formatDate(date);
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function getRandomColor(): string {
  const colors = [
    'from-pink-200 to-purple-200',
    'from-purple-200 to-indigo-200',
    'from-indigo-200 to-blue-200',
    'from-blue-200 to-teal-200',
    'from-teal-200 to-green-200',
    'from-green-200 to-yellow-200',
    'from-yellow-200 to-orange-200',
    'from-orange-200 to-pink-200',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getMoodColor(mood: string): string {
  const moodColors: Record<string, string> = {
    stressed: 'from-red-200 to-orange-200',
    anxious: 'from-yellow-200 to-orange-200',
    sad: 'from-blue-200 to-indigo-200',
    neutral: 'from-gray-200 to-gray-300',
    happy: 'from-yellow-200 to-green-200',
    excited: 'from-orange-200 to-pink-200',
    calm: 'from-blue-200 to-teal-200',
    energetic: 'from-green-200 to-yellow-200',
  };
  return moodColors[mood] || 'from-gray-200 to-gray-300';
}

export function getGoalColor(goal: string): string {
  const goalColors: Record<string, string> = {
    stress_relief: 'from-blue-200 to-teal-200',
    confidence_building: 'from-orange-200 to-pink-200',
    relaxation: 'from-purple-200 to-indigo-200',
    mindfulness: 'from-green-200 to-teal-200',
    productivity: 'from-yellow-200 to-orange-200',
    sleep_improvement: 'from-indigo-200 to-purple-200',
  };
  return goalColors[goal] || 'from-gray-200 to-gray-300';
}