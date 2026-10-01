// OWNER: Lesedi — REMOVE BEFORE COMMIT
import React, { useEffect, useState } from 'react';
import { Booking, bookingsApi, ApiError } from '../api/client';
import { Link } from 'react-router-dom';
import { formatRands } from '../utils/format';

export const MyBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBookings() {
      try {
        setLoading(true);
        setError(null);
        const data = await bookingsApi.listMine();
        setBookings(data.bookings);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load your bookings.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', color: 'var(--primary-navy)' }}>My Bookings</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Services you have booked on HustleHub+.
        </p>
      </div>

      {error && <div className="alert-error" role="alert">{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>No bookings found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            Browse the marketplace and hire a skilled freelancer today!
          </p>
          <Link to="/" className="btn btn-primary">
            Explore Gigs
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {bookings.map((booking) => (
            <div key={booking.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                  }}
                >
                  {booking.status}
                </span>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-navy)', marginBottom: '0.35rem' }}>
                  {booking.gigSnapshot.title}
                </h3>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  Booked on {new Date(booking.createdAt).toLocaleDateString()} • Freelancer:{' '}
                  <strong style={{ color: 'var(--primary-navy)' }}>{booking.freelancerName || 'Verified Freelancer'}</strong>{' '}
                  <span title={`Full ID: ${booking.freelancerId}`}>(ID: {booking.freelancerId.slice(0, 8)}...)</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Amount Paid</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-orange)' }}>
                  {formatRands(booking.gigSnapshot.price)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
