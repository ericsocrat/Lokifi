import { SimpleSlider, Slider, clamp, getPercentage, roundToStep } from '@/components/ui/Slider';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('Slider', () => {
  // ============================================================================
  // Helper Functions
  // ============================================================================

  describe('Helper Functions', () => {
    describe('clamp', () => {
      it('clamps value within range', () => {
        expect(clamp(50, 0, 100)).toBe(50);
        expect(clamp(-10, 0, 100)).toBe(0);
        expect(clamp(150, 0, 100)).toBe(100);
      });
    });

    describe('roundToStep', () => {
      it('rounds to nearest step', () => {
        expect(roundToStep(12, 5, 0)).toBe(10);
        expect(roundToStep(13, 5, 0)).toBe(15);
        expect(roundToStep(17, 10, 0)).toBe(20);
      });

      it('respects min value', () => {
        expect(roundToStep(7, 5, 5)).toBe(5);
        expect(roundToStep(9, 5, 5)).toBe(10);
      });
    });

    describe('getPercentage', () => {
      it('calculates percentage correctly', () => {
        expect(getPercentage(50, 0, 100)).toBe(50);
        expect(getPercentage(25, 0, 100)).toBe(25);
        expect(getPercentage(0, 0, 100)).toBe(0);
        expect(getPercentage(100, 0, 100)).toBe(100);
      });

      it('handles custom ranges', () => {
        expect(getPercentage(15, 10, 20)).toBe(50);
        expect(getPercentage(30, 20, 40)).toBe(50);
      });
    });
  });

  // ============================================================================
  // Basic Rendering
  // ============================================================================

  describe('Basic Rendering', () => {
    it('renders slider', () => {
      render(<Slider />);

      expect(screen.getByTestId('slider')).toBeInTheDocument();
      expect(screen.getByTestId('slider-track')).toBeInTheDocument();
      expect(screen.getByTestId('slider-fill')).toBeInTheDocument();
      expect(screen.getByTestId('slider-thumb')).toBeInTheDocument();
    });

    it('renders with default value', () => {
      render(<Slider defaultValue={50} />);

      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '50');
    });

    it('renders with controlled value', () => {
      render(<Slider value={75} />);

      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '75');
    });

    it('renders with custom min/max', () => {
      render(<Slider value={50} min={0} max={200} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '200');
    });

    it('renders with custom className', () => {
      render(<Slider className="custom-slider" />);

      expect(screen.getByTestId('slider')).toHaveClass('custom-slider');
    });
  });

  // ============================================================================
  // Controlled Mode
  // ============================================================================

  describe('Controlled Mode', () => {
    it('respects controlled value', () => {
      const { rerender } = render(<Slider value={25} />);

      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '25');

      rerender(<Slider value={75} />);
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '75');
    });

    it('calls onChange when value changes', () => {
      const onChange = vi.fn();
      render(<Slider value={50} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowRight' });

      expect(onChange).toHaveBeenCalledWith(51);
    });
  });

  // ============================================================================
  // Sizes
  // ============================================================================

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`renders ${size} size`, () => {
        render(<Slider size={size} />);
        expect(screen.getByTestId('slider')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Variants
  // ============================================================================

  describe('Variants', () => {
    const variants = ['default', 'primary', 'success', 'warning', 'danger'] as const;

    variants.forEach((variant) => {
      it(`renders ${variant} variant`, () => {
        render(<Slider variant={variant} />);
        expect(screen.getByTestId('slider')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Orientation
  // ============================================================================

  describe('Orientation', () => {
    it('renders horizontal by default', () => {
      render(<Slider />);

      expect(screen.getByTestId('slider')).toHaveAttribute('data-orientation', 'horizontal');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-orientation', 'horizontal');
    });

    it('renders vertical orientation', () => {
      render(<Slider orientation="vertical" />);

      expect(screen.getByTestId('slider')).toHaveAttribute('data-orientation', 'vertical');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-orientation', 'vertical');
    });
  });

  // ============================================================================
  // Disabled State
  // ============================================================================

  describe('Disabled State', () => {
    it('disables slider', () => {
      render(<Slider disabled />);

      expect(screen.getByTestId('slider')).toHaveAttribute('data-disabled');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not respond to keyboard when disabled', () => {
      const onChange = vi.fn();
      render(<Slider disabled value={50} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowRight' });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('has tabIndex -1 when disabled', () => {
      render(<Slider disabled />);

      expect(screen.getByRole('slider')).toHaveAttribute('tabIndex', '-1');
    });

    it('applies disabled styles', () => {
      render(<Slider disabled />);

      expect(screen.getByTestId('slider')).toHaveClass('opacity-50', 'pointer-events-none');
    });
  });

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  describe('Keyboard Navigation', () => {
    it('increases value with ArrowRight', () => {
      const onChange = vi.fn();
      render(<Slider value={50} onChange={onChange} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
      expect(onChange).toHaveBeenCalledWith(51);
    });

    it('increases value with ArrowUp', () => {
      const onChange = vi.fn();
      render(<Slider value={50} onChange={onChange} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowUp' });
      expect(onChange).toHaveBeenCalledWith(51);
    });

    it('decreases value with ArrowLeft', () => {
      const onChange = vi.fn();
      render(<Slider value={50} onChange={onChange} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowLeft' });
      expect(onChange).toHaveBeenCalledWith(49);
    });

    it('decreases value with ArrowDown', () => {
      const onChange = vi.fn();
      render(<Slider value={50} onChange={onChange} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowDown' });
      expect(onChange).toHaveBeenCalledWith(49);
    });

    it('jumps by 10x step with PageUp', () => {
      const onChange = vi.fn();
      render(<Slider value={50} step={5} onChange={onChange} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'PageUp' });
      expect(onChange).toHaveBeenCalledWith(100);
    });

    it('jumps by 10x step with PageDown', () => {
      const onChange = vi.fn();
      render(<Slider value={50} step={5} onChange={onChange} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'PageDown' });
      expect(onChange).toHaveBeenCalledWith(0);
    });

    it('goes to min with Home', () => {
      const onChange = vi.fn();
      render(<Slider value={50} min={10} onChange={onChange} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'Home' });
      expect(onChange).toHaveBeenCalledWith(10);
    });

    it('goes to max with End', () => {
      const onChange = vi.fn();
      render(<Slider value={50} max={90} onChange={onChange} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'End' });
      expect(onChange).toHaveBeenCalledWith(90);
    });

    it('respects step when navigating', () => {
      const onChange = vi.fn();
      render(<Slider value={50} step={5} onChange={onChange} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
      expect(onChange).toHaveBeenCalledWith(55);
    });

    it('clamps to min', () => {
      const onChange = vi.fn();
      render(<Slider value={0} min={0} onChange={onChange} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowLeft' });
      expect(onChange).toHaveBeenCalledWith(0);
    });

    it('clamps to max', () => {
      const onChange = vi.fn();
      render(<Slider value={100} max={100} onChange={onChange} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
      expect(onChange).toHaveBeenCalledWith(100);
    });
  });

  // ============================================================================
  // Range Slider
  // ============================================================================

  describe('Range Slider', () => {
    it('renders two thumbs for range', () => {
      render(<Slider value={[20, 80]} />);

      expect(screen.getByTestId('slider-thumb-0')).toBeInTheDocument();
      expect(screen.getByTestId('slider-thumb-1')).toBeInTheDocument();
    });

    it('sets correct values on thumbs', () => {
      render(<Slider value={[20, 80]} />);

      const thumbs = screen.getAllByRole('slider');
      expect(thumbs[0]).toHaveAttribute('aria-valuenow', '20');
      expect(thumbs[1]).toHaveAttribute('aria-valuenow', '80');
    });

    it('calls onChange with array', () => {
      const onChange = vi.fn();
      render(<Slider value={[20, 80]} onChange={onChange} />);

      const firstThumb = screen.getAllByRole('slider')[0];
      fireEvent.keyDown(firstThumb, { key: 'ArrowRight' });

      expect(onChange).toHaveBeenCalledWith([21, 80]);
    });

    it('prevents thumbs from crossing (first thumb)', () => {
      const onChange = vi.fn();
      render(<Slider value={[79, 80]} onChange={onChange} />);

      const firstThumb = screen.getAllByRole('slider')[0];
      fireEvent.keyDown(firstThumb, { key: 'ArrowRight' });

      // First thumb should stop at second thumb's value
      expect(onChange).toHaveBeenCalledWith([80, 80]);
    });

    it('prevents thumbs from crossing (second thumb)', () => {
      const onChange = vi.fn();
      render(<Slider value={[20, 21]} onChange={onChange} />);

      const secondThumb = screen.getAllByRole('slider')[1];
      fireEvent.keyDown(secondThumb, { key: 'ArrowLeft' });

      // Second thumb should stop at first thumb's value
      expect(onChange).toHaveBeenCalledWith([20, 20]);
    });

    it('supports defaultValue as array', () => {
      render(<Slider defaultValue={[30, 70]} />);

      const thumbs = screen.getAllByRole('slider');
      expect(thumbs[0]).toHaveAttribute('aria-valuenow', '30');
      expect(thumbs[1]).toHaveAttribute('aria-valuenow', '70');
    });
  });

  // ============================================================================
  // Marks
  // ============================================================================

  describe('Marks', () => {
    it('renders marks when enabled', () => {
      render(<Slider marks step={25} />);

      expect(screen.getByTestId('slider-marks')).toBeInTheDocument();
    });

    it('does not render marks by default', () => {
      render(<Slider />);

      expect(screen.queryByTestId('slider-marks')).not.toBeInTheDocument();
    });

    it('renders custom marks', () => {
      render(
        <Slider
          marks={[
            { value: 0, label: 'Low' },
            { value: 50, label: 'Medium' },
            { value: 100, label: 'High' },
          ]}
        />
      );

      expect(screen.getByTestId('slider-marks')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Show Value
  // ============================================================================

  describe('Show Value', () => {
    it('shows value tooltip on hover when showValue is true', () => {
      render(<Slider showValue defaultValue={50} />);

      const thumb = screen.getByRole('slider');
      fireEvent.mouseEnter(thumb);

      expect(screen.getByTestId('slider-value')).toHaveTextContent('50');
    });

    it('hides value tooltip on mouse leave', () => {
      render(<Slider showValue defaultValue={50} />);

      const thumb = screen.getByRole('slider');
      fireEvent.mouseEnter(thumb);
      expect(screen.getByTestId('slider-value')).toBeInTheDocument();

      fireEvent.mouseLeave(thumb);
      expect(screen.queryByTestId('slider-value')).not.toBeInTheDocument();
    });

    it('uses formatValue for display', () => {
      render(<Slider showValue defaultValue={50} formatValue={(v) => `${v}%`} />);

      const thumb = screen.getByRole('slider');
      fireEvent.mouseEnter(thumb);

      expect(screen.getByTestId('slider-value')).toHaveTextContent('50%');
    });
  });

  // ============================================================================
  // Form Integration
  // ============================================================================

  describe('Form Integration', () => {
    it('renders hidden input with name', () => {
      render(<Slider name="volume" value={50} />);

      const input = document.querySelector('input[name="volume"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('50');
    });

    it('renders multiple hidden inputs for range with name', () => {
      render(<Slider name="range" value={[20, 80]} />);

      const input0 = document.querySelector('input[name="range[0]"]');
      const input1 = document.querySelector('input[name="range[1]"]');

      expect(input0).toHaveValue('20');
      expect(input1).toHaveValue('80');
    });
  });

  // ============================================================================
  // Accessibility
  // ============================================================================

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<Slider value={50} min={0} max={100} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '50');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '100');
    });

    it('supports aria-label', () => {
      render(<Slider aria-label="Volume control" />);

      expect(screen.getByRole('slider')).toHaveAttribute('aria-label', 'Volume control');
    });

    it('supports aria-labelledby', () => {
      render(
        <div>
          <label id="volume-label">Volume</label>
          <Slider aria-labelledby="volume-label" />
        </div>
      );

      expect(screen.getByRole('slider')).toHaveAttribute('aria-labelledby', 'volume-label');
    });

    it('is focusable', () => {
      render(<Slider />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('tabIndex', '0');
    });
  });

  // ============================================================================
  // Data Attributes
  // ============================================================================

  describe('Data Attributes', () => {
    it('sets data-state on thumb', () => {
      render(<Slider />);

      expect(screen.getByTestId('slider-thumb')).toHaveAttribute('data-state', 'idle');
    });

    it('sets data-disabled when disabled', () => {
      render(<Slider disabled />);

      expect(screen.getByTestId('slider')).toHaveAttribute('data-disabled');
      expect(screen.getByTestId('slider-thumb')).toHaveAttribute('data-disabled');
    });

    it('sets data-orientation', () => {
      render(<Slider orientation="vertical" />);

      expect(screen.getByTestId('slider')).toHaveAttribute('data-orientation', 'vertical');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('handles min equals max', () => {
      render(<Slider min={50} max={50} value={50} />);

      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '50');
    });

    it('handles decimal step', () => {
      const onChange = vi.fn();
      render(<Slider value={0.5} step={0.1} min={0} max={1} onChange={onChange} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
      expect(onChange).toHaveBeenCalledWith(0.6);
    });

    it('handles negative values', () => {
      render(<Slider min={-100} max={100} value={-50} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '-50');
      expect(slider).toHaveAttribute('aria-valuemin', '-100');
      expect(slider).toHaveAttribute('aria-valuemax', '100');
    });

    it('spreads additional props', () => {
      render(<Slider data-custom="value" />);

      expect(screen.getByTestId('slider')).toHaveAttribute('data-custom', 'value');
    });
  });

  // ============================================================================
  // SimpleSlider
  // ============================================================================

  describe('SimpleSlider', () => {
    it('renders with label', () => {
      render(<SimpleSlider label="Volume" />);

      expect(screen.getByText('Volume')).toBeInTheDocument();
    });

    it('displays current value', () => {
      render(<SimpleSlider label="Volume" value={50} />);

      expect(screen.getByTestId('simple-slider-value')).toHaveTextContent('50');
    });

    it('shows min/max labels when showMinMax is true', () => {
      render(<SimpleSlider showMinMax min={0} max={100} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('uses custom min/max labels', () => {
      render(<SimpleSlider showMinMax min={0} max={100} minLabel="Low" maxLabel="High" />);

      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('uses formatValue for display', () => {
      render(<SimpleSlider label="Volume" value={50} formatValue={(v) => `${v}%`} />);

      expect(screen.getByTestId('simple-slider-value')).toHaveTextContent('50%');
    });

    it('displays range values correctly', () => {
      render(<SimpleSlider label="Price Range" value={[20, 80]} formatValue={(v) => `$${v}`} />);

      expect(screen.getByTestId('simple-slider-value')).toHaveTextContent('$20 - $80');
    });

    it('calls onChange', () => {
      const onChange = vi.fn();
      render(<SimpleSlider value={50} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowRight' });

      expect(onChange).toHaveBeenCalledWith(51);
    });

    it('applies custom className', () => {
      render(<SimpleSlider className="custom-simple" />);

      expect(screen.getByTestId('simple-slider')).toHaveClass('custom-simple');
    });
  });
});
