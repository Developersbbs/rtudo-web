import dayjs from "dayjs";

export const getDefaultUserSchema = ({ user, onboarding }) => {
  const today = dayjs().format("YYYY-MM-DD");
  const nowISO = new Date().toISOString();

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || onboarding?.name || 'User',
    photoURL: user.photoURL || onboarding?.photo || '',

    hasCompletedOnboarding: false,
    hasReceivedWelcomeBonus: true,

    lastLoginDate: nowISO,
    lastLoginXpDate: today,
    lastDailyXP: today,
    lastStreakUpdate: today + "T18:30:00.000Z",
    weekStartDate: "",
    weeklyXPClaimed: false,
    currentPlan: "free",
    currentSubscriptionId: "",
    subscriptionStatus: "inactive",
    subscriptionEndDate: "",

    streak: 1,
    availableXP: 260,
    totalXP: 260,

    xpHistory: {
      [today]: {
        earned: 260,
        source: {
          welcome_bonus: 250,
          daily: 10,
        },
      },
    },

    skills: {
      grammar: 0,
      vocabulary: 0,
      listening: 0,
      speaking: 0,
    },

    completedLessons: 0,

    appUsage: {
      dailyUsage: [
        {
          date: today,
          lastUpdated: nowISO,
          sessionsCount: 1,
          timeSpent: 0,
        },
      ],
    },

    weeklyUsage: {
      weekStart: today,
      totalTime: 0,
      averageTime: 0,
      mostActiveDay: today,
    },

    monthlyUsage: {
      month: today.slice(0, 7),
      totalTime: 0,
      averageTime: 0,
      mostActiveWeek: today,
    },

    updatedAt: nowISO,
  };
};
