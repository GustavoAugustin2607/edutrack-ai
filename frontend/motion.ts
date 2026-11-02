import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
// Cards and rows that cascade in when a page opens.
const REVEAL = [
  '.card', '.g-panel', '.g-hero', '.g-quest', '.g-badge', '.g-item', '.house-card',
  '.arena-hero', '.arena-ai', '.arena-decks', '.arena-game', '.arena-result',
  '.week-paper', '.task-slip', '.task-row', '.flashcard',
  '.analysis-summary > div', '.analysis-chart-section', '.analysis-detail', '.analysis-insights',
  '.ai-mode-rail > button', '.ai-composer', '.ai-result',
].join(',');

export function useEntrance(ref: RefObject<HTMLElement | null>, key: string) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      // Only what is visible on this page; the dashboard has its own reveal.
      const items = Array.from(root.querySelectorAll<HTMLElement>(REVEAL))
        .filter(el => el.offsetParent !== null && !el.closest('.overview-dashboard'))
        .slice(0, 28);
      if (!items.length) {
        gsap.fromTo(root, { y: 8, opacity: 0.5 }, { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out', clearProps: 'all' });
        return;
      }
      gsap.fromTo(
        items,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.035, ease: 'power3.out', clearProps: 'transform,opacity' },
      );
    });
    return () => media.revert();
  }, [key, ref]);
}

export function useDashboardMotion(
  ref: RefObject<HTMLElement | null>,
  key: string,
) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.fromTo(
          '[data-dashboard-reveal]',
          { y: 12, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.34,
            stagger: 0.045,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
          },
        );
        gsap.fromTo(
          '[data-chart-bar]',
          { scaleY: 0, transformOrigin: 'bottom' },
          {
            scaleY: 1,
            duration: 0.38,
            stagger: 0.018,
            delay: 0.08,
            ease: 'power2.out',
            clearProps: 'transform',
          },
        );
      }, root);
      return () => context.revert();
    });
    return () => media.revert();
  }, [key, ref]);
}
