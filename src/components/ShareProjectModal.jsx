import React, { useState, useEffect } from 'react';
import { IoLinkOutline, IoCopy, IoCheckmark, IoTrashOutline, IoEye, IoEyeOff, IoCalendarOutline } from 'react-icons/io5';
import ModalCloseButton from './ModalCloseButton';
import { useProjectShares } from '../hooks/useProjectShares';
import { useDialog } from '../contexts/DialogContext';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { PompayLoader } from './PompayLogo';
import '../styles/ModalCommon.css';
import '../styles/ShareModalRedesign.css';

const ShareProjectModal = ({ project, onClose }) => {
  const { shares, loading, createShare, revokeShare, toggleShareStatus, getShareUrl, refresh } = useProjectShares(project?.id);
  const { confirm, showToast } = useDialog();
  const { trapRef } = useModalBehavior(true, onClose);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);

  const [shareLabel, setShareLabel] = useState('');
  const [expiresIn, setExpiresIn] = useState('never');
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
      let expiresAt = null;
      if (expiresIn !== 'never') {
        const now = new Date();
        const days = { '7days': 7, '30days': 30, '90days': 90 }[expiresIn];
        expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      await createShare({
        accessType: 'read-only',
        label: shareLabel || `Shared on ${new Date().toLocaleDateString()}`,
        email: shareEmail || null,
        expiresAt,
      });

      setShareLabel('');
      setExpiresIn('never');
      setShareEmail('');
      setShowCreateForm(false);
      showToast('Share link created', { type: 'success' });
    } catch (error) {
      showToast('Failed to create share link. Please try again.', { type: 'error' });
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
      showToast('Failed to copy link. Please copy manually.', { type: 'error' });
    }
  };

  const handleRevokeShare = async (shareId) => {
    const ok = await confirm(
      'Revoke this share link? Anyone with the link will lose access.',
      { title: 'Revoke Share Link', confirmLabel: 'Revoke', cancelLabel: 'Cancel' }
    );
    if (!ok) return;
    try {
      await revokeShare(shareId);
      showToast('Share link revoked', { type: 'success' });
    } catch (error) {
      showToast('Failed to revoke share. Please try again.', { type: 'error' });
    }
  };

  const handleToggleStatus = async (share) => {
    try {
      await toggleShareStatus(share.id, !share.is_active);
    } catch (error) {
      showToast('Failed to update share status. Please try again.', { type: 'error' });
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
    <div className='pompay-modal' onClick={onClose}>
      <div
        className='pompay-modal-card spm-root'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-labelledby='spm-title'
        ref={trapRef}
      >
        <div className='pompay-modal-head'>
          <h3 id='spm-title'>Share: {project?.name}</h3>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className='spm-body'>
          {!showCreateForm ? (
            <div className='spm-create-prompt'>
              <p className='spm-intro'>
                Share this project dashboard with clients or team members using a secure link.
              </p>
              <button className='spm-btn spm-btn-primary' onClick={() => setShowCreateForm(true)}>
                <IoLinkOutline size={16} aria-hidden='true' />
                Create Share Link
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateShare} className='spm-form'>
              <div className='spm-field'>
                <label htmlFor='spm-label'>Label (Optional)</label>
                <input
                  id='spm-label'
                  type='text'
                  className='spm-input'
                  placeholder='e.g., Client Portal, Team Dashboard'
                  value={shareLabel}
                  onChange={(e) => setShareLabel(e.target.value)}
                />
              </div>

              <div className='spm-field'>
                <label htmlFor='spm-email'>Share with Email (Optional)</label>
                <input
                  id='spm-email'
                  type='email'
                  className='spm-input'
                  placeholder='client@example.com'
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                />
                <p className='spm-hint'>
                  If set, the recipient must sign in with this email. Leave empty for a public link.
                </p>
              </div>

              <div className='spm-field'>
                <label htmlFor='spm-expires'>Expires</label>
                <select
                  id='spm-expires'
                  className='spm-select'
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                >
                  <option value='never'>Never</option>
                  <option value='7days'>7 Days</option>
                  <option value='30days'>30 Days</option>
                  <option value='90days'>90 Days</option>
                </select>
              </div>

              <div className='spm-actions'>
                <button
                  type='button'
                  className='spm-btn spm-btn-cancel'
                  onClick={() => setShowCreateForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='spm-btn spm-btn-primary'
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating…' : 'Create Link'}
                </button>
              </div>
            </form>
          )}

          {shares.length > 0 && (
            <div>
              <p className='spm-list-head'>Active Links ({shares.length})</p>
              <div className='spm-list'>
                {shares.map((share) => {
                  const expired = isExpired(share.expires_at);
                  const shareUrl = getShareUrl(share.share_token);

                  return (
                    <div
                      key={share.id}
                      className={`spm-item ${!share.is_active || expired ? 'inactive' : ''}`}
                    >
                      <div className='spm-item-head'>
                        <div className='spm-item-title'>
                          <IoLinkOutline size={16} aria-hidden='true' />
                          <span>{share.label || 'Untitled Share'}</span>
                          {expired && <span className='spm-badge expired'>Expired</span>}
                          {!share.is_active && !expired && <span className='spm-badge inactive'>Inactive</span>}
                          {share.is_active && !expired && <span className='spm-badge active'>Active</span>}
                        </div>
                        <div className='spm-item-acts'>
                          <button
                            className='spm-icon-btn'
                            onClick={() => handleToggleStatus(share)}
                            aria-label={share.is_active ? 'Disable share link' : 'Enable share link'}
                          >
                            {share.is_active ? <IoEye size={16} aria-hidden='true' /> : <IoEyeOff size={16} aria-hidden='true' />}
                          </button>
                          <button
                            className='spm-icon-btn danger'
                            onClick={() => handleRevokeShare(share.id)}
                            aria-label='Revoke share link'
                          >
                            <IoTrashOutline size={16} aria-hidden='true' />
                          </button>
                        </div>
                      </div>

                      <div className='spm-details'>
                        <div className='spm-detail-row'>
                          <span className='spm-detail-label'>Access</span>
                          <span className='spm-detail-value'>{share.access_type}</span>
                        </div>
                        {share.shared_with_email && (
                          <div className='spm-detail-row'>
                            <span className='spm-detail-label'>Shared with</span>
                            <span className='spm-detail-value'>{share.shared_with_email}</span>
                          </div>
                        )}
                        <div className='spm-detail-row'>
                          <span className='spm-detail-label'>
                            <IoCalendarOutline size={13} aria-hidden='true' />
                            Expires
                          </span>
                          <span className='spm-detail-value'>{formatDate(share.expires_at)}</span>
                        </div>
                        <div className='spm-detail-row'>
                          <span className='spm-detail-label'>Views</span>
                          <span className='spm-detail-value'>{share.view_count || 0}</span>
                        </div>
                      </div>

                      {share.is_active && !expired && (
                        <div className='spm-url-row'>
                          <input
                            type='text'
                            value={shareUrl}
                            readOnly
                            className='spm-url-input'
                            aria-label='Share URL'
                          />
                          <button
                            className='spm-copy-btn'
                            onClick={() => handleCopyLink(share.share_token)}
                            aria-label='Copy share link'
                          >
                            {copiedToken === share.share_token ? (
                              <><IoCheckmark size={15} aria-hidden='true' /> Copied!</>
                            ) : (
                              <><IoCopy size={15} aria-hidden='true' /> Copy</>
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
            <div className='spm-loading'>
              <PompayLoader size={26} label='Loading shares…' />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareProjectModal;
