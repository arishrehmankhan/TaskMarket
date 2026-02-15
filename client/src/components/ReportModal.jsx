import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { createReport } from '../lib/api';

export default function ReportModal({ isOpen, onClose, targetType, targetId }) {
  const reasonFieldId = 'report-reason';
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setReason('');
    setError('');
    setSuccess(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please describe the issue.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await createReport({ targetType, targetId, reason: reason.trim() });
      setSuccess(true);
      setReason('');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <AlertTriangle size={18} /> Report {targetType}
          </h3>
          <button className="btn-icon" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor={reasonFieldId}>Reason</label>
            <textarea
              id={reasonFieldId}
              className="form-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the issue…"
              rows={4}
              required
            />
          </div>

          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">Report submitted.</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={handleClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={submitting || success}
            >
              {submitting ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
