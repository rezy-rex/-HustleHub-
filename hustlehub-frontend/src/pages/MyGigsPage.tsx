
import React, { useEffect, useState } from 'react';
import { Gig, gigsApi, ApiError, DEFAULT_CATEGORY_IMAGES } from '../api/client';
import { formatRands } from '../utils/format';

const CATEGORY_OPTIONS = [
  'Graphic Design',
  'Copywriting',
  'Accounting',
  'Software Development',
  'Other',
];

export const MyGigsPage: React.FC = () => {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Graphic Design');
  const [newDescription, setNewDescription] = useState('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [newCoverImage, setNewCoverImage] = useState<string>('');
  const [createLoading, setCreateLoading] = useState(false);

  // Edit form state
  const [editingGigId, setEditingGigId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('Graphic Design');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editCoverImage, setEditCoverImage] = useState<string>('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchMyGigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gigsApi.listMine();
      setGigs(data.gigs);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load your gigs.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyGigs();
  }, []);

  const handleCreateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsedPrice = parseFloat(newPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Please provide a valid positive price in Rands.');
      return;
    }

    setCreateLoading(true);
    try {
      const finalCover =
        newCoverImage.trim() ||
        DEFAULT_CATEGORY_IMAGES[newCategory] ||
        DEFAULT_CATEGORY_IMAGES['Other'];

      await gigsApi.create({
        title: newTitle,
        category: newCategory,
        description: newDescription,
        price: parsedPrice,
        coverImage: finalCover,
      });

      setNewTitle('');
      setNewCategory('Graphic Design');
      setNewDescription('');
      setNewPrice('');
      setNewCoverImage('');
      setShowCreateForm(false);
      await fetchMyGigs();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create gig.');
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const startEdit = (gig: Gig) => {
    setEditingGigId(gig.id);
    setEditTitle(gig.title);
    setEditCategory(gig.category || 'Graphic Design');
    setEditDescription(gig.description);
    setEditPrice(gig.price.toString());
    setEditCoverImage(gig.coverImage || '');
  };

  const handleUpdateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGigId) return;
    setError(null);

    const parsedPrice = parseFloat(editPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Please provide a valid positive price in Rands.');
      return;
    }

    setEditLoading(true);
    try {
      const finalCover =
        editCoverImage.trim() ||
        DEFAULT_CATEGORY_IMAGES[editCategory] ||
        DEFAULT_CATEGORY_IMAGES['Other'];

      await gigsApi.update(editingGigId, {
        title: editTitle,
        category: editCategory,
        description: editDescription,
        price: parsedPrice,
        coverImage: finalCover,
      });
      setEditingGigId(null);
      await fetchMyGigs();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update gig.');
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteGig = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this gig?')) return;
    setError(null);

    try {
      await gigsApi.delete(id);
      await fetchMyGigs();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to delete gig.');
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', color: 'var(--primary-navy)' }}>My Listed Gigs</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Manage and edit your offerings across design, writing, accounting, and development.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Cancel' : '+ Create New Gig'}
        </button>
      </div>

      {error && <div className="alert-error" role="alert">{error}</div>}

      {/* Create Gig Form */}
      {showCreateForm && (
        <div className="card" style={{ marginBottom: '2rem', border: '2px solid var(--primary-orange)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary-navy)' }}>
            Create a New Gig Listing
          </h2>
          <form onSubmit={handleCreateGig}>
            <div className="form-group">
              <label className="form-label" htmlFor="new-title">Gig Title</label>
              <input
                id="new-title"
                type="text"
                required
                className="form-input"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Modern Brand Identity & Vector Logo Design"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-category">Service Category</label>
              <select
                id="new-category"
                className="form-select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-cover">
                Cover Image URL (optional — leave blank for curated category stock photo)
              </label>
              <input
                id="new-cover"
                type="url"
                className="form-input"
                value={newCoverImage}
                onChange={(e) => setNewCoverImage(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-desc">Description</label>
              <textarea
                id="new-desc"
                required
                rows={3}
                className="form-textarea"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describe the deliverables, timeline, and inclusions of your service..."
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-price">Price (Rands - ZAR)</label>
              <input
                id="new-price"
                type="number"
                step="1"
                min="1"
                required
                className="form-input"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="e.g. 1500"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" disabled={createLoading} className="btn btn-primary">
                {createLoading ? 'Publishing...' : 'Publish Gig'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Gigs List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading your gigs...</div>
      ) : gigs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>You haven't created any gigs yet</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            Start selling your services by clicking "+ Create New Gig".
          </p>
          <button onClick={() => setShowCreateForm(true)} className="btn btn-primary">
            + Create New Gig
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {gigs.map((gig) => {
            const cover =
              gig.coverImage ||
              DEFAULT_CATEGORY_IMAGES[gig.category || 'Other'] ||
              DEFAULT_CATEGORY_IMAGES['Other'];

            return (
              <div key={gig.id} className="card">
                {editingGigId === gig.id ? (
                  /* Edit Mode */
                  <form onSubmit={handleUpdateGig}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--primary-navy)' }}>Edit Gig</h3>
                    <div className="form-group">
                      <label className="form-label">Title</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select
                        className="form-select"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cover Image URL</label>
                      <input
                        type="url"
                        className="form-input"
                        value={editCoverImage}
                        onChange={(e) => setEditCoverImage(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea
                        required
                        rows={3}
                        className="form-textarea"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Price (Rands - ZAR)</label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        required
                        className="form-input"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button type="submit" disabled={editLoading} className="btn btn-primary">
                        {editLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingGigId(null)}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Display Mode */
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{ width: '120px', height: '80px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#e2e8f0' }}>
                      <img src={cover} alt={gig.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span className="role-pill role-client" style={{ fontSize: '0.7rem' }}>
                          {gig.category || 'General'}
                        </span>
                        <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-navy)' }}>
                          {gig.title}
                        </h3>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {gig.description}
                      </p>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-orange)' }}>
                        {formatRands(gig.price)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => startEdit(gig)} className="btn btn-secondary">
                        Edit
                      </button>
                      <button onClick={() => handleDeleteGig(gig.id)} className="btn btn-danger">
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
