'use client'

/**
 * Golden flame border + orbiting spark particle effect applied to the
 * result card while streaming (`.flame-border-active` / `.flame-sparks`).
 * Global styled-jsx so the keyframes/`@property` register once.
 */
export default function FlameBorderStyle() {
  return (
    <style jsx global>{`
      .flame-border-active {
        position: relative;
        border: 3px solid transparent;
        background-clip: padding-box;
        z-index: 0;
      }
      /* Rotating conic gradient — the "flame ring". Thicker + brighter, with
         two hot lobes so the fire reads clearly while streaming. */
      .flame-border-active::before {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: inherit;
        padding: 3px;
        background: conic-gradient(
          from var(--flame-angle, 0deg),
          rgba(212,168,83,0.25) 0%,
          rgba(255,190,60,1) 7%,
          rgba(255,140,20,1) 14%,
          rgba(255,90,10,1) 19%,
          rgba(255,210,70,1) 24%,
          rgba(255,150,30,0.7) 34%,
          rgba(180,110,40,0.3) 48%,
          rgba(255,170,40,0.6) 60%,
          rgba(255,120,10,1) 70%,
          rgba(255,80,5,1) 76%,
          rgba(255,200,60,1) 84%,
          rgba(255,150,25,0.9) 91%,
          rgba(212,168,83,0.25) 100%
        );
        -webkit-mask:
          linear-gradient(#fff 0 0) content-box,
          linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask:
          linear-gradient(#fff 0 0) content-box,
          linear-gradient(#fff 0 0);
        mask-composite: exclude;
        animation: flameRotate 2s linear infinite;
        z-index: -1;
      }
      /* Outer glow — warm pulsing halo, larger and hotter. */
      .flame-border-active::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: inherit;
        background: transparent;
        box-shadow:
          0 0 14px rgba(255,170,40,0.55),
          0 0 34px rgba(255,130,20,0.38),
          0 0 70px rgba(255,110,10,0.2),
          0 0 110px rgba(212,168,83,0.12);
        animation: flameGlow 1.6s ease-in-out infinite;
        z-index: -2;
        pointer-events: none;
      }
      @keyframes flameRotate {
        to { --flame-angle: 360deg; }
      }
      @keyframes flameGlow {
        0%, 100% {
          box-shadow:
            0 0 12px rgba(255,170,40,0.45),
            0 0 28px rgba(255,130,20,0.28),
            0 0 60px rgba(255,110,10,0.14),
            0 0 100px rgba(212,168,83,0.08);
        }
        50% {
          box-shadow:
            0 0 20px rgba(255,180,50,0.75),
            0 0 46px rgba(255,140,25,0.5),
            0 0 90px rgba(255,110,10,0.3),
            0 0 140px rgba(212,168,83,0.18);
        }
      }
      @property --flame-angle {
        syntax: '<angle>';
        initial-value: 0deg;
        inherits: false;
      }

      /* ── Spark particles ── */
      .flame-sparks {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: visible;
        z-index: 1;
        border-radius: inherit;
      }
      .flame-spark {
        position: absolute;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,235,150,1) 0%, rgba(255,150,30,0.9) 45%, transparent 100%);
        box-shadow:
          0 0 8px rgba(255,200,60,1),
          0 0 18px rgba(255,140,20,0.75),
          0 0 30px rgba(255,110,10,0.45);
        filter: blur(0.4px);
      }
      /* Each spark orbits via offset-path on a rounded rect matching the card.
         Fallback: absolute positioning with individual keyframes. */
      .flame-spark-1 { animation: sparkOrbit1 3s linear infinite; }
      .flame-spark-2 { animation: sparkOrbit2 3.6s linear infinite; }
      .flame-spark-3 { animation: sparkOrbit3 2.6s linear infinite; }
      .flame-spark-4 { animation: sparkOrbit4 3.2s linear infinite; }
      .flame-spark-5 { animation: sparkOrbit5 4.2s linear infinite; opacity: 0.85; width: 5px; height: 5px; }
      .flame-spark-6 { animation: sparkOrbit6 3.9s linear infinite; opacity: 0.8; width: 5px; height: 5px; }
      .flame-spark-7 { animation: sparkOrbit2 3.3s linear infinite; animation-delay: -1.6s; }
      .flame-spark-8 { animation: sparkOrbit4 2.9s linear infinite; animation-delay: -1s; width: 5px; height: 5px; }
      .flame-spark-9  { animation: sparkOrbit1 2.8s linear infinite; animation-delay: -0.7s; }
      .flame-spark-10 { animation: sparkOrbit1 3.4s linear infinite; animation-delay: -2.2s; width: 5px; height: 5px; }
      .flame-spark-11 { animation: sparkOrbit2 4.0s linear infinite; animation-delay: -0.4s; }
      .flame-spark-12 { animation: sparkOrbit3 3.1s linear infinite; animation-delay: -1.3s; width: 5px; height: 5px; }
      .flame-spark-13 { animation: sparkOrbit3 2.4s linear infinite; animation-delay: -0.9s; }
      .flame-spark-14 { animation: sparkOrbit4 3.6s linear infinite; animation-delay: -2.5s; }
      .flame-spark-15 { animation: sparkOrbit5 3.7s linear infinite; animation-delay: -1.1s; opacity: 0.8; width: 5px; height: 5px; }
      .flame-spark-16 { animation: sparkOrbit6 3.4s linear infinite; animation-delay: -2s; opacity: 0.85; }

      /* Sparks move along the card perimeter using top/left keyframes.
         Perimeter path: top edge → right edge → bottom edge → left edge. */
      @keyframes sparkOrbit1 {
        0%   { top: -2px; left: 10%; opacity: 1; }
        25%  { top: -2px; left: 90%; opacity: 0.9; }
        26%  { top: 5%; right: auto; left: calc(100% + 0px); }
        50%  { top: 90%; left: calc(100% + 0px); opacity: 1; }
        51%  { top: calc(100% + 0px); left: 85%; }
        75%  { top: calc(100% + 0px); left: 15%; opacity: 0.8; }
        76%  { top: 85%; left: -2px; }
        99%  { top: 5%; left: -2px; opacity: 0.9; }
        100% { top: -2px; left: 10%; opacity: 1; }
      }
      @keyframes sparkOrbit2 {
        0%   { top: -2px; left: 55%; opacity: 0.8; }
        20%  { top: -2px; left: 95%; opacity: 1; }
        21%  { top: 10%; left: calc(100% + 0px); }
        45%  { top: 85%; left: calc(100% + 0px); opacity: 0.9; }
        46%  { top: calc(100% + 0px); left: 80%; }
        70%  { top: calc(100% + 0px); left: 10%; opacity: 0.7; }
        71%  { top: 80%; left: -2px; }
        95%  { top: 8%; left: -2px; opacity: 0.9; }
        100% { top: -2px; left: 55%; opacity: 0.8; }
      }
      @keyframes sparkOrbit3 {
        0%   { top: 50%; left: calc(100% + 0px); opacity: 1; }
        30%  { top: calc(100% + 0px); left: calc(100% + 0px); }
        35%  { top: calc(100% + 0px); left: 70%; opacity: 0.8; }
        65%  { top: calc(100% + 0px); left: 5%; }
        70%  { top: 80%; left: -2px; opacity: 1; }
        100% { top: 50%; left: calc(100% + 0px); opacity: 1; }
      }
      @keyframes sparkOrbit4 {
        0%   { top: calc(100% + 0px); left: 40%; opacity: 0.9; }
        25%  { top: calc(100% + 0px); left: 5%; opacity: 0.7; }
        30%  { top: 80%; left: -2px; }
        55%  { top: 10%; left: -2px; opacity: 1; }
        60%  { top: -2px; left: 15%; }
        85%  { top: -2px; left: 80%; opacity: 0.8; }
        90%  { top: 15%; left: calc(100% + 0px); }
        100% { top: calc(100% + 0px); left: 40%; opacity: 0.9; }
      }
      @keyframes sparkOrbit5 {
        0%   { top: -2px; left: 30%; opacity: 0.6; }
        50%  { top: calc(100% + 0px); left: 70%; opacity: 0.8; }
        100% { top: -2px; left: 30%; opacity: 0.6; }
      }
      @keyframes sparkOrbit6 {
        0%   { top: 30%; left: -2px; opacity: 0.5; }
        50%  { top: 70%; left: calc(100% + 0px); opacity: 0.7; }
        100% { top: 30%; left: -2px; opacity: 0.5; }
      }
    `}</style>
  )
}
