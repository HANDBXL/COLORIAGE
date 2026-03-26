import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useDraw } from '../hooks/useDraw';
import { CANVAS_MIN_RESOLUTION } from '../constants';
import { loadCanvasData, createAutosaver } from '../utils/autosave';

/** 'full' = normal multiply overlay on whole image
 *  'right-half' = multiply overlay only on right 50% (for pages coloured on left)
 *  'none' = no overlay at all
 */
type OverlayMode = 'full' | 'right-half' | 'none';

interface CanvasBoardProps {
    imageSrc?: string;
    drawLogic: ReturnType<typeof useDraw>;
    overlayMode?: OverlayMode;
    pageId: string;
}

export const CanvasBoard: React.FC<CanvasBoardProps> = React.memo(({ imageSrc, drawLogic, overlayMode = 'full', pageId }) => {
    const { canvasRef, onInteractStart, onInteractMove, onInteractEnd } = drawLogic;
    const [intrinsicSize, setIntrinsicSize] = useState({ width: 800, height: 600 });
    const [isImageReady, setIsImageReady] = useState(false);
    const hasInitializedRef = useRef(false);
    const autosaverRef = useRef(createAutosaver(pageId));

    // Update autosaver when pageId changes
    useEffect(() => {
        autosaverRef.current.cancel();
        autosaverRef.current = createAutosaver(pageId);
        return () => autosaverRef.current.cancel();
    }, [pageId]);

    // Trigger autosave after each stroke (when canUndo changes = history updated)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && drawLogic.canUndo) {
            autosaverRef.current.trigger(canvas);
        }
    }, [drawLogic.canUndo, canvasRef]);

    // Initial setup: load image if provided, then attempt to restore autosave
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const wrapper = canvas.parentElement;
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();

        if (imageSrc) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageSrc;
            img.onload = async () => {
                const baseW = img.naturalWidth || img.width || 1000;
                const baseH = img.naturalHeight || img.height || 1000;

                const upScale = Math.max(1, CANVAS_MIN_RESOLUTION / Math.max(baseW, baseH));
                const imgW = Math.round(baseW * upScale);
                const imgH = Math.round(baseH * upScale);

                canvas.width = imgW;
                canvas.height = imgH;
                setIntrinsicSize({ width: imgW, height: imgH });

                // Try to restore autosaved data
                try {
                    const savedBlob = await loadCanvasData(pageId);
                    if (savedBlob) {
                        const savedImg = new Image();
                        const url = URL.createObjectURL(savedBlob);
                        await new Promise<void>((resolve, reject) => {
                            savedImg.onload = () => {
                                ctx.drawImage(savedImg, 0, 0, imgW, imgH);
                                URL.revokeObjectURL(url);
                                resolve();
                            };
                            savedImg.onerror = () => {
                                URL.revokeObjectURL(url);
                                reject();
                            };
                            savedImg.src = url;
                        });
                    } else {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0, imgW, imgH);
                    }
                } catch {
                    // Fallback: draw normally
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, imgW, imgH);
                }

                drawLogic.saveHistory();
                setIsImageReady(true);
            };
        } else {
            canvas.width = rect.width;
            canvas.height = rect.height;
            setIntrinsicSize({ width: rect.width, height: rect.height });

            drawLogic.setScale(1);
            drawLogic.setPanOffset({ x: 0, y: 0 });

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            drawLogic.saveHistory();
            setIsImageReady(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageSrc]); // intentional: don't include drawLogic to avoid infinite loop

    // Robust Initialization: Wait for DOM container layout AND image load before centering
    const resetZoom = drawLogic.resetZoom;
    useEffect(() => {
        if (!isImageReady) return;

        const canvas = canvasRef.current;
        const wrapper = canvas?.parentElement?.parentElement;
        if (!wrapper) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0 && entry.contentRect.height > 0 && !hasInitializedRef.current) {
                    hasInitializedRef.current = true;
                    resetZoom();
                }
            }
        });

        observer.observe(wrapper);
        return () => observer.disconnect();
    }, [isImageReady, resetZoom, canvasRef]);

    const getCursorStyle = useCallback(() => {
        if (drawLogic.tool === 'hand' || drawLogic.isSpacePanning) return 'grab';

        const size = Math.max(4, drawLogic.lineWidth * drawLogic.scale);
        const half = size / 2;

        let fillColor = drawLogic.color;
        let borderColor = '#ffffff';

        if (drawLogic.tool === 'eraser') {
            fillColor = 'rgba(255,255,255,0.5)';
            borderColor = '#000000';
        }

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size + 2}" height="${size + 2}">
            <circle cx="${half + 1}" cy="${half + 1}" r="${half}" fill="${fillColor}" stroke="${borderColor}" stroke-width="1.5" />
        </svg>`;

        try {
            const base64 = btoa(svg);
            return `url(data:image/svg+xml;base64,${base64}) ${half + 1} ${half + 1}, crosshair`;
        } catch {
            return 'crosshair';
        }
    }, [drawLogic.tool, drawLogic.isSpacePanning, drawLogic.lineWidth, drawLogic.scale, drawLogic.color]);

    return (
        <div className="canvas-wrapper" style={{ overflow: 'hidden', position: 'absolute', inset: 0 }} role="application" aria-label="Zone de dessin">
            <div
                className="document-paper"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: intrinsicSize.width,
                    height: intrinsicSize.height,
                    transform: `translate(${drawLogic.panOffset.x}px, ${drawLogic.panOffset.y}px) scale(${drawLogic.scale})`,
                    transformOrigin: '0 0',
                    backgroundColor: '#ffffff'
                }}
            >
                <canvas
                    ref={canvasRef}
                    aria-label="Canvas de coloriage"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        cursor: getCursorStyle()
                    }}
                    onMouseDown={onInteractStart}
                    onMouseMove={onInteractMove}
                    onMouseUp={onInteractEnd}
                    onMouseLeave={onInteractEnd}
                    onTouchStart={onInteractStart}
                    onTouchMove={onInteractMove}
                    onTouchEnd={onInteractEnd}
                    onTouchCancel={onInteractEnd}
                />
                {imageSrc && overlayMode !== 'none' && (
                    <img
                        src={imageSrc}
                        alt="Illustration de coloriage en superposition"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            mixBlendMode: 'multiply',
                            clipPath: overlayMode === 'right-half' ? 'inset(0 0 0 50%)' : undefined,
                        }}
                    />
                )}
            </div>
        </div>
    );
});
