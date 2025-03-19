import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

// Define the notification structure
export interface Notification {
  id: string;
  message: string;
}

// Define the context type
interface NotificationContextType {
  notifications: Notification[];
  showNotification: (message: string) => void;
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

  // Function to add a notification
  const showNotification = useCallback((message: string) => {
    const newNotification = {
      id: Date.now().toString(),
      message,
    };

    setNotifications((prevNotifications) => [
      ...prevNotifications,
      newNotification,
    ]);

    // Remove notification after 5 seconds
    setTimeout(() => {
      setNotifications((prevNotifications) =>
        prevNotifications.filter(
          (notification) => notification.id !== newNotification.id
        )
      );
    }, 5000);
  }, []);

  const value = {
    notifications,
    showNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
