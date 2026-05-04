import { useState, useEffect, useRef, useCallback } from 'react';

import AIR5_VIDEO from '../assets/COVER AIR5/AIR-V1.mp4';
import RAP_VIDEO from '../assets/COVER RAP/RAP-V1.mp4';
import AIR5_1 from '../assets/COVER AIR5/AIR5-01.png';
import AIR5_2 from '../assets/COVER AIR5/AIR5-02.png';
import AIR5_3 from '../assets/COVER AIR5/AIR5-03.png';
import AIR5_4 from '../assets/COVER AIR5/AIR5-04.png';
import AIR5_5 from '../assets/COVER AIR5/AIR5-05.png';
import RAP_1 from '../assets/COVER RAP/RAP-01.jpeg';
import RAP_2 from '../assets/COVER RAP/RAP-02.jpeg';
import RAP_3 from '../assets/COVER RAP/RAP-03.jpeg';

type Slide = { type: 'video'; src: string } | { type: 'image'; src: string };

const AIR5_SLIDES: Slide[] = [
  { type: 'video', src: AIR5_VIDEO },
  { type: 'image', src: AIR5_1 },
  { type: 'image', src: AIR5_2 },
  { type: 'image', src: AIR5_3 },
  { type: 'image', src: AIR5_4 },
  { type: 'image', src: AIR5_5 },
];

const RAP_SLIDES: Slide[] = [
  { type: 'video', src: RAP_VIDEO },
  { type: 'image', src: RAP_1 },
  { type: 'image', src: RAP_2 },
  { type: 'image', src: RAP_3 },
];

const AIR5_CTA_URL: string | null = null;
const RAP_CTA_URL: string | null = null;

const MOBILE_BP = 640;
const CHOSEN_THRESHOLD = 0.64;
const SLIDE_MS = 2500;

const AIR5_TEXT = `« AIR 5 : LE MYTHE EN PIXELS.

36 PAGES D'HISTOIRE,
UNE PALETTE INFINIE SOUS LES DOIGTS.

SUR CE CIRCUIT INTERACTIF,
PLACEZ CLICS ET NUANCES,
EN REVISITANT L'ICÔNE.

DU CHÂSSIS CLASSIQUE
AU DESIGN NUMÉRIQUE.

CLIQUEZ, REDÉMARREZ, COLORIEZ ! »`;

const RAP_TEXT = `« LE FLOW DEVIENT DIGITAL,
LA RIME PREND DES COULEURS.

SUR CES 4 MESURES INTERACTIVES,
PLACEZ CLICS ET NUANCES,
EN EXPLORANT VOS GAMMES VIRTUELLES.

DU MULTISYLLABIQUE
AU TACTILE MAGIQUE.

CLIQUEZ, SWIPEZ, COLORIEZ ! »`;

interface LandingPageProps {
  onEnter: (edition: 'air5' | 'rap') => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  const [divider, setDivider] = useState(0.5);
  const targetDivider = useRef(0.5);
  const currentDivider = useRef(0.5);
  const animRef = useRef<number | undefined>(undefined);

  const [vpW, setVpW] = useState(() => window.innerWidth);
  const [vpH, setVpH] = useState(() => window.innerHeight);

  const isMobile = vpW < MOBILE_BP;

