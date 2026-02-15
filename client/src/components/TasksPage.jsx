import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { fetchTasks } from '../lib/api';
import TaskCard from './TaskCard';

const filterLabels = {
  all: 'All',
  open: 'Open',
  assigned: 'Assigned',
  work_submitted: 'Work Submitted',
  closed: 'Closed',
};

const filterHelpText = {
  all: 'Show tasks in every status.',
  open: 'Show tasks currently accepting offers.',
  assigned: 'Show tasks with an accepted fulfiller.',
  work_submitted: 'Show tasks where work was submitted and awaiting final confirmation.',
  closed: 'Show tasks completed and closed by both sides.',
};

const publishedDateOptions = {
  all: 'Any time',
  '1d': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

const sortOptions = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  budget_desc: 'Highest budget',
  budget_asc: 'Lowest budget',
};

function getNumberParam(value) {
  if (!value) return '';
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? String(numericValue) : '';
}

function getDaysFromPublishedOption(value) {
  if (!value || value === 'all') return null;
  const parsed = Number.parseInt(value.replace('d', ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function sortTasks(taskList, sortBy) {
  const sorted = taskList.slice();
  switch (sortBy) {
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    case 'budget_desc':
      return sorted.sort((a, b) => Number(b.budgetAmount || 0) - Number(a.budgetAmount || 0));
    case 'budget_asc':
      return sorted.sort((a, b) => Number(a.budgetAmount || 0) - Number(b.budgetAmount || 0));
    case 'newest':
    default:
      return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [minBudgetInput, setMinBudgetInput] = useState(getNumberParam(searchParams.get('minBudget')));
  const [maxBudgetInput, setMaxBudgetInput] = useState(getNumberParam(searchParams.get('maxBudget')));
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => (searchParams.get('q') || '').trim(), [searchParams]);
  const status = useMemo(() => {
    const value = searchParams.get('status') || 'all';
    return Object.prototype.hasOwnProperty.call(filterLabels, value) ? value : 'all';
  }, [searchParams]);

  const published = useMemo(() => {
    const value = searchParams.get('published') || 'all';
    return Object.prototype.hasOwnProperty.call(publishedDateOptions, value) ? value : 'all';
  }, [searchParams]);

  const sort = useMemo(() => {
    const value = searchParams.get('sort') || 'newest';
    return Object.prototype.hasOwnProperty.call(sortOptions, value) ? value : 'newest';
  }, [searchParams]);

  const minBudget = useMemo(() => getNumberParam(searchParams.get('minBudget')), [searchParams]);
  const maxBudget = useMemo(() => getNumberParam(searchParams.get('maxBudget')), [searchParams]);

  const loadTasks = useCallback(async (q, taskStatus) => {
    try {
      setLoading(true);
      const params = {};
      if (q) params.q = q;
      if (taskStatus && taskStatus !== 'all') params.status = taskStatus;
      const data = await fetchTasks(params);
      setTasks(Array.isArray(data) ? data : data.tasks ?? []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSearchInput(query);
    setMinBudgetInput(minBudget);
    setMaxBudgetInput(maxBudget);
  }, [query, minBudget, maxBudget]);

  useEffect(() => {
    loadTasks(query, status);
  }, [query, status, loadTasks]);

  function updateSearchParams(nextQuery, nextStatus, nextPublished, nextSort, nextMinBudget, nextMaxBudget) {
    const params = new URLSearchParams();
    const cleanQuery = (nextQuery || '').trim();
    const cleanMinBudget = getNumberParam(nextMinBudget);
    const cleanMaxBudget = getNumberParam(nextMaxBudget);

    if (cleanQuery) params.set('q', cleanQuery);
    if (nextStatus && nextStatus !== 'all') params.set('status', nextStatus);
    if (nextPublished && nextPublished !== 'all') params.set('published', nextPublished);
    if (nextSort && nextSort !== 'newest') params.set('sort', nextSort);
    if (cleanMinBudget) params.set('minBudget', cleanMinBudget);
    if (cleanMaxBudget) params.set('maxBudget', cleanMaxBudget);

    setSearchParams(params);
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    updateSearchParams(searchInput, status, published, sort, minBudgetInput, maxBudgetInput);
  }

  function handleFilterChange(nextStatus) {
    updateSearchParams(searchInput, nextStatus, published, sort, minBudgetInput, maxBudgetInput);
  }

  function handlePublishedChange(event) {
    updateSearchParams(searchInput, status, event.target.value, sort, minBudgetInput, maxBudgetInput);
  }

  function handleSortChange(event) {
    updateSearchParams(searchInput, status, published, event.target.value, minBudgetInput, maxBudgetInput);
  }

  const visibleTasks = useMemo(() => {
    const liveMinBudget = getNumberParam(minBudgetInput);
    const liveMaxBudget = getNumberParam(maxBudgetInput);
    const minValue = liveMinBudget ? Number(liveMinBudget) : null;
    const maxValue = liveMaxBudget ? Number(liveMaxBudget) : null;
    const days = getDaysFromPublishedOption(published);
    const now = Date.now();

    const filtered = tasks.filter((task) => {
      const budget = Number(task.budgetAmount || 0);
      if (minValue !== null && budget < minValue) return false;
      if (maxValue !== null && budget > maxValue) return false;

      if (days !== null) {
        const createdAt = new Date(task.createdAt).getTime();
        if (!Number.isFinite(createdAt)) return false;
        const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
        if (ageInDays > days) return false;
      }

      return true;
    });

    return sortTasks(filtered, sort);
  }, [tasks, minBudgetInput, maxBudgetInput, published, sort]);

  return (
    <div className="tasks-page">
      <section className="section tasks-hero">
        <div className="container">
          <span className="section-label">Task Directory</span>
          <h1 className="section-title">Find the right task faster</h1>
          <p className="section-subtitle">
            Search by keyword, filter by publish date and budget range, then sort your results.
          </p>

          <form className="tasks-search" onSubmit={handleSearchSubmit}>
            <Search size={18} aria-hidden="true" />
            <input
              placeholder="Search by title, description, or category"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              aria-label="Search all tasks"
            />
            <button type="submit">Search</button>
          </form>

          <div className="feed-filters">
            {Object.entries(filterLabels).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`filter-pill${status === value ? ' active' : ''}`}
                onClick={() => handleFilterChange(value)}
                title={filterHelpText[value]}
                aria-label={`${label}. ${filterHelpText[value]}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="tasks-filter-grid">
            <label className="tasks-field">
              <span>Published</span>
              <select value={published} onChange={handlePublishedChange}>
                {Object.entries(publishedDateOptions).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="tasks-field">
              <span>Min budget</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={minBudgetInput}
                onChange={(event) => setMinBudgetInput(event.target.value)}
              />
            </label>

            <label className="tasks-field">
              <span>Max budget</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="No limit"
                value={maxBudgetInput}
                onChange={(event) => setMaxBudgetInput(event.target.value)}
              />
            </label>

            <label className="tasks-field">
              <span>Sort by</span>
              <select value={sort} onChange={handleSortChange}>
                {Object.entries(sortOptions).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="section tasks-results">
        <div className="container">
          {!loading && <p className="tasks-result-count">{visibleTasks.length} task{visibleTasks.length === 1 ? '' : 's'} found</p>}
          {loading ? (
            <div className="empty-state">Loading tasks…</div>
          ) : visibleTasks.length === 0 ? (
            <div className="empty-state">No tasks match your search.</div>
          ) : (
            <div className="task-grid">
              {visibleTasks.map((task) => (
                <TaskCard key={task._id || task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}