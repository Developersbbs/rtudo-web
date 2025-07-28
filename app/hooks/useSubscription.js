import { useState, useEffect, useContext, createContext } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/app/firebase/firebaseConfig';

// Create Subscription Context
const SubscriptionContext = createContext();

// Subscription Provider Component
export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState(null);

  const userId = 'user_123'; // Replace with actual user ID from your auth context

  useEffect(() => {
    if (!userId) return;

    // Real-time subscription listener
    const unsubscribe = onSnapshot(
      doc(db, 'subscriptions', userId),
      (doc) => {
        if (doc.exists()) {
          const subData = doc.data();
          const now = new Date();
          const expiresAt = subData.expiresAt.toDate();
          
          if (subData.status === 'active' && expiresAt > now) {
            setSubscription(subData);
            setUserPlan(subData.planType);
          } else {
            setSubscription(null);
            setUserPlan(null);
          }
        } else {
          setSubscription(null);
          setUserPlan(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to subscription:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const hasAccess = (chapterIndex = 0) => {
    if (!subscription) return false;
    if (userPlan === 'pro') return true;
    if (userPlan === 'basic') return chapterIndex < 5;
    return false;
  };

  const isBasicPlan = () => userPlan === 'basic';
  const isProPlan = () => userPlan === 'pro';
  const hasSubscription = () => !!subscription;

  const value = {
    subscription,
    userPlan,
    loading,
    hasAccess,
    isBasicPlan,
    isProPlan,
    hasSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// Custom hook to use subscription context
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}