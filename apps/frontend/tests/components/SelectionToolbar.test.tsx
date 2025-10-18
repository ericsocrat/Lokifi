/**
 * @vitest-environment jsdom
 */
import SelectionToolbar from '@/components/SelectionToolbar';
import { useChartStore } from '@/state/store';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the store
vi.mock('@/state/store', () => ({
  useChartStore: vi.fn(),
}));

describe('SelectionToolbar', () => {
  let mockStore: any;

  beforeEach(() => {
    mockStore = {
      selection: new Set(),
      alignSelected: vi.fn(),
      distributeSelected: vi.fn(),
    };

    (useChartStore as any).mockReturnValue(mockStore);
  });

  describe('Visibility', () => {
    it('should not render when no selection', () => {
      mockStore.selection = new Set();
      const { container } = render(<SelectionToolbar />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when only 1 item selected', () => {
      mockStore.selection = new Set(['shape1']);
      const { container } = render(<SelectionToolbar />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when 2 items selected', () => {
      mockStore.selection = new Set(['shape1', 'shape2']);
      render(<SelectionToolbar />);
      expect(screen.getByText('Align ⟵')).toBeInTheDocument();
    });

    it('should render when multiple items selected', () => {
      mockStore.selection = new Set(['shape1', 'shape2', 'shape3', 'shape4']);
      render(<SelectionToolbar />);
      expect(screen.getByText('Align ⟵')).toBeInTheDocument();
    });
  });

  describe('Alignment Buttons', () => {
    beforeEach(() => {
      mockStore.selection = new Set(['shape1', 'shape2']);
    });

    it('should render all alignment buttons', () => {
      render(<SelectionToolbar />);

      expect(screen.getByText('Align ⟵')).toBeInTheDocument();
      expect(screen.getByText('Align ⟶')).toBeInTheDocument();
      expect(screen.getByText('Align ⤒')).toBeInTheDocument();
      expect(screen.getByText('Align ⤓')).toBeInTheDocument();
    });

    it('should call alignSelected with "left" when left align clicked', async () => {
      const user = userEvent.setup();
      render(<SelectionToolbar />);

      await user.click(screen.getByText('Align ⟵'));
      expect(mockStore.alignSelected).toHaveBeenCalledWith('left');
    });

    it('should call alignSelected with "right" when right align clicked', async () => {
      const user = userEvent.setup();
      render(<SelectionToolbar />);

      await user.click(screen.getByText('Align ⟶'));
      expect(mockStore.alignSelected).toHaveBeenCalledWith('right');
    });

    it('should call alignSelected with "top" when top align clicked', async () => {
      const user = userEvent.setup();
      render(<SelectionToolbar />);

      await user.click(screen.getByText('Align ⤒'));
      expect(mockStore.alignSelected).toHaveBeenCalledWith('top');
    });

    it('should call alignSelected with "bottom" when bottom align clicked', async () => {
      const user = userEvent.setup();
      render(<SelectionToolbar />);

      await user.click(screen.getByText('Align ⤓'));
      expect(mockStore.alignSelected).toHaveBeenCalledWith('bottom');
    });
  });

  describe('Distribution Buttons', () => {
    beforeEach(() => {
      mockStore.selection = new Set(['shape1', 'shape2', 'shape3']);
    });

    it('should render distribution buttons', () => {
      render(<SelectionToolbar />);

      expect(screen.getByText('Distribute ↔︎')).toBeInTheDocument();
      expect(screen.getByText('Distribute ↕︎')).toBeInTheDocument();
    });

    it('should call distributeSelected with "h" when horizontal distribute clicked', async () => {
      const user = userEvent.setup();
      render(<SelectionToolbar />);

      await user.click(screen.getByText('Distribute ↔︎'));
      expect(mockStore.distributeSelected).toHaveBeenCalledWith('h');
    });

    it('should call distributeSelected with "v" when vertical distribute clicked', async () => {
      const user = userEvent.setup();
      render(<SelectionToolbar />);

      await user.click(screen.getByText('Distribute ↕︎'));
      expect(mockStore.distributeSelected).toHaveBeenCalledWith('v');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null store gracefully', () => {
      (useChartStore as any).mockReturnValue(null);
      const { container } = render(<SelectionToolbar />);
      expect(container.firstChild).toBeNull();
    });

    it('should handle store without selection property', () => {
      (useChartStore as any).mockReturnValue({ alignSelected: vi.fn() });
      const { container } = render(<SelectionToolbar />);
      expect(container.firstChild).toBeNull();
    });

    it('should handle empty selection set', () => {
      mockStore.selection = new Set([]);
      const { container } = render(<SelectionToolbar />);
      expect(container.firstChild).toBeNull();
    });

    it('should re-render when selection changes', () => {
      mockStore.selection = new Set(['shape1']);
      const { container, rerender } = render(<SelectionToolbar />);
      expect(container.firstChild).toBeNull();

      mockStore.selection = new Set(['shape1', 'shape2']);
      rerender(<SelectionToolbar />);
      expect(screen.getByText('Align ⟵')).toBeInTheDocument();
    });
  });
});
