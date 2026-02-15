import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createTask, updateTask, fetchTask } from '../lib/api';

export default function TaskForm() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(taskId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);

  function normalizeTaskPayload(payload) {
    return payload?.task ?? payload?.data?.task ?? payload;
  }

  useEffect(() => {
    if (!isEdit) return;

    fetchTask(taskId)
      .then((payload) => {
        const task = normalizeTaskPayload(payload);
        setTitle(task.title);
        setDescription(task.description);
        setBudgetAmount(task.budgetAmount);
        setCurrency(task.currency);
      })
      .catch((err) => setError(err.message || 'Failed to load task'))
      .finally(() => setLoading(false));
  }, [taskId, isEdit]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const body = {
      title: title.trim(),
      description: description.trim(),
      budgetAmount: Number(budgetAmount),
      currency,
    };

    try {
      if (isEdit) {
        await updateTask(taskId, body);
        navigate(`/tasks/${taskId}`);
      } else {
        const created = await createTask(body);
        const task = normalizeTaskPayload(created);
        const createdTaskId = task?.id || task?._id;
        if (!createdTaskId) {
          throw new Error('Task created but task id is missing in response');
        }
        navigate(`/tasks/${createdTaskId}`);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="task-form-page section">
        <div className="container">
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-form-page section">
      <div className="container">
        <div className="task-form-card">
          <h1>{isEdit ? 'Edit Task' : 'Post a New Task'}</h1>
          <p className="form-subtitle">
            {isEdit
              ? 'Update your task details.'
              : 'Describe what you need done and set your budget.'}
          </p>

          <form className="task-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="task-title">Title</label>
              <input
                id="task-title"
                className="form-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Fix leaking kitchen faucet"
                required
                minLength={5}
                maxLength={140}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="task-description">Description</label>
              <textarea
                id="task-description"
                className="form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the task in detail..."
                rows={5}
                required
                minLength={10}
                maxLength={2500}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="task-budget">Budget</label>
                <input
                  id="task-budget"
                  className="form-input"
                  type="number"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="e.g., 5000"
                  min={1}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="task-currency">Currency</label>
                <select
                  id="task-currency"
                  className="form-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : isEdit ? 'Update Task' : 'Post Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
