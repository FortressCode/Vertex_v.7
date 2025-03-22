import React, { useCallback } from "react";
import {
  useNotification,
  Notification as NotificationType,
} from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";
import "../styles/Notification.css";

const Notification: React.FC = () => {
  const { notifications, dismissNotification } = useNotification();
  const { currentUser } = useAuth();

  const handleDismiss = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
      // Prevent event from bubbling up to parent elements
      e.stopPropagation();
      e.preventDefault();

      // Get the notification element
      const notificationElement = e.currentTarget.closest(
        ".notification"
      ) as HTMLDivElement;

      if (notificationElement) {
        // Add the exit animation class
        notificationElement.classList.add("notification-exit");

        // Prevent additional click events during animation
        notificationElement.style.pointerEvents = "none";

        // Wait for animation to complete before removing
        setTimeout(() => {
          dismissNotification(id);
        }, 300); // Match this with the CSS animation duration
      } else {
        // Fallback if element not found
        dismissNotification(id);
      }
    },
    [dismissNotification]
  );

  // Render nothing if no notifications or if user is not logged in
  if (notifications.length === 0 || !currentUser) {
    return null;
  }

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="notification"
          data-id={notification.id}
        >
          <div className="notification-content">
            <span className="notification-message">{notification.message}</span>
            <button
              className="notification-close"
              onClick={(e) => handleDismiss(e, notification.id)}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Notification;
