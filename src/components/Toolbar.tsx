import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import { Pencil, Eraser, Hand, RotateCcw, Maximize, ZoomIn, ZoomOut, Download, MoreHorizontal, Moon, Sun, Eye, Palette, PenTool, Droplet, Sparkles } from 'lucide-react';
import type { Tool, BrushType } from '../hooks/useDraw';
import { ToolButton, ColorSelector, BrushSettings } from './ToolbarComponents';
import { RangeSlider } from './RangeSlider';
import { BRUSH_WIDTH_MIN, BRUSH_WIDTH_MAX, OPACITY_MIN, OPACITY_MAX, CUSTOM_COLORS_KEY } from '../constants';

// --- COLOR UTILS & CONSTANTS ---
const PALETTE_ESSENTIEL = { name: 'Essentiel', colors: ['#FF0000', '#000000', '#FFFFFF', '#808080', '#CCCCCC', '#D3D3D3', '#FFD700', '#FFA500', '#00FF00', '#0000FF', '#800080', '#A52A2A'] };

const AIR5_PALETTES = [
    PALETTE_ESSENTIEL,
    { name: 'Classique', colors: ['#D32F2F', '#1565C0', '#2E7D32', '#90A4AE', '#E65100', '#F9A825', '#4A148C', '#37474F', '#BF360C', '#1B5E20', '#CFD8DC', '#FFF8E1'] },
    { name: 'Circuit',   colors: ['#E8002D', '#FFD700', '#00D2BE', '#FF8700', '#1E1E1E', '#6E6E6E', '#0047AB', '#FF4500', '#005B35', '#C0C0C0', '#FFFFFF', '#FFA500'] },
    { name: 'Rétro',     colors: ['#1A237E', '#B71C1C', '#C0A050', '#F5F0E8', '#4E342E', '#607D8B', '#78909C', '#558B2F', '#6D4C41', '#BCAAA4', '#FFF9C4', '#212121'] },
];

const RAP_PALETTES = [
    PALETTE_ESSENTIEL,
    { name: 'Hip-Hop',   colors: ['#7B1FA2', '#1565C0', '#00C853', '#FFD600', '#FF6D00', '#546E7A', '#000000', '#FFFFFF', '#D50000', '#0091EA', '#FFD700', '#00BFA5'] },
    { name: 'Old School',colors: ['#000000', '#FFFFFF', '#795548', '#1565C0', '#D32F2F', '#E65100', '#6A1B9A', '#2E7D32', '#212121', '#F9A825', '#9E9E9E', '#A1887F'] },
    { name: 'Vinyle',    colors: ['#121212', '#B0B0B0', '#F5F0DC', '#C62828', '#5D4037', '#455A64', '#FFD54F', '#1565C0', '#388E3C', '#6A1B9A', '#F5F5F5', '#8D6E63'] },
];

const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const ll = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l: Math.round(ll * 100) };
    const d = max - min;
    const ss = ll > 0.5 ? d / (2 - max - min) : d / (max + min);
    let hh = 0;
    if (max === r) hh = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) hh = ((b - r) / d + 2) / 6;
    else hh = ((r - g) / d + 4) / 6;
    return { h: Math.round(hh * 360), s: Math.round(ss * 100), l: Math.round(ll * 100) };
};

const BRUSH_OPTIONS: { type: BrushType; icon: React.ReactNode; label: string }[] = [
    { type: 'solid',  icon: <Pencil size={16} />,   label: 'Solide' },
    { type: 'marker', icon: <PenTool size={16} />,  label: 'Marqueur' },
    { type: 'pinceau',icon: <Droplet size={16} />,  label: 'Aquarelle' },
    { type: 'neon',   icon: <Sparkles size={16} />, label: 'Néon' },
];

interface ToolbarProps {
    tool: Tool;
    setTool: (t: Tool) => void;
    undo: () => void;
    canUndo: boolean;
    resetZoom?: () => void;
    zoomIn?: () => void;
    zoomOut?: () => void;
    onExport?: () => void;
    isDark?: boolean;
    toggleDark?: () => void;
    isColorBlind?: boolean;
    toggleColorBlind?: () => void;
    edition?: 'air5' | 'rap' | null;

