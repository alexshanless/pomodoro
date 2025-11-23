import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const useGoalsStreaks = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState({
    dailyPomodoroGoal: 8,
    weeklyPomodoroGoal: 40
  });
  const [streaks, setStreaks] = useState({
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    streakStartDate: null
  });
  const [loading, setLoading] = useState(true);

  // Helper function to get local date in YYYY-MM-DD format
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load goals and streaks from Supabase
  useEffect(() => {
    const loadFromSupabase = async () => {
      if (!user || !isSupabaseConfigured || !supabase) {
        loadFromLocalStorage();
        return;
      }

      try {
        setLoading(true);

        // Load goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('user_goals')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (goalsError && goalsError.code !== 'PGRST116') {
          throw goalsError;
        }

        if (goalsData) {
          setGoals({
            dailyPomodoroGoal: goalsData.daily_pomodoro_goal,
            weeklyPomodoroGoal: goalsData.weekly_pomodoro_goal
          });
        } else {
          // Create default goals for new user
          await createDefaultGoals();
        }

        // Load streaks
        const { data: streaksData, error: streaksError } = await supabase
          .from('user_streaks')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (streaksError && streaksError.code !== 'PGRST116') {
          throw streaksError;
        }

        if (streaksData) {
          setStreaks({
            currentStreak: streaksData.current_streak,
            longestStreak: streaksData.longest_streak,
            lastActivityDate: streaksData.last_activity_date,
            streakStartDate: streaksData.streak_start_date
          });
        } else {
          // Create default streaks for new user
          await createDefaultStreaks();
        }
      } catch (error) {
        console.error('Error loading goals/streaks from Supabase:', error);
        loadFromLocalStorage();
      } finally {
        setLoading(false);
      }
    };

    const loadFromLocalStorage = () => {
      try {
        const storedGoals = localStorage.getItem('userGoals');
        if (storedGoals) {
          setGoals(JSON.parse(storedGoals));
        }

        const storedStreaks = localStorage.getItem('streakData');
        if (storedStreaks) {
          setStreaks(JSON.parse(storedStreaks));
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFromSupabase();
  }, [user]);

  // Create default goals in database
  const createDefaultGoals = async () => {
    if (!user || !isSupabaseConfigured || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('user_goals')
        .insert([
          {
            user_id: user.id,
            daily_pomodoro_goal: 8,
            weekly_pomodoro_goal: 40
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setGoals({
        dailyPomodoroGoal: data.daily_pomodoro_goal,
        weeklyPomodoroGoal: data.weekly_pomodoro_goal
      });
    } catch (error) {
      console.error('Error creating default goals:', error);
    }
  };

  // Create default streaks in database
  const createDefaultStreaks = async () => {
    if (!user || !isSupabaseConfigured || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('user_streaks')
        .insert([
          {
            user_id: user.id,
            current_streak: 0,
            longest_streak: 0,
            last_activity_date: null,
            streak_start_date: null
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setStreaks({
        currentStreak: data.current_streak,
        longestStreak: data.longest_streak,
        lastActivityDate: data.last_activity_date,
        streakStartDate: data.streak_start_date
      });
    } catch (error) {
      console.error('Error creating default streaks:', error);
    }
  };

  // Update goals
  const updateGoals = async (newGoals) => {
    const updatedGoals = {
      dailyPomodoroGoal: newGoals.dailyPomodoroGoal ?? goals.dailyPomodoroGoal,
      weeklyPomodoroGoal: newGoals.weeklyPomodoroGoal ?? goals.weeklyPomodoroGoal
    };

    // Save to Supabase if user is authenticated
    if (user && isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('user_goals')
          .upsert([
            {
              user_id: user.id,
              daily_pomodoro_goal: updatedGoals.dailyPomodoroGoal,
              weekly_pomodoro_goal: updatedGoals.weeklyPomodoroGoal,
              updated_at: new Date().toISOString()
            }
          ]);

        if (error) throw error;

        setGoals(updatedGoals);
        return { success: true, error: null };
      } catch (error) {
        console.error('Error updating goals in Supabase:', error);
        // Fall back to localStorage
        localStorage.setItem('userGoals', JSON.stringify(updatedGoals));
        setGoals(updatedGoals);
        return { success: false, error };
      }
    } else {
      // Save to localStorage only
      localStorage.setItem('userGoals', JSON.stringify(updatedGoals));
      setGoals(updatedGoals);
      return { success: true, error: null };
    }
  };

  // Calculate streak based on session data
  const updateStreak = async (sessions) => {
    const today = getLocalDateString();
    const yesterday = getLocalDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));

    // Get all dates with at least 1 completed focus session
    const activeDates = Object.keys(sessions)
      .filter(date => sessions[date].completed > 0)
      .sort()
      .reverse();

    if (activeDates.length === 0) {
      // No activity, reset streak
      await updateStreaksData({
        currentStreak: 0,
        longestStreak: streaks.longestStreak,
        lastActivityDate: null,
        streakStartDate: null
      });
      return;
    }

    const mostRecentActivityDate = activeDates[0];

    // Check if streak is broken (no activity today or yesterday)
    if (mostRecentActivityDate !== today && mostRecentActivityDate !== yesterday) {
      // Streak is broken, but we completed a session today, so start new streak
      if (mostRecentActivityDate === today) {
        await updateStreaksData({
          currentStreak: 1,
          longestStreak: Math.max(1, streaks.longestStreak),
          lastActivityDate: today,
          streakStartDate: today
        });
      } else {
        // No activity today, streak is broken
        await updateStreaksData({
          currentStreak: 0,
          longestStreak: streaks.longestStreak,
          lastActivityDate: mostRecentActivityDate,
          streakStartDate: null
        });
      }
      return;
    }

    // Calculate current streak by counting consecutive days backwards
    let currentStreak = 0;
    let streakStartDate = null;
    let checkDate = new Date(today);

    for (let i = 0; i < activeDates.length; i++) {
      const expectedDateStr = getLocalDateString(checkDate);
      if (activeDates[i] === expectedDateStr) {
        currentStreak++;
        streakStartDate = expectedDateStr;
        // Move to previous day
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }

    // Update longest streak if current is higher
    const newLongestStreak = Math.max(currentStreak, streaks.longestStreak);

    await updateStreaksData({
      currentStreak,
      longestStreak: newLongestStreak,
      lastActivityDate: mostRecentActivityDate,
      streakStartDate
    });
  };

  // Update streaks data in database and state
  const updateStreaksData = async (newStreaks) => {
    // Save to Supabase if user is authenticated
    if (user && isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('user_streaks')
          .upsert([
            {
              user_id: user.id,
              current_streak: newStreaks.currentStreak,
              longest_streak: newStreaks.longestStreak,
              last_activity_date: newStreaks.lastActivityDate,
              streak_start_date: newStreaks.streakStartDate,
              updated_at: new Date().toISOString()
            }
          ]);

        if (error) throw error;

        setStreaks(newStreaks);
        return { success: true, error: null };
      } catch (error) {
        console.error('Error updating streaks in Supabase:', error);
        // Fall back to localStorage
        localStorage.setItem('streakData', JSON.stringify(newStreaks));
        setStreaks(newStreaks);
        return { success: false, error };
      }
    } else {
      // Save to localStorage only
      localStorage.setItem('streakData', JSON.stringify(newStreaks));
      setStreaks(newStreaks);
      return { success: true, error: null };
    }
  };

  // Calculate daily progress
  const getDailyProgress = (sessions) => {
    const today = getLocalDateString();
    const todaySessions = sessions[today] || { completed: 0 };
    const completed = todaySessions.completed || 0;
    const target = goals.dailyPomodoroGoal;
    const percentage = target > 0 ? Math.min((completed / target) * 100, 100) : 0;

    return {
      completed,
      target,
      percentage: Math.round(percentage),
      isAchieved: completed >= target
    };
  };

  // Calculate weekly progress
  const getWeeklyProgress = (sessions) => {
    let completed = 0;
    const today = new Date();

    // Count last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = getLocalDateString(date);
      const daySessions = sessions[dateStr] || { completed: 0 };
      completed += daySessions.completed || 0;
    }

    const target = goals.weeklyPomodoroGoal;
    const percentage = target > 0 ? Math.min((completed / target) * 100, 100) : 0;

    return {
      completed,
      target,
      percentage: Math.round(percentage),
      isAchieved: completed >= target
    };
  };

  return {
    goals,
    streaks,
    loading,
    updateGoals,
    updateStreak,
    getDailyProgress,
    getWeeklyProgress
  };
};
