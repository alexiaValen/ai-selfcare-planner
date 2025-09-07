'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  className?: string;
}

export function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  color, 
  className 
}: FeatureCardProps) {
  return (
    <motion.div
      className={cn(
        'card-glass p-6 rounded-2xl card-hover group cursor-pointer',
        className
      )}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Icon Container */}
        <motion.div
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            'bg-gradient-to-r shadow-lg group-hover:shadow-xl',
            color
          )}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ duration: 0.3 }}
        >
          <Icon className="w-8 h-8 text-gray-700" />
        </motion.div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-700 transition-colors">
            {title}
          </h3>
          <p className="text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Decorative Element */}
        <motion.div
          className="w-12 h-1 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full opacity-0 group-hover:opacity-100"
          initial={{ width: 0 }}
          whileHover={{ width: 48 }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Background Decoration */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300">
        <div className={cn('w-full h-full rounded-2xl bg-gradient-to-br', color)} />
      </div>
    </motion.div>
  );
}