/**
 * Unit tests for OfflineBanner component and related utilities
 * Tests both happy paths and offline scenarios with translation integration
 */

import { render, screen } from '@testing-library/react';
import { OfflineBanner, OfflineOverlay, useOfflineDisabled } from '../OfflineBanner';

// Mock useOnlineStatus hook
const mockUseOnlineStatus = jest.fn();
jest.mock('../../hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

// Mock next-i18next
jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'offline.banner.title': 'Connection lost - You are currently offline',
        'offline.banner.description': 'Some features may not work until your connection is restored',
        'offline.overlay.message': 'Please check your connection',
        'offline.tooltip': 'This feature is not available offline',
      };
      return translations[key] || key;
    },
  }),
}));

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Paths - Online State', () => {
    test('should not render when online', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
      });

      const { container } = render(<OfflineBanner />);
      
      expect(container.firstChild).toBeNull();
    });

    test('should not render with custom className when online', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
      });

      const { container } = render(<OfflineBanner className="custom-class" />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Offline State', () => {
    test('should render banner when offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });

      render(<OfflineBanner />);
      
      expect(screen.getByText('Connection lost - You are currently offline')).toBeInTheDocument();
      expect(screen.getByText('Some features may not work until your connection is restored')).toBeInTheDocument();
    });

    test('should apply custom className when offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });

      const { container } = render(<OfflineBanner className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
      expect(container.firstChild).toHaveClass('fixed', 'top-0', 'left-0', 'right-0', 'z-50');
    });

    test('should have correct styling and structure when offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });

      const { container } = render(<OfflineBanner />);
      
      const banner = container.firstChild as HTMLElement;
      expect(banner).toHaveClass('fixed', 'top-0', 'left-0', 'right-0', 'z-50');
      
      const content = banner.firstChild as HTMLElement;
      expect(content).toHaveClass('bg-red-600', 'text-white', 'px-4', 'py-3', 'shadow-lg');
    });

    test('should display animated dots indicator when offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });

      render(<OfflineBanner />);
      
      // Should have 3 animated dots
      const dots = document.querySelectorAll('.animate-pulse');
      expect(dots.length).toBeGreaterThanOrEqual(3);
    });

    test('should display offline icon when offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });

      render(<OfflineBanner />);
      
      // Check for SVG icon
      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('w-5', 'h-5');
    });
  });
});

describe('OfflineOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Paths - Online State', () => {
    test('should render children without overlay when online', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
      });

      render(
        <OfflineOverlay>
          <div>Child content</div>
        </OfflineOverlay>
      );
      
      expect(screen.getByText('Child content')).toBeInTheDocument();
      expect(screen.queryByText('Please check your connection')).not.toBeInTheDocument();
      
      // Should not have overlay
      const overlay = document.querySelector('.absolute.inset-0');
      expect(overlay).not.toBeInTheDocument();
    });

    test('should apply custom className when online', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
      });

      const { container } = render(
        <OfflineOverlay className="custom-overlay">
          <div>Child content</div>
        </OfflineOverlay>
      );
      
      expect(container.firstChild).toHaveClass('custom-overlay');
      expect(container.firstChild).toHaveClass('relative');
    });

    test('should render multiple children when online', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
      });

      render(
        <OfflineOverlay>
          <div>First child</div>
          <div>Second child</div>
          <button>Click me</button>
        </OfflineOverlay>
      );
      
      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });
  });

  describe('Offline State', () => {
    test('should show overlay with default message when offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });

      render(
        <OfflineOverlay>
          <div>Child content</div>
        </OfflineOverlay>
      );
      
      expect(screen.getByText('Child content')).toBeInTheDocument();
      expect(screen.getByText('Please check your connection')).toBeInTheDocument();
    });

    test('should use custom message when provided and offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });

      render(
        <OfflineOverlay message="Custom offline message">
          <div>Child content</div>
        </OfflineOverlay>
      );
      
      expect(screen.getByText('Custom offline message')).toBeInTheDocument();
      expect(screen.queryByText('Please check your connection')).not.toBeInTheDocument();
    });

    test('should hide message when showMessage is false', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });

      render(
        <OfflineOverlay showMessage={false}>
          <div>Child content</div>
        </OfflineOverlay>
      );
      
      expect(screen.getByText('Child content')).toBeInTheDocument();
      expect(screen.queryByText('Please check your connection')).not.toBeInTheDocument();
      
      // Overlay should still exist but without message
      const overlay = document.querySelector('.absolute.inset-0');
      expect(overlay).toBeInTheDocument();
    });

    test('should have correct overlay styling when offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });

      render(
        <OfflineOverlay>
          <div>Child content</div>
        </OfflineOverlay>
      );
      
      const overlay = document.querySelector('.absolute.inset-0');
      expect(overlay).toHaveClass(
        'bg-gray-900',
        'bg-opacity-50',
        'flex',
        'items-center',
        'justify-center',
        'z-10',
        'rounded-lg'
      );
    });

    test('should display warning icon in overlay when offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });

      render(
        <OfflineOverlay>
          <div>Child content</div>
        </OfflineOverlay>
      );
      
      // Check for warning icon SVG
      const warningIcon = document.querySelector('svg');
      expect(warningIcon).toBeInTheDocument();
      expect(warningIcon).toHaveClass('w-5', 'h-5', 'text-red-600');
    });
  });
});

