const express = require('express');
const { auth } = require('../middleware/auth');
const Activity = require('../models/Activity');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/activities
// @desc    Get user's activities with pagination and filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      completed,
      startDate,
      endDate,
      sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter = { userId: req.user._id, isActive: true };
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (completed !== undefined) filter['completionData.isCompleted'] = completed === 'true';
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const activities = await Activity.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('socialData.likes.userId', 'username profile.firstName profile.avatar')
      .populate('socialData.comments.userId', 'username profile.firstName profile.avatar');

    const total = await Activity.countDocuments(filter);

    res.json({
      activities,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        hasNext: skip + activities.length < total,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      message: 'Error fetching activities',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/activities/:id
// @desc    Get single activity by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    })
    .populate('socialData.likes.userId', 'username profile.firstName profile.avatar')
    .populate('socialData.comments.userId', 'username profile.firstName profile.avatar');

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    res.json({ activity });

  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      message: 'Error fetching activity',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/activities
// @desc    Create new activity
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      type,
      category,
      title,
      content,
      description,
      duration,
      difficulty,
      tags,
      scheduledFor
    } = req.body;

    // Validation
    if (!type || !category || !title || !content) {
      return res.status(400).json({
        message: 'Please provide type, category, title, and content'
      });
    }

    const activity = new Activity({
      userId: req.user._id,
      type,
      category,
      title,
      content,
      description,
      duration: duration || 5,
      difficulty: difficulty || 'beginner',
      tags: tags || [],
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      isAIGenerated: false
    });

    await activity.save();

    res.status(201).json({
      message: 'Activity created successfully',
      activity
    });

  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({
      message: 'Error creating activity',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/activities/:id
// @desc    Update activity
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    const {
      title,
      content,
      description,
      duration,
      difficulty,
      tags,
      scheduledFor
    } = req.body;

    // Update fields
    if (title !== undefined) activity.title = title;
    if (content !== undefined) activity.content = content;
    if (description !== undefined) activity.description = description;
    if (duration !== undefined) activity.duration = duration;
    if (difficulty !== undefined) activity.difficulty = difficulty;
    if (tags !== undefined) activity.tags = tags;
    if (scheduledFor !== undefined) activity.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;

    await activity.save();

    res.json({
      message: 'Activity updated successfully',
      activity
    });

  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({
      message: 'Error updating activity',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/activities/:id/complete
// @desc    Mark activity as completed
// @access  Private
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const { rating, feedback, moodBefore, moodAfter, notes } = req.body;

    const activity = await Activity.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    if (activity.completionData.isCompleted) {
      return res.status(400).json({ message: 'Activity already completed' });
    }

    // Mark as completed
    activity.markCompleted(rating, feedback, moodBefore, moodAfter, notes);
    await activity.save();

    // Update user streak
    const user = await User.findById(req.user._id);
    user.updateStreak();
    await user.save();

    res.json({
      message: 'Activity completed successfully',
      activity,
      streakData: user.streakData
    });

  } catch (error) {
    console.error('Complete activity error:', error);
    res.status(500).json({
      message: 'Error completing activity',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/activities/:id/like
// @desc    Like/unlike activity
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    const existingLike = activity.socialData.likes.find(like => 
      like.userId.toString() === req.user._id.toString()
    );

    if (existingLike) {
      // Unlike
      activity.removeLike(req.user._id);
    } else {
      // Like
      activity.addLike(req.user._id);
    }

    await activity.save();

    res.json({
      message: existingLike ? 'Activity unliked' : 'Activity liked',
      likeCount: activity.socialData.likes.length,
      isLiked: !existingLike
    });

  } catch (error) {
    console.error('Like activity error:', error);
    res.status(500).json({
      message: 'Error liking activity',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/activities/:id/comment
// @desc    Add comment to activity
// @access  Private
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const activity = await Activity.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    activity.addComment(req.user._id, content.trim());
    await activity.save();

    // Populate the new comment
    await activity.populate('socialData.comments.userId', 'username profile.firstName profile.avatar');

    const newComment = activity.socialData.comments[activity.socialData.comments.length - 1];

    res.json({
      message: 'Comment added successfully',
      comment: newComment,
      commentCount: activity.socialData.comments.length
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      message: 'Error adding comment',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/activities/:id/share
// @desc    Share activity with friends or make public
// @access  Private
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { shareWith, makePublic } = req.body;

    const activity = await Activity.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    if (makePublic) {
      activity.socialData.isShared = true;
    }

    if (shareWith && Array.isArray(shareWith)) {
      shareWith.forEach(userId => {
        const existingShare = activity.socialData.sharedWith.find(share => 
          share.userId.toString() === userId.toString()
        );
        
        if (!existingShare) {
          activity.socialData.sharedWith.push({
            userId,
            sharedAt: new Date()
          });
        }
      });
    }

    await activity.save();

    res.json({
      message: 'Activity shared successfully',
      activity: activity.getPublicData()
    });

  } catch (error) {
    console.error('Share activity error:', error);
    res.status(500).json({
      message: 'Error sharing activity',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/activities/:id
// @desc    Delete activity (soft delete)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    activity.isActive = false;
    await activity.save();

    res.json({ message: 'Activity deleted successfully' });

  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({
      message: 'Error deleting activity',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/activities/stats/summary
// @desc    Get user's activity statistics
// @access  Private
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const stats = await Activity.getUserStats(req.user._id);
    
    // Get weekly progress
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyActivities = await Activity.find({
      userId: req.user._id,
      createdAt: { $gte: weekAgo },
      isActive: true
    });

    const weeklyCompleted = weeklyActivities.filter(a => a.completionData.isCompleted).length;

    // Get mood trends
    const moodData = await Activity.aggregate([
      { $match: { userId: req.user._id, 'completionData.isCompleted': true } },
      { $group: {
        _id: '$completionData.mood.after',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);

    res.json({
      stats: {
        ...stats,
        weeklyProgress: {
          total: weeklyActivities.length,
          completed: weeklyCompleted,
          completionRate: weeklyActivities.length > 0 ? (weeklyCompleted / weeklyActivities.length) * 100 : 0
        },
        moodTrends: moodData
      }
    });

  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({
      message: 'Error fetching activity statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router;