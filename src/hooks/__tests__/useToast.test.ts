import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../useToast';

describe('useToast', () => {
  it('should initialize with empty toasts', () => {
    const { result } = renderHook(() => useToast());
    
    expect(result.current.toasts).toEqual([]);
  });

  it('should add a toast', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.showToast('Test message', 'success');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Test message');
    expect(result.current.toasts[0].type).toBe('success');
    expect(result.current.toasts[0].id).toBeDefined();
  });

  it('should add multiple toasts', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.showToast('Message 1', 'success');
      result.current.showToast('Message 2', 'error');
      result.current.showToast('Message 3', 'info');
    });

    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts[0].message).toBe('Message 1');
    expect(result.current.toasts[1].message).toBe('Message 2');
    expect(result.current.toasts[2].message).toBe('Message 3');
  });

  it('should default to info type', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.showToast('Test message');
    });

    expect(result.current.toasts[0].type).toBe('info');
  });

  it('should remove a toast', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.showToast('Message 1', 'success');
      result.current.showToast('Message 2', 'error');
    });

    const toastId = result.current.toasts[0].id;
    
    act(() => {
      result.current.removeToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Message 2');
  });

  it('should handle removing non-existent toast', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.showToast('Message 1', 'success');
      result.current.removeToast('non-existent-id');
    });

    expect(result.current.toasts).toHaveLength(1);
  });

  it('should generate unique IDs for toasts', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.showToast('Message 1');
      result.current.showToast('Message 2');
    });

    expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id);
  });
});

