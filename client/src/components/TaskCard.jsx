import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';

const statusLabels = {
  open: 'Open',
  assigned: 'Assigned',
  work_submitted: 'Work Submitted',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

/**
 * Convert an ISO date string to a human-friendly relative time string.
 */
function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export default function TaskCard({ task }) {
  const id = task._id || task.id;

  return (
    <Link to={`/tasks/${id}`} className="task-card">
      <div className="task-card-header">
        <span className={`pill ${task.status}`}>
          {statusLabels[task.status] || task.status}
        </span>
        <span className="task-card-budget">
          <span className="budget-amount">
            {task.currency} {Number(task.budgetAmount).toLocaleString()}
          </span>
        </span>
      </div>

      <h3 className="task-card-title">{task.title}</h3>

      <p className="task-card-desc">
        {task.description && task.description.length > 120
          ? `${task.description.slice(0, 120)}…`
          : task.description}
      </p>

      <div className="task-card-footer">
        <div className="task-card-meta">
          <Clock size={14} />
          <span>{timeAgo(task.createdAt)}</span>
        </div>
        <ArrowRight size={16} className="task-card-arrow" />
      </div>
    </Link>
  );
}

export { timeAgo };
