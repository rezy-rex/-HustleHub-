
import React, { useEffect, useState } from 'react';
import { Booking, Transaction, bookingsApi, transactionsApi, ApiError } from '../api/client';
import { formatRands, formatRandsWithDecimals } from '../utils/format';

export const ReceivedBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [bookingData, txData] = await Promise.all([
          bookingsApi.listReceived(),
          transactionsApi.listMine(),
        ]);

        setBookings(bookingData.bookings);
        setTransactions(txData.transactions);
        setTotalIncome(txData.totalIncome);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load received bookings or income data.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', color: 'var(--primary-navy)' }}>Received Client Bookings</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Overview of client bookings on your gigs and your earnings in South African Rands (ZAR).
        </p>
      </div>

      {error && <div className="alert-error" role="alert">{error}</div>}

      {/* Income Summary Stats Box */}
      <div className="stats-box">
        <div>
          <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Total Income Earned (ZAR)</span>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fed7aa', marginTop: '0.25rem' }}>
            {formatRandsWithDecimals(totalIncome)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Completed Transactions</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.25rem' }}>
            {transactions.length}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading received bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>No bookings received yet</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            When clients book your services, their orders and payments will appear here.
          </p>
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
                  Booked on {new Date(booking.createdAt).toLocaleDateString()} • Client:{' '}
                  <strong style={{ color: 'var(--primary-navy)' }}>{booking.clientName || 'Client'}</strong>{' '}
                  <span title={`Full ID: ${booking.clientId}`}>(ID: {booking.clientId.slice(0, 8)}...)</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Gig Earnings</span>
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
