import React, { useState, useRef, useEffect } from 'react';
import { IoClose } from 'react-icons/io5';

/**
 * TagInput Component
 * A reusable component for adding and managing tags
 *
 * @param {Array} tags - Current array of tags
 * @param {Function} onChange - Callback function when tags change
 * @param {Array} suggestions - Optional array of suggested tags
 * @param {String} placeholder - Placeholder text for input
 * @param {Number} maxTags - Maximum number of tags allowed (default: 10)
 */
const TagInput = ({
  tags = [],
  onChange,
  suggestions = [],
  placeholder = 'Add tags (press Enter)',
  maxTags = 10
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    // Filter suggestions based on input value
    if (inputValue.trim() && suggestions.length > 0) {
      const filtered = suggestions.filter(
        suggestion =>
          suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
          !tags.includes(suggestion)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [inputValue, suggestions, tags]);

  const addTag = (tag) => {
    const trimmedTag = tag.trim().toLowerCase();

    // Validate tag
    if (!trimmedTag) return;
    if (tags.includes(trimmedTag)) return;
    if (tags.length >= maxTags) return;
    if (trimmedTag.length > 30) return;

    // Add tag
    onChange([...tags, trimmedTag]);
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag if backspace is pressed with empty input
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    addTag(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className='tag-input-container'>
      <div className='tag-input-wrapper'>
        {/* Display existing tags */}
        <div className='tag-list'>
          {tags.map((tag, index) => (
            <span key={index} className='tag-pill'>
              {tag}
              <button
                type='button'
                className='tag-remove-btn'
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
              >
                <IoClose size={14} />
              </button>
            </span>
          ))}
        </div>

        {/* Input field */}
        {tags.length < maxTags && (
          <input
            ref={inputRef}
            type='text'
            className='tag-input'
            placeholder={tags.length === 0 ? placeholder : ''}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onFocus={() => {
              if (inputValue.trim() && filteredSuggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            maxLength={30}
            aria-label='Tag input'
          />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className='tag-suggestions-dropdown'>
          {filteredSuggestions.slice(0, 5).map((suggestion, index) => (
            <div
              key={index}
              className='tag-suggestion-item'
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}

      {/* Helper text */}
      {tags.length === 0 && (
        <div className='tag-input-helper'>
          Press Enter to add tags
        </div>
      )}
    </div>
  );
};

export default TagInput;
