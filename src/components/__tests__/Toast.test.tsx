import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toast } from '../Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render toast message', () => {
    const onClose = vi.fn();
    const { container } = render(<Toast message="Test message" type="info" onClose={onClose} />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });

  it('should display correct icon for success type', () => {
    const onClose = vi.fn();
    const { container } = render(<Toast message="Success" type="success" onClose={onClose} />);

    const icons = container.querySelectorAll('span');
    const iconText = Array.from(icons).map(span => span.textContent).join('');
    expect(iconText).toContain('✓');
  });

  it('should display correct icon for error type', () => {
    const onClose = vi.fn();
    const { container } = render(<Toast message="Error" type="error" onClose={onClose} />);

    const icons = container.querySelectorAll('span');
    const iconText = Array.from(icons).map(span => span.textContent).join('');
    expect(iconText).toContain('✕');
  });

  it('should display correct icon for info type', () => {
    const onClose = vi.fn();
    const { container } = render(<Toast message="Info" type="info" onClose={onClose} />);

    const icons = container.querySelectorAll('span');
    const iconText = Array.from(icons).map(span => span.textContent).join('');
    expect(iconText).toContain('ℹ');
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<Toast message="Test" type="info" onClose={onClose} />);

    const closeButton = container.querySelector('button');
    expect(closeButton).toBeInTheDocument();
    closeButton?.click();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should auto-dismiss after 4 seconds', () => {
    const onClose = vi.fn();
    render(<Toast message="Test" type="info" onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(4000);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not auto-dismiss before 4 seconds', () => {
    const onClose = vi.fn();
    render(<Toast message="Test" type="info" onClose={onClose} />);

    vi.advanceTimersByTime(3000);

    expect(onClose).not.toHaveBeenCalled();
  });
});

