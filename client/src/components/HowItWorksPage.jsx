import { Link } from 'react-router-dom';
import { ClipboardList, Handshake, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    title: 'Post a task',
    description:
      'Users create a task with budget, timeline, and details so others can send offers.',
    Icon: ClipboardList,
  },
  {
    title: 'Accept an offer and complete work',
    description:
      'The task owner reviews offers and assigns one participant. Both sides coordinate in chat and mark work as submitted.',
    Icon: Handshake,
  },
  {
    title: 'Confirm offline payment together',
    description:
      'Task closure happens only after both participants confirm completion and offline payment.',
    Icon: CheckCircle2,
  },
];

export default function HowItWorksPage() {
  return (
    <section className="section how-it-works-page">
      <div className="container">
        <span className="section-label">How It Works</span>
        <h1 className="section-title">How TaskMarket Works</h1>
        <p className="section-subtitle">
          TaskMarket connects users for offline-paid tasks. Payments happen offline,
          directly between both participants.
        </p>

        <div className="how-steps-grid">
          {steps.map(({ title, description, Icon }) => (
            <article key={title} className="how-step-card">
              <div className="how-step-icon" aria-hidden="true">
                <Icon size={20} />
              </div>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </div>

        <div className="how-it-works-note">
          <p>
            Reviews can be left only after a task is closed by both participants.
          </p>
          <div className="how-it-works-actions">
            <Link to="/" className="btn btn-outline btn-sm">Browse Tasks</Link>
            <Link to="/tasks/new" className="btn btn-primary btn-sm">Post a Task</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
