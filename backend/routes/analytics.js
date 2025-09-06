const express = require('express');
const { auth } = require('../middleware/auth');
const Activity = require('../models/Activity');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/analytics/streaks
// @desc    Get user's streak analytics
// @access  Private
router.get('/streaks', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Get daily activity data for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyActivities = await Activity.aggregate([
      {
        $match: {
          userId: user._id,
          'completionData.isCompleted': true,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          date: { $first: '$createdAt' }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    // Calculate streak calendar data
    const streakCalendar = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dayData = dailyActivities.find(day => {
        const dayDate = new Date(day.date);
        return dayDate.toDateString() === date.toDateString();
      });

      streakCalendar.push({
        date: date.toISOString().split('T')[0],
        count: dayData ? dayData.count : 0,
        hasActivity: !!dayData
      });
    }

    res.json({
      streakData: user.streakData,
      streakCalendar,
      analytics: {
        activeDays: dailyActivities.length,
        totalActivities: dailyActivities.reduce((sum, day) => sum + day.count, 0),
        averagePerDay: dailyActivities.length > 0 
          ? (dailyActivities.reduce((sum, day) => sum + day.count, 0) / dailyActivities.length).toFixed(1)
          : 0
      }
    });

  } catch (error) {
    console.error('Get streak analytics error:', error);
    res.status(500).json({
      message: 'Error fetching streak analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/analytics/progress
// @desc    Get user's progress analytics
// @access  Private
router.get('/progress', auth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Activity completion trends
    const completionTrends = await Activity.aggregate([
      {
        $match: {
          userId: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: ['$completionData.isCompleted', 1, 0] }
          },
          date: { $first: '$createdAt' }
        }
      },
      {
        $addFields: {
          completionRate: {
            $multiply: [
              { $divide: ['$completed', '$total'] },
              100
            ]
          }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    // Activity type distribution
    const activityTypes = await Activity.aggregate([
      {
        $match: {
          userId: req.user._id,
          'completionData.isCompleted': true,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          averageRating: { $avg: '$completionData.rating' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Mood progression
    const moodProgression = await Activity.aggregate([
      {
        $match: {
          userId: req.user._id,
          'completionData.isCompleted': true,
          'completionData.mood.before': { $exists: true },
          'completionData.mood.after': { $exists: true },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            before: '$completionData.mood.before',
            after: '$completionData.mood.after'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Goal progress
    const goalProgress = await Activity.aggregate([
      {
        $match: {
          userId: req.user._id,
          'completionData.isCompleted': true,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          averageRating: { $avg: '$completionData.rating' },
          totalDuration: { $sum: '$duration' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Weekly summary
    const weeklySummary = await Activity.aggregate([
      {
        $match: {
          userId: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            week: { $week: '$createdAt' }
          },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: ['$completionData.isCompleted', 1, 0] }
          },
          totalDuration: { $sum: '$duration' },
          averageRating: { $avg: '$completionData.rating' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.week': 1 }
      }
    ]);

    res.json({
      period,
      completionTrends,
      activityTypes,
      moodProgression,
      goalProgress,
      weeklySummary,
      summary: {
        totalActivities: completionTrends.reduce((sum, day) => sum + day.total, 0),
        totalCompleted: completionTrends.reduce((sum, day) => sum + day.completed, 0),
        averageCompletionRate: completionTrends.length > 0 
          ? (completionTrends.reduce((sum, day) => sum + day.completionRate, 0) / completionTrends.length).toFixed(1)
          : 0,
        totalTimeSpent: goalProgress.reduce((sum, goal) => sum + goal.totalDuration, 0)
      }
    });

  } catch (error) {
    console.error('Get progress analytics error:', error);
    res.status(500).json({
      message: 'Error fetching progress analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/analytics/insights
// @desc    Get AI-powered insights about user's wellness journey
// @access  Private
router.get('/insights', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get recent activity data
    const recentActivities = await Activity.find({
      userId: req.user._id,
      'completionData.isCompleted': true,
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: -1 });

    // Calculate insights
    const insights = [];

    // Streak insights
    if (user.streakData.currentStreak >= 7) {
      insights.push({
        type: 'achievement',
        title: 'Great Consistency!',
        message: `You're on a ${user.streakData.currentStreak}-day streak! Keep up the amazing work.`,
        icon: '🔥',
        priority: 'high'
      });
    } else if (user.streakData.currentStreak === 0) {
      insights.push({
        type: 'motivation',
        title: 'Ready for a Fresh Start?',
        message: 'Every journey begins with a single step. Start your wellness streak today!',
        icon: '🌱',
        priority: 'medium'
      });
    }

    // Activity pattern insights
    const activityCounts = recentActivities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {});

    const mostFrequentActivity = Object.entries(activityCounts)
      .sort(([,a], [,b]) => b - a)[0];

    if (mostFrequentActivity) {
      insights.push({
        type: 'pattern',
        title: 'Your Favorite Activity',
        message: `You've been loving ${mostFrequentActivity[0]} activities! You've completed ${mostFrequentActivity[1]} in the last 30 days.`,
        icon: '⭐',
        priority: 'low'
      });
    }

    // Mood improvement insights
    const moodImprovements = recentActivities.filter(activity => {
      const before = activity.completionData.mood?.before;
      const after = activity.completionData.mood?.after;
      
      const moodScale = {
        'sad': 1, 'stressed': 2, 'anxious': 2, 'neutral': 3,
        'calm': 4, 'happy': 5, 'excited': 5, 'energetic': 5
      };
      
      return before && after && moodScale[after] > moodScale[before];
    });

    if (moodImprovements.length > 0) {
      const improvementRate = (moodImprovements.length / recentActivities.length * 100).toFixed(0);
      insights.push({
        type: 'progress',
        title: 'Mood Booster',
        message: `${improvementRate}% of your activities have improved your mood. You're doing great!`,
        icon: '😊',
        priority: 'high'
      });
    }

    // Goal progress insights
    const goalActivities = recentActivities.filter(activity => 
      activity.category === user.primaryGoal
    );

    if (goalActivities.length >= 10) {
      insights.push({
        type: 'achievement',
        title: 'Goal Focused',
        message: `You've completed ${goalActivities.length} activities toward your ${user.primaryGoal.replace('_', ' ')} goal this month!`,
        icon: '🎯',
        priority: 'high'
      });
    }

    // Time of day insights
    const hourCounts = recentActivities.reduce((acc, activity) => {
      const hour = new Date(activity.createdAt).getHours();
      let timeOfDay;
      if (hour >= 6 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
      else timeOfDay = 'night';
      
      acc[timeOfDay] = (acc[timeOfDay] || 0) + 1;
      return acc;
    }, {});

    const preferredTime = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0];

    if (preferredTime) {
      insights.push({
        type: 'pattern',
        title: 'Your Peak Time',
        message: `You're most active in the ${preferredTime[0]}. Consider scheduling important activities during this time.`,
        icon: '⏰',
        priority: 'low'
      });
    }

    // Recommendations based on data
    const recommendations = [];

    if (user.streakData.currentStreak < 3) {
      recommendations.push({
        type: 'habit',
        title: 'Build Consistency',
        message: 'Try setting a daily reminder to complete at least one small activity.',
        action: 'Set Daily Reminder'
      });
    }

    if (recentActivities.length < 10) {
      recommendations.push({
        type: 'engagement',
        title: 'Explore More Activities',
        message: 'Discover new types of self-care activities to keep your routine fresh.',
        action: 'Browse Activities'
      });
    }

    res.json({
      insights: insights.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      recommendations,
      dataPoints: {
        totalActivities: recentActivities.length,
        currentStreak: user.streakData.currentStreak,
        longestStreak: user.streakData.longestStreak,
        moodImprovements: moodImprovements.length,
        goalActivities: goalActivities.length
      }
    });

  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({
      message: 'Error generating insights',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/analytics/export
// @desc    Export user's data
// @access  Private
router.get('/export', auth, async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const user = await User.findById(req.user._id).select('-password');
    const activities = await Activity.find({ userId: req.user._id });

    const exportData = {
      user: {
        profile: user.profile,
        preferences: user.preferences,
        streakData: user.streakData,
        achievements: user.achievements,
        exportedAt: new Date().toISOString()
      },
      activities: activities.map(activity => ({
        type: activity.type,
        category: activity.category,
        title: activity.title,
        content: activity.content,
        duration: activity.duration,
        difficulty: activity.difficulty,
        completed: activity.completionData.isCompleted,
        completedAt: activity.completionData.completedAt,
        rating: activity.completionData.rating,
        feedback: activity.completionData.feedback,
        moodBefore: activity.completionData.mood?.before,
        moodAfter: activity.completionData.mood?.after,
        createdAt: activity.createdAt
      })),
      summary: {
        totalActivities: activities.length,
        completedActivities: activities.filter(a => a.completionData.isCompleted).length,
        currentStreak: user.streakData.currentStreak,
        longestStreak: user.streakData.longestStreak
      }
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csv = this.convertToCSV(exportData.activities);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="wellness-data.csv"');
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="wellness-data.json"');
      res.json(exportData);
    }

  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      message: 'Error exporting data',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// Helper function to convert data to CSV
function convertToCSV(activities) {
  const headers = [
    'Date', 'Type', 'Category', 'Title', 'Duration', 'Difficulty',
    'Completed', 'Rating', 'Mood Before', 'Mood After', 'Feedback'
  ];

  const rows = activities.map(activity => [
    new Date(activity.createdAt).toISOString().split('T')[0],
    activity.type,
    activity.category,
    activity.title,
    activity.duration,
    activity.difficulty,
    activity.completed ? 'Yes' : 'No',
    activity.rating || '',
    activity.moodBefore || '',
    activity.moodAfter || '',
    activity.feedback || ''
  ]);

  return [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
}

module.exports = router;