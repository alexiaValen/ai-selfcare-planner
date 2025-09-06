const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    avatar: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      maxlength: 500
    },
    dateOfBirth: Date,
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  currentMood: {
    type: String,
    enum: ['stressed', 'anxious', 'sad', 'neutral', 'happy', 'excited', 'calm', 'energetic'],
    default: 'neutral'
  },
  primaryGoal: {
    type: String,
    enum: ['stress_relief', 'confidence_building', 'relaxation', 'mindfulness', 'productivity', 'sleep_improvement'],
    required: true
  },
  preferences: {
    notificationSettings: {
      dailyReminders: {
        type: Boolean,
        default: true
      },
      affirmationTime: {
        type: String,
        default: '09:00'
      },
      activityReminders: {
        type: Boolean,
        default: true
      },
      socialUpdates: {
        type: Boolean,
        default: true
      }
    },
    contentPreferences: {
      preferredActivityTypes: [{
        type: String,
        enum: ['meditation', 'journaling', 'exercise', 'breathing', 'stretching', 'skincare', 'reading', 'music']
      }],
      difficultyLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
      },
      sessionDuration: {
        type: Number,
        default: 10 // minutes
      }
    },
    themePreferences: {
      colorScheme: {
        type: String,
        enum: ['pastel_pink', 'lavender_mint', 'sunset_peach', 'ocean_breeze'],
        default: 'pastel_pink'
      },
      animations: {
        type: Boolean,
        default: true
      }
    }
  },
  streakData: {
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    lastActivityDate: Date,
    totalActivitiesCompleted: {
      type: Number,
      default: 0
    }
  },
  socialData: {
    friends: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'blocked'],
        default: 'pending'
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    groups: [{
      groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
      },
      role: {
        type: String,
        enum: ['member', 'admin'],
        default: 'member'
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }],
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'friends'
      },
      shareProgress: {
        type: Boolean,
        default: true
      }
    }
  },
  achievements: [{
    type: {
      type: String,
      enum: ['first_activity', 'week_streak', 'month_streak', 'social_butterfly', 'goal_achiever']
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    },
    description: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'socialData.friends.userId': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update streak method
userSchema.methods.updateStreak = function() {
  const today = new Date();
  const lastActivity = this.streakData.lastActivityDate;
  
  if (!lastActivity) {
    this.streakData.currentStreak = 1;
    this.streakData.lastActivityDate = today;
  } else {
    const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      // Consecutive day
      this.streakData.currentStreak += 1;
      this.streakData.lastActivityDate = today;
    } else if (daysDiff > 1) {
      // Streak broken
      this.streakData.currentStreak = 1;
      this.streakData.lastActivityDate = today;
    }
    // Same day, no change needed
  }
  
  // Update longest streak if current is higher
  if (this.streakData.currentStreak > this.streakData.longestStreak) {
    this.streakData.longestStreak = this.streakData.currentStreak;
  }
  
  this.streakData.totalActivitiesCompleted += 1;
};

// Get user's public profile
userSchema.methods.getPublicProfile = function() {
  return {
    _id: this._id,
    username: this.username,
    profile: {
      firstName: this.profile.firstName,
      avatar: this.profile.avatar,
      bio: this.profile.bio
    },
    streakData: {
      currentStreak: this.streakData.currentStreak,
      longestStreak: this.streakData.longestStreak,
      totalActivitiesCompleted: this.streakData.totalActivitiesCompleted
    },
    achievements: this.achievements,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);