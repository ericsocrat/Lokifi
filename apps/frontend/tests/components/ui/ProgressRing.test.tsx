/**
 * ProgressRing Component Tests
 *
 * Tests the circular progress indicator component including:
 * - Rendering at various progress values
 * - Custom sizing and styling
 * - Label display options
 * - Accessibility attributes
 */

import { ProgressRing } from '@/src/components/ui/ProgressRing';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('ProgressRing Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<ProgressRing progress={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
    });

    it('should display correct percentage label', () => {
      render(<ProgressRing progress={75} />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should round percentage to nearest integer', () => {
      render(<ProgressRing progress={33.7} />);

      expect(screen.getByText('34%')).toBeInTheDocument();
    });

    it('should render SVG with circles', () => {
      const { container } = render(<ProgressRing progress={50} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();

      const circles = container.querySelectorAll('circle');
      expect(circles).toHaveLength(2); // Background + progress
    });
  });

  describe('Progress Values', () => {
    it('should handle 0% progress', () => {
      render(<ProgressRing progress={0} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });

    it('should handle 100% progress', () => {
      render(<ProgressRing progress={100} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });

    it('should clamp progress above 100% to 100%', () => {
      render(<ProgressRing progress={150} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });

    it('should clamp negative progress to 0%', () => {
      render(<ProgressRing progress={-20} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });
  });

  describe('Custom Size', () => {
    it('should apply custom size', () => {
      render(<ProgressRing progress={50} size={120} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveStyle({ width: '120px', height: '120px' });
    });

    it('should have default size of 80px', () => {
      render(<ProgressRing progress={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveStyle({ width: '80px', height: '80px' });
    });

    it('should scale font size with ring size', () => {
      const { container } = render(<ProgressRing progress={50} size={100} />);

      const label = container.querySelector('span');
      expect(label).toHaveStyle({ fontSize: '20px' }); // 100 * 0.2
    });
  });

  describe('Custom Colors', () => {
    it('should apply custom progress color', () => {
      const { container } = render(<ProgressRing progress={50} color="#10B981" />);

      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle).toHaveAttribute('stroke', '#10B981');
    });

    it('should use default purple color', () => {
      const { container } = render(<ProgressRing progress={50} />);

      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle).toHaveAttribute('stroke', '#8B5CF6');
    });

    it('should apply custom track color', () => {
      const { container } = render(<ProgressRing progress={50} trackColor="#374151" />);

      const trackCircle = container.querySelectorAll('circle')[0];
      expect(trackCircle).toHaveAttribute('stroke', '#374151');
    });
  });

  describe('Label Options', () => {
    it('should hide label when showLabel is false', () => {
      render(<ProgressRing progress={50} showLabel={false} />);

      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('should display custom label instead of percentage', () => {
      render(<ProgressRing progress={80} customLabel="4/5" />);

      expect(screen.getByText('4/5')).toBeInTheDocument();
      expect(screen.queryByText('80%')).not.toBeInTheDocument();
    });

    it('should apply label className', () => {
      const { container } = render(
        <ProgressRing progress={50} labelClassName="text-emerald-400" />
      );

      const label = container.querySelector('span');
      expect(label).toHaveClass('text-emerald-400');
    });
  });

  describe('Stroke Width', () => {
    it('should apply custom stroke width', () => {
      const { container } = render(<ProgressRing progress={50} strokeWidth={10} />);

      const circles = container.querySelectorAll('circle');
      circles.forEach((circle) => {
        expect(circle).toHaveAttribute('stroke-width', '10');
      });
    });

    it('should use default stroke width of 6', () => {
      const { container } = render(<ProgressRing progress={50} />);

      const circles = container.querySelectorAll('circle');
      circles.forEach((circle) => {
        expect(circle).toHaveAttribute('stroke-width', '6');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have progressbar role', () => {
      render(<ProgressRing progress={50} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should have aria-valuenow attribute', () => {
      render(<ProgressRing progress={65} />);

      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '65');
    });

    it('should have aria-valuemin and aria-valuemax', () => {
      render(<ProgressRing progress={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should have aria-label with progress percentage', () => {
      render(<ProgressRing progress={75} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', 'Progress: 75%');
    });
  });

  describe('CSS Classes', () => {
    it('should apply custom className to container', () => {
      render(<ProgressRing progress={50} className="my-custom-class" />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveClass('my-custom-class');
    });

    it('should have default flex classes', () => {
      render(<ProgressRing progress={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveClass('inline-flex', 'items-center', 'justify-center');
    });
  });

  describe('Animation', () => {
    it('should have transition style for progress animation', () => {
      const { container } = render(<ProgressRing progress={50} animationDuration={300} />);

      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle).toHaveStyle({
        transition: 'stroke-dashoffset 300ms ease-out',
      });
    });

    it('should use default 500ms animation duration', () => {
      const { container } = render(<ProgressRing progress={50} />);

      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle).toHaveStyle({
        transition: 'stroke-dashoffset 500ms ease-out',
      });
    });
  });
});
