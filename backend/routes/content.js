const express = require('express');
const { auth } = require('../middleware/auth');
const openaiService = require('../services/openaiService');
const Activity = require('../models/Activity');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/content/daily-affirmation
// @desc    Get daily personalized affirmation
// @access  Private
router.get('/daily-affirmation', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has an affirmation for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingAffirmation = await Activity.findOne({
      userId: user._id,
      type: 'affirmation',
      createdAt: { $gte: today }
    });

    if (existingAffirmation) {
      return res.json({
        affirmation: existingAffirmation,
        isNew: false
      });
    }

    // Generate new affirmation
    const userProfile = {
      currentMood: user.currentMood,
      primaryGoal: user.primaryGoal,
      preferences: user.preferences,
      profile: user.profile
    };

    const affirmationData = await openaiService.generateAffirmation(userProfile);
    
    // Save to database
    const affirmation = new Activity({
      userId: user._id,
      ...affirmationData,
      title: 'Daily Affirmation',
      description: 'Your personalized daily affirmation'
    });

    await affirmation.save();

    res.json({
      affirmation,
      isNew: true
    });

  } catch (error) {
    console.error('Daily affirmation error:', error);
    res.status(500).json({
      message: 'Error generating daily affirmation',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/content/generate-activity
// @desc    Generate personalized self-care activity
// @access  Private
router.post('/generate-activity', auth, async (req, res) => {
  try {
    const { activityType, customPrompt } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userProfile = {
      currentMood: user.currentMood,
      primaryGoal: user.primaryGoal,
      preferences: user.preferences,
      profile: user.profile
    };

    let activityData;

    switch (activityType) {
      case 'journaling':
        activityData = await openaiService.generateJournalingPrompt(userProfile);
        break;
      case 'wellness-tip':
        activityData = await openaiService.generateWellnessTip(userProfile);
        break;
      default:
        activityData = await openaiService.generateActivity(userProfile);
    }

    // Save to database
    const activity = new Activity({
      userId: user._id,
      ...activityData
    });

    await activity.save();

    res.json({
      activity,
      message: 'Activity generated successfully'
    });

  } catch (error) {
    console.error('Generate activity error:', error);
    res.status(500).json({
      message: 'Error generating activity',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/content/recommendations
// @desc    Get personalized content recommendations
// @access  Private
router.get('/recommendations', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's recent activities to avoid repetition
    const recentActivities = await Activity.find({
      userId: user._id,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).select('type category');

    // Get trending activities from other users
    const trendingActivities = await Activity.getTrendingActivities(5);

    // Get activities based on user's goal and mood
    const goalBasedActivities = await Activity.find({
      category: user.primaryGoal,
      isActive: true,
      'socialData.isShared': true
    })
    .populate('userId', 'username profile.firstName profile.avatar')
    .limit(5)
    .sort({ 'socialData.likes': -1, createdAt: -1 });

    // Get mood-based recommendations
    const moodRecommendations = await this.getMoodBasedRecommendations(user.currentMood);

    res.json({
      recommendations: {
        trending: trendingActivities,
        goalBased: goalBasedActivities,
        moodBased: moodRecommendations,
        recentTypes: recentActivities.map(a => a.type)
      }
    });

  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      message: 'Error fetching recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/content/motivational-message
// @desc    Generate motivational message for notifications
// @access  Private
router.post('/motivational-message', auth, async (req, res) => {
  try {
    const { context } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userProfile = {
      currentMood: user.currentMood,
      primaryGoal: user.primaryGoal,
      profile: user.profile
    };

    const message = await openaiService.generateMotivationalMessage(userProfile, context);

    res.json({
      message,
      context,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Generate motivational message error:', error);
    res.status(500).json({
      message: 'Error generating motivational message',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/content/daily-dashboard
// @desc    Get daily dashboard content
// @access  Private
router.get('/daily-dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's activities
    const todaysActivities = await Activity.find({
      userId: user._id,
      createdAt: { $gte: today }
    }).sort({ createdAt: -1 });

    // Get completed activities count for today
    const completedToday = todaysActivities.filter(a => a.completionData.isCompleted).length;

    // Get user's streak info
    const streakData = user.streakData;

    // Get daily affirmation
    const dailyAffirmation = todaysActivities.find(a => a.type === 'affirmation');

    // Generate wellness tip if none exists for today
    let wellnessTip = todaysActivities.find(a => a.type === 'tip');
    
    if (!wellnessTip) {
      try {
        const userProfile = {
          currentMood: user.currentMood,
          primaryGoal: user.primaryGoal,
          preferences: user.preferences
        };
        
        const tipData = await openaiService.generateWellnessTip(userProfile);
        
        wellnessTip = new Activity({
          userId: user._id,
          ...tipData
        });
        
        await wellnessTip.save();
      } catch (tipError) {
        console.error('Error generating wellness tip:', tipError);
        wellnessTip = null;
      }
    }

    // Get suggested activities based on time of day and user preferences
    const suggestedActivities = await this.getSuggestedActivities(user);

    res.json({
      dashboard: {
        user: {
          name: user.profile.firstName || user.username,
          currentMood: user.currentMood,
          primaryGoal: user.primaryGoal,
          avatar: user.profile.avatar
        },
        streak: streakData,
        todaysProgress: {
          activitiesCompleted: completedToday,
          totalActivities: todaysActivities.length,
          completionRate: todaysActivities.length > 0 ? (completedToday / todaysActivities.length) * 100 : 0
        },
        content: {
          dailyAffirmation,
          wellnessTip,
          suggestedActivities: suggestedActivities.slice(0, 3)
        },
        recentActivities: todaysActivities.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('Daily dashboard error:', error);
    res.status(500).json({
      message: 'Error fetching daily dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// Helper function to get mood-based recommendations
async function getMoodBasedRecommendations(mood) {
  const moodActivities = {
    stressed: ['breathing', 'meditation', 'stretching'],
    anxious: ['breathing', 'meditation', 'journaling'],
    sad: ['exercise', 'music', 'journaling'],
    neutral: ['meditation', 'reading', 'stretching'],
    happy: ['exercise', 'music', 'socializing'],
    excited: ['exercise', 'creative', 'socializing'],
    calm: ['reading', 'meditation', 'skincare'],
    energetic: ['exercise', 'dancing', 'creative']
  };

  const recommendedTypes = moodActivities[mood] || ['meditation', 'breathing'];
  
  return Activity.find({
    type: { $in: recommendedTypes },
    'socialData.isShared': true,
    isActive: true
  })
  .populate('userId', 'username profile.firstName profile.avatar')
  .sort({ 'socialData.likes': -1 })
  .limit(3);
}

// Helper function to get suggested activities based on time and preferences
async function getSuggestedActivities(user) {
  const hour = new Date().getHours();
  let suggestedTypes = [];

  // Time-based suggestions
  if (hour >= 6 && hour < 12) {
    // Morning
    suggestedTypes = ['meditation', 'stretching', 'journaling'];
  } else if (hour >= 12 && hour < 17) {
    // Afternoon
    suggestedTypes = ['breathing', 'exercise', 'reading'];
  } else if (hour >= 17 && hour < 21) {
    // Evening
    suggestedTypes = ['stretching', 'skincare', 'music'];
  } else {
    // Night
    suggestedTypes = ['meditation', 'breathing', 'reading'];
  }

  // Filter by user preferences if available
  const preferredTypes = user.preferences?.contentPreferences?.preferredActivityTypes;
  if (preferredTypes && preferredTypes.length > 0) {
    suggestedTypes = suggestedTypes.filter(type => preferredTypes.includes(type));
  }

  return Activity.find({
    type: { $in: suggestedTypes },
    'socialData.isShared': true,
    isActive: true
  })
  .populate('userId', 'username profile.firstName profile.avatar')
  .sort({ 'socialData.likes': -1, createdAt: -1 })
  .limit(5);
}

module.exports = router;