const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Activity = require('../models/Activity');

const router = express.Router();

// @route   GET /api/users/search
// @desc    Search for users by username or name
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const searchRegex = new RegExp(q.trim(), 'i');

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude current user
        { isActive: true },
        {
          $or: [
            { username: searchRegex },
            { 'profile.firstName': searchRegex },
            { 'profile.lastName': searchRegex }
          ]
        }
      ]
    })
    .select('username profile.firstName profile.lastName profile.avatar streakData.currentStreak createdAt')
    .limit(parseInt(limit));

    res.json({ users });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      message: 'Error searching users',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/users/:userId/profile
// @desc    Get user's public profile
// @access  Private
router.get('/:userId/profile', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('username profile streakData achievements createdAt socialData.privacy');

    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check privacy settings
    const currentUser = await User.findById(req.user._id);
    const isFriend = currentUser.socialData.friends.some(friend => 
      friend.userId.toString() === userId.toString() && friend.status === 'accepted'
    );

    const isOwnProfile = userId.toString() === req.user._id.toString();

    if (user.socialData.privacy.profileVisibility === 'private' && !isOwnProfile) {
      return res.status(403).json({ message: 'Profile is private' });
    }

    if (user.socialData.privacy.profileVisibility === 'friends' && !isFriend && !isOwnProfile) {
      return res.status(403).json({ message: 'Profile is only visible to friends' });
    }

    // Get user's public activities if sharing is enabled
    let recentActivities = [];
    if (user.socialData.privacy.shareProgress || isFriend || isOwnProfile) {
      recentActivities = await Activity.find({
        userId: userId,
        'socialData.isShared': true,
        isActive: true
      })
      .select('type category title createdAt completionData.isCompleted socialData.likes')
      .sort({ createdAt: -1 })
      .limit(5);
    }

    // Get activity stats
    const activityStats = await Activity.aggregate([
      { $match: { userId: user._id, 'completionData.isCompleted': true } },
      {
        $group: {
          _id: null,
          totalCompleted: { $sum: 1 },
          favoriteType: { $push: '$type' }
        }
      }
    ]);

    const stats = activityStats[0] || { totalCompleted: 0, favoriteType: [] };
    
    // Find most common activity type
    const typeCounts = stats.favoriteType.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    const favoriteType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

    const publicProfile = {
      _id: user._id,
      username: user.username,
      profile: {
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        avatar: user.profile.avatar,
        bio: user.profile.bio
      },
      streakData: {
        currentStreak: user.streakData.currentStreak,
        longestStreak: user.streakData.longestStreak,
        totalActivitiesCompleted: user.streakData.totalActivitiesCompleted
      },
      achievements: user.achievements,
      stats: {
        totalCompleted: stats.totalCompleted,
        favoriteActivityType: favoriteType,
        memberSince: user.createdAt
      },
      recentActivities,
      relationship: {
        isFriend,
        isOwnProfile
      }
    };

    res.json({ profile: publicProfile });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      message: 'Error fetching user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/users/leaderboard
// @desc    Get wellness leaderboard
// @access  Private
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const { type = 'streak', period = 'all', limit = 50 } = req.query;

    let matchStage = { isActive: true };
    let sortStage = {};

    // Add time period filter if needed
    if (period !== 'all') {
      const startDate = new Date();
      switch (period) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }
      matchStage.lastLogin = { $gte: startDate };
    }

    let leaderboard = [];

    switch (type) {
      case 'streak':
        leaderboard = await User.find(matchStage)
          .select('username profile.firstName profile.avatar streakData.currentStreak')
          .sort({ 'streakData.currentStreak': -1, 'streakData.longestStreak': -1 })
          .limit(parseInt(limit));
        
        leaderboard = leaderboard.map((user, index) => ({
          rank: index + 1,
          user: {
            _id: user._id,
            username: user.username,
            firstName: user.profile.firstName,
            avatar: user.profile.avatar
          },
          value: user.streakData.currentStreak,
          label: `${user.streakData.currentStreak} day${user.streakData.currentStreak !== 1 ? 's' : ''}`
        }));
        break;

      case 'activities':
        leaderboard = await User.find(matchStage)
          .select('username profile.firstName profile.avatar streakData.totalActivitiesCompleted')
          .sort({ 'streakData.totalActivitiesCompleted': -1 })
          .limit(parseInt(limit));
        
        leaderboard = leaderboard.map((user, index) => ({
          rank: index + 1,
          user: {
            _id: user._id,
            username: user.username,
            firstName: user.profile.firstName,
            avatar: user.profile.avatar
          },
          value: user.streakData.totalActivitiesCompleted,
          label: `${user.streakData.totalActivitiesCompleted} activities`
        }));
        break;

      case 'social':
        // Most liked activities
        const socialLeaders = await Activity.aggregate([
          {
            $match: {
              'socialData.isShared': true,
              isActive: true,
              ...(period !== 'all' && { createdAt: { $gte: startDate } })
            }
          },
          {
            $group: {
              _id: '$userId',
              totalLikes: { $sum: { $size: '$socialData.likes' } },
              totalShared: { $sum: 1 }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          {
            $unwind: '$user'
          },
          {
            $match: {
              'user.isActive': true
            }
          },
          {
            $sort: { totalLikes: -1, totalShared: -1 }
          },
          {
            $limit: parseInt(limit)
          }
        ]);

        leaderboard = socialLeaders.map((item, index) => ({
          rank: index + 1,
          user: {
            _id: item.user._id,
            username: item.user.username,
            firstName: item.user.profile.firstName,
            avatar: item.user.profile.avatar
          },
          value: item.totalLikes,
          label: `${item.totalLikes} likes`
        }));
        break;

      default:
        return res.status(400).json({ message: 'Invalid leaderboard type' });
    }

    // Find current user's position
    const currentUserRank = leaderboard.findIndex(entry => 
      entry.user._id.toString() === req.user._id.toString()
    ) + 1;

    res.json({
      leaderboard,
      currentUserRank: currentUserRank || null,
      type,
      period,
      total: leaderboard.length
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      message: 'Error fetching leaderboard',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/users/achievements/unlock
// @desc    Unlock achievement for user
// @access  Private
router.post('/achievements/unlock', auth, async (req, res) => {
  try {
    const { type, description } = req.body;

    if (!type) {
      return res.status(400).json({ message: 'Achievement type is required' });
    }

    const user = await User.findById(req.user._id);

    // Check if achievement already exists
    const existingAchievement = user.achievements.find(achievement => 
      achievement.type === type
    );

    if (existingAchievement) {
      return res.status(400).json({ message: 'Achievement already unlocked' });
    }

    // Add new achievement
    user.achievements.push({
      type,
      description: description || this.getAchievementDescription(type),
      unlockedAt: new Date()
    });

    await user.save();

    const newAchievement = user.achievements[user.achievements.length - 1];

    res.json({
      message: 'Achievement unlocked!',
      achievement: newAchievement
    });

  } catch (error) {
    console.error('Unlock achievement error:', error);
    res.status(500).json({
      message: 'Error unlocking achievement',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/users/suggestions
// @desc    Get friend suggestions based on similar interests
// @access  Private
router.get('/suggestions', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const currentFriendIds = currentUser.socialData.friends.map(friend => friend.userId);
    
    // Find users with similar goals and activity preferences
    const suggestions = await User.find({
      _id: { 
        $ne: req.user._id,
        $nin: currentFriendIds
      },
      isActive: true,
      $or: [
        { primaryGoal: currentUser.primaryGoal },
        { 'preferences.contentPreferences.preferredActivityTypes': { 
          $in: currentUser.preferences.contentPreferences?.preferredActivityTypes || [] 
        }}
      ]
    })
    .select('username profile.firstName profile.lastName profile.avatar profile.bio primaryGoal streakData.currentStreak')
    .limit(10);

    // Calculate similarity scores
    const suggestionsWithScores = suggestions.map(user => {
      let score = 0;
      
      // Same primary goal
      if (user.primaryGoal === currentUser.primaryGoal) score += 3;
      
      // Similar activity preferences
      const userPrefs = user.preferences?.contentPreferences?.preferredActivityTypes || [];
      const currentPrefs = currentUser.preferences?.contentPreferences?.preferredActivityTypes || [];
      const commonPrefs = userPrefs.filter(pref => currentPrefs.includes(pref));
      score += commonPrefs.length;
      
      // Similar streak levels
      const streakDiff = Math.abs(user.streakData.currentStreak - currentUser.streakData.currentStreak);
      if (streakDiff <= 5) score += 2;
      else if (streakDiff <= 10) score += 1;

      return {
        user: {
          _id: user._id,
          username: user.username,
          profile: user.profile,
          primaryGoal: user.primaryGoal,
          currentStreak: user.streakData.currentStreak
        },
        similarityScore: score,
        reasons: [
          ...(user.primaryGoal === currentUser.primaryGoal ? ['Same wellness goal'] : []),
          ...(commonPrefs.length > 0 ? [`${commonPrefs.length} shared interests`] : []),
          ...(streakDiff <= 5 ? ['Similar activity level'] : [])
        ]
      };
    });

    // Sort by similarity score
    suggestionsWithScores.sort((a, b) => b.similarityScore - a.similarityScore);

    res.json({
      suggestions: suggestionsWithScores.slice(0, 5)
    });

  } catch (error) {
    console.error('Get friend suggestions error:', error);
    res.status(500).json({
      message: 'Error fetching friend suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/users/privacy
// @desc    Update user privacy settings
// @access  Private
router.put('/privacy', auth, async (req, res) => {
  try {
    const { profileVisibility, shareProgress } = req.body;

    const user = await User.findById(req.user._id);

    if (profileVisibility !== undefined) {
      if (!['public', 'friends', 'private'].includes(profileVisibility)) {
        return res.status(400).json({ message: 'Invalid profile visibility setting' });
      }
      user.socialData.privacy.profileVisibility = profileVisibility;
    }

    if (shareProgress !== undefined) {
      user.socialData.privacy.shareProgress = shareProgress;
    }

    await user.save();

    res.json({
      message: 'Privacy settings updated successfully',
      privacy: user.socialData.privacy
    });

  } catch (error) {
    console.error('Update privacy settings error:', error);
    res.status(500).json({
      message: 'Error updating privacy settings',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// Helper function to get achievement descriptions
function getAchievementDescription(type) {
  const descriptions = {
    'first_activity': 'Completed your first wellness activity',
    'week_streak': 'Maintained a 7-day activity streak',
    'month_streak': 'Maintained a 30-day activity streak',
    'social_butterfly': 'Shared 10 activities with friends',
    'goal_achiever': 'Completed 50 activities toward your primary goal'
  };
  
  return descriptions[type] || 'Achievement unlocked!';
}

module.exports = router;