    color: string;
    setColor: (c: string) => void;
    lineWidth: number;
    setLineWidth: (w: number) => void;
    brushType: BrushType;
    setBrushType: (b: BrushType) => void;
    opacity: number;
    setOpacity: (o: number) => void;
    eraserWidth: number;
    setEraserWidth: (w: number) => void;
    eraserOpacity: number;
    setEraserOpacity: (o: number) => void;
}

export const Toolbar: React.FC<ToolbarProps> = React.memo(({
    tool, setTool, undo, canUndo,
    resetZoom, zoomIn, zoomOut, onExport,
    isDark = false, toggleDark,
    isColorBlind = false, toggleColorBlind,
    edition = null,
    color, setColor, lineWidth, setLineWidth,
    brushType, setBrushType, opacity, setOpacity,
    eraserWidth, setEraserWidth, eraserOpacity, setEraserOpacity
}) => {
    const PRESET_PALETTES = edition === 'rap' ? RAP_PALETTES : AIR5_PALETTES;

    const [activeMenu, setActiveMenu] = useState<'none' | 'more' | 'brush' | 'color' | 'eraser'>('none');

    const [hsl, setHsl] = useState(() => hexToHsl(color));
    const prevColorRef = useRef(color);

    if (prevColorRef.current !== color) {
        prevColorRef.current = color;
        setHsl(hexToHsl(color));
    }

    const [activePalette, setActivePalette] = useState(PRESET_PALETTES[0]);
    const [customColors, setCustomColors] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem(CUSTOM_COLORS_KEY) || '[]'); } catch { return []; }
    });

    useEffect(() => {
        try {
            localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(customColors));
        } catch {
            // localStorage may be full or unavailable
        }
    }, [customColors]);

    const handleHslChange = useCallback((newH: number, newS: number, newL: number) => {
        setHsl({ h: newH, s: newS, l: newL });
        setColor(hslToHex(newH, newS, newL));
    }, [setColor]);

    const addCustomColor = useCallback(() => {
        const hex = hslToHex(hsl.h, hsl.s, hsl.l);
        if (!customColors.includes(hex)) {
            setCustomColors(prev => [...prev, hex]);
        }
    }, [hsl, customColors]);

    const toggleMenu = useCallback((menu: 'more' | 'brush' | 'color' | 'eraser') => {
        setActiveMenu(prev => prev === menu ? 'none' : menu);
    }, []);

    const toolbarRef = useRef<HTMLDivElement>(null);
    const [toolbarWidth, setToolbarWidth] = useState<number | null>(null);

    useLayoutEffect(() => {
        if (!toolbarRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setToolbarWidth((entry.target as HTMLElement).offsetWidth);
            }
        });
        observer.observe(toolbarRef.current);
        return () => observer.disconnect();
    }, []);

    const panelStyle: React.CSSProperties = useMemo(() => ({
        position: 'fixed',
        bottom: '5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        width: toolbarWidth ? `${toolbarWidth}px` : 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        zIndex: 500,
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto'
    }), [toolbarWidth]);

    // Keyboard navigation for tools
    const handleToolbarKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'b': setTool('brush'); break;
            case 'e': setTool('eraser'); break;
            case 'h': setTool('hand'); setActiveMenu('none'); break;
            case 'z':
                if ((e.ctrlKey || e.metaKey) && canUndo) undo();
                break;
        }
    }, [setTool, undo, canUndo]);

    return (
        <>
            {/* ── Main toolbar ── */}
            <div ref={toolbarRef} className="retro-panel toolbar-bottom" role="toolbar" aria-label="Outils de dessin" onKeyDown={handleToolbarKeyDown}>
                <ToolButton active={tool === 'brush'} onClick={() => { setTool('brush'); toggleMenu('brush'); }} title="Crayon & Options (B)" ariaLabel="Crayon et options de pinceau" icon={<Pencil size={20} />} />
                <ToolButton active={(activeMenu === 'color' && tool === 'brush')} onClick={() => { setTool('brush'); toggleMenu('color'); }} title="Couleur (C)" ariaLabel="Sélecteur de couleur" icon={<Palette size={20} color={color} />} />
                <ToolButton active={(activeMenu === 'eraser' || tool === 'eraser')} onClick={() => { setTool('eraser'); toggleMenu('eraser'); }} title="Gomme & Options (E)" ariaLabel="Gomme et options" icon={<Eraser size={20} />} />
                <ToolButton className="tool-btn hide-on-mobile" active={tool === 'hand'} onClick={() => { setTool('hand'); setActiveMenu('none'); }} title="Déplacer (H)" ariaLabel="Outil main pour déplacer" icon={<Hand size={20} />} />

                <div className="divider-v hide-on-mobile" role="separator" />

                <ToolButton onClick={() => undo()} disabled={!canUndo} title="Annuler (Ctrl+Z)" ariaLabel="Annuler la dernière action" icon={<RotateCcw size={20} />} />

                <div className="divider-v" role="separator" />

                {zoomOut && <ToolButton className="tool-btn hide-on-mobile" onClick={() => zoomOut()} title="Zoom arrière" ariaLabel="Zoom arrière" icon={<ZoomOut size={20} />} />}
                {resetZoom && <ToolButton className="tool-btn hide-on-mobile" onClick={() => resetZoom()} title="Recentrer" ariaLabel="Recentrer le canvas" icon={<Maximize size={20} />} />}
                {zoomIn && <ToolButton className="tool-btn hide-on-mobile" onClick={() => zoomIn()} title="Zoom avant" ariaLabel="Zoom avant" icon={<ZoomIn size={20} />} />}

                <div className="divider-v hide-on-mobile" role="separator" />

                <ToolButton active={activeMenu === 'more'} onClick={() => toggleMenu('more')} title="Plus d'options" ariaLabel="Plus d'options" icon={<MoreHorizontal size={20} />} />
            </div>

            {/* ── Panels ── */}
            {activeMenu === 'more' && (
                <div className="retro-panel" style={panelStyle} role="menu" aria-label="Options supplémentaires">
                    {onExport && (
                        <ToolButton onClick={() => onExport()} title="Télécharger" ariaLabel="Télécharger l'image" icon={<Download size={16} />} style={{ width: '100%', justifyContent: 'flex-start', gap: '0.6rem' }}>
                            Télécharger
                        </ToolButton>
                    )}
                    <div className="divider" style={{ margin: '0.25rem 0' }} role="separator" />
                    <ToolButton active={isDark} onClick={() => toggleDark?.()} ariaLabel={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'} icon={isDark ? <Sun size={16} /> : <Moon size={16} />} style={{ width: '100%', justifyContent: 'flex-start', gap: '0.6rem' }}>
                        {isDark ? 'Mode clair' : 'Mode sombre'}
                    </ToolButton>
                    <ToolButton active={isColorBlind} onClick={() => toggleColorBlind?.()} ariaLabel={isColorBlind ? 'Désactiver le mode daltonien' : 'Activer le mode daltonien'} icon={<Eye size={16} />} style={{ width: '100%', justifyContent: 'flex-start', gap: '0.6rem' }}>
                        {isColorBlind ? 'Normale' : 'Daltonisme'}
                    </ToolButton>
                </div>
            )}

            {activeMenu === 'brush' && (
                <div className="retro-panel" style={panelStyle} role="region" aria-label="Options du pinceau">
                    <BrushSettings brushType={brushType} setBrushType={setBrushType} lineWidth={lineWidth} setLineWidth={setLineWidth} opacity={opacity} setOpacity={setOpacity} brushOptions={BRUSH_OPTIONS} />
                </div>
            )}

            {activeMenu === 'color' && (
                <div className="retro-panel" style={panelStyle} role="region" aria-label="Sélecteur de couleur">
                    <ColorSelector color={color} setColor={setColor} addCustomColor={addCustomColor} hsl={hsl} handleHslChange={handleHslChange} activePalette={activePalette} setActivePalette={setActivePalette} presetPalettes={PRESET_PALETTES} customColors={customColors} />
                </div>
            )}

            {activeMenu === 'eraser' && (
                <div className="retro-panel" style={panelStyle} role="region" aria-label="Options de la gomme">
                    <p className="palette-title" style={{ marginBottom: '0.6rem' }}>Options de la gomme</p>
                    <RangeSlider label="Épaisseur" value={eraserWidth} onChange={setEraserWidth} min={BRUSH_WIDTH_MIN} max={BRUSH_WIDTH_MAX} unit="px" ariaLabel="Épaisseur de la gomme" />
                    <RangeSlider label="Opacité" value={eraserOpacity} onChange={setEraserOpacity} min={OPACITY_MIN} max={OPACITY_MAX} unit="%" ariaLabel="Opacité de la gomme" />
                </div>
            )}
        </>
    );
});