describe('useOfflineDisabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Paths - Online State', () => {
    test('should return enabled props when online', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
      });

      const TestComponent = () => {
        const props = useOfflineDisabled();
        return <div data-testid="test-element" {...props} />;
      };

      render(<TestComponent />);
      
      const element = screen.getByTestId('test-element');
      expect(element).not.toBeDisabled();
      expect(element).toHaveAttribute('aria-disabled', 'false');
      expect(element).not.toHaveAttribute('title');
      expect(element).not.toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    test('should work with button elements when online', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
      });

      const TestComponent = () => {
        const props = useOfflineDisabled();
        return <button data-testid="test-button" {...props}>Click me</button>;
      };

      render(<TestComponent />);
      
      const button = screen.getByTestId('test-button');
      expect(button).toBeEnabled();
      expect(button).not.toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    test('should work with input elements when online', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
      });

      const TestComponent = () => {
        const props = useOfflineDisabled();
        return <input data-testid="test-input" {...props} placeholder="Type here" />;
      };

      render(<TestComponent />);
      
      const input = screen.getByTestId('test-input');
      expect(input).toBeEnabled();
      expect(input).not.toHaveAttribute('title');
    });
  });

  describe('Offline State', () => {
    test('should return disabled props when offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });

      const TestComponent = () => {
        const props = useOfflineDisabled();
        return <button data-testid="test-button" {...props}>Test</button>;
      };

      render(<TestComponent />);
      
      const button = screen.getByTestId('test-button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('title', 'This feature is not available offline');
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    test('should use translated tooltip text when offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });

      const TestComponent = () => {
        const props = useOfflineDisabled();
        return <div data-testid="test-element" {...props} />;
      };

      render(<TestComponent />);
      
      const element = screen.getByTestId('test-element');
      expect(element).toHaveAttribute('title', 'This feature is not available offline');
    });

    test('should disable multiple elements when offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });

      const TestComponent = () => {
        const props = useOfflineDisabled();
        return (
          <div>
            <button data-testid="button1" {...props}>Button 1</button>
            <button data-testid="button2" {...props}>Button 2</button>
            <input data-testid="input1" {...props} />
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('button1')).toBeDisabled();
      expect(screen.getByTestId('button2')).toBeDisabled();
      expect(screen.getByTestId('input1')).toBeDisabled();
    });
  });

  describe('State Transitions', () => {
    test('should update props when network state changes', () => {
      // Start online
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
      });

      const TestComponent = () => {
        const props = useOfflineDisabled();
        return <button data-testid="test-button" {...props}>Test</button>;
      };

      const { rerender } = render(<TestComponent />);
      
      // Initially enabled
      expect(screen.getByTestId('test-button')).toBeEnabled();

      // Go offline
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });

      rerender(<TestComponent />);
      
      // Now disabled
      expect(screen.getByTestId('test-button')).toBeDisabled();
    });
  });
});