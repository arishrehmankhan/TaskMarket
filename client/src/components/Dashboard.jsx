import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, CheckCircle, Clock, Send, ArrowRight, MessageSquare } from 'lucide-react';
import { fetchMyTasks, submitWork, confirmOffline } from '../lib/api';
import { useAuth } from '../lib/auth-context';

const STATUS_LABELS = {
  open: 'Open',
  assigned: 'Assigned',
  work_submitted: 'Work Submitted',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

const TAB_LABELS = {
  all: 'All',
  requester: 'Posted By Me',
  fulfiller: 'Assigned To Me',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  function normalizeTasksResponse(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.tasks)) return payload.tasks;
    if (Array.isArray(payload?.data?.tasks)) return payload.data.tasks;
    return [];
  }

  useEffect(() => {
    fetchMyTasks()
      .then((payload) => setTasks(normalizeTasksResponse(payload)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === 'requester') return task.requesterId === user.id;
    if (activeTab === 'fulfiller') return task.assignedFulfillerId === user.id;
    return true;
  });

  async function handleSubmitWork(taskId) {
    setActionLoading(taskId);
    try {
      await submitWork(taskId);
      const updated = await fetchMyTasks();
      setTasks(normalizeTasksResponse(updated));
    } catch {
      /* errors handled globally */
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConfirmOffline(taskId) {
    setActionLoading(taskId);
    try {
      await confirmOffline(taskId);
      const updated = await fetchMyTasks();
      setTasks(normalizeTasksResponse(updated));
    } catch {
      /* errors handled globally */
    } finally {
      setActionLoading(null);
    }
  }

  function userAlreadyConfirmed(task) {
    const isRequester = task.requesterId === user.id;
    return isRequester ? task.requesterConfirmedOffline : task.fulfillerConfirmedOffline;
  }

  if (loading) {
    return (
      <div className="dashboard-page section">
        <div className="container">
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page section">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <span className="section-label">Dashboard</span>
            <h1 className="section-title">My Tasks</h1>
          </div>
          <Link to="/tasks/new" className="btn btn-primary">
            <Plus size={18} /> Post New Task
          </Link>
        </div>

        <div className="dashboard-tabs">
          {['all', 'requester', 'fulfiller'].map((tab) => (
            <button
              key={tab}
              className={`filter-pill ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="dashboard-grid">
          {filteredTasks.map((task) => {
            const isRequester = task.requesterId === user.id;

            return (
              <div key={task.id} className="dashboard-card">
                <div className="dashboard-card-header">
                  <span className={`pill ${task.status}`}>
                    {STATUS_LABELS[task.status] || task.status}
                  </span>
                  <span className={`pill ${isRequester ? 'requester' : 'fulfiller'}`}>
                    {isRequester ? 'Requester' : 'Fulfiller'}
                  </span>
                </div>

                <Link to={`/tasks/${task.id}`}>
                  <h3>{task.title}</h3>
                </Link>

                <div className="dashboard-card-budget">
                  {task.currency} {task.budgetAmount?.toLocaleString()}
                </div>

                {task.status === 'work_submitted' && (
                  <div className="confirmation-dots">
                    <span className={`dot ${task.requesterConfirmedOffline ? 'confirmed' : ''}`}>
                      <CheckCircle size={14} /> Requester
                    </span>
                    <span className={`dot ${task.fulfillerConfirmedOffline ? 'confirmed' : ''}`}>
                      <CheckCircle size={14} /> Fulfiller
                    </span>
                  </div>
                )}

                <div className="dashboard-card-actions">
                  {task.status === 'assigned' && !isRequester && (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={actionLoading === task.id}
                      onClick={() => handleSubmitWork(task.id)}
                    >
                      <Send size={14} /> {actionLoading === task.id ? 'Submitting…' : 'Submit Work'}
                    </button>
                  )}

                  {task.status === 'work_submitted' && !userAlreadyConfirmed(task) && (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={actionLoading === task.id}
                      onClick={() => handleConfirmOffline(task.id)}
                    >
                      <CheckCircle size={14} />{' '}
                      {actionLoading === task.id ? 'Confirming…' : 'Confirm Offline Payment'}
                    </button>
                  )}

                  {task.status === 'closed' && (
                    <Link to={`/tasks/${task.id}/review`} className="btn btn-outline btn-sm">
                      <ArrowRight size={14} /> Leave Review
                    </Link>
                  )}

                  {['assigned', 'work_submitted'].includes(task.status) && (
                    <Link to={`/messages?taskId=${task.id}`} className="btn btn-outline btn-sm">
                      <MessageSquare size={14} /> Chat
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredTasks.length === 0 && (
          <div className="empty-state">
            <Clock size={40} />
            <p>No tasks here yet.</p>
            <Link to="/tasks/new" className="btn btn-primary">
              Post Your First Task
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
