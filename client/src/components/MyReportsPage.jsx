import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileWarning, Clock } from 'lucide-react';
import { fetchMyReports } from '../lib/api';

const STATUS_LABELS = {
  open: 'Open',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function normalizeReportsResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.reports)) return payload.reports;
  if (Array.isArray(payload?.data?.reports)) return payload.data.reports;
  return [];
}

export default function MyReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyReports()
      .then((payload) => setReports(normalizeReportsResponse(payload)))
      .catch((err) => setError(err?.message || 'Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="reports-page section">
        <div className="container">
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page section">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <span className="section-label">Safety</span>
            <h1 className="section-title">My Reports</h1>
            <p className="section-subtitle">Track reports you have submitted.</p>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="dashboard-grid">
          {reports.map((report) => (
            <article key={report.id} className="dashboard-card report-card">
              <div className="dashboard-card-header">
                <span className={`pill ${report.status}`}>
                  {STATUS_LABELS[report.status] || report.status}
                </span>
                <span className={`pill ${report.targetType}`}>Target: {report.targetType}</span>
              </div>

              <h3 className="report-title">Report #{report.id.slice(-6)}</h3>
              <p className="report-reason">{report.reason}</p>

              <p className="report-meta">Submitted: {formatDate(report.createdAt)}</p>
              {report.resolvedAt && <p className="report-meta">Handled: {formatDate(report.resolvedAt)}</p>}
              {report.resolutionNote && <p className="report-note">Note: {report.resolutionNote}</p>}

              {report.targetType === 'task' && (
                <Link to={`/tasks/${report.targetId}`} className="btn btn-outline btn-sm">
                  View Task
                </Link>
              )}

              {report.targetType === 'user' && (
                <Link to={`/users/${report.targetId}`} className="btn btn-outline btn-sm">
                  View User
                </Link>
              )}
            </article>
          ))}
        </div>

        {reports.length === 0 && (
          <div className="empty-state">
            <FileWarning size={40} />
            <p className="empty-state-title">No reports submitted yet.</p>
            <p className="empty-state-desc">
              If you report a task or user, it will appear here.
            </p>
            <Link to="/dashboard" className="btn btn-primary">
              <Clock size={16} /> Back to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}