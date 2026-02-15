import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TaskCard, { timeAgo } from '../../src/components/TaskCard';

describe('TaskCard Component', () => {
  const mockTask = {
    id: '123',
    title: 'Build a website',
    description: 'I need a professional website for my business',
    budgetAmount: 500,
    currency: 'INR',
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  const renderTaskCard = (task = mockTask) => {
    return render(
      <BrowserRouter>
        <TaskCard task={task} />
      </BrowserRouter>
    );
  };

  it('should render task title', () => {
    renderTaskCard();
    expect(screen.getByText('Build a website')).toBeInTheDocument();
  });

  it('should render task description (truncated if too long)', () => {
    const longDescription = 'a'.repeat(150);
    const task = { ...mockTask, description: longDescription };
    renderTaskCard(task);
    
    const descElement = screen.getByText((content) => content.includes('a') && content.includes('…'));
    expect(descElement).toBeInTheDocument();
  });

  it('should render full description if short', () => {
    const task = { ...mockTask, description: 'Short description' };
    renderTaskCard(task);
    expect(screen.getByText('Short description')).toBeInTheDocument();
  });

  it('should render budget with currency', () => {
    renderTaskCard();
    expect(screen.getByText(/INR 500/)).toBeInTheDocument();
  });

  it('should render status badge', () => {
    renderTaskCard();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('should render correct status labels for different statuses', () => {
    const statuses = ['assigned', 'work_submitted', 'closed', 'cancelled'];
    const labels = ['Assigned', 'Work Submitted', 'Closed', 'Cancelled'];

    statuses.forEach((status, index) => {
      const task = { ...mockTask, status };
      const { unmount } = renderTaskCard(task);
      expect(screen.getByText(labels[index])).toBeInTheDocument();
      unmount();
    });
  });

  it('should be a link to task detail page', () => {
    renderTaskCard();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/tasks/123');
  });

  it('should use _id if available', () => {
    const task = { ...mockTask, _id: 'abc456', id: undefined };
    renderTaskCard(task);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/tasks/abc456');
  });
});

describe('timeAgo helper', () => {
  it('should return "just now" for current timestamp', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe('just now');
  });

  it('should return minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinutesAgo)).toBe('5m ago');
  });

  it('should return hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoHoursAgo)).toBe('2h ago');
  });

  it('should return days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(threeDaysAgo)).toBe('3d ago');
  });

  it('should return weeks ago', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoWeeksAgo)).toBe('2w ago');
  });

  it('should return months ago', () => {
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoMonthsAgo)).toBe('2mo ago');
  });
});
