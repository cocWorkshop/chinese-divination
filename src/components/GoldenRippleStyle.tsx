'use client'

/**
 * Modern Oriental Golden Ripple Border Effect.
 * Replaces aggressive gaming flame borders with an elegant, serene
 * celestial gold stream that gracefully glides along the card perimeter
 * during live SSE streaming inference.
 */
export default function GoldenRippleStyle() {
  return (
    <style jsx global>{`
      .flame-border-active,
      .golden-ripple-active {
        position: relative;
        border: 2px solid transparent !important;
        background-clip: padding-box;
        z-index: 0;
      }

      /* Four-phase celestial gold stream (Quad-Beam) — guarantees that regardless
         of card height (even 4,000px) and scroll position, there is ALWAYS a luminous
         celestial stream actively gliding through the user's visible viewport. */
      .flame-border-active::before,
      .golden-ripple-active::before {
        content: '';
        position: absolute;
        inset: -2px;
        border-radius: inherit;
        padding: 2px;
        background: conic-gradient(
          from var(--golden-stream-angle, 0deg),
          rgba(212, 168, 83, 0.08) 0%,
          rgba(212, 168, 83, 0.5) 6%,
          rgba(245, 215, 145, 0.95) 12%,
          rgba(212, 168, 83, 0.5) 18%,
          rgba(212, 168, 83, 0.08) 25%,
          rgba(212, 168, 83, 0.5) 31%,
          rgba(245, 215, 145, 0.95) 37%,
          rgba(212, 168, 83, 0.5) 43%,
          rgba(212, 168, 83, 0.08) 50%,
          rgba(212, 168, 83, 0.5) 56%,
          rgba(245, 215, 145, 0.95) 62%,
          rgba(212, 168, 83, 0.5) 68%,
          rgba(212, 168, 83, 0.08) 75%,
          rgba(212, 168, 83, 0.5) 81%,
          rgba(245, 215, 145, 0.95) 87%,
          rgba(212, 168, 83, 0.5) 93%,
          rgba(212, 168, 83, 0.08) 100%
        );
        -webkit-mask:
          linear-gradient(#fff 0 0) content-box,
          linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask:
          linear-gradient(#fff 0 0) content-box,
          linear-gradient(#fff 0 0);
        mask-composite: exclude;
        animation: goldenStreamRotate 4.5s linear infinite;
        z-index: -1;
      }

      :root:not(.dark) .flame-border-active::before,
      :root:not(.dark) .golden-ripple-active::before {
        background: conic-gradient(
          from var(--golden-stream-angle, 0deg),
          rgba(184, 134, 11, 0.1) 0%,
          rgba(184, 134, 11, 0.6) 6%,
          rgba(139, 101, 8, 0.95) 12%,
          rgba(184, 134, 11, 0.6) 18%,
          rgba(184, 134, 11, 0.1) 25%,
          rgba(184, 134, 11, 0.6) 31%,
          rgba(139, 101, 8, 0.95) 37%,
          rgba(184, 134, 11, 0.6) 43%,
          rgba(184, 134, 11, 0.1) 50%,
          rgba(184, 134, 11, 0.6) 56%,
          rgba(139, 101, 8, 0.95) 62%,
          rgba(184, 134, 11, 0.6) 68%,
          rgba(184, 134, 11, 0.1) 75%,
          rgba(184, 134, 11, 0.6) 81%,
          rgba(139, 101, 8, 0.95) 87%,
          rgba(184, 134, 11, 0.6) 93%,
          rgba(184, 134, 11, 0.1) 100%
        );
      }

      /* Luminous ambient halo & breathing sanctuary aura */
      .flame-border-active::after,
      .golden-ripple-active::after {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: inherit;
        background: transparent;
        box-shadow:
          0 0 16px rgba(212, 168, 83, 0.35),
          0 0 36px rgba(212, 168, 83, 0.18),
          inset 0 0 18px rgba(212, 168, 83, 0.06);
        animation: goldenStreamPulse 2.8s ease-in-out infinite;
        z-index: -2;
        pointer-events: none;
      }

      :root:not(.dark) .flame-border-active::after,
      :root:not(.dark) .golden-ripple-active::after {
        box-shadow:
          0 0 14px rgba(184, 134, 11, 0.25),
          0 0 28px rgba(184, 134, 11, 0.12),
          inset 0 0 14px rgba(184, 134, 11, 0.05);
      }

      @keyframes goldenStreamRotate {
        to {
          --golden-stream-angle: 360deg;
        }
      }

      @keyframes goldenStreamPulse {
        0%, 100% {
          opacity: 0.65;
          box-shadow:
            0 0 14px rgba(212, 168, 83, 0.25),
            0 0 28px rgba(212, 168, 83, 0.12),
            inset 0 0 14px rgba(212, 168, 83, 0.04);
        }
        50% {
          opacity: 1;
          box-shadow:
            0 0 22px rgba(212, 168, 83, 0.45),
            0 0 45px rgba(212, 168, 83, 0.25),
            inset 0 0 24px rgba(212, 168, 83, 0.1);
        }
      }

      @property --golden-stream-angle {
        syntax: '<angle>';
        initial-value: 0deg;
        inherits: false;
      }

      /* Flame sparks neutralized to invisible */
      .flame-sparks {
        display: none !important;
      }
    `}</style>
  )
}
