const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  avatar: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['stress_relief', 'confidence_building', 'relaxation', 'mindfulness', 'productivity', 'sleep_improvement', 'general'],
    default: 'general'
  },
  privacy: {
    type: String,
    enum: ['public', 'private', 'invite_only'],
    default: 'public'
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  challenges: [{
    title: {
      type: String,
      required: true,
      maxlength: 200
    },
    description: {
      type: String,
      maxlength: 1000
    },
    type: {
      type: String,
      enum: ['daily_activity', 'streak_challenge', 'group_goal', 'custom'],
      required: true
    },
    goal: {
      target: Number, // e.g., 7 days, 30 activities, etc.
      unit: {
        type: String,
        enum: ['days', 'activities', 'minutes', 'points']
      }
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    participants: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      progress: {
        type: Number,
        default: 0
      },
      lastUpdate: {
        type: Date,
        default: Date.now
      },
      isCompleted: {
        type: Boolean,
        default: false
      }
    }],
    rewards: [{
      type: {
        type: String,
        enum: ['badge', 'points', 'title', 'custom']
      },
      name: String,
      description: String,
      icon: String
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  posts: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000
    },
    type: {
      type: String,
      enum: ['text', 'affirmation_share', 'progress_update', 'question', 'celebration'],
      default: 'text'
    },
    attachments: [{
      type: {
        type: String,
        enum: ['image', 'activity', 'achievement']
      },
      url: String,
      activityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity'
      }
    }],
    reactions: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      type: {
        type: String,
        enum: ['like', 'love', 'support', 'celebrate', 'inspire'],
        default: 'like'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    comments: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      content: {
        type: String,
        required: true,
        maxlength: 500
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    isPinned: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    allowMemberPosts: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    allowInvites: {
      type: Boolean,
      default: true
    },
    maxMembers: {
      type: Number,
      default: 100
    }
  },
  stats: {
    totalActivities: {
      type: Number,
      default: 0
    },
    totalChallengesCompleted: {
      type: Number,
      default: 0
    },
    averageEngagement: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
groupSchema.index({ privacy: 1, isActive: 1 });
groupSchema.index({ category: 1, isActive: 1 });
groupSchema.index({ 'members.userId': 1 });
groupSchema.index({ createdBy: 1 });

// Virtual for member count
groupSchema.virtual('memberCount').get(function() {
  return this.members.filter(member => member.isActive).length;
});

// Virtual for active challenges count
groupSchema.virtual('activeChallengesCount').get(function() {
  return this.challenges.filter(challenge => 
    challenge.isActive && 
    new Date() >= challenge.startDate && 
    new Date() <= challenge.endDate
  ).length;
});

// Method to add member
groupSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (!existingMember) {
    this.members.push({
      userId,
      role,
      joinedAt: new Date(),
      isActive: true
    });
  } else if (!existingMember.isActive) {
    existingMember.isActive = true;
    existingMember.joinedAt = new Date();
  }
};

// Method to remove member
groupSchema.methods.removeMember = function(userId) {
  const member = this.members.find(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (member) {
    member.isActive = false;
  }
};

// Method to update member role
groupSchema.methods.updateMemberRole = function(userId, newRole) {
  const member = this.members.find(member => 
    member.userId.toString() === userId.toString() && member.isActive
  );
  
  if (member) {
    member.role = newRole;
  }
};

// Method to create challenge
groupSchema.methods.createChallenge = function(challengeData, createdBy) {
  const challenge = {
    ...challengeData,
    createdBy,
    createdAt: new Date(),
    participants: []
  };
  
  this.challenges.push(challenge);
  return this.challenges[this.challenges.length - 1];
};

// Method to join challenge
groupSchema.methods.joinChallenge = function(challengeId, userId) {
  const challenge = this.challenges.id(challengeId);
  
  if (challenge && challenge.isActive) {
    const existingParticipant = challenge.participants.find(p => 
      p.userId.toString() === userId.toString()
    );
    
    if (!existingParticipant) {
      challenge.participants.push({
        userId,
        progress: 0,
        lastUpdate: new Date(),
        isCompleted: false
      });
    }
  }
};

// Method to update challenge progress
groupSchema.methods.updateChallengeProgress = function(challengeId, userId, progress) {
  const challenge = this.challenges.id(challengeId);
  
  if (challenge) {
    const participant = challenge.participants.find(p => 
      p.userId.toString() === userId.toString()
    );
    
    if (participant) {
      participant.progress = progress;
      participant.lastUpdate = new Date();
      
      // Check if challenge is completed
      if (progress >= challenge.goal.target) {
        participant.isCompleted = true;
      }
    }
  }
};

// Method to add post
groupSchema.methods.addPost = function(postData) {
  const post = {
    ...postData,
    reactions: [],
    comments: [],
    isPinned: false,
    createdAt: new Date()
  };
  
  this.posts.unshift(post); // Add to beginning for chronological order
  return this.posts[0];
};

// Method to add reaction to post
groupSchema.methods.addReactionToPost = function(postId, userId, reactionType) {
  const post = this.posts.id(postId);
  
  if (post) {
    const existingReaction = post.reactions.find(r => 
      r.userId.toString() === userId.toString()
    );
    
    if (existingReaction) {
      existingReaction.type = reactionType;
    } else {
      post.reactions.push({
        userId,
        type: reactionType,
        createdAt: new Date()
      });
    }
  }
};

// Method to add comment to post
groupSchema.methods.addCommentToPost = function(postId, userId, content) {
  const post = this.posts.id(postId);
  
  if (post) {
    post.comments.push({
      userId,
      content,
      createdAt: new Date()
    });
  }
};

// Method to get group summary
groupSchema.methods.getSummary = function() {
  return {
    _id: this._id,
    name: this.name,
    description: this.description,
    avatar: this.avatar,
    category: this.category,
    privacy: this.privacy,
    memberCount: this.memberCount,
    activeChallengesCount: this.activeChallengesCount,
    stats: this.stats,
    createdAt: this.createdAt
  };
};

// Static method to get popular groups
groupSchema.statics.getPopularGroups = async function(limit = 10) {
  return this.aggregate([
    { $match: { isActive: true, privacy: { $in: ['public', 'invite_only'] } } },
    {
      $addFields: {
        memberCount: {
          $size: {
            $filter: {
              input: '$members',
              cond: { $eq: ['$$this.isActive', true] }
            }
          }
        },
        activeChallengesCount: {
          $size: {
            $filter: {
              input: '$challenges',
              cond: {
                $and: [
                  { $eq: ['$$this.isActive', true] },
                  { $lte: ['$$this.startDate', new Date()] },
                  { $gte: ['$$this.endDate', new Date()] }
                ]
              }
            }
          }
        }
      }
    },
    { $sort: { memberCount: -1, activeChallengesCount: -1, createdAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creator'
      }
    },
    {
      $project: {
        name: 1,
        description: 1,
        avatar: 1,
        category: 1,
        privacy: 1,
        memberCount: 1,
        activeChallengesCount: 1,
        stats: 1,
        createdAt: 1,
        'creator.username': 1,
        'creator.profile.firstName': 1
      }
    }
  ]);
};

module.exports = mongoose.model('Group', groupSchema);