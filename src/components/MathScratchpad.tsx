import { Eraser, PenTool, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { playTap } from '../utils/sound';

interface MathScratchpadProps {
  questionKey: string;
}

const PEN_COLORS = [
  { id: 'slate', hex: '#0f172a', label: '深黑' },
  { id: 'sky', hex: '#0284c7', label: '藍色' },
  { id: 'rose', hex: '#e11d48', label: '紅色' },
] as const;

export function MathScratchpad({ questionKey }: MathScratchpadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [penColor, setPenColor] = useState<string>('#0f172a');
  const [isEraser, setIsEraser] = useState(false);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    clearCanvas();
  }, [clearCanvas, questionKey]);

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getCoords(e);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 22;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = e.pointerType === 'pen' ? 3 : 4;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCoords(e);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  return (
    <div className="mt-4 rounded-2xl border-2 border-sky-200 bg-sky-50/50 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-black text-sky-900">
          <PenTool className="h-3.5 w-3.5" />
          <span>數學計算草稿板（支援平板手指／Apple Pencil，換題自動清空）</span>
        </div>
        <div className="flex items-center gap-1.5">
          {PEN_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={`畫筆顏色：${c.label}`}
              onClick={() => {
                playTap();
                setIsEraser(false);
                setPenColor(c.hex);
              }}
              className={`h-6 w-6 rounded-full border-2 transition ${
                !isEraser && penColor === c.hex
                  ? 'scale-110 border-amber-400 ring-2 ring-amber-200'
                  : 'border-white'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
          <button
            type="button"
            onClick={() => {
              playTap();
              setIsEraser((prev) => !prev);
            }}
            aria-pressed={isEraser}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-black transition ${
              isEraser
                ? 'border-amber-400 bg-amber-100 text-amber-900'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Eraser className="h-3 w-3" />
            <span>橡皮擦</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playTap();
              clearCanvas();
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-black text-slate-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash2 className="h-3 w-3" />
            <span>清空</span>
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={640}
        height={200}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="h-44 w-full cursor-crosshair rounded-xl border border-sky-200 bg-white select-none"
        style={{
          touchAction: 'none',
          backgroundImage:
            'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
    </div>
  );
}
