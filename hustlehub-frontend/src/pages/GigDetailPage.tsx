
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Gig, gigsApi, bookingsApi, ApiError, DEFAULT_CATEGORY_IMAGES } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatRands } from '../utils/format';

export const GigDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const navigate = useNavigate();

  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGig() {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const data = await gigsApi.getById(id);
        setGig(data.gig);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load gig details.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchGig();
  }, [id]);

  const handleBook = async () => {
    if (!gig) return;
    setBookingLoading(true);
    setError(null);

    try {
      await bookingsApi.create({ gigId: gig.id });
      setSuccessMessage('Booking confirmed successfully! Redirecting to your bookings...');
      setTimeout(() => {
        navigate('/my-bookings');
      }, 1500);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to book this gig.');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading gig details...</div>;
  }

  if (error && !gig) {
    return (
      <div>
        <div className="alert-error" role="alert">{error}</div>
        <Link to="/" className="btn btn-secondary">Back to Gigs</Link>
      </div>
    );
  }

  if (!gig) {
    return (
      <div>
        <div className="alert-error" role="alert">Gig not found.</div>
        <Link to="/" className="btn btn-secondary">Back to Gigs</Link>
      </div>
    );
  }

  const cover =
    gig.coverImage ||
    DEFAULT_CATEGORY_IMAGES[gig.category || 'Other'] ||
    DEFAULT_CATEGORY_IMAGES['Other'];

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <Link to="/" className="btn btn-secondary" style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
        ← Back to All Gigs
      </Link>

      {error && <div className="alert-error" role="alert">{error}</div>}
      {successMessage && <div className="alert-success" role="alert">{successMessage}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Cover Hero Banner */}
        <div style={{ position: 'relative', height: '280px', width: '100%', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
          <img
            src={cover}
            alt={gig.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {gig.category && (
            <span
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                color: 'white',
                padding: '0.35rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                backdropFilter: 'blur(4px)',
              }}
            >
              {gig.category}
            </span>
          )}
        </div>

        <div style={{ padding: '2rem' }}>
          {/* Header & Price */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <h1 style={{ fontSize: '1.85rem', color: 'var(--primary-navy)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                {gig.title}
              </h1>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Listed on {new Date(gig.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div style={{ textAlign: 'right', background: '#fff7ed', padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid #fed7aa' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                Fixed Rate
              </span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-orange)' }}>
                {formatRands(gig.price)}
              </span>
            </div>
          </div>

          {/* Freelancer Profile & Association Box */}
          <div className="freelancer-profile-box">
            <div className="avatar-circle-lg">
              {(gig.freelancerName || 'F').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1.1rem', color: 'var(--primary-navy)' }}>
                  {gig.freelancerName || 'Verified Freelancer'}
                </strong>
                <span className="role-pill role-freelancer">Verified Freelancer</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Freelancer ID: <code style={{ backgroundColor: '#e2e8f0', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{gig.freelancerId}</code>
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '1.5rem 0', margin: '1.5rem 0' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem', color: 'var(--navy-light)' }}>
              Service Overview
            </h3>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75, color: 'var(--text-main)', fontSize: '0.98rem' }}>
              {gig.description}
            </p>
          </div>

          {/* Booking Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              100% Satisfaction Guarantee • Direct Freelancer Collaboration
            </div>

            {/* Book this gig button only visible when role === 'client' */}
            {role === 'client' && (
              <button
                onClick={handleBook}
                disabled={bookingLoading}
                className="btn btn-primary"
                style={{ padding: '0.75rem 2rem', fontSize: '1.05rem', fontWeight: 700 }}
              >
                {bookingLoading ? 'Processing Booking...' : `Book Gig for ${formatRands(gig.price)}`}
              </button>
            )}

            {role === 'freelancer' && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                (You are logged in as a Freelancer — login as a Client to book gigs)
              </span>
            )}

            {!role && (
              <Link to="/login" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem' }}>
                Login to Book This Gig
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
