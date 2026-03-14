/**
 * Performance Utilities
 * Debouncing, throttling, and memoization helpers
 */

/**
 * Debounce function - delays execution until after wait time has elapsed
 * Use for: search inputs, resize handlers, API calls
 *
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;

  const debounced = function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };

  // Add cancel method to allow cancelling pending execution
  debounced.cancel = () => {
    clearTimeout(timeout);
  };

  return debounced;
};

/**
 * Throttle function - ensures function is called at most once per interval
 * Use for: scroll handlers, mousemove, window resize
 *
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export const throttle = (func, limit = 100) => {
  let inThrottle;

  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Memoize function - caches function results
 * Use for: expensive calculations, API responses
 *
 * @param {Function} func - Function to memoize
 * @returns {Function} - Memoized function
 */
export const memoize = (func) => {
  const cache = new Map();

  return (...args) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Lazy load images - only load when in viewport
 * Use for: image galleries, long lists with images
 *
 * @param {string} src - Image source URL
 * @param {string} placeholder - Placeholder image URL
 * @returns {Object} - { src, isLoaded }
 */
export const useLazyImage = (src, placeholder = '') => {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const imgRef = React.useRef();

  React.useEffect(() => {
    let observer;
    const imgElement = imgRef.current;

    if (imgElement && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              setIsLoaded(true);
              observer.unobserve(imgElement);
            }
          });
        },
        {
          rootMargin: '50px'
        }
      );

      observer.observe(imgElement);
    } else {
      // Fallback for browsers without IntersectionObserver
      setImageSrc(src);
      setIsLoaded(true);
    }

    return () => {
      if (observer && imgElement) {
        observer.unobserve(imgElement);
      }
    };
  }, [src]);

  return { imageSrc, isLoaded, imgRef };
};

/**
 * Deep equality check for objects
 * Use with useMemo, useCallback dependencies
 *
 * @param {*} a - First value
 * @param {*} b - Second value
 * @returns {boolean} - Whether values are deeply equal
 */
export const deepEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
};

/**
 * Request Animation Frame throttle
 * Use for: scroll handlers, animations
 *
 * @param {Function} func - Function to throttle
 * @returns {Function} - RAF-throttled function
 */
export const rafThrottle = (func) => {
  let rafId = null;

  return function throttled(...args) {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func(...args);
        rafId = null;
      });
    }
  };
};

export default {
  debounce,
  throttle,
  memoize,
  deepEqual,
  rafThrottle
};
