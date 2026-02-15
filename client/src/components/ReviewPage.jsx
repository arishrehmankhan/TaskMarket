import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import { createReview, fetchTask } from '../lib/api';
import { useAuth } from '../lib/auth-context';

function normalizeTaskPayload(payload) {
  if (payload?.task) return payload.task;
  if (payload?.data?.task) return payload.data.task;
  return payload;
}

export default function ReviewPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTask() {
      try {
        setLoading(true);
        setError('');
        const payload = await fetchTask(taskId);
        setTask(normalizeTaskPayload(payload));
      } catch (err) {
        setError(err.message || 'Failed to load task');
      } finally {
        setLoading(false);
      }
    }

    loadTask();
  }, [taskId]);

  const userId = user?.id || user?._id;

  const canReview = useMemo(() => {
    if (!task || !userId) return false;
    const requesterId = task.requesterId?._id || task.requesterId;
    const fulfillerId = task.assignedFulfillerId?._id || task.assignedFulfillerId;
    return (
      task.status === 'closed' &&
      (String(requesterId) === String(userId) || String(fulfillerId) === String(userId))
    );
  }, [task, userId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rating || !canReview) return;

    try {
      setSubmitting(true);
      setError('');
      await createReview({
        taskId,
        rating,
        comment: comment.trim(),
      });
      navigate(`/tasks/${taskId}`, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="review-page section">
        <div className="container">
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="review-page section">
      <div className="container">
        <div className="review-shell">
          <Link to={`/tasks/${taskId}`} className="btn btn-ghost btn-sm">
            <ArrowLeft size={14} /> Back to task
          </Link>

          <div className="review-form-card">
            <span className="section-label">Review</span>
            <h1 className="section-title">Leave a Review</h1>
            <p className="review-subtitle">Task: {task?.title || 'Task'}</p>

            {!canReview ? (
              <div className="error-banner">Review is available only for closed tasks where you are a participant.</div>
            ) : (
              <form className="review-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Your Rating</label>
                  <div className="review-stars-input" role="radiogroup" aria-label="Rating">
                    {Array.from({ length: 5 }, (_, i) => {
                      const value = i + 1;
                      const active = value <= rating;
                      return (
                        <button
                          key={value}
                          type="button"
                          className={`star-btn ${active ? 'active' : ''}`}
                          onClick={() => setRating(value)}
                          aria-label={`${value} star${value > 1 ? 's' : ''}`}
                        >
                          <Star size={22} fill={active ? 'currentColor' : 'none'} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Comment (optional)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Share your experience working together"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={1000}
                  />
                </div>

                {error && <div className="form-error">{error}</div>}

                <div className="review-actions">
                  <button type="submit" className="btn btn-primary" disabled={!rating || submitting}>
                    {submitting ? 'Submitting…' : 'Submit Review'}
                  </button>
                  <Link to={`/tasks/${taskId}`} className="btn btn-outline btn-sm">
                    Cancel
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
