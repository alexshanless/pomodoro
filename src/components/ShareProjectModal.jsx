import React, { useState, useEffect } from 'react';
import { IoClose, IoLinkOutline, IoCopy, IoCheckmark, IoTrashOutline, IoEye, IoEyeOff, IoCalendarOutline } from 'react-icons/io5';
import { useProjectShares } from '../hooks/useProjectShares';
import '../App.css';

const ShareProjectModal = ({ project, onClose }) => {
  const { shares, loading, createShare, revokeShare, toggleShareStatus, getShareUrl, refresh } = useProjectShares(project?.id);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);

  // Form state
  const [shareLabel, setShareLabel] = useState('');
  const [accessType, setAccessType] = useState('read-only');
  const [expiresIn, setExpiresIn] = useState('never'); // 'never', '7days', '30days', '90days'
  const [shareEmail, setShareEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (project?.id) {
      refresh();
    }
  }, [project?.id, refresh]);

  const handleCreateShare = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Calculate expiration date
      let expiresAt = null;
      if (expiresIn !== 'never') {
        const now = new Date();
        const days = {
          '7days': 7,
          '30days': 30,
          '90days': 90,
        }[expiresIn];
        expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      await createShare({
        accessType,
        label: shareLabel || `Shared on ${new Date().toLocaleDateString()}`,
        email: shareEmail || null,
        expiresAt,
      });

      // Reset form
      setShareLabel('');
      setAccessType('read-only');
      setExpiresIn('never');
      setShareEmail('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create share:', error);
      alert('Failed to create share link. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async (shareToken) => {
    const url = getShareUrl(shareToken);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(shareToken);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy link. Please copy manually.');
    }
  };

  const handleRevokeShare = async (shareId) => {
    if (window.confirm('Are you sure you want to revoke this share link? Anyone with the link will lose access.')) {
      try {
        await revokeShare(shareId);
      } catch (error) {
        console.error('Failed to revoke share:', error);
        alert('Failed to revoke share. Please try again.');
      }
    }
  };

  const handleToggleStatus = async (share) => {
    try {
      await toggleShareStatus(share.id, !share.is_active);
    } catch (error) {
      console.error('Failed to toggle share status:', error);
      alert('Failed to update share status. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className='form-modal' onClick={onClose}>
      <div className='form-modal-content share-modal' onClick={(e) => e.stopPropagation()}>
        <div className='modal-header-settings'>
          <h3>Share Project: {project?.name}</h3>
          <button className='close-modal-btn' onClick={onClose}>
            <IoClose size={24} />
          </button>
        </div>

        <div className='share-modal-body'>
          {/* Create new share section */}
          {!showCreateForm ? (
            <div className='create-share-prompt'>
              <p>Share this project dashboard with clients or team members using a secure link.</p>
              <button
                className='btn-primary'
                onClick={() => setShowCreateForm(true)}
              >
                <IoLinkOutline size={18} />
                Create Share Link
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateShare} className='create-share-form'>
              <div className='form-group'>
                <label>Label (Optional)</label>
                <input
                  type='text'
                  placeholder='e.g., Client Portal, Team Dashboard'
                  value={shareLabel}
                  onChange={(e) => setShareLabel(e.target.value)}
                />
              </div>

              <div className='form-group'>
                <label>Access Type</label>
                <select
                  value={accessType}
                  onChange={(e) => setAccessType(e.target.value)}
                >
                  <option value='read-only'>Read Only</option>
                  <option value='comment'>Read + Comment</option>
                  <option value='edit'>Edit</option>
                </select>
                <small>Read-only allows viewing sessions and stats only</small>
              </div>

              <div className='form-group'>
                <label>Share with Email (Optional)</label>
                <input
                  type='email'
                  placeholder='client@example.com'
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                />
                <small>Leave empty for a public shareable link</small>
              </div>

              <div className='form-group'>
                <label>Expires</label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                >
                  <option value='never'>Never</option>
                  <option value='7days'>7 Days</option>
                  <option value='30days'>30 Days</option>
                  <option value='90days'>90 Days</option>
                </select>
              </div>

              <div className='form-actions'>
                <button
                  type='button'
                  className='btn-cancel'
                  onClick={() => setShowCreateForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='btn-primary'
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Share Link'}
                </button>
              </div>
            </form>
          )}

          {/* Existing shares list */}
          {shares.length > 0 && (
            <div className='existing-shares-section'>
              <h4>Active Share Links ({shares.length})</h4>
              <div className='shares-list'>
                {shares.map((share) => {
                  const expired = isExpired(share.expires_at);
                  const shareUrl = getShareUrl(share.share_token);

                  return (
                    <div
                      key={share.id}
                      className={`share-item ${!share.is_active || expired ? 'share-inactive' : ''}`}
                    >
                      <div className='share-item-header'>
                        <div className='share-item-title'>
                          <IoLinkOutline size={18} />
                          <span>{share.label || 'Untitled Share'}</span>
                          {expired && <span className='share-badge expired'>Expired</span>}
                          {!share.is_active && !expired && <span className='share-badge inactive'>Inactive</span>}
                          {share.is_active && !expired && <span className='share-badge active'>Active</span>}
                        </div>
                        <div className='share-item-actions'>
                          <button
                            className='icon-btn'
                            onClick={() => handleToggleStatus(share)}
                            title={share.is_active ? 'Disable' : 'Enable'}
                          >
                            {share.is_active ? <IoEye size={18} /> : <IoEyeOff size={18} />}
                          </button>
                          <button
                            className='icon-btn danger'
                            onClick={() => handleRevokeShare(share.id)}
                            title='Revoke'
                          >
                            <IoTrashOutline size={18} />
                          </button>
                        </div>
                      </div>

                      <div className='share-item-details'>
                        <div className='share-detail-row'>
                          <span className='share-detail-label'>Access:</span>
                          <span className='share-detail-value'>{share.access_type}</span>
                        </div>
                        {share.shared_with_email && (
                          <div className='share-detail-row'>
                            <span className='share-detail-label'>Shared with:</span>
                            <span className='share-detail-value'>{share.shared_with_email}</span>
                          </div>
                        )}
                        <div className='share-detail-row'>
                          <span className='share-detail-label'>
                            <IoCalendarOutline size={14} />
                            Expires:
                          </span>
                          <span className='share-detail-value'>{formatDate(share.expires_at)}</span>
                        </div>
                        <div className='share-detail-row'>
                          <span className='share-detail-label'>Views:</span>
                          <span className='share-detail-value'>{share.view_count || 0}</span>
                        </div>
                      </div>

                      {share.is_active && !expired && (
                        <div className='share-url-container'>
                          <input
                            type='text'
                            value={shareUrl}
                            readOnly
                            className='share-url-input'
                          />
                          <button
                            className='btn-copy'
                            onClick={() => handleCopyLink(share.share_token)}
                          >
                            {copiedToken === share.share_token ? (
                              <>
                                <IoCheckmark size={18} />
                                Copied!
                              </>
                            ) : (
                              <>
                                <IoCopy size={18} />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loading && shares.length === 0 && (
            <div className='loading-state'>
              <p>Loading shares...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareProjectModal;
