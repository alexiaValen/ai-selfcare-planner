'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Hero3D } from '@/components/3d/Hero3D';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { Button } from '@/components/ui/Button';
import { 
  Heart, 
  Brain, 
  Users, 
  Calendar, 
  Sparkles, 
  Target,
  MessageCircle,
  TrendingUp 
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Recommendations',
    description: 'Get personalized self-care activities and affirmations tailored to your mood and goals.',
    color: 'from-pink-200 to-purple-200'
  },
  {
    icon: Heart,
    title: 'Mood Tracking',
    description: 'Track your emotional journey and see how self-care activities improve your wellbeing.',
    color: 'from-purple-200 to-indigo-200'
  },
  {
    icon: Calendar,
    title: 'Streak Tracking',
    description: 'Build healthy habits with visual streak tracking and achievement rewards.',
    color: 'from-indigo-200 to-blue-200'
  },
  {
    icon: Users,
    title: 'Social Challenges',
    description: 'Join friends in wellness challenges and share your self-care journey together.',
    color: 'from-blue-200 to-teal-200'
  },
  {
    icon: Sparkles,
    title: 'Daily Affirmations',
    description: 'Start each day with personalized, AI-generated affirmations that inspire and motivate.',
    color: 'from-teal-200 to-green-200'
  },
  {
    icon: Target,
    title: 'Goal Setting',
    description: 'Set and achieve wellness goals with guided activities and progress tracking.',
    color: 'from-green-200 to-yellow-200'
  },
  {
    icon: MessageCircle,
    title: 'Community Support',
    description: 'Connect with like-minded individuals on their wellness journey for mutual support.',
    color: 'from-yellow-200 to-orange-200'
  },
  {
    icon: TrendingUp,
    title: 'Progress Analytics',
    description: 'Visualize your wellness journey with detailed insights and progress reports.',
    color: 'from-orange-200 to-pink-200'
  }
];

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* 3D Background */}
        <div className="absolute inset-0 z-0">
          <Hero3D />
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <motion.h1 
              className="text-5xl md:text-7xl font-bold gradient-text leading-tight"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              Your AI-Powered
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Self-Care Companion
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Discover personalized wellness activities, track your mood, build healthy habits, 
              and connect with friends on your journey to better mental health.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Button
                size="lg"
                onClick={() => router.push('/register')}
                className="btn-primary text-lg px-8 py-4 min-w-[200px]"
              >
                Start Your Journey
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push('/login')}
                className="text-lg px-8 py-4 min-w-[200px] border-2 border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                Sign In
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 floating-animation">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-pink-200 to-purple-200 opacity-60"></div>
        </div>
        <div className="absolute top-40 right-20 floating-animation" style={{ animationDelay: '1s' }}>
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-200 to-teal-200 opacity-60"></div>
        </div>
        <div className="absolute bottom-40 left-20 floating-animation" style={{ animationDelay: '2s' }}>
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-200 to-yellow-200 opacity-60"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              Everything You Need for
              <span className="gradient-text"> Wellness</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI-powered platform combines cutting-edge technology with proven wellness practices 
              to create a personalized self-care experience just for you.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <FeatureCard {...feature} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-100 via-pink-100 to-indigo-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800">
              Ready to Transform Your
              <span className="gradient-text"> Wellness Journey?</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join thousands of users who have already discovered the power of AI-guided self-care. 
              Start your personalized wellness journey today.
            </p>
            <Button
              size="lg"
              onClick={() => router.push('/register')}
              className="btn-primary text-xl px-12 py-6"
            >
              Get Started Free
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold gradient-text mb-4">AI Self-Care Planner</h3>
            <p className="text-gray-600 mb-6">
              Your personalized wellness companion powered by artificial intelligence.
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-purple-600 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-purple-600 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-purple-600 transition-colors">Contact Us</a>
            </div>
            <p className="text-gray-400 text-sm mt-6">
              © 2024 AI Self-Care Planner. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
