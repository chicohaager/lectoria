// AccessibilityHelper.js - Accessibility utilities and skip navigation
import React from 'react';
import { Box, Link } from '@mui/material';

function AccessibilityHelper() {
  // Skip links for keyboard navigation
  const skipLinks = [
    { href: '#main-content', text: 'Zum Hauptinhalt springen' },
    { href: '#navigation', text: 'Zur Navigation springen' },
    { href: '#search', text: 'Zur Suche springen' },
  ];

  return (
    <>
      {/* Skip Navigation Links - only visible on focus */}
      <Box
        sx={{
          position: 'fixed',
          top: -100,
          left: 0,
          width: '100%',
          zIndex: 9999,
          '& a:focus': {
            position: 'relative',
            top: 100,
            display: 'block',
            width: 'auto',
            height: 'auto',
            padding: 1,
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            textDecoration: 'none',
            fontWeight: 'bold',
          },
        }}
      >
        {skipLinks.map((link, index) => (
          <Link
            key={index}
            href={link.href}
            sx={{
              position: 'absolute',
              left: '-10000px',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
            }}
          >
            {link.text}
          </Link>
        ))}
      </Box>

      {/* Screen Reader Only Status/Live Region */}
      <div
        id="sr-live-region"
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      />

      {/* Focus management styles */}
      <style>{`
        /* High contrast focus indicators */
        *:focus {
          outline: 2px solid #0066cc !important;
          outline-offset: 2px !important;
        }

        /* Skip to content link styling */
        .skip-link {
          position: absolute;
          top: -40px;
          left: 6px;
          background: #000;
          color: #fff;
          padding: 8px;
          text-decoration: none;
          border-radius: 0 0 6px 6px;
          z-index: 100;
        }
        
        .skip-link:focus {
          top: 0;
        }

        /* Ensure sufficient color contrast for focus indicators */
        [data-focus-visible] {
          box-shadow: 0 0 0 2px #0066cc !important;
        }

        /* Improve keyboard navigation for cards and interactive elements */
        .MuiCard-root:focus-within {
          box-shadow: 0 0 0 2px #0066cc, 0 4px 8px rgba(0,0,0,0.1) !important;
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .MuiButton-root, .MuiIconButton-root {
            border: 1px solid currentColor;
          }
        }

        /* Reduce motion for users who prefer it */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </>
  );
}

// Helper function to announce messages to screen readers
export function announceToScreenReader(message) {
  const liveRegion = document.getElementById('sr-live-region');
  if (liveRegion) {
    liveRegion.textContent = message;
    // Clear after a short delay to allow for repeated announcements
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  }
}

// Helper function to manage focus
export function focusElement(selector, delay = 0) {
  setTimeout(() => {
    const element = document.querySelector(selector);
    if (element) {
      element.focus();
    }
  }, delay);
}

// Keyboard event handlers for enhanced navigation
export function handleKeyNavigation(event, actions) {
  switch (event.key) {
    case 'Enter':
    case ' ':
      if (actions.onActivate) {
        event.preventDefault();
        actions.onActivate();
      }
      break;
    case 'Escape':
      if (actions.onEscape) {
        event.preventDefault();
        actions.onEscape();
      }
      break;
    case 'ArrowUp':
      if (actions.onArrowUp) {
        event.preventDefault();
        actions.onArrowUp();
      }
      break;
    case 'ArrowDown':
      if (actions.onArrowDown) {
        event.preventDefault();
        actions.onArrowDown();
      }
      break;
    case 'ArrowLeft':
      if (actions.onArrowLeft) {
        event.preventDefault();
        actions.onArrowLeft();
      }
      break;
    case 'ArrowRight':
      if (actions.onArrowRight) {
        event.preventDefault();
        actions.onArrowRight();
      }
      break;
    case 'Home':
      if (actions.onHome) {
        event.preventDefault();
        actions.onHome();
      }
      break;
    case 'End':
      if (actions.onEnd) {
        event.preventDefault();
        actions.onEnd();
      }
      break;
    default:
      break;
  }
}

export default AccessibilityHelper;