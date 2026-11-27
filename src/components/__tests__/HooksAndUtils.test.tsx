import '@testing-library/jest-dom/vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEyeCareTimer } from '../../hooks/useEyeCareTimer';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useEyeCareTimer hook', () => {
  it('opens eye-care reminder after intervalSeconds and resets on dismiss', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useEyeCareTimer({
        enabled: true,
        resetKey: 'profile-1',
        intervalSeconds: 5,
      }),
    );

    expect(result.current.eyeCareOpen).toBe(false);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.eyeCareOpen).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.eyeCareOpen).toBe(true);

    act(() => {
      result.current.dismissEyeCare();
    });
    expect(result.current.eyeCareOpen).toBe(false);
  });

  it('does not trigger when disabled', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useEyeCareTimer({
        enabled: false,
        resetKey: 'profile-1',
        intervalSeconds: 3,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.eyeCareOpen).toBe(false);
  });
});
