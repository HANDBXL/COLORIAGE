import React from 'react';
import { Plus } from 'lucide-react';
import type { BrushType } from '../hooks/useDraw';
import { RangeSlider } from './RangeSlider';
import { BRUSH_WIDTH_MIN, BRUSH_WIDTH_MAX, OPACITY_MIN, OPACITY_MAX } from '../constants';

interface ToolButtonProps {
    className?: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title?: string;
    icon: React.ReactNode;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    ariaLabel?: string;
}

export const ToolButton: React.FC<ToolButtonProps> = React.memo(({
    className, onClick, active, disabled, title, icon, style, children, ariaLabel,
}) => (
    <button
        className={`${className || 'tool-btn'} ${active ? 'active' : ''}`}
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel || title}
        aria-pressed={active}
        style={{ ...style, opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
        {icon}
        {children}
    </button>
));

interface ColorSelectorProps {
    color: string;
    setColor: (c: string) => void;
    addCustomColor: () => void;
    hsl: { h: number; s: number; l: number };
    handleHslChange: (h: number, s: number, l: number) => void;
    activePalette: { name: string; colors: string[] };
    setActivePalette: (p: { name: string; colors: string[] }) => void;
    presetPalettes: { name: string; colors: string[] }[];
    customColors: string[];
}

export const ColorSelector: React.FC<ColorSelectorProps> = React.memo(({
    color, setColor, addCustomColor, hsl, handleHslChange,
    activePalette, setActivePalette, presetPalettes, customColors
}) => (
    <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{
                width: '36px', height: '36px', flexShrink: 0,
                backgroundColor: color,
                border: '1px solid var(--panel-border)',
                position: 'relative',
            }}>
                <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    aria-label="Choisir une couleur"
                    style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, flex: 1 }}>Couleur active</span>
            <ToolButton onClick={addCustomColor} title="Ajouter au nuancier" ariaLabel="Ajouter la couleur au nuancier personnel" icon={<Plus size={16} />} style={{ width: '36px', height: '36px' }} />
        </div>

        <div style={{ marginBottom: '0.2rem' }}>
            {[
                { label: 'H', val: hsl.h, set: (v: number) => handleHslChange(v, hsl.s, hsl.l), min: 0, max: 360, unit: '°', ariaLabel: 'Teinte' },
                { label: 'S', val: hsl.s, set: (v: number) => handleHslChange(hsl.h, v, hsl.l), min: 0, max: 100, unit: '%', ariaLabel: 'Saturation' },
                { label: 'L', val: hsl.l, set: (v: number) => handleHslChange(hsl.h, hsl.s, v), min: 0, max: 100, unit: '%', ariaLabel: 'Luminosité' },
            ].map(({ label, val, set, min, max, unit, ariaLabel }) => (
                <RangeSlider key={label} label={label} value={val} onChange={set} min={min} max={max} unit={unit} ariaLabel={ariaLabel} />
            ))}
        </div>

        <div className="divider" style={{ margin: '0.5rem 0' }} />

        <div style={{ marginBottom: '0.4rem' }} role="group" aria-label="Palettes de couleurs">
            <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', marginBottom: '0.5rem', paddingBottom: '2px', scrollbarWidth: 'none' }} role="tablist" aria-label="Sélection de palette">
                {presetPalettes.map(p => (
                    <button
                        key={p.name}
                        onClick={() => setActivePalette(p)}
                        className={`theme-btn ${activePalette.name === p.name ? 'active' : ''}`}
                        role="tab"
                        aria-selected={activePalette.name === p.name}
                        style={{ whiteSpace: 'nowrap', fontSize: '0.7rem', padding: '3px 8px' }}
                    >{p.name}</button>
                ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }} role="group" aria-label={`Couleurs de la palette ${activePalette.name}`}>
                {activePalette.colors.map(c => (
                    <button
                        key={c}
                        className={`color-btn ${color === c ? 'active' : ''}`}
                        style={{ backgroundColor: c, width: '28px', height: '28px', flexShrink: 0 }}
                        onClick={() => setColor(c)}
                        title={c}
                        aria-label={`Couleur ${c}`}
                        aria-pressed={color === c}
                    />
                ))}
            </div>
        </div>

        {customColors.length > 0 && (
            <>
                <div className="divider" style={{ margin: '0.5rem 0' }} />
                <p className="palette-title" style={{ marginBottom: '0.4rem', fontSize: '0.65rem' }}>Nuancier personnel</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.2rem' }} role="group" aria-label="Nuancier personnel">
                    {customColors.map(c => (
                        <button
                            key={c}
                            className={`color-btn ${color === c ? 'active' : ''}`}
                            style={{ backgroundColor: c, width: '24px', height: '24px', flexShrink: 0 }}
                            onClick={() => setColor(c)}
                            title={c}
                            aria-label={`Couleur personnalisée ${c}`}
                            aria-pressed={color === c}
                        />
                    ))}
                </div>
            </>
        )}
    </>
));

interface BrushSettingsProps {
    brushType: BrushType;
    setBrushType: (b: BrushType) => void;
    lineWidth: number;
    setLineWidth: (w: number) => void;
    opacity: number;
    setOpacity: (o: number) => void;
    brushOptions: { type: BrushType; icon: React.ReactNode; label: string }[];
}

export const BrushSettings: React.FC<BrushSettingsProps> = React.memo(({
    brushType, setBrushType, lineWidth, setLineWidth, opacity, setOpacity, brushOptions
}) => (
    <>
        <p className="palette-title" style={{ marginBottom: '0.4rem' }}>Forme du trait</p>
        <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.8rem' }} role="group" aria-label="Type de pinceau">
            {brushOptions.map(b => (
                <ToolButton
                    key={b.type}
                    active={brushType === b.type}
                    onClick={() => setBrushType(b.type)}
                    title={b.label}
                    ariaLabel={`Pinceau ${b.label}`}
                    icon={b.icon}
                    style={{ width: '34px', height: '34px', flex: 1 }}
                />
            ))}
        </div>

        <RangeSlider label="Épaisseur" value={lineWidth} onChange={setLineWidth} min={BRUSH_WIDTH_MIN} max={BRUSH_WIDTH_MAX} unit="px" ariaLabel="Épaisseur du trait" />
        <RangeSlider label="Opacité" value={opacity} onChange={setOpacity} min={OPACITY_MIN} max={OPACITY_MAX} unit="%" ariaLabel="Opacité du trait" />
    </>
));
