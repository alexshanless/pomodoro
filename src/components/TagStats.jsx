import React, { useState, useEffect } from 'react';
import { IoClose } from 'react-icons/io5';

/**
 * TagStats Component
 * Displays tag statistics and allows filtering sessions by tags
 *
 * @param {Object} sessions - Sessions data from pomodoroSessions
 * @param {Function} onTagFilter - Callback when a tag is selected for filtering
 * @param {String} selectedTag - Currently selected tag filter
 */
const TagStats = ({ sessions = {}, onTagFilter, selectedTag = null }) => {
  const [tagStats, setTagStats] = useState([]);

  useEffect(() => {
    const calculateTagStats = () => {
      const tagCounts = {};
      const tagMinutes = {};

      // Iterate through all sessions to count tags
      Object.values(sessions).forEach(dayData => {
        if (dayData.sessions && Array.isArray(dayData.sessions)) {
          dayData.sessions.forEach(session => {
            if (session.tags && Array.isArray(session.tags) && session.mode === 'focus') {
              session.tags.forEach(tag => {
                const normalizedTag = tag.toLowerCase().trim();
                if (normalizedTag) {
                  tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
                  tagMinutes[normalizedTag] = (tagMinutes[normalizedTag] || 0) + (session.duration || 0);
                }
              });
            }
          });
        }
      });

      // Convert to array and sort by count
      const statsArray = Object.keys(tagCounts).map(tag => ({
        tag,
        count: tagCounts[tag],
        totalMinutes: tagMinutes[tag],
        hours: Math.floor(tagMinutes[tag] / 60),
        minutes: tagMinutes[tag] % 60
      }));

      // Sort by count descending
      statsArray.sort((a, b) => b.count - a.count);

      setTagStats(statsArray);
    };

    calculateTagStats();
  }, [sessions]);

  const handleTagClick = (tag) => {
    if (onTagFilter) {
      // Toggle tag selection
      if (selectedTag === tag) {
        onTagFilter(null); // Deselect
      } else {
        onTagFilter(tag); // Select
      }
    }
  };

  const clearFilter = () => {
    if (onTagFilter) {
      onTagFilter(null);
    }
  };

  if (tagStats.length === 0) {
    return (
      <div className='tag-stats-container'>
        <h4>Tag Statistics</h4>
        <p className='tag-stats-empty'>No tags found. Start adding tags to your sessions!</p>
      </div>
    );
  }

  return (
    <div className='tag-stats-container'>
      <div className='tag-stats-header'>
        <h4>Most Used Tags</h4>
        {selectedTag && (
          <button className='clear-filter-btn' onClick={clearFilter}>
            <IoClose size={16} />
            Clear Filter
          </button>
        )}
      </div>

      <div className='tag-stats-list'>
        {tagStats.slice(0, 10).map((stat, index) => (
          <div
            key={index}
            className={`tag-stat-item ${selectedTag === stat.tag ? 'active' : ''}`}
            onClick={() => handleTagClick(stat.tag)}
            role='button'
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleTagClick(stat.tag);
              }
            }}
          >
            <div className='tag-stat-info'>
              <span className='tag-stat-name'>#{stat.tag}</span>
              <span className='tag-stat-count'>{stat.count} session{stat.count !== 1 ? 's' : ''}</span>
            </div>
            <div className='tag-stat-time'>
              {stat.hours > 0 && `${stat.hours}h `}
              {stat.minutes}m
            </div>
          </div>
        ))}
      </div>

      {selectedTag && (
        <div className='active-filter-indicator'>
          Filtering by: <strong>#{selectedTag}</strong>
        </div>
      )}
    </div>
  );
};

export default TagStats;
