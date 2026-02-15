import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Flag } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { fetchUser, fetchUserReviews } from '../lib/api';
import ReportModal from './ReportModal';

const AVATAR_COLORS = ['coral', 'sky', 'mint', 'lavender', 'peach'];

function avatarColor(name = '') {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function Stars({ count, max = 5 }) {
  return (
    <>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={16}
          className={i < count ? 'star-filled' : 'star-empty'}
          fill={i < count ? 'currentColor' : 'none'}
        />
      ))}
    </>
  );
}

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: currentUser, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  const isOwnProfile = !userId;
  const targetId = userId || currentUser?._id || currentUser?.id;

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      setLoading(true);
      setError('');
      try {
        if (isOwnProfile) {
          setProfile(currentUser);
        } else {
          const res = await fetchUser(userId);
          setProfile(res.user ?? res.data?.user ?? res.data ?? res);
        }

        if (targetId) {
          const revRes = await fetchUserReviews(targetId);
          const reviewList = Array.isArray(revRes)
            ? revRes
            : Array.isArray(revRes?.reviews)
              ? revRes.reviews
              : Array.isArray(revRes?.data?.reviews)
                ? revRes.data.reviews
                : [];
          setReviews(reviewList);
        }
      } catch (err) {
        setError(err?.response?.data?.message || err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId, currentUser, authLoading, isOwnProfile, targetId]);

  if (authLoading || loading) {
    return (
      <div className="profile-page section">
        <div className="container"><p>Loading…</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page section">
        <div className="container"><div className="form-error">{error}</div></div>
      </div>
    );
  }

  if (!profile) return null;

  const initial = (profile.fullName || '?')[0].toUpperCase();
  const colorClass = avatarColor(profile.fullName);
  const rating = profile.averageRating ?? 0;
  const ratingCount = profile.ratingCount ?? 0;
  const currentUserId = currentUser?._id || currentUser?.id;
  const isOtherUser =
    Boolean(currentUserId && targetId) &&
    !isOwnProfile &&
    String(targetId) !== String(currentUserId);
  const roleLabel = profile.role === 'admin' ? 'Admin' : 'Member';

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div className="profile-page section">
      <div className="container">
        {/* Header */}
        <div className="profile-header">
          <div className={`avatar lg ${colorClass}`}>{initial}</div>
          <div className="profile-info">
            <h1>{profile.fullName}</h1>
            <span className={`pill ${profile.role === 'admin' ? 'admin' : 'user'}`}>{roleLabel}</span>
            <div className="profile-rating">
              <Stars count={Math.round(rating)} />
              <span>{rating.toFixed(1)}</span>
              <span className="text-muted">({ratingCount} reviews)</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="profile-stats">
          <div className="stat-card">
            <span className="stat-value">{ratingCount}</span>
            <span>Reviews</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{rating.toFixed(1)}</span>
            <span>Rating</span>
          </div>
        </div>

        {/* Reviews */}
        <section className="reviews-section">
          <h2>Reviews</h2>
          {reviews.length === 0 && <p>No reviews yet.</p>}
          {reviews.map((review) => (
            <div key={review._id || review.id} className="review-card">
              <div className="review-header">
                <div className="review-stars">
                  <Stars count={review.rating} />
                </div>
                <span className="review-date">{formatDate(review.createdAt)}</span>
              </div>
              {review.comment && <p className="review-comment">{review.comment}</p>}
            </div>
          ))}
        </section>

        {/* Report */}
        {isOtherUser && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setReportOpen(true)}
          >
            <Flag size={14} /> Report User
          </button>
        )}

        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="user"
          targetId={targetId}
        />
      </div>
    </div>
  );
}
