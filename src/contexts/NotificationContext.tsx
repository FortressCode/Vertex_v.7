import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { auth } from "../firebase";

// Define the notification structure
export interface Notification {
  id: string;
  message: string;
  createdAt: number;
}

// Define the context type
interface NotificationContextType {
  notifications: Notification[];
  showNotification: (message: string) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

// Create the context
const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// Custom hook to use the notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

// Props for the provider component
interface NotificationProviderProps {
  children: ReactNode;
}

// Provider component
export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const notificationCounter = useRef<number>(0);

  // Track message history to prevent duplicates even after dismissal
  const recentMessages = useRef<Map<string, number>>(new Map());

  // Function to clear all notifications
  const clearAllNotifications = useCallback(() => {
    // Clear all timeouts
    Object.values(timeoutRefs.current).forEach(clearTimeout);
    timeoutRefs.current = {};

    // Clear all notifications
    setNotifications([]);

    // Clear recent messages
    recentMessages.current.clear();
  }, []);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        // User has logged out, clear all notifications
        clearAllNotifications();
      }
    });

    return () => unsubscribe();
  }, [clearAllNotifications]);

  // Clean up timeouts and message history when unmounting
  useEffect(() => {
    // Set interval to clean up old message history entries
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      // Remove messages older than 30 seconds from history
      recentMessages.current.forEach((timestamp, message) => {
        if (now - timestamp > 30000) {
          recentMessages.current.delete(message);
        }
      });
    }, 10000); // Run cleanup every 10 seconds

    return () => {
      // Clear all timeouts when component unmounts
      Object.values(timeoutRefs.current).forEach(clearTimeout);
      clearInterval(cleanupInterval);
    };
  }, []);

  // Function to dismiss a notification
  const dismissNotification = useCallback((id: string) => {
    // Clear any existing timeout for this notification
    if (timeoutRefs.current[id]) {
      clearTimeout(timeoutRefs.current[id]);
      delete timeoutRefs.current[id];
    }

    setNotifications((prevNotifications) => {
      // Check if notification still exists to avoid unnecessary rerenders
      if (!prevNotifications.some((notification) => notification.id === id)) {
        return prevNotifications;
      }
      return prevNotifications.filter((notification) => notification.id !== id);
    });
  }, []);

  // Function to add a notification with debouncing and improved duplicate detection
  const showNotification = useCallback(
    (message: string) => {
      // First check the message history to prevent duplicates
      const now = Date.now();
      const lastShown = recentMessages.current.get(message);

      // If this message was shown in the last 10 seconds, don't show it again
      if (lastShown && now - lastShown < 10000) {
        return;
      }

      // Add/update message in the recent history
      recentMessages.current.set(message, now);

      // Increment the counter to ensure unique IDs
      notificationCounter.current += 1;

      // Create a truly unique ID combining timestamp and counter
      const id = `${Date.now()}-${notificationCounter.current}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      const newNotification = {
        id,
        message,
        createdAt: now,
      };

      setNotifications((prevNotifications) => {
        // Check for duplicate messages that are still visible
        const duplicateMessageExists = prevNotifications.some(
          (notification) => notification.message === message
        );

        // If duplicate found, don't add another notification
        if (duplicateMessageExists) {
          return prevNotifications;
        }

        return [...prevNotifications, newNotification];
      });

      // Remove notification after 5 seconds
      const timeoutId = setTimeout(() => {
        dismissNotification(id);
      }, 5000);

      // Store the timeout reference for cleanup
      timeoutRefs.current[id] = timeoutId;
    },
    [dismissNotification]
  );

  const value = {
    notifications,
    showNotification,
    dismissNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
