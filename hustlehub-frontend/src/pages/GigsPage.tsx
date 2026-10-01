// OWNER: Lesedi — REMOVE BEFORE COMMIT
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gig, gigsApi, ApiError, GIG_CATEGORIES, DEFAULT_CATEGORY_IMAGES } from '../api/client';
import { formatRands } from '../utils/format';

export const GigsPage: React.FC = () => {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGigs() {
      try {
        setLoading(true);
        setError(null);
        const data = await gigsApi.list();
        setGigs(data.gigs);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load gigs.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchGigs();
  }, []);

  const filteredGigs =
    selectedCategory === 'All'
      ? gigs
      : gigs.filter(
          (gig) =>
            gig.category &&
            gig.category.toLowerCase() === selectedCategory.toLowerCase()
        );

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.85rem', color: 'var(--primary-navy)' }}>Explore Marketplace Gigs</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Find high-quality services in design, copywriting, accounting, and development provided by verified freelancers.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="category-pills">
        {GIG_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && <div className="alert-error" role="alert">{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading gigs...</div>
      ) : filteredGigs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>No gigs found in this category</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '1rem' }}>
            Try browsing "All" categories or check back soon for new service offerings.
          </p>
          <button onClick={() => setSelectedCategory('All')} className="btn btn-secondary">
            View All Gigs
          </button>
        </div>
      ) : (
        <div className="grid-cards">
          {filteredGigs.map((gig) => {
            const cover =
              gig.coverImage ||
              DEFAULT_CATEGORY_IMAGES[gig.category || 'Other'] ||
              DEFAULT_CATEGORY_IMAGES['Other'];

            return (
              <div key={gig.id} className="card gig-card" data-testid={`gig-card-${gig.id}`}>
                {/* Cover Image & Category Badge */}
                <div className="gig-cover-wrapper">
                  <img
                    src={cover}
                    alt={gig.title}
                    className="gig-cover-img"
                    loading="lazy"
                  />
                  {gig.category && (
                    <span className="gig-category-badge">{gig.category}</span>
                  )}
                </div>

                <div className="gig-card-body">
                  {/* Freelancer Name and ID Association */}
                  <div className="freelancer-badge-row">
                    <div className="avatar-circle-sm">
                      {(gig.freelancerName || 'F').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--primary-navy)' }}>
                        {gig.freelancerName || 'Verified Freelancer'}
                      </span>
                      <span
                        style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}
                        title={`Freelancer ID: ${gig.freelancerId}`}
                      >
                        (ID: {gig.freelancerId.slice(0, 8)}...)
                      </span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: 'var(--primary-navy)' }}>
                    {gig.title}
                  </h3>

                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.88rem',
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.55,
                    }}
                  >
                    {gig.description}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 'auto',
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '0.85rem',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Starting At
                      </span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-orange)' }}>
                        {formatRands(gig.price)}
                      </div>
                    </div>
                    <Link to={`/gigs/${gig.id}`} className="btn btn-primary" style={{ padding: '0.45rem 1rem' }}>
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
