import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { fetchAdminReports, resolveReport } from '../lib/api';

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

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [actionLoadingId, setActionLoadingId] = useState('');

  async function loadReports(filter) {
    setLoading(true);
    setError('');

    try {
      const payload = await fetchAdminReports(filter === 'all' ? '' : filter);
      setReports(normalizeReportsResponse(payload));
    } catch (err) {
      setError(err?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports(statusFilter);
  }, [statusFilter]);

  async function handleResolve(reportId, status) {
    setActionLoadingId(`${reportId}:${status}`);
    setError('');
    try {
      await resolveReport(reportId, { status, resolutionNote: '' });
      await loadReports(statusFilter);
    } catch (err) {
      setError(err?.message || 'Failed to update report');
    } finally {
      setActionLoadingId('');
    }
  }

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
            <span className="section-label">Admin</span>
            <h1 className="section-title">Reports Dashboard</h1>
            <p className="section-subtitle">Review and moderate user-submitted reports.</p>
          </div>
        </div>

        <div className="dashboard-tabs">
          {['all', 'open', 'resolved', 'dismissed'].map((value) => (
            <button
              key={value}
              className={`filter-pill ${statusFilter === value ? 'active' : ''}`}
              onClick={() => setStatusFilter(value)}
            >
              {value === 'all' ? 'All' : STATUS_LABELS[value]}
            </button>
          ))}
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

              <p className="report-meta">Reporter: {report.reporterId}</p>
              <p className="report-meta">Submitted: {formatDate(report.createdAt)}</p>
              {report.resolvedAt && <p className="report-meta">Handled: {formatDate(report.resolvedAt)}</p>}
              {report.resolutionNote && <p className="report-note">Note: {report.resolutionNote}</p>}

              {report.status === 'open' && (
                <div className="dashboard-card-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleResolve(report.id, 'resolved')}
                    disabled={actionLoadingId === `${report.id}:resolved` || actionLoadingId === `${report.id}:dismissed`}
                  >
                    Resolve
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleResolve(report.id, 'dismissed')}
                    disabled={actionLoadingId === `${report.id}:resolved` || actionLoadingId === `${report.id}:dismissed`}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>

        {reports.length === 0 && (
          <div className="empty-state">
            <ShieldCheck size={40} />
            <p className="empty-state-title">No reports found.</p>
            <p className="empty-state-desc">Try another filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}