import { useEffect, useRef, useState, useCallback } from 'react';
import {
  DEFAULT_COLOR, DEFAULT_LINE_WIDTH, DEFAULT_OPACITY,
  DEFAULT_ERASER_WIDTH, DEFAULT_ERASER_OPACITY,
  ZOOM_SENSITIVITY, ZOOM_MIN, ZOOM_MAX,
  ZOOM_STEP_FACTOR, ZOOM_BY_MIN, ZOOM_BY_MAX,
  MAX_HISTORY_STEPS,
} from '../constants';

export type Tool = 'brush' | 'eraser' | 'hand';
export type BrushType = 'solid' | 'marker' | 'pinceau' | 'neon' | 'spray';

export type Point = { x: number; y: number };

interface UseDrawProps {
    onDraw: (ctx: CanvasRenderingContext2D, point: Point, prevPoint: Point | null) => void;
}

export const useDraw = ({ onDraw }: UseDrawProps) => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<Tool>('brush');
    const [brushType, setBrushType] = useState<BrushType>('solid');
    const [color, setColor] = useState(DEFAULT_COLOR);
    const [lineWidth, setLineWidth] = useState(DEFAULT_LINE_WIDTH);
    const [opacity, setOpacity] = useState(DEFAULT_OPACITY);
    const [eraserWidth, setEraserWidth] = useState(DEFAULT_ERASER_WIDTH);
    const [eraserOpacity, setEraserOpacity] = useState(DEFAULT_ERASER_OPACITY);
    const [scale, setScale] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [isSpacePanning, setIsSpacePanning] = useState(false);

    // Undo/Redo states
    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyStep, setHistoryStep] = useState(-1);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const prevPoint = useRef<Point | null>(null);
    const lastPanPoint = useRef<{ x: number, y: number } | null>(null);

    // Pinch-to-zoom state
    const initialPinchDistance = useRef<number | null>(null);
    const initialScale = useRef<number>(1);
    const initialPanOffset = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

    // Initial setup for wheel zoom
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const screenWrapper = canvas.closest('.canvas-wrapper');
            if (!screenWrapper) return;
            const rect = screenWrapper.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const delta = -e.deltaY * ZOOM_SENSITIVITY;

            setScale(s => {
                let newScale = s * Math.exp(delta);
                if (newScale < ZOOM_MIN) newScale = ZOOM_MIN;
                if (newScale > ZOOM_MAX) newScale = ZOOM_MAX;

                const ratio = newScale / s;
                setPanOffset(p => ({
                    x: mouseX - (mouseX - p.x) * ratio,
                    y: mouseY - (mouseY - p.y) * ratio
                }));

                return newScale;
            });
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                setIsSpacePanning(true);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') setIsSpacePanning(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        canvas.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            canvas.removeEventListener('wheel', handleWheel);
        };
    }, []);

    const saveHistory = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            setHistory(prev => {
                const newHistory = prev.slice(0, historyStep + 1);
                newHistory.push(imageData);
                // Cap history to avoid excessive memory usage
                if (newHistory.length > MAX_HISTORY_STEPS) {
                    newHistory.shift();
                }
                return newHistory;
            });
            setHistoryStep(prev => {
                const newLen = Math.min(prev + 2, MAX_HISTORY_STEPS);
                return newLen - 1;
            });
        } catch {
            // Canvas may be tainted or too large — skip history save
        }
    }, [historyStep]);

    const undo = useCallback(() => {
        if (historyStep > 0) {
            const step = historyStep - 1;
            setHistoryStep(step);
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx && history[step]) {
                try {
                    ctx.putImageData(history[step], 0, 0);
                } catch {
                    // putImageData can fail on tainted canvas
                }
            }
        }
    }, [historyStep, history]);

    const redo = useCallback(() => {
        if (historyStep < history.length - 1) {
            const step = historyStep + 1;
            setHistoryStep(step);
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx && history[step]) {
                try {
                    ctx.putImageData(history[step], 0, 0);
                } catch {
                    // putImageData can fail on tainted canvas
                }
            }
        }
    }, [historyStep, history]);

    const clear = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        saveHistory();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, [saveHistory]);

    const zoomBy = useCallback((factor: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const screenWrapper = canvas.closest('.canvas-wrapper');
        if (!screenWrapper) return;

        const rect = screenWrapper.getBoundingClientRect();

        setScale(s => {
            let newScale = s * factor;
            if (newScale < ZOOM_BY_MIN) newScale = ZOOM_BY_MIN;
            if (newScale > ZOOM_BY_MAX) newScale = ZOOM_BY_MAX;

            // Always re-center the image in the viewport after zoom
            setPanOffset({
                x: (rect.width - canvas.width * newScale) / 2,
                y: (rect.height - canvas.height * newScale) / 2
            });

            return newScale;
        });
    }, []);

    const zoomIn = useCallback(() => zoomBy(ZOOM_STEP_FACTOR), [zoomBy]);
    const zoomOut = useCallback(() => zoomBy(1 / ZOOM_STEP_FACTOR), [zoomBy]);

    const computePointInCanvas = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();

        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }, []);

    const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
        return Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
    };

    const getCenter = (touch1: React.Touch, touch2: React.Touch) => {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    };

    const onInteractStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e && e.touches.length === 2) {
            e.preventDefault();
            const dist = getDistance(e.touches[0], e.touches[1]);
            initialPinchDistance.current = dist;
            initialScale.current = scale;
            initialPanOffset.current = { ...panOffset };

            const center = getCenter(e.touches[0], e.touches[1]);
            lastPanPoint.current = center;
            setIsPanning(true);
            return;
        }

        if (tool === 'hand' || isSpacePanning) {
            setIsPanning(true);
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
            lastPanPoint.current = { x: clientX, y: clientY };
            return;
        }

        const point = computePointInCanvas(e);
        if (!point || !canvasRef.current || ('touches' in e && e.touches.length > 1)) return;

        setIsDrawing(true);
        prevPoint.current = point;
    }, [tool, isSpacePanning, scale, panOffset, computePointInCanvas]);

    const onInteractMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e && e.touches.length === 2 && initialPinchDistance.current !== null) {
            e.preventDefault();

            const currentDist = getDistance(e.touches[0], e.touches[1]);
            const scaleFactor = currentDist / initialPinchDistance.current;
            let newScale = initialScale.current * scaleFactor;

            if (newScale < ZOOM_MIN) newScale = ZOOM_MIN;
            if (newScale > ZOOM_MAX) newScale = ZOOM_MAX;

            const center = getCenter(e.touches[0], e.touches[1]);
            const canvas = canvasRef.current;
            const screenWrapper = canvas?.closest('.canvas-wrapper');

            let pX = initialPanOffset.current.x;
            let pY = initialPanOffset.current.y;

            if (screenWrapper && lastPanPoint.current) {
               const rect = screenWrapper.getBoundingClientRect();
               const mouseX = center.x - rect.left;
               const mouseY = center.y - rect.top;

               const ratio = newScale / initialScale.current;

               const translationDx = center.x - lastPanPoint.current.x;
               const translationDy = center.y - lastPanPoint.current.y;

               pX = mouseX - (mouseX - initialPanOffset.current.x) * ratio;
               pY = mouseY - (mouseY - initialPanOffset.current.y) * ratio;

               pX += translationDx;
               pY += translationDy;
            }

            setScale(newScale);
            setPanOffset({ x: pX, y: pY });
            return;
        }

        if ((tool === 'hand' || isSpacePanning) && isPanning && lastPanPoint.current) {
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
            const dx = clientX - lastPanPoint.current.x;
            const dy = clientY - lastPanPoint.current.y;
            setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            lastPanPoint.current = { x: clientX, y: clientY };
            return;
        }

        if (!isDrawing) return;
        const point = computePointInCanvas(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (!point || !ctx) return;

        onDraw(ctx, point, prevPoint.current);
        prevPoint.current = point;
    }, [tool, isSpacePanning, isPanning, isDrawing, onDraw, computePointInCanvas]);

    const onInteractEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e && e.touches.length < 2) {
             initialPinchDistance.current = null;
        }

        if (tool === 'hand' || isSpacePanning || isPanning) {
            if ('touches' in e && e.touches.length > 0) {
               setIsDrawing(false);
               prevPoint.current = null;
            } else {
               setIsPanning(false);
            }
            lastPanPoint.current = null;

            if ('touches' in e && e.touches.length > 0) {
                return;
            }
        }

        if (isDrawing) {
            setIsDrawing(false);
            prevPoint.current = null;
            saveHistory();
        }
    }, [tool, isSpacePanning, isPanning, isDrawing, saveHistory]);

    const resetZoom = useCallback(() => {
        const canvas = canvasRef.current;
        const screenWrapper = canvas?.closest('.canvas-wrapper');
        if (!canvas || !screenWrapper || canvas.width === 0) return;
        const rect = screenWrapper.getBoundingClientRect();
        const hRatio = rect.width / canvas.width;
        const vRatio = rect.height / canvas.height;
        const ratio = Math.min(hRatio, vRatio);

        setScale(ratio);
        setPanOffset({
            x: (rect.width - canvas.width * ratio) / 2,
            y: (rect.height - canvas.height * ratio) / 2
        });
    }, []);

    return {
        canvasRef,
        onInteractStart,
        onInteractMove,
        onInteractEnd,
        tool,
        setTool,
        brushType,
        setBrushType,
        color,
        setColor,
        lineWidth,
        setLineWidth,
        scale,
        setScale,
        panOffset,
        setPanOffset,
        isSpacePanning,
        zoomIn,
        zoomOut,
        resetZoom,
        clear,
        undo,
        redo,
        saveHistory,
        canUndo: historyStep > 0,
        canRedo: historyStep < history.length - 1,
        opacity,
        setOpacity,
        eraserWidth,
        setEraserWidth,
        eraserOpacity,
        setEraserOpacity,
    };
};
