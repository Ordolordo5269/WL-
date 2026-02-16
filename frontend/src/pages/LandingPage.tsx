import { useEffect } from 'react';
import LandingApp from '../landing-module/App';
import '../landing-module/landing.css';

/**
 * LandingPage wrapper that overrides the main app's restrictive CSS
 * (position: fixed, overflow: hidden on html/body/#root) so the landing
 * page can scroll freely and render at full height.
 */
export default function LandingPage() {
  useEffect(() => {
    // Store original styles so we can restore on unmount
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    const origHtml = {
      overflow: html.style.overflow,
      height: html.style.height,
      width: html.style.width,
    };
    const origBody = {
      overflow: body.style.overflow,
      overflowX: body.style.overflowX,
      height: body.style.height,
      width: body.style.width,
      background: body.style.backgroundColor,
    };
    const origRoot = root
      ? {
          position: root.style.position,
          top: root.style.top,
          left: root.style.left,
          width: root.style.width,
          height: root.style.height,
          overflow: root.style.overflow,
          transform: root.style.transform,
          backfaceVisibility: root.style.backfaceVisibility,
        }
      : null;

    // Override for landing page: allow scroll, full-height flow
    html.style.overflow = 'auto';
    html.style.height = 'auto';
    body.style.overflow = 'auto';
    body.style.overflowX = 'hidden';
    body.style.height = 'auto';
    body.style.backgroundColor = '#0a0a0a';

    if (root) {
      root.style.position = 'relative';
      root.style.top = 'auto';
      root.style.left = 'auto';
      root.style.width = '100%';
      root.style.height = 'auto';
      root.style.overflow = 'visible';
      root.style.transform = 'none';
      root.style.backfaceVisibility = 'visible';
    }

    return () => {
      // Restore everything when leaving the landing page
      html.style.overflow = origHtml.overflow;
      html.style.height = origHtml.height;
      html.style.width = origHtml.width;
      body.style.overflow = origBody.overflow;
      body.style.overflowX = origBody.overflowX;
      body.style.height = origBody.height;
      body.style.width = origBody.width;
      body.style.backgroundColor = origBody.background;

      if (root && origRoot) {
        root.style.position = origRoot.position;
        root.style.top = origRoot.top;
        root.style.left = origRoot.left;
        root.style.width = origRoot.width;
        root.style.height = origRoot.height;
        root.style.overflow = origRoot.overflow;
        root.style.transform = origRoot.transform;
        root.style.backfaceVisibility = origRoot.backfaceVisibility;
      }
    };
  }, []);

  return (
    <div className="landing-page-root">
      <LandingApp />
    </div>
  );
}
