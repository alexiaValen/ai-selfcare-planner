const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['affirmation', 'meditation', 'journaling', 'exercise', 'breathing', 'stretching', 'skincare', 'reading', 'music', 'custom'],
    required: true
  },
  category: {
    type: String,
    enum: ['stress_relief', 'confidence_building', 'relaxation', 'mindfulness', 'productivity', 'sleep_improvement'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  description: {
    type: String,
    maxlength: 500
  },
  duration: {
    type: Number, // in minutes
    default: 5
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  aiPrompt: {
    type: String,
    maxlength: 500
  },
  completionData: {
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String,
      maxlength: 500
    },
    mood: {
      before: {
        type: String,
        enum: ['stressed', 'anxious', 'sad', 'neutral', 'happy', 'excited', 'calm', 'energetic']
      },
      after: {
        type: String,
        enum: ['stressed', 'anxious', 'sad', 'neutral', 'happy', 'excited', 'calm', 'energetic']
      }
    },
    notes: {
      type: String,
      maxlength: 1000
    }
  },
  socialData: {
    isShared: {
      type: Boolean,
      default: false
    },
    sharedWith: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      sharedAt: {
        type: Date,
        default: Date.now
      }
    }],
    likes: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      likedAt: {
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
        maxlength: 300
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  scheduledFor: Date,
  reminderSent: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ userId: 1, type: 1 });
activitySchema.index({ userId: 1, 'completionData.isCompleted': 1 });
activitySchema.index({ scheduledFor: 1 });
activitySchema.index({ 'socialData.isShared': 1, createdAt: -1 });

// Virtual for like count
activitySchema.virtual('likeCount').get(function() {
  return this.socialData.likes.length;
});

// Virtual for comment count
activitySchema.virtual('commentCount').get(function() {
  return this.socialData.comments.length;
});

// Method to mark activity as completed
activitySchema.methods.markCompleted = function(rating, feedback, moodBefore, moodAfter, notes) {
  this.completionData.isCompleted = true;
  this.completionData.completedAt = new Date();
  this.completionData.rating = rating;
  this.completionData.feedback = feedback;
  this.completionData.mood.before = moodBefore;
  this.completionData.mood.after = moodAfter;
  this.completionData.notes = notes;
};

// Method to add like
activitySchema.methods.addLike = function(userId) {
  const existingLike = this.socialData.likes.find(like => 
    like.userId.toString() === userId.toString()
  );
  
  if (!existingLike) {
    this.socialData.likes.push({ userId });
  }
};

// Method to remove like
activitySchema.methods.removeLike = function(userId) {
  this.socialData.likes = this.socialData.likes.filter(like => 
    like.userId.toString() !== userId.toString()
  );
};

// Method to add comment
activitySchema.methods.addComment = function(userId, content) {
  this.socialData.comments.push({
    userId,
    content,
    createdAt: new Date()
  });
};

// Method to get public activity data
activitySchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    type: this.type,
    category: this.category,
    title: this.title,
    content: this.content,
    description: this.description,
    duration: this.duration,
    difficulty: this.difficulty,
    tags: this.tags,
    completionData: {
      isCompleted: this.completionData.isCompleted,
      completedAt: this.completionData.completedAt,
      rating: this.completionData.rating
    },
    socialData: {
      likes: this.socialData.likes,
      comments: this.socialData.comments
    },
    createdAt: this.createdAt,
    likeCount: this.likeCount,
    commentCount: this.commentCount
  };
};

// Static method to get user's activity stats
activitySchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalActivities: { $sum: 1 },
        completedActivities: {
          $sum: { $cond: ['$completionData.isCompleted', 1, 0] }
        },
        averageRating: {
          $avg: '$completionData.rating'
        },
        activitiesByType: {
          $push: '$type'
        },
        activitiesByCategory: {
          $push: '$category'
        }
      }
    }
  ]);

  return stats[0] || {
    totalActivities: 0,
    completedActivities: 0,
    averageRating: 0,
    activitiesByType: [],
    activitiesByCategory: []
  };
};

// Static method to get trending activities
activitySchema.statics.getTrendingActivities = async function(limit = 10) {
  return this.aggregate([
    { $match: { 'socialData.isShared': true, isActive: true } },
    {
      $addFields: {
        likeCount: { $size: '$socialData.likes' },
        commentCount: { $size: '$socialData.comments' },
        engagementScore: {
          $add: [
            { $size: '$socialData.likes' },
            { $multiply: [{ $size: '$socialData.comments' }, 2] }
          ]
        }
      }
    },
    { $sort: { engagementScore: -1, createdAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $project: {
        type: 1,
        category: 1,
        title: 1,
        content: 1,
        description: 1,
        duration: 1,
        difficulty: 1,
        tags: 1,
        likeCount: 1,
        commentCount: 1,
        engagementScore: 1,
        createdAt: 1,
        'user.username': 1,
        'user.profile.firstName': 1,
        'user.profile.avatar': 1
      }
    }
  ]);
};

module.exports = mongoose.model('Activity', activitySchema);