  const [air5Slide, setAir5Slide] = useState(0);
  const [rapSlide, setRapSlide] = useState(0);
  const air5TimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rapTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'landing-slide-anim';
    style.textContent = '@keyframes slidefade{from{opacity:0}to{opacity:1}}.slide-img{animation:slidefade 0.55s ease forwards}';
    document.head.appendChild(style);
    return () => { document.getElementById('landing-slide-anim')?.remove(); };
  }, []);

  useEffect(() => {
    const update = () => { setVpW(window.innerWidth); setVpH(window.innerHeight); };
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const tick = () => {
      const cur = currentDivider.current;
      const next = cur + (targetDivider.current - cur) * 0.072;
      if (Math.abs(next - cur) > 0.0003) {
        currentDivider.current = next;
        setDivider(next);
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current !== undefined) cancelAnimationFrame(animRef.current); };
  }, []);

  const air5Chosen = divider >= CHOSEN_THRESHOLD;
  useEffect(() => {
    clearTimeout(air5TimerRef.current);
    if (!air5Chosen) { setAir5Slide(0); return; }
    // Only set timer for image slides; video advances via onEnded
    if (AIR5_SLIDES[air5Slide % AIR5_SLIDES.length].type === 'image') {
      air5TimerRef.current = setTimeout(() => {
        setAir5Slide(s => (s + 1) % AIR5_SLIDES.length);
      }, SLIDE_MS);
    }
    return () => clearTimeout(air5TimerRef.current);
  }, [air5Chosen, air5Slide]);

  const rapChosen = divider <= (1 - CHOSEN_THRESHOLD);
  useEffect(() => {
    clearTimeout(rapTimerRef.current);
    if (!rapChosen) { setRapSlide(0); return; }
    if (RAP_SLIDES[rapSlide % RAP_SLIDES.length].type === 'image') {
      rapTimerRef.current = setTimeout(() => {
        setRapSlide(s => (s + 1) % RAP_SLIDES.length);
      }, SLIDE_MS);
    }
    return () => clearTimeout(rapTimerRef.current);
  }, [rapChosen, rapSlide]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mobile = rect.width < MOBILE_BP;
    const raw = mobile
      ? 1 - (e.clientY - rect.top) / rect.height
      : 1 - (e.clientX - rect.left) / rect.width;
    targetDivider.current = Math.max(0.32, Math.min(0.68, raw));
  }, []);

  const handleMouseLeave = useCallback(() => {
    targetDivider.current = 0.5;
  }, []);

  const handleCta = useCallback((edition: 'air5' | 'rap') => {
    const url = edition === 'air5' ? AIR5_CTA_URL : RAP_CTA_URL;
    if (url) window.location.href = url;
    else onEnter(edition);
  }, [onEnter]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mobile = rect.width < MOBILE_BP;
    if (mobile) {
      const y = e.touches[0].clientY - rect.top;
      targetDivider.current = y / rect.height < 0.5 ? 0.68 : 0.32;
    } else {
      const x = e.touches[0].clientX - rect.left;
      targetDivider.current = x / rect.width < 0.5 ? 0.68 : 0.32;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {}, []);

  // ── Derived geometry ──

  // Desktop: vertical diagonal (X-axis)
  const midX = divider * vpW;
  const diagOffset = Math.round(Math.min(vpH / (2 * Math.tan(65 * Math.PI / 180)), vpW * 0.20));
  const lineX1 = midX + diagOffset; // top edge X
  const lineX2 = midX - diagOffset; // bottom edge X

  // Mobile: horizontal diagonal (Y-axis), AIR5 = top, RAP = bottom
  const midY = divider * vpH;
  const diagOffsetH = Math.round(Math.min(vpW / (2 * Math.tan(65 * Math.PI / 180)), vpH * 0.15));
  const lineYL = midY - diagOffsetH; // left-edge Y
  const lineYR = midY + diagOffsetH; // right-edge Y

  const air5Clip = isMobile
    ? `polygon(0px 0px, ${vpW}px 0px, ${vpW}px ${lineYR}px, 0px ${lineYL}px)`
    : `polygon(0px 0px, ${lineX1}px 0px, ${lineX2}px ${vpH}px, 0px ${vpH}px)`;
  const rapClip = isMobile
    ? `polygon(0px ${lineYL}px, ${vpW}px ${lineYR}px, ${vpW}px ${vpH}px, 0px ${vpH}px)`
    : `polygon(${lineX1}px 0px, ${vpW}px 0px, ${vpW}px ${vpH}px, ${lineX2}px ${vpH}px)`;

  // Image opacity: 50% at rest → 100% active, 25% inactive
  const air5ImgAlpha = Math.max(0.25, Math.min(1, 0.5 + (divider - 0.5) * 5));
  const rapImgAlpha  = Math.max(0.25, Math.min(1, 0.5 + (0.5 - divider) * 5));

  // Content alpha: text + CTA — reaches 100% at ~1/3 of travel from center
  const air5ContentAlpha = Math.max(0, Math.min(1, (divider - 0.5) * 14));
  const rapContentAlpha  = Math.max(0, Math.min(1, (0.5 - divider) * 14));

  // Dynamic gradient: 0 at rest, rises only on the INACTIVE side
  const air5GradAlpha = Math.max(0, Math.min(1, (0.5 - divider) * 5.5));
  const rapGradAlpha  = Math.max(0, Math.min(1, (divider - 0.5) * 5.5));

  // Title scale
  const air5TitleScale = Math.max(0.82, Math.min(1.18, 0.82 + (divider - 0.32) * 1.0));
  const rapTitleScale  = Math.max(0.82, Math.min(1.18, 0.82 + ((1 - divider) - 0.32) * 1.0));

  // Hint opacity: 1 at rest (divider = 0.5), fades out as interaction grows
  const hintAlpha = Math.max(0, 1 - Math.abs(divider - 0.5) * 10);

  // Parallax shift
  const air5ShiftX = (divider - 0.5) * 32;
  const rapShiftX  = (0.5 - divider) * 32;

  // ── Shared styles ──

  const infoBlock: React.CSSProperties = {
    background: 'white',
    border: '2px solid #0a0a0a',
    padding: '0.9rem 1.1rem',
    maxWidth: 'min(380px, 75vw)',
  };

  const ctaBtn: React.CSSProperties = {
    background: '#0a0a0a', color: 'white',
    border: '2px solid #0a0a0a',
    padding: '0.75rem 1.4rem',
    fontFamily: 'var(--font-family)',
    fontSize: '0.65rem', fontWeight: 800,
    letterSpacing: '0.14em', textTransform: 'uppercase' as const,
    cursor: 'pointer', marginTop: '0.75rem',
    display: 'flex', alignItems: 'center', gap: '0.5rem',
  };

  const textStyle: React.CSSProperties = {
    fontSize: 'clamp(0.52rem, 0.78vw, 0.65rem)',
    fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase', lineHeight: 1.9,
    whiteSpace: 'pre-line', color: '#0a0a0a',
    margin: 0,
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="main"
      aria-label="Choisissez votre édition de coloriage"
      style={{
        position: 'fixed', inset: 0,
        background: '#0a0a0a',
        overflow: 'hidden',
        fontFamily: 'var(--font-family)',
        userSelect: 'none',
      }}
    >
      {/* ══ PANNEAU AIR 5 (gauche / haut mobile) ══ */}
      <div style={{ position: 'absolute', inset: 0, clipPath: air5Clip }}>
        <div style={{ position: 'absolute', inset: 0, opacity: air5ImgAlpha, transition: 'none' }}>
          {/* Cover statique (toujours visible en fond) */}
          <img
            src={AIR5_SLIDES[1].src}
            alt="" aria-hidden="true"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              transform: `translateX(${air5ShiftX}px) scale(1.02)`,
              pointerEvents: 'none',
            }}
          />
          {/* Slideshow actif quand chosen */}
          {air5Chosen && (() => {
            const slide = AIR5_SLIDES[air5Slide % AIR5_SLIDES.length];
            return slide.type === 'video' ? (
              <video
                key={`air5-${air5Slide}`}
                autoPlay muted playsInline
                className="slide-img"
                onEnded={() => setAir5Slide(s => (s + 1) % AIR5_SLIDES.length)}
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', objectPosition: 'center',
                  transform: `translateX(${air5ShiftX}px) scale(1.02)`,
                  pointerEvents: 'none',
                }}
              >
                <source src={slide.src} type="video/mp4" />
              </video>
            ) : (
              <img
                key={`air5-${air5Slide}`}
                src={slide.src}
                alt="" aria-hidden="true"
                className="slide-img"
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', objectPosition: 'center',
                  transform: `translateX(${air5ShiftX}px) scale(1.02)`,
                  pointerEvents: 'none',
                }}
              />
            );
          })()}
        </div>
        {/* Gradient only when AIR5 is the inactive side */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.90) 100%)',
          opacity: air5GradAlpha,
          zIndex: 1, pointerEvents: 'none',
        }} />
        {/* Titre AIR 5 */}
        <div style={{
          position: 'absolute', top: '2.5rem', left: '2.5rem', zIndex: 3,
          color: 'white', pointerEvents: 'none',
          transform: `scale(${air5TitleScale})`, transformOrigin: 'left top',
          transition: 'transform 0.35s ease',
        }}>
          <span style={{ display: 'block', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55, marginBottom: '0.3rem' }}>
            Édition
          </span>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase', lineHeight: 0.95, color: 'white', margin: 0 }}>
            AIR 5
          </h2>
        </div>
      </div>

      {/* ══ PANNEAU RAP (droite / bas mobile) ══ */}
      <div style={{ position: 'absolute', inset: 0, clipPath: rapClip }}>
        <div style={{ position: 'absolute', inset: 0, opacity: rapImgAlpha, transition: 'none' }}>
          {/* Cover statique (toujours visible en fond) */}
          <img
            src={RAP_SLIDES[1].src}
            alt="" aria-hidden="true"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              transform: `translateX(${rapShiftX}px) scale(1.02)`,
              pointerEvents: 'none',
            }}
          />
          {/* Slideshow actif quand chosen */}
          {rapChosen && (() => {
            const slide = RAP_SLIDES[rapSlide % RAP_SLIDES.length];
            return slide.type === 'video' ? (
              <video
                key={`rap-${rapSlide}`}
                autoPlay muted playsInline
                className="slide-img"
                onEnded={() => setRapSlide(s => (s + 1) % RAP_SLIDES.length)}
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', objectPosition: 'center',
                  transform: `translateX(${rapShiftX}px) scale(1.02)`,
                  pointerEvents: 'none',
                }}
              >
                <source src={slide.src} type="video/mp4" />
              </video>
            ) : (
              <img
                key={`rap-${rapSlide}`}
                src={slide.src}
                alt="" aria-hidden="true"
                className="slide-img"
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', objectPosition: 'center',
                  transform: `translateX(${rapShiftX}px) scale(1.02)`,
                  pointerEvents: 'none',
                }}
              />
            );
          })()}
        </div>
        {/* Gradient only when RAP is the inactive side */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.90) 100%)',
          opacity: rapGradAlpha,
          zIndex: 1, pointerEvents: 'none',
        }} />
        {/* Titre RAP — bas-gauche sur mobile, haut-droite sur desktop */}
        <div style={{
          position: 'absolute',
          ...(isMobile
            ? { bottom: '2.5rem', left: '2.5rem', transformOrigin: 'left bottom', textAlign: 'left' as const }
            : { top: '2.5rem', right: '2.5rem', transformOrigin: 'right top', textAlign: 'right' as const }
          ),
          zIndex: 3,
          color: 'white',
          pointerEvents: 'none',
          transform: `scale(${rapTitleScale})`,
          transition: 'transform 0.35s ease',
        }}>
          <span style={{ display: 'block', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55, marginBottom: '0.3rem' }}>
            Édition
          </span>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase', lineHeight: 0.95, color: 'white', margin: 0 }}>
            RAP
          </h2>
        </div>
      </div>

      {/* ══ BLOC TEXTE + CTA AIR 5 — zIndex 15, toujours au-dessus de la séparation ══ */}
      <div style={{
        position: 'absolute',
        left: '2.5rem',
        ...(isMobile
          ? { top: '6rem' }
          : { top: '50%', transform: `translateY(calc(-50% + ${(1 - air5ContentAlpha) * -14}px))` }
        ),
        zIndex: 15,
        opacity: air5ContentAlpha,
        transition: 'none',
        pointerEvents: air5ContentAlpha > 0.4 ? 'auto' : 'none',
      }}>
        <div style={infoBlock}>
          <p style={textStyle}>{AIR5_TEXT}</p>
          <button
            onClick={() => handleCta('air5')}
            tabIndex={air5ContentAlpha > 0.4 ? 0 : -1}
            aria-label="Ouvrir l'édition AIR 5"
            style={ctaBtn}
          >
            COLORIER AIR 5 <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      {/* ══ BLOC TEXTE + CTA RAP — zIndex 15, toujours au-dessus de la séparation ══ */}
      <div style={{
        position: 'absolute',
        right: '2.5rem',
        ...(isMobile
          ? { bottom: '6rem' }
          : { top: '50%', transform: `translateY(calc(-50% + ${(1 - rapContentAlpha) * 14}px))` }
        ),
        zIndex: 15,
        opacity: rapContentAlpha,
        transition: 'none',
        pointerEvents: rapContentAlpha > 0.4 ? 'auto' : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
      }}>
        <div style={{ ...infoBlock, textAlign: 'right' }}>
          <p style={textStyle}>{RAP_TEXT}</p>
          <button
            onClick={() => handleCta('rap')}
            tabIndex={rapContentAlpha > 0.4 ? 0 : -1}
            aria-label="Ouvrir l'édition RAP"
            style={{ ...ctaBtn, marginLeft: 'auto' }}
          >
            <span aria-hidden="true">←</span> COLORIER RAP
          </button>
        </div>
      </div>

      {/* ══ LIGNE DE SÉPARATION ══ */}
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none', overflow: 'visible' }}
      >
        {isMobile ? (
          <line
            x1={0} y1={lineYL}
            x2={vpW} y2={lineYR}
            stroke={`rgba(255,255,255,${0.18 + hintAlpha * 0.45})`}
            strokeWidth="1"
          />
        ) : (
          <line
            x1={lineX1} y1={0}
            x2={lineX2} y2={vpH}
            stroke={`rgba(255,255,255,${0.18 + hintAlpha * 0.45})`}
            strokeWidth="1"
          />
        )}
      </svg>

      {/* ══ HINT CENTRAL ══ */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: isMobile ? `${divider * 100}%` : '50%',
          left: isMobile ? '50%' : `${divider * 100}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: 20, pointerEvents: 'none',
          color: 'white', textAlign: 'center',
          opacity: hintAlpha,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.7 }}>
          {isMobile ? '↑ DÉPLACEZ ↓' : '← DÉPLACEZ →'}
        </span>
      </div>
    </div>
  );
}
