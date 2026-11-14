import { renderHook, act } from '@testing-library/react';
import { useFocusRefresh } from './useFocusRefresh';
import { useOffline } from '../contexts/OfflineContext';

jest.mock('../contexts/OfflineContext', () => ({
  useOffline: jest.fn()
}));

const focusWindow = () => act(() => {
  window.dispatchEvent(new Event('focus'));
});

describe('useFocusRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-14T10:00:00Z'));
    useOffline.mockReturnValue({ isOnline: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps the key when focus returns inside the interval', () => {
    const { result } = renderHook(() => useFocusRefresh(60000));
    jest.advanceTimersByTime(30000);
    focusWindow();
    expect(result.current).toBe(0);
  });

  it('changes the key once when focus returns after the interval', () => {
    const { result } = renderHook(() => useFocusRefresh(60000));
    jest.advanceTimersByTime(61000);
    focusWindow();
    focusWindow();
    expect(result.current).toBe(1);

    jest.advanceTimersByTime(61000);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe(2);
  });

  it('does not refresh while offline', () => {
    useOffline.mockReturnValue({ isOnline: false });
    const { result } = renderHook(() => useFocusRefresh(60000));
    jest.advanceTimersByTime(61000);
    focusWindow();
    expect(result.current).toBe(0);
  });
});
