import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  X,
  Send,
  MessageSquare,
  Flag,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  fetchTask,
  submitOffer,
  withdrawOffer,
  acceptOffer,
  cancelTask,
  adminRequestTaskModification,
  adminDeleteTask,
  submitWork,
  confirmOffline,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { timeAgo } from './TaskCard';
import ReportModal from './ReportModal';

const statusLabels = {
  open: 'Open',
  assigned: 'Assigned',
  work_submitted: 'Work Submitted',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export default function TaskDetail() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showAdminModifyModal, setShowAdminModifyModal] = useState(false);
  const [showAdminDeleteModal, setShowAdminDeleteModal] = useState(false);
  const [modificationNoteInput, setModificationNoteInput] = useState('');
  const [adminModifyError, setAdminModifyError] = useState('');
  const [adminDeleteError, setAdminDeleteError] = useState('');

  // Offer form state
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTask(taskId);
      // API may return { task, offers } or flat object
      if (data.task) {
        setTask(data.task);
        setOffers(data.offers ?? []);
      } else {
        setTask(data);
        setOffers(data.offers ?? []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Derived state ── */
  const userId = user?._id || user?.id;
  const requesterId = task?.requesterId?._id || task?.requesterId?.id || task?.requesterId;
  const assignedFulfillerId =
    task?.assignedFulfillerId?._id || task?.assignedFulfillerId?.id || task?.assignedFulfillerId;
  const isRequester = Boolean(userId && requesterId) && String(requesterId) === String(userId);
  const isFulfiller = Boolean(userId && assignedFulfillerId) && String(assignedFulfillerId) === String(userId);
  const isParticipant = isRequester || isFulfiller;
  const isAdmin = user?.role === 'admin';

  const userPendingOffer =
    userId &&
    offers.find(
      (o) =>
        String(o.fulfillerId?._id || o.fulfillerId?.id || o.fulfillerId) === String(userId) &&
        o.status === 'pending'
    );

  const canSubmitOffer =
    user && task?.status === 'open' && !task?.requiresModification && !isRequester && !userPendingOffer;

  /* ── Action handlers ── */
  async function wrap(fn) {
    try {
      setActionError('');
      setBusy(true);
      await fn();
      await load();
    } catch (err) {
      setActionError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    if (!window.confirm('Cancel this task?')) return;
    wrap(() => cancelTask(taskId));
  }

  function handleAcceptOffer(offerId) {
    wrap(() => acceptOffer(taskId, offerId));
  }

  function handleWithdrawOffer(offerId) {
    wrap(() => withdrawOffer(taskId, offerId));
  }

  function handleSubmitWork() {
    wrap(() => submitWork(taskId));
  }

  function handleConfirmOffline() {
    wrap(() => confirmOffline(taskId));
  }

  function openAdminRequestModificationModal() {
    setAdminModifyError('');
    setModificationNoteInput(task?.modificationNote || '');
    setShowAdminModifyModal(true);
  }

  async function handleAdminRequestModificationSubmit(e) {
    e.preventDefault();

    const trimmed = modificationNoteInput.trim();
    if (trimmed.length < 5) {
      setAdminModifyError('Please enter at least 5 characters.');
      return;
    }

    try {
      setAdminModifyError('');
      setActionError('');
      setBusy(true);
      await adminRequestTaskModification(taskId, { note: trimmed });
      setShowAdminModifyModal(false);
      await load();
    } catch (err) {
      setAdminModifyError(err.message || 'Failed to request modifications');
    } finally {
      setBusy(false);
    }
  }

  function openAdminDeleteModal() {
    setAdminDeleteError('');
    setShowAdminDeleteModal(true);
  }

  async function handleAdminDeleteConfirm() {
    try {
      setAdminDeleteError('');
      setActionError('');
      setBusy(true);
      await adminDeleteTask(taskId);
      navigate('/');
    } catch (err) {
      setAdminDeleteError(err.message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitOffer(e) {
    e.preventDefault();
    if (!offerAmount) return;

    const trimmedMessage = offerMessage.trim();
    if (trimmedMessage.length < 5) {
      setActionError('Please enter at least 5 characters in your offer message.');
      return;
    }

    await wrap(() =>
      submitOffer(taskId, {
        amount: Number(offerAmount),
        message: trimmedMessage,
      })
    );
    setOfferAmount('');
    setOfferMessage('');
  }

  /* ── Render helpers ── */
  if (loading) return <div className="section"><div className="container"><div className="empty-state">Loading…</div></div></div>;
  if (error)   return <div className="section"><div className="container"><div className="empty-state">{error}</div></div></div>;
  if (!task)    return null;

  return (
    <div className="task-detail-page section">
      <div className="container">
        {/* Back link */}
        <Link to="/" className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
          <ArrowLeft size={16} /> Back to tasks
        </Link>

        {/* ── Main card ── */}
        <div className="task-detail-card detail-card">
          <div className="task-detail-header detail-header">
            <div>
              <div className="detail-status-row">
                <span className={`pill ${task.status}`}>
                  {statusLabels[task.status] || task.status}
                </span>
              </div>
              <h1 className="detail-title">{task.title}</h1>
            </div>
            <div className="task-detail-budget detail-budget-box">
              <span className="detail-budget-label">Budget</span>
              <span className="detail-budget-amount">
                {task.currency} {Number(task.budgetAmount).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="task-detail-body detail-desc">
            <p>{task.description}</p>
          </div>

          {task.requiresModification && (isRequester || isAdmin) && (
            <div className="confirmation-status" style={{ background: 'var(--coral-bg)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 24 }}>
              <h3 className="detail-section-heading" style={{ border: 'none', paddingBottom: 0 }}>
                Changes requested by admin
              </h3>
              <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>
                {task.modificationNote || 'Please review and update this task.'}
              </p>
            </div>
          )}

          <div className="task-detail-meta detail-meta" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
            <span><Clock size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Posted {timeAgo(task.createdAt)}</span>
            {task.workSubmittedAt && (
              <span><Clock size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Work submitted {timeAgo(task.workSubmittedAt)}</span>
            )}
            {task.closedAt && (
              <span><Clock size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Closed {timeAgo(task.closedAt)}</span>
            )}
          </div>

          {/* Confirmation status */}
          {task.status === 'work_submitted' && (
            <div className="confirmation-status" style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 24 }}>
              <h3 className="detail-section-heading" style={{ border: 'none', paddingBottom: 0 }}>Offline Payment Confirmation</h3>
              <div className="confirmation-row" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <span>
                  {task.requesterConfirmedOffline
                    ? <><CheckCircle size={16} style={{ color: 'var(--primary)', verticalAlign: -3, marginRight: 4 }} /> Requester: Confirmed</>
                    : <><XCircle size={16} style={{ color: 'var(--text-light)', verticalAlign: -3, marginRight: 4 }} /> Requester: Pending</>}
                </span>
                <span>
                  {task.fulfillerConfirmedOffline
                    ? <><CheckCircle size={16} style={{ color: 'var(--primary)', verticalAlign: -3, marginRight: 4 }} /> Fulfiller: Confirmed</>
                    : <><XCircle size={16} style={{ color: 'var(--text-light)', verticalAlign: -3, marginRight: 4 }} /> Fulfiller: Pending</>}
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="task-detail-actions detail-actions">
            {isRequester && task.status === 'open' && (
              <>
                <Link to={`/tasks/${taskId}/edit`} className="btn btn-primary btn-sm">
                  <Edit size={14} /> Edit
                </Link>
                <button className="btn btn-danger btn-sm" onClick={handleCancel} disabled={busy}>
                  <Trash2 size={14} /> Cancel Task
                </button>
              </>
            )}

            {isAdmin && task.status === 'open' && (
              <>
                <button className="btn btn-outline sage btn-sm" onClick={openAdminRequestModificationModal} disabled={busy}>
                  Request Modifications
                </button>
                <button className="btn btn-danger btn-sm" onClick={openAdminDeleteModal} disabled={busy}>
                  <Trash2 size={14} /> Delete Post
                </button>
              </>
            )}

            {isFulfiller && task.status === 'assigned' && (
              <button className="btn btn-primary" onClick={handleSubmitWork} disabled={busy}>
                <Send size={14} /> Submit Work
              </button>
            )}

            {isParticipant && task.status === 'work_submitted' && (
              <button className="btn btn-primary" onClick={handleConfirmOffline} disabled={busy}>
                <CheckCircle size={14} /> Confirm Offline Payment
              </button>
            )}

            {isParticipant && ['assigned', 'work_submitted', 'closed'].includes(task.status) && (
              <Link to={`/messages?taskId=${taskId}`} className="btn btn-outline sage btn-sm">
                <MessageSquare size={14} /> Open Chat
              </Link>
            )}

            {task.status === 'closed' && user && (
              <Link to={`/tasks/${taskId}/review`} className="btn btn-outline coral btn-sm">
                Leave Review
              </Link>
            )}

            {user && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowReport(true)}>
                <Flag size={14} /> Report
              </button>
            )}
          </div>

          {actionError && <div className="form-error" style={{ marginTop: 12 }}>{actionError}</div>}
        </div>

        {/* ── Offers section ── */}
        <div className="offers-section" style={{ marginTop: 40 }}>
          <h2 className="detail-section-heading">Offers ({offers.length})</h2>

          {offers.length === 0 && (
            <div className="empty-state">No offers yet.</div>
          )}

          {offers.map((offer) => {
            const oid = offer._id || offer.id;
            const fid = offer.fulfillerId?._id || offer.fulfillerId?.id || offer.fulfillerId;
            const initial = (offer.fulfillerId?.fullName || offer.fulfillerName || 'F').charAt(0).toUpperCase();
            const isOwnOffer = Boolean(userId && fid) && String(fid) === String(userId);

            return (
              <div className="offer-card" key={oid}>
                <div className="avatar sm sage">{initial}</div>
                <div className="offer-info">
                  <div className="offer-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Link to={`/users/${fid}`} className="offer-name">
                      {offer.fulfillerId?.fullName || offer.fulfillerName || 'Fulfiller'}
                    </Link>
                    <span className={`pill ${offer.status}`}>{offer.status}</span>
                  </div>
                  {offer.message && <p className="offer-msg">{offer.message}</p>}
                  <div className="offer-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    <span className="offer-amount">
                      {task.currency} {Number(offer.amount).toLocaleString()}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {isRequester && offer.status === 'pending' && (
                        <button className="offer-accept" onClick={() => handleAcceptOffer(oid)} disabled={busy}>
                          Accept
                        </button>
                      )}
                      {isOwnOffer && offer.status === 'pending' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleWithdrawOffer(oid)} disabled={busy}>
                          Withdraw
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Submit Offer form ── */}
        {canSubmitOffer && (
          <div className="offer-form-card form-card" style={{ marginTop: 32 }}>
            <h3 className="detail-section-heading">Make an Offer</h3>
            <form onSubmit={handleSubmitOffer}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Your Price ({task.currency})</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    step="any"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea
                  className="form-textarea"
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  placeholder="Describe why you're a great fit…"
                  required
                  minLength={5}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                <Send size={14} /> Submit Offer
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Report modal */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetType="task"
        targetId={taskId}
      />

      {showAdminModifyModal && (
        <div className="modal-overlay" onClick={() => setShowAdminModifyModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request modifications</h3>
              <button className="btn-icon" onClick={() => setShowAdminModifyModal(false)}>
                <X size={20} />
              </button>
            </div>

            <p className="modal-desc">Send a clear note to the poster about what to update.</p>

            <form onSubmit={handleAdminRequestModificationSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="modification-note">Modification note</label>
                <textarea
                  id="modification-note"
                  className="form-textarea"
                  value={modificationNoteInput}
                  onChange={(e) => setModificationNoteInput(e.target.value)}
                  placeholder="Explain the required changes…"
                  rows={4}
                  minLength={5}
                  maxLength={500}
                  required
                />
              </div>

              {adminModifyError && <div className="form-error">{adminModifyError}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAdminModifyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Sending…' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdminDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowAdminDeleteModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete post</h3>
              <button className="btn-icon" onClick={() => setShowAdminDeleteModal(false)}>
                <X size={20} />
              </button>
            </div>

            <p className="modal-desc">This permanently deletes the task post and related offers/messages. This action cannot be undone.</p>

            {adminDeleteError && <div className="form-error">{adminDeleteError}</div>}

            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowAdminDeleteModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleAdminDeleteConfirm} disabled={busy}>
                {busy ? 'Deleting…' : 'Delete Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
