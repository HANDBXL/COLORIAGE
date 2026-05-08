import { useState, useEffect, useCallback, useRef } from 'react';
import { useDraw } from './hooks/useDraw';
import { CanvasBoard } from './components/CanvasBoard';
import { Toolbar } from './components/Toolbar';
import { LandingPage } from './components/LandingPage';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import {
  ARTIST,
  MARKER_ALPHA_FACTOR, WATERCOLOR_ALPHA_FACTOR, WATERCOLOR_SHADOW_BLUR, NEON_SHADOW_BLUR,
  EXPORT_FONT_SIZE_RATIO, EXPORT_FONT_SIZE_MIN, EXPORT_MARGIN_RATIO, EXPORT_FONT_URL,
} from './constants';

import pagesData from './data/pages.json';
import rapPages from './data/rapPages.json';

// Overlay modes and types
export type OverlayMode = 'full' | 'right-half' | 'none' | 'split';

interface PageData {
  id: string;
  title: string;
  image?: string;
  imageA?: string;
  imageB?: string;
  overlay: OverlayMode;
  url?: string;
  urlA?: string;
  urlB?: string;
}

const PAGES: PageData[] = (pagesData as any[]).map(p => {
  const image = p.image || '';
  const url = new URL(`./assets/illustrations/${image}`, import.meta.url).href;
  const urlA = p.imageA ? new URL(`./assets/illustrations/${p.imageA}`, import.meta.url).href : undefined;
  const urlB = p.imageB ? new URL(`./assets/illustrations/${p.imageB}`, import.meta.url).href : undefined;
  return { ...p, url, urlA, urlB };
});

// Build full URLs for RAP pages
const RAP_PAGES: PageData[] = (rapPages as any[]).map(p => {
  const image = p.image || '';
  const url = image ? new URL(`./assets/illustrations-RAP/${image}`, import.meta.url).href : undefined;
  const urlA = p.imageA ? new URL(`./assets/illustrations-RAP/${p.imageA}`, import.meta.url).href : undefined;
  const urlB = p.imageB ? new URL(`./assets/illustrations-RAP/${p.imageB}`, import.meta.url).href : undefined;
  return { ...p, url, urlA, urlB };
});

