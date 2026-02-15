import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PlusCircle } from 'lucide-react';
import { fetchTasks } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import TaskCard from './TaskCard';

const categories = ['Home Services', 'Design', 'Translation', 'Moving', 'Writing', 'Tech Support'];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);

  function handlePostTask() {
    navigate(user ? '/tasks/new' : '/login');
  }

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTasks({ status: 'open' });
      const list = Array.isArray(data) ? data : data.tasks ?? [];
      const topTasks = list
        .slice()
        .sort((a, b) => Number(b.budgetAmount || 0) - Number(a.budgetAmount || 0))
        .slice(0, 6);
      setTasks(topTasks);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadTasks();
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [loadTasks]);

  function openTasksPage(nextSearch) {
    const q = nextSearch.trim();
    navigate(q ? `/tasks?q=${encodeURIComponent(q)}` : '/tasks');
  }

  function handleSearch(e) {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    openTasksPage(search);
  }

  return (
    <div className="home-page">
      {/* ── Hero ── */}
      <section className="hero">
        <div className="geo-circle a"></div>
        <div className="geo-circle b"></div>
        <div className="geo-circle c"></div>
        <div className="geo-rect d"></div>

        <div className="container">
          <h1 className="hero-headline">
            Get things <span className="accent">done</span>. Get{' '}
            <span className="accent-coral">paid</span> doing them.
          </h1>
          <p className="hero-sub">
            A marketplace where people post tasks and skilled individuals bid to
            complete them. Payment happens directly between you.
          </p>

          <div className="hero-cta-row">
            <form className="hero-search" onSubmit={handleSearch}>
            <input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search tasks"
            />
              <button type="submit">
                <Search size={18} /> Search
              </button>
            </form>
            <button className="hero-post-btn" onClick={handlePostTask}>
              <PlusCircle size={20} />
              Post a Task
            </button>
          </div>

          <button className="hero-support-link" onClick={() => navigate('/how-it-works')}>
            New to TaskMarket? See how it works
          </button>

          <div className="hero-categories">
            {categories.map((c) => (
              <button className="cat-pill" key={c} onClick={() => openTasksPage(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Task Feed ── */}
      <section className="section">
        <div className="container">
          <span className="section-label">Open Opportunities</span>
          <h2 className="section-title">Top Open Tasks</h2>
          <p className="filter-help">Showing the 6 highest-budget open tasks.</p>

          {loading ? (
            <div className="empty-state">Loading tasks…</div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">No tasks found.</div>
          ) : (
            <div className="task-grid">
              {tasks.map((task) => (
                <TaskCard key={task._id || task.id} task={task} />
              ))}
            </div>
          )}

          <div className="home-tasks-actions">
            <button className="btn btn-outline" onClick={() => navigate('/tasks')}>
              View all tasks
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
