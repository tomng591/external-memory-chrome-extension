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

    it('should display subtitle about vendor lock-in', () => {
      render(<Popup />);
      expect(screen.getByText('Store AI conversations without vendor lock-in')).toBeInTheDocument();
    });

    it('should display status section with placeholder text', () => {
      render(<Popup />);
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Configuration coming soon...')).toBeInTheDocument();
    });

    it('should display supported platforms section', () => {
      render(<Popup />);
      expect(screen.getByText('Supported Platforms')).toBeInTheDocument();
      expect(screen.getByText('✓ ChatGPT')).toBeInTheDocument();
      expect(screen.getByText('✓ Claude')).toBeInTheDocument();
    });

    it('should display version number', () => {
      render(<Popup />);
      expect(screen.getByText('v0.0.1')).toBeInTheDocument();
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

      cards.forEach(card => {
        expect(card).toHaveClass('rounded-lg');
        expect(card).toHaveClass('p-3');
        expect(card).toHaveClass('border');
      });
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

    it('should have list of supported platforms', () => {
      const { container } = render(<Popup />);
      const list = container.querySelector('ul');
      expect(list).toBeInTheDocument();

      const listItems = list?.querySelectorAll('li');
      expect(listItems?.length).toBe(2);
    });

    it('should have footer section', () => {
      const { container } = render(<Popup />);
      const footer = container.querySelector('div.border-t');
      expect(footer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have text content accessible via screen reader', () => {
      render(<Popup />);

      expect(screen.getByText('External Memory')).toBeVisible();
      expect(screen.getByText('Configuration coming soon...')).toBeVisible();
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