// Single Page Editor Instance
function PageEditor({ page, isActive, artist, onToolSelect, isDark, toggleDark, edition }: {
  page: PageData,
  isActive: boolean,
  artist: string,
  onToolSelect?: () => void,
  isDark?: boolean,
  toggleDark?: () => void,
  edition?: 'air5' | 'rap' | null,
}) {
  const strokeDistanceRef = useRef(0);

  const drawLogic = useDraw({
    onDraw: (ctx, point, prevPoint) => {
      if (prevPoint) {
        strokeDistanceRef.current += Math.hypot(point.x - prevPoint.x, point.y - prevPoint.y);
      }

      ctx.beginPath();
      ctx.moveTo(prevPoint?.x || point.x, prevPoint?.y || point.y);
      ctx.lineTo(point.x, point.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Dynamic line width for 'marker' (Brush 2)
      let dynamicWidth = drawLogic.tool === 'eraser' ? drawLogic.eraserWidth : drawLogic.lineWidth;
      if (drawLogic.tool === 'brush' && drawLogic.brushType === 'marker') {
        const progress = Math.min(1, strokeDistanceRef.current / 400); // Thicker over 400px
        dynamicWidth = drawLogic.lineWidth * (0.4 + 0.6 * progress);
      }
      ctx.lineWidth = dynamicWidth;

      if (drawLogic.tool === 'eraser') {
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = drawLogic.eraserOpacity / 100;
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0;
      } else {
        const userAlpha = drawLogic.opacity / 100;
        ctx.strokeStyle = drawLogic.color;
        if (drawLogic.brushType === 'solid') {
          ctx.globalAlpha = userAlpha;
          ctx.globalCompositeOperation = 'source-over';
          ctx.shadowBlur = 0;
        } else if (drawLogic.brushType === 'marker') {
          ctx.globalAlpha = userAlpha * MARKER_ALPHA_FACTOR;
          ctx.globalCompositeOperation = 'multiply';
          ctx.shadowBlur = 0;
        } else if (drawLogic.brushType === 'pinceau') {
          ctx.globalAlpha = userAlpha * WATERCOLOR_ALPHA_FACTOR;
          ctx.globalCompositeOperation = 'source-over';
          ctx.shadowBlur = WATERCOLOR_SHADOW_BLUR;
          ctx.shadowColor = drawLogic.color;
        } else if (drawLogic.brushType === 'neon') {
          ctx.globalAlpha = userAlpha;
          ctx.globalCompositeOperation = 'source-over';
          ctx.shadowBlur = NEON_SHADOW_BLUR;
          ctx.shadowColor = drawLogic.color;
        }
      }
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.globalCompositeOperation = 'source-over';
    }
  });

  useEffect(() => {
    if (!drawLogic.isDrawing) {
      strokeDistanceRef.current = 0;
    }
  }, [drawLogic.isDrawing]);

  const exportCanvas = useCallback(() => {
    const canvas = drawLogic.canvasRef.current;
    if (!canvas) return;

    const doExport = async (overlayImg: HTMLImageElement | null) => {
      try {
        if (!document.fonts.check('bold 16px Roboto')) {
          const font = new FontFace('Roboto', `url(${EXPORT_FONT_URL})`);
          await font.load();
          document.fonts.add(font);
        }
      } catch {
        // Font loading failed — proceed with fallback
      }

      const exportCvs = document.createElement('canvas');
      exportCvs.width = canvas.width;
      exportCvs.height = canvas.height;
      const ctx = exportCvs.getContext('2d');
      if (!ctx) return;

      try {
        ctx.drawImage(canvas, 0, 0);

        if (page.overlay === 'split' && page.urlB) {
          // Mode split: A (overlayImg) à gauche 50% avec multiply
          // B (urlB) à droite 50% avec normal
          const imgB = new Image();
          imgB.crossOrigin = 'anonymous';
          await new Promise((resolve) => {
            imgB.onload = resolve;
            imgB.onerror = resolve;
            imgB.src = page.urlB!;
          });

          const halfW = exportCvs.width / 2;

          // Image A multiply à gauche
          if (overlayImg) {
            ctx.globalCompositeOperation = 'multiply';
            ctx.drawImage(overlayImg, 0, 0, halfW, exportCvs.height);
          }

          // Image B normal à droite
          ctx.globalCompositeOperation = 'source-over';
          if (imgB.complete && imgB.naturalWidth > 0) {
            ctx.drawImage(imgB, halfW, 0, halfW, exportCvs.height);
          }
        } else if (overlayImg) {
          ctx.globalCompositeOperation = 'multiply';
          ctx.drawImage(overlayImg, 0, 0, exportCvs.width, exportCvs.height);
          ctx.globalCompositeOperation = 'source-over';
        }

        const fontSize = Math.max(EXPORT_FONT_SIZE_MIN, Math.round(exportCvs.width * EXPORT_FONT_SIZE_RATIO));
        const margin = Math.round(exportCvs.width * EXPORT_MARGIN_RATIO);
        ctx.font = `bold ${fontSize}px Roboto, sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(255,255,255,0.9)';
        ctx.shadowBlur = 6;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillText(`© ${artist}`, exportCvs.width - margin, exportCvs.height - margin);
        ctx.shadowBlur = 0;

        const url = exportCvs.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `coloriage_${Date.now()}.png`;
        link.href = url;
        link.click();
      } catch {
        // Export failed (canvas tainted or other issue)
      }
    };

    const imageSrc = page.url;
    if (imageSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => doExport(img);
      img.onerror = () => doExport(null);
      img.src = imageSrc;
      if (img.complete) doExport(img);
    } else {
      doExport(null);
    }
  }, [drawLogic.canvasRef, page.url, artist]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      width: '100%',
      height: '100%',
      position: 'absolute',
      inset: 0,
      zIndex: 10
    }}
    role="tabpanel"
    aria-label={`Page de coloriage : ${page.title}`}
    aria-hidden={!isActive}
    >
      <Toolbar
            tool={drawLogic.tool}
            setTool={(t) => { drawLogic.setTool(t); if (t !== 'hand') onToolSelect?.(); }}
            undo={drawLogic.undo}
            canUndo={drawLogic.canUndo}
            resetZoom={drawLogic.resetZoom}
            zoomIn={drawLogic.zoomIn}
            zoomOut={drawLogic.zoomOut}
            onExport={exportCanvas}
            isDark={isDark}
            toggleDark={toggleDark}
            edition={edition}
            color={drawLogic.color}
            setColor={drawLogic.setColor}
            lineWidth={drawLogic.lineWidth}
            setLineWidth={drawLogic.setLineWidth}
            brushType={drawLogic.brushType}
            setBrushType={drawLogic.setBrushType}
            opacity={drawLogic.opacity}
            setOpacity={drawLogic.setOpacity}
            eraserWidth={drawLogic.eraserWidth}
            setEraserWidth={drawLogic.setEraserWidth}
            eraserOpacity={drawLogic.eraserOpacity}
            setEraserOpacity={drawLogic.setEraserOpacity}
      />

      <div className="canvas-container">
        <CanvasBoard
          imageSrc={page.urlA || page.url || ''}
          imageBSrc={page.urlB}
          drawLogic={drawLogic}
          overlayMode={page.overlay}
          pageId={page.id}
        />
      </div>
    </div>
  );
}

export default function App() {
  const [edition, setEdition] = useState<'air5' | 'rap' | null>(null);
  const [showLanding, setShowLanding] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [showNav, setShowNav] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Load appropriate pages based on selected edition
  const pages = edition === 'rap' ? RAP_PAGES : PAGES;

  const handleEnterEdition = useCallback((_edition: 'air5' | 'rap') => {
    setEdition(_edition);
    setShowLanding(false);
    setPageIndex(0);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark', isDark);
  }, [isDark]);

  // Keyboard navigation for pages
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setPageIndex(i => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        setPageIndex(i => Math.min(pages.length - 1, i + 1));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [pages.length]);

  const toggleDark = useCallback(() => setIsDark(v => !v), []);

  if (showLanding) {
    return <LandingPage onEnter={handleEnterEdition} />;
  }

  return (
    <div className="app-container" role="main" aria-label="Application de coloriage">
      {/* ── BACK BUTTON ── */}
      <button
        onClick={() => { setShowLanding(true); setEdition(null); setPageIndex(0); }}
        className="tool-btn"
        aria-label="Retour à l'accueil"
        title="Retour à l'accueil"
        style={{
          position: 'fixed', top: '1.25rem', left: '1.25rem',
          zIndex: 500,
          border: '1px solid var(--panel-border)',
          background: 'var(--panel-bg)',
          cursor: 'pointer',
          height: '36px',
          width: 'auto',
          padding: '0 12px',
          borderRadius: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          color: 'var(--text-secondary)',
          boxShadow: '2px 2px 0 rgba(0,0,0,0.08)',
          fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase',
          transition: 'all 0.2s ease',
        }}
      >
        <ArrowLeft size={16} /> Retour
      </button>

      {/* ── CONSTANT TOGGLE BUTTON ── */}
      <button
        onClick={() => setShowNav(!showNav)}
        className="tool-btn"
        aria-expanded={showNav}
        aria-controls="planches-panel"
        aria-label={showNav ? `Masquer les planches — page actuelle : ${pages[pageIndex].title}` : `Afficher les planches — page actuelle : ${pages[pageIndex].title}`}
        style={{
          position: 'fixed', top: '1.25rem',
          ...(isMobile
            ? { right: '1.25rem' }
            : { left: '50%', transform: 'translateX(-50%)' }
          ),
          zIndex: 500,
          border: '1px solid var(--panel-border)',
          background: 'var(--panel-bg)',
          cursor: 'pointer',
          height: '36px',
          width: 'auto',
          padding: '0 12px',
          borderRadius: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          color: 'var(--text-secondary)',
          boxShadow: '2px 2px 0 rgba(0,0,0,0.08)',
          fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase',
          transition: 'all 0.2s ease',
        }}
        title={showNav ? "Masquer les planches" : "Afficher les planches"}
      >
        {pages[pageIndex].title}
        {showNav ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* ── PLANCHES PANEL ── */}
      <div
        id="planches-panel"
        role="navigation"
        aria-label="Navigation entre les planches"
        style={{
          position: 'fixed', top: '4.5rem', left: 0, right: 0,
          zIndex: 300, display: 'flex', flexDirection: 'column',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s cubic-bezier(0.4,0,0.2,1)',
          transform: showNav ? 'translateY(0)' : 'translateY(-1rem)',
          opacity: showNav ? 1 : 0,
          pointerEvents: showNav ? 'auto' : 'none',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto',
          padding: '0.5rem',
          width: 'fit-content',
          maxWidth: 'calc(100vw - 32px)',
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          boxShadow: '4px 4px 0 rgba(0,0,0,0.08)'
        }}>
          {/* ← Prev */}
          <button
            onClick={() => setPageIndex(i => Math.max(0, i - 1))}
            disabled={pageIndex === 0}
            className="tool-btn"
            aria-label="Page précédente"
            style={{
              flexShrink: 0, width: '36px', height: '36px',
              border: 'none',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: pageIndex === 0 ? 0.3 : 1,
              transition: 'opacity 0.15s', color: 'var(--text-primary)',
              borderRadius: 0,
              marginRight: '0.25rem'
            }}
            title="Page précédente"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Thumbnail strip */}
          <div
            style={{
              display: 'flex', gap: '0.75rem',
              overflowX: 'auto', alignItems: 'center',
              padding: '0.25rem',
              scrollbarWidth: 'none',
              maxWidth: 'calc(100vw - 120px)'
            }}
            role="tablist"
            aria-label="Sélection de page"
          >
            {pages.map((page, i) => (
              <div
                key={page.id}
                onClick={() => setPageIndex(i)}
                role="tab"
                tabIndex={0}
                aria-selected={i === pageIndex}
                aria-label={page.title}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPageIndex(i);
                  }
                }}
                title={page.title}
                style={{
                  minWidth: '56px', width: '56px', height: '56px',
                  border: i === pageIndex ? '2px solid var(--accent-color)' : '2px solid transparent',
                  borderRadius: 0,
                  cursor: 'pointer',
                  padding: '2px',
                  flexShrink: 0,
                  background: 'transparent',
                  transform: i === pageIndex ? 'translateY(-3px)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex',
                }}>
                  {page.overlay === 'split' && page.urlA && page.urlB ? (
                    <>
                      <div style={{
                        flex: 1,
                        backgroundImage: `url(${page.urlA})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'right',
                        backgroundRepeat: 'no-repeat',
                      }} />
                      <div style={{
                        flex: 1,
                        backgroundImage: `url(${page.urlB})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'left',
                        backgroundRepeat: 'no-repeat',
                      }} />
                    </>
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      backgroundImage: `url(${page.url || page.urlA})`,
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* → Next */}
          <button
            onClick={() => setPageIndex(i => Math.min(pages.length - 1, i + 1))}
            disabled={pageIndex === pages.length - 1}
            className="tool-btn"
            aria-label="Page suivante"
            style={{
              flexShrink: 0, width: '36px', height: '36px',
              border: 'none',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: pageIndex === pages.length - 1 ? 0.3 : 1,
              transition: 'opacity 0.15s', color: 'var(--text-primary)',
              borderRadius: 0,
              marginLeft: '0.25rem'
            }}
            title="Page suivante"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* ── PAGE EDITOR (single active page) ── */}
      <PageEditor
        key={pages[pageIndex].id}
        page={pages[pageIndex]}
        artist={ARTIST}
        isActive={true}
        onToolSelect={() => setShowNav(false)}
        isDark={isDark}
        toggleDark={toggleDark}
        edition={edition}
      />
    </div>
  );
}
