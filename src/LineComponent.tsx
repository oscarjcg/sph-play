import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

interface LineDrawingComponentProps {
  onLinesDrawn?: (lines: THREE.Vector2[][]) => void;
}

export const LineDrawingComponent: React.FC<LineDrawingComponentProps> = ({ onLinesDrawn }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentStart, setCurrentStart] = useState<THREE.Vector2 | null>(null);
  const [lines, setLines] = useState<THREE.Vector2[][]>([]);

  useEffect(() => {
    redraw(null);
  }, [lines, currentStart]);

  const redraw = (preview: THREE.Vector2 | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all completed lines
    lines.forEach((line) => {
      if (line.length !== 2) return;
      ctx.beginPath();
      ctx.moveTo(line[0].x, line[0].y);
      ctx.lineTo(line[1].x, line[1].y);
      ctx.stroke();
    });

    // Draw preview line if applicable
    if (currentStart && preview) {
      ctx.beginPath();
      ctx.moveTo(currentStart.x, currentStart.y);
      ctx.lineTo(preview.x, preview.y);
      ctx.stroke();
    } else if (currentStart) {
      // Optional: draw a small dot for the starting point
      ctx.beginPath();
      ctx.arc(currentStart.x, currentStart.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const startPoint = new THREE.Vector2(x, y);
    setCurrentStart(startPoint);
    redraw(null); // Draw the starting dot if desired
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentStart) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const previewPos = new THREE.Vector2(x, y);
    redraw(previewPos);
  };

  const endDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentStart) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const endPoint = new THREE.Vector2(x, y);
    if (endPoint.equals(currentStart)) {
      // Ignore zero-length lines
      setCurrentStart(null);
      redraw(null);
      return;
    }
    setLines((prev) => [...prev, [currentStart, endPoint]]);
    setCurrentStart(null);
    // useEffect will handle redraw
  };

  const clearCanvas = () => {
    setLines([]);
    setCurrentStart(null);
    redraw(null);
  };

  const outputLines = () => {
    const formattedLines = lines
      .map((line) => `    [${line.map((point) => `new THREE.Vector2(${point.x}, ${point.y})`).join(', ')}]`)
      .join(',\n');
    const output = `const lines: Line[] = [\n${formattedLines}\n];`;
    console.log(output);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: '1px solid black' }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseOut={endDrawing}
      />
      <button onClick={clearCanvas}>Clear</button>
      <button onClick={outputLines}>Output Lines</button>
    </div>
  );
};

export default LineDrawingComponent;