const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Generate personalized affirmations based on user's mood and goal
  async generateAffirmation(userProfile) {
    try {
      const { currentMood, primaryGoal, preferences, profile } = userProfile;
      
      const prompt = this.buildAffirmationPrompt(currentMood, primaryGoal, preferences, profile);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a compassionate wellness coach specializing in creating personalized, uplifting affirmations. Your affirmations should be positive, empowering, and tailored to the user's specific needs and goals. Keep them concise (1-3 sentences) and use 'I' statements."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.8,
      });

      const affirmation = completion.choices[0].message.content.trim();
      
      return {
        content: affirmation,
        category: primaryGoal,
        type: 'affirmation',
        isAIGenerated: true,
        aiPrompt: prompt
      };

    } catch (error) {
      console.error('Error generating affirmation:', error);
      throw new Error('Failed to generate affirmation');
    }
  }

  // Generate self-care activity suggestions
  async generateActivity(userProfile) {
    try {
      const { currentMood, primaryGoal, preferences, profile } = userProfile;
      const activityTypes = preferences.contentPreferences?.preferredActivityTypes || [];
      const difficultyLevel = preferences.contentPreferences?.difficultyLevel || 'beginner';
      const sessionDuration = preferences.contentPreferences?.sessionDuration || 10;
      
      const prompt = this.buildActivityPrompt(currentMood, primaryGoal, activityTypes, difficultyLevel, sessionDuration);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a wellness expert who creates personalized self-care activities. Provide practical, actionable activities that can be done at home or anywhere. Include clear step-by-step instructions. Format your response as JSON with 'title', 'description', 'steps' (array), 'duration' (number in minutes), 'difficulty', and 'tags' (array) fields."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.7,
      });

      const activityText = completion.choices[0].message.content.trim();
      
      // Try to parse as JSON, fallback to text format
      let activityData;
      try {
        activityData = JSON.parse(activityText);
      } catch (parseError) {
        // Fallback to text format
        activityData = {
          title: "Personalized Self-Care Activity",
          description: activityText,
          steps: [activityText],
          duration: sessionDuration,
          difficulty: difficultyLevel,
          tags: [primaryGoal, currentMood]
        };
      }
      
      return {
        ...activityData,
        content: activityData.description || activityText,
        category: primaryGoal,
        type: this.determineActivityType(activityData.title, activityData.description || activityText),
        isAIGenerated: true,
        aiPrompt: prompt
      };

    } catch (error) {
      console.error('Error generating activity:', error);
      throw new Error('Failed to generate activity');
    }
  }

  // Generate journaling prompts
  async generateJournalingPrompt(userProfile) {
    try {
      const { currentMood, primaryGoal, profile } = userProfile;
      
      const prompt = this.buildJournalingPrompt(currentMood, primaryGoal);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a therapeutic journaling expert. Create thoughtful, introspective prompts that help users explore their emotions, thoughts, and goals. The prompts should be open-ended and encourage self-reflection."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.8,
      });

      const journalingPrompt = completion.choices[0].message.content.trim();
      
      return {
        title: "Reflective Journaling",
        content: journalingPrompt,
        description: "Take a few minutes to reflect and write about your thoughts and feelings.",
        category: primaryGoal,
        type: 'journaling',
        duration: 10,
        isAIGenerated: true,
        aiPrompt: prompt
      };

    } catch (error) {
      console.error('Error generating journaling prompt:', error);
      throw new Error('Failed to generate journaling prompt');
    }
  }

  // Generate motivational messages for notifications
  async generateMotivationalMessage(userProfile, context = 'general') {
    try {
      const { currentMood, primaryGoal, profile } = userProfile;
      
      const prompt = this.buildMotivationalPrompt(currentMood, primaryGoal, context);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a supportive wellness coach. Create brief, encouraging messages for push notifications. Keep them under 100 characters, positive, and actionable. Use a warm, friendly tone."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 50,
        temperature: 0.9,
      });

      return completion.choices[0].message.content.trim();

    } catch (error) {
      console.error('Error generating motivational message:', error);
      throw new Error('Failed to generate motivational message');
    }
  }

  // Generate personalized wellness tips
  async generateWellnessTip(userProfile) {
    try {
      const { currentMood, primaryGoal, preferences } = userProfile;
      
      const prompt = this.buildWellnessTipPrompt(currentMood, primaryGoal, preferences);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a wellness expert providing practical, science-based tips for mental health and self-care. Keep tips concise, actionable, and easy to implement in daily life."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      const tip = completion.choices[0].message.content.trim();
      
      return {
        title: "Wellness Tip",
        content: tip,
        category: primaryGoal,
        type: 'tip',
        isAIGenerated: true,
        aiPrompt: prompt
      };

    } catch (error) {
      console.error('Error generating wellness tip:', error);
      throw new Error('Failed to generate wellness tip');
    }
  }

  // Helper methods for building prompts
  buildAffirmationPrompt(mood, goal, preferences, profile) {
    const firstName = profile?.firstName || 'friend';
    const moodContext = this.getMoodContext(mood);
    const goalContext = this.getGoalContext(goal);
    
    return `Create a personalized affirmation for someone who is feeling ${mood} and wants to work on ${goal}. 
    ${moodContext} ${goalContext}
    The affirmation should be empowering, use "I" statements, and be 1-2 sentences long.
    Make it feel personal and uplifting.`;
  }

  buildActivityPrompt(mood, goal, activityTypes, difficulty, duration) {
    const typePreferences = activityTypes.length > 0 
      ? `They prefer activities like: ${activityTypes.join(', ')}.` 
      : '';
    
    return `Create a ${difficulty} level self-care activity for someone feeling ${mood} who wants to work on ${goal}.
    The activity should take about ${duration} minutes. ${typePreferences}
    Provide a clear title, description, and step-by-step instructions.
    Make it practical and doable at home or anywhere.`;
  }

  buildJournalingPrompt(mood, goal) {
    const moodContext = this.getMoodContext(mood);
    const goalContext = this.getGoalContext(goal);
    
    return `Create a thoughtful journaling prompt for someone feeling ${mood} who wants to work on ${goal}.
    ${moodContext} ${goalContext}
    The prompt should encourage self-reflection and emotional exploration.`;
  }

  buildMotivationalPrompt(mood, goal, context) {
    return `Create a brief, encouraging notification message for someone feeling ${mood} who is working on ${goal}.
    Context: ${context}
    Keep it under 100 characters, positive, and actionable.`;
  }

  buildWellnessTipPrompt(mood, goal, preferences) {
    return `Provide a practical wellness tip for someone feeling ${mood} who wants to work on ${goal}.
    Make it actionable, science-based, and easy to implement in daily life.
    Keep it concise but informative.`;
  }

  getMoodContext(mood) {
    const moodContexts = {
      stressed: 'They need calming and grounding support.',
      anxious: 'They need reassurance and confidence building.',
      sad: 'They need uplifting and hope-inspiring words.',
      neutral: 'They are open to positive growth and motivation.',
      happy: 'They want to maintain and amplify their positive energy.',
      excited: 'They want to channel their energy productively.',
      calm: 'They want to maintain their peaceful state.',
      energetic: 'They want to use their energy for positive activities.'
    };
    return moodContexts[mood] || 'They are seeking positive support.';
  }

  getGoalContext(goal) {
    const goalContexts = {
      stress_relief: 'Focus on relaxation, breathing, and letting go of tension.',
      confidence_building: 'Emphasize self-worth, capabilities, and inner strength.',
      relaxation: 'Focus on peace, calm, and releasing tension.',
      mindfulness: 'Emphasize present moment awareness and acceptance.',
      productivity: 'Focus on motivation, focus, and accomplishment.',
      sleep_improvement: 'Emphasize rest, peace, and preparing for quality sleep.'
    };
    return goalContexts[goal] || 'Support their personal growth journey.';
  }

  determineActivityType(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    
    if (text.includes('meditat') || text.includes('mindful')) return 'meditation';
    if (text.includes('journal') || text.includes('writ')) return 'journaling';
    if (text.includes('breath') || text.includes('inhale') || text.includes('exhale')) return 'breathing';
    if (text.includes('stretch') || text.includes('yoga')) return 'stretching';
    if (text.includes('exercise') || text.includes('movement') || text.includes('walk')) return 'exercise';
    if (text.includes('skin') || text.includes('self-care routine')) return 'skincare';
    if (text.includes('read') || text.includes('book')) return 'reading';
    if (text.includes('music') || text.includes('listen')) return 'music';
    
    return 'custom';
  }
}

module.exports = new OpenAIService();