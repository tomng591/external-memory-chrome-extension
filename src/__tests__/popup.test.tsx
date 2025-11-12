import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Popup from '../popup';

describe('Popup Component', () => {
  describe('Rendering', () => {
    it('should render without errors', () => {
      render(<Popup />);
      expect(screen.getByText('External Memory')).toBeInTheDocument();
    });

    it('should display main heading "External Memory"', () => {
      render(<Popup />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('External Memory');
    });

    it('should display subtitle about conversation backup', () => {
      render(<Popup />);
      expect(screen.getByText('AI conversation backup')).toBeInTheDocument();
    });

    it('should display status section', () => {
      render(<Popup />);
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should display settings button', () => {
      render(<Popup />);
      expect(screen.getByRole('button', { name: /Settings/ })).toBeInTheDocument();
    });

    it('should display version number', () => {
      render(<Popup />);
      expect(screen.getByText(/v0\.0\.1/)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have correct heading styling classes', () => {
      const { container } = render(<Popup />);
      const heading = container.querySelector('h1');
      expect(heading).toHaveClass('text-2xl');
      expect(heading).toHaveClass('font-bold');
      expect(heading).toHaveClass('text-gray-900');
    });

    it('should have background styling', () => {
      const { container } = render(<Popup />);
      const wrapper = container.querySelector('div');
      expect(wrapper).toHaveClass('bg-gradient-to-br');
      expect(wrapper).toHaveClass('p-4');
    });

    it('should have card sections with proper styling', () => {
      const { container } = render(<Popup />);
      const cards = container.querySelectorAll('.bg-white');
      expect(cards.length).toBeGreaterThan(0);

      // Check that at least some cards have the expected classes
      let hasRounded = false;
      let hasBorder = false;

      cards.forEach(card => {
        if (card.classList.contains('rounded-lg')) hasRounded = true;
        if (card.classList.contains('border')) hasBorder = true;
      });

      expect(hasRounded || hasBorder).toBe(true);
    });

    it('should have subheadings with proper styling', () => {
      const { container } = render(<Popup />);
      const subheadings = container.querySelectorAll('h2');
      expect(subheadings.length).toBeGreaterThan(0);

      subheadings.forEach(heading => {
        expect(heading).toHaveClass('text-sm');
        expect(heading).toHaveClass('font-semibold');
      });
    });
  });

  describe('Layout Structure', () => {
    it('should have proper semantic structure', () => {
      const { container } = render(<Popup />);

      // Should have main container
      const mainDiv = container.querySelector('div');
      expect(mainDiv).toBeInTheDocument();

      // Should have heading
      expect(container.querySelector('h1')).toBeInTheDocument();

      // Should have subheadings
      const subheadings = container.querySelectorAll('h2');
      expect(subheadings.length).toBeGreaterThan(0);
    });

    it('should have footer section', () => {
      const { container } = render(<Popup />);
      const footer = container.querySelector('div.border-t');
      expect(footer).toBeInTheDocument();
    });

    it('should have a settings button', () => {
      const { container } = render(<Popup />);
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-indigo-600');
    });
  });

  describe('Accessibility', () => {
    it('should have text content accessible via screen reader', () => {
      render(<Popup />);

      expect(screen.getByText('External Memory')).toBeVisible();
      expect(screen.getByText('Status')).toBeVisible();
    });

    it('should have proper heading hierarchy', () => {
      render(<Popup />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();

      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThan(0);
    });
  });
});
