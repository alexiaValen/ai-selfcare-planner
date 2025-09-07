'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false,
    disabled,
    children, 
    ...props 
  }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center rounded-lg font-semibold
      transition-all duration-300 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      transform hover:scale-105 active:scale-95
    `;

    const variants = {
      primary: `
        bg-gradient-to-r from-pink-200 to-purple-200 
        text-gray-800 hover:from-pink-300 hover:to-purple-300
        shadow-lg hover:shadow-xl
        focus:ring-purple-300
      `,
      secondary: `
        bg-gradient-to-r from-blue-200 to-teal-200 
        text-gray-800 hover:from-blue-300 hover:to-teal-300
        shadow-lg hover:shadow-xl
        focus:ring-teal-300
      `,
      accent: `
        bg-gradient-to-r from-orange-200 to-pink-200 
        text-gray-800 hover:from-orange-300 hover:to-pink-300
        shadow-lg hover:shadow-xl
        focus:ring-pink-300
      `,
      outline: `
        border-2 border-purple-300 text-purple-700 
        hover:bg-purple-50 hover:border-purple-400
        focus:ring-purple-300
      `,
      ghost: `
        text-gray-700 hover:bg-gray-100 
        focus:ring-gray-300
      `,
    };

    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
      xl: 'px-8 py-4 text-xl',
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        {...(props as any)}
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </div>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button };