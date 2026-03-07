import type { Notification } from '../../entities/types';

interface NotificationsPanelProps {
  notifications: Notification[];
}

export function NotificationsPanel({ notifications }: NotificationsPanelProps) {
  return (
    <section className="panel notifications">
      <h2>Notifications</h2>
      <ul>
        {notifications.slice(0, 6).map((notification) => (
          <li key={notification.id} className={`note-${notification.kind}`}>
            <span className="time">D{notification.day}</span>
            <span>{notification.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
