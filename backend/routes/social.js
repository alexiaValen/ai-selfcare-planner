const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Group = require('../models/Group');
const Activity = require('../models/Activity');

const router = express.Router();

// @route   GET /api/social/friends
// @desc    Get user's friends list
// @access  Private
router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('socialData.friends.userId', 'username profile.firstName profile.lastName profile.avatar streakData.currentStreak');

    const friends = user.socialData.friends.filter(friend => friend.status === 'accepted');

    res.json({ friends });

  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({
      message: 'Error fetching friends',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/social/friends/request
// @desc    Send friend request
// @access  Private
router.post('/friends/request', auth, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    if (username === req.user.username) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    const targetUser = await User.findOne({ username });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = await User.findById(req.user._id);

    // Check if already friends or request exists
    const existingFriend = currentUser.socialData.friends.find(friend => 
      friend.userId.toString() === targetUser._id.toString()
    );

    if (existingFriend) {
      if (existingFriend.status === 'accepted') {
        return res.status(400).json({ message: 'Already friends' });
      } else if (existingFriend.status === 'pending') {
        return res.status(400).json({ message: 'Friend request already sent' });
      }
    }

    // Add friend request to current user
    currentUser.socialData.friends.push({
      userId: targetUser._id,
      status: 'pending',
      addedAt: new Date()
    });

    // Add incoming request to target user
    targetUser.socialData.friends.push({
      userId: currentUser._id,
      status: 'pending',
      addedAt: new Date()
    });

    await currentUser.save();
    await targetUser.save();

    res.json({ message: 'Friend request sent successfully' });

  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({
      message: 'Error sending friend request',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/social/friends/accept
// @desc    Accept friend request
// @access  Private
router.post('/friends/accept', auth, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update friend status for both users
    const currentUserFriend = currentUser.socialData.friends.find(friend => 
      friend.userId.toString() === userId.toString()
    );

    const targetUserFriend = targetUser.socialData.friends.find(friend => 
      friend.userId.toString() === req.user._id.toString()
    );

    if (!currentUserFriend || !targetUserFriend) {
      return res.status(400).json({ message: 'Friend request not found' });
    }

    currentUserFriend.status = 'accepted';
    targetUserFriend.status = 'accepted';

    await currentUser.save();
    await targetUser.save();

    res.json({ message: 'Friend request accepted' });

  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({
      message: 'Error accepting friend request',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/social/friends/:userId
// @desc    Remove friend or decline request
// @access  Private
router.delete('/friends/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove from both users' friend lists
    currentUser.socialData.friends = currentUser.socialData.friends.filter(friend => 
      friend.userId.toString() !== userId.toString()
    );

    targetUser.socialData.friends = targetUser.socialData.friends.filter(friend => 
      friend.userId.toString() !== req.user._id.toString()
    );

    await currentUser.save();
    await targetUser.save();

    res.json({ message: 'Friend removed successfully' });

  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({
      message: 'Error removing friend',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/social/groups
// @desc    Get user's groups
// @access  Private
router.get('/groups', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('socialData.groups.groupId');

    const groups = user.socialData.groups.map(group => ({
      ...group.groupId.getSummary(),
      userRole: group.role,
      joinedAt: group.joinedAt
    }));

    res.json({ groups });

  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      message: 'Error fetching groups',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/social/groups/discover
// @desc    Discover public groups
// @access  Private
router.get('/groups/discover', auth, async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;

    const filter = { 
      isActive: true, 
      privacy: { $in: ['public', 'invite_only'] }
    };

    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const groups = await Group.find(filter)
      .populate('createdBy', 'username profile.firstName profile.avatar')
      .sort({ memberCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Group.countDocuments(filter);

    res.json({
      groups: groups.map(group => ({
        ...group.getSummary(),
        creator: group.createdBy
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });

  } catch (error) {
    console.error('Discover groups error:', error);
    res.status(500).json({
      message: 'Error discovering groups',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/social/groups
// @desc    Create new group
// @access  Private
router.post('/groups', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      privacy,
      avatar,
      settings
    } = req.body;

    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

    const group = new Group({
      name,
      description,
      category: category || 'general',
      privacy: privacy || 'public',
      avatar: avatar || '',
      settings: settings || {},
      createdBy: req.user._id,
      members: [{
        userId: req.user._id,
        role: 'admin',
        joinedAt: new Date(),
        isActive: true
      }]
    });

    await group.save();

    // Add group to user's groups
    const user = await User.findById(req.user._id);
    user.socialData.groups.push({
      groupId: group._id,
      role: 'admin',
      joinedAt: new Date()
    });
    await user.save();

    res.status(201).json({
      message: 'Group created successfully',
      group: group.getSummary()
    });

  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      message: 'Error creating group',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/social/groups/:groupId/join
// @desc    Join a group
// @access  Private
router.post('/groups/:groupId/join', auth, async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);

    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.privacy === 'private') {
      return res.status(403).json({ message: 'Cannot join private group without invitation' });
    }

    // Check if already a member
    const existingMember = group.members.find(member => 
      member.userId.toString() === req.user._id.toString() && member.isActive
    );

    if (existingMember) {
      return res.status(400).json({ message: 'Already a member of this group' });
    }

    // Check member limit
    const activeMemberCount = group.members.filter(member => member.isActive).length;
    if (activeMemberCount >= group.settings.maxMembers) {
      return res.status(400).json({ message: 'Group has reached maximum member limit' });
    }

    // Add member to group
    group.addMember(req.user._id);
    await group.save();

    // Add group to user's groups
    const user = await User.findById(req.user._id);
    user.socialData.groups.push({
      groupId: group._id,
      role: 'member',
      joinedAt: new Date()
    });
    await user.save();

    res.json({ message: 'Successfully joined group' });

  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({
      message: 'Error joining group',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/social/groups/:groupId/challenges
// @desc    Create group challenge
// @access  Private
router.post('/groups/:groupId/challenges', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const {
      title,
      description,
      type,
      goal,
      startDate,
      endDate,
      rewards
    } = req.body;

    const group = await Group.findById(groupId);

    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin or moderator
    const member = group.members.find(member => 
      member.userId.toString() === req.user._id.toString() && member.isActive
    );

    if (!member || !['admin', 'moderator'].includes(member.role)) {
      return res.status(403).json({ message: 'Only admins and moderators can create challenges' });
    }

    const challengeData = {
      title,
      description,
      type,
      goal,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      rewards: rewards || []
    };

    const challenge = group.createChallenge(challengeData, req.user._id);
    await group.save();

    res.status(201).json({
      message: 'Challenge created successfully',
      challenge
    });

  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({
      message: 'Error creating challenge',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/social/groups/:groupId/challenges/:challengeId/join
// @desc    Join group challenge
// @access  Private
router.post('/groups/:groupId/challenges/:challengeId/join', auth, async (req, res) => {
  try {
    const { groupId, challengeId } = req.params;

    const group = await Group.findById(groupId);

    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member
    const member = group.members.find(member => 
      member.userId.toString() === req.user._id.toString() && member.isActive
    );

    if (!member) {
      return res.status(403).json({ message: 'Must be a group member to join challenges' });
    }

    group.joinChallenge(challengeId, req.user._id);
    await group.save();

    res.json({ message: 'Successfully joined challenge' });

  } catch (error) {
    console.error('Join challenge error:', error);
    res.status(500).json({
      message: 'Error joining challenge',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/social/groups/:groupId/challenges/:challengeId/progress
// @desc    Update challenge progress
// @access  Private
router.post('/groups/:groupId/challenges/:challengeId/progress', auth, async (req, res) => {
  try {
    const { groupId, challengeId } = req.params;
    const { progress } = req.body;

    if (typeof progress !== 'number') {
      return res.status(400).json({ message: 'Progress must be a number' });
    }

    const group = await Group.findById(groupId);

    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }

    group.updateChallengeProgress(challengeId, req.user._id, progress);
    await group.save();

    // Emit real-time update
    req.app.get('io').to(`group-${groupId}`).emit('challenge-progress', {
      challengeId,
      userId: req.user._id,
      progress
    });

    res.json({ message: 'Progress updated successfully' });

  } catch (error) {
    console.error('Update challenge progress error:', error);
    res.status(500).json({
      message: 'Error updating challenge progress',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/social/feed
// @desc    Get social feed with friends' activities
// @access  Private
router.get('/feed', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(req.user._id);
    const friendIds = user.socialData.friends
      .filter(friend => friend.status === 'accepted')
      .map(friend => friend.userId);

    // Include user's own activities
    friendIds.push(req.user._id);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const activities = await Activity.find({
      userId: { $in: friendIds },
      'socialData.isShared': true,
      isActive: true
    })
    .populate('userId', 'username profile.firstName profile.lastName profile.avatar')
    .populate('socialData.likes.userId', 'username profile.firstName profile.avatar')
    .populate('socialData.comments.userId', 'username profile.firstName profile.avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Activity.countDocuments({
      userId: { $in: friendIds },
      'socialData.isShared': true,
      isActive: true
    });

    res.json({
      feed: activities.map(activity => activity.getPublicData()),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });

  } catch (error) {
    console.error('Get social feed error:', error);
    res.status(500).json({
      message: 'Error fetching social feed',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router;