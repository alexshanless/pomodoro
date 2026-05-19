import React, { useState, useEffect, useMemo, useRef } from 'react';
import { IoCheckmark, IoChevronDown } from 'react-icons/io5';

const TIMEZONES = [
  { value: 'Pacific/Honolulu', label: 'Honolulu (UTC-10:00)' },
  { value: 'America/Anchorage', label: 'Alaska (UTC-09:00)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles, San Francisco (UTC-08:00)' },
  { value: 'America/Phoenix', label: 'Phoenix (UTC-07:00)' },
  { value: 'America/Denver', label: 'Denver, Salt Lake City (UTC-07:00)' },
  { value: 'America/Chicago', label: 'Chicago, Dallas, Houston (UTC-06:00)' },
  { value: 'America/Mexico_City', label: 'Mexico City (UTC-06:00)' },
  { value: 'America/New_York', label: 'New York, Miami, Toronto (UTC-05:00)' },
  { value: 'America/Caracas', label: 'Caracas (UTC-04:00)' },
  { value: 'America/Santiago', label: 'Santiago (UTC-04:00)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo, Buenos Aires (UTC-03:00)' },
  { value: 'Atlantic/South_Georgia', label: 'South Georgia (UTC-02:00)' },
  { value: 'Atlantic/Azores', label: 'Azores (UTC-01:00)' },
  { value: 'UTC', label: 'UTC (UTC+00:00)' },
  { value: 'Europe/London', label: 'London, Dublin, Lisbon (UTC+00:00)' },
  { value: 'Europe/Paris', label: 'Paris, Berlin, Rome (UTC+01:00)' },
  { value: 'Europe/Athens', label: 'Athens, Helsinki, Istanbul (UTC+02:00)' },
  { value: 'Africa/Cairo', label: 'Cairo (UTC+02:00)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (UTC+02:00)' },
  { value: 'Europe/Moscow', label: 'Moscow (UTC+03:00)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+04:00)' },
  { value: 'Asia/Karachi', label: 'Karachi (UTC+05:00)' },
  { value: 'Asia/Kolkata', label: 'Mumbai, Delhi, Kolkata (UTC+05:30)' },
  { value: 'Asia/Dhaka', label: 'Dhaka (UTC+06:00)' },
  { value: 'Asia/Bangkok', label: 'Bangkok, Jakarta (UTC+07:00)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong, Singapore (UTC+08:00)' },
  { value: 'Asia/Shanghai', label: 'Beijing, Shanghai (UTC+08:00)' },
  { value: 'Asia/Tokyo', label: 'Tokyo, Seoul (UTC+09:00)' },
  { value: 'Australia/Sydney', label: 'Sydney, Melbourne (UTC+10:00)' },
  { value: 'Pacific/Auckland', label: 'Auckland (UTC+12:00)' }
];

const TimezoneSelect = ({ id, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listboxId = `${id}-listbox`;

  const label = useMemo(() => {
    if (!value) return 'Select timezone';
    const selected = TIMEZONES.find(tz => tz.value === value);
    return selected ? selected.label : value;
  }, [value]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return TIMEZONES;
    const q = searchQuery.toLowerCase();
    return TIMEZONES.filter(tz =>
      tz.label.toLowerCase().includes(q) ||
      tz.value.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (tz) => {
    onChange(tz.value);
    setSearchQuery('');
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className='searchable-select-container' ref={containerRef}>
      <button
        id={id}
        ref={triggerRef}
        type='button'
        className='searchable-select-trigger'
        aria-haspopup='listbox'
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? '' : 'placeholder'}>{label}</span>
        <IoChevronDown size={16} style={{
          transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
        }} />
      </button>

      {isOpen && (
        <div className='searchable-select-dropdown'>
          <div className='searchable-select-search'>
            <input
              type='text'
              placeholder='Search by city or UTC offset...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              aria-label='Search timezones'
              autoFocus
            />
          </div>
          <ul
            id={listboxId}
            role='listbox'
            aria-label='Timezones'
            className='searchable-select-options'
          >
            {filtered.length > 0 ? (
              filtered.map(tz => (
                <li key={tz.value} role='none'>
                  <button
                    type='button'
                    role='option'
                    aria-selected={value === tz.value}
                    className={`searchable-select-option ${value === tz.value ? 'selected' : ''}`}
                    onClick={() => handleSelect(tz)}
                  >
                    {tz.label}
                    {value === tz.value && (
                      <IoCheckmark size={16} style={{ marginLeft: 'auto', color: '#3b82f6' }} />
                    )}
                  </button>
                </li>
              ))
            ) : (
              <li className='searchable-select-no-results' role='presentation'>
                No timezones found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TimezoneSelect;
