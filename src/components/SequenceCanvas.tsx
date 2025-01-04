import { useEffect, useRef } from 'react';
import { Canvas, Text } from 'fabric';

export const SequenceCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);

  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;

    // Initialize canvas only once
    fabricRef.current = new Canvas(canvasRef.current, {
      width: 800,
      height: 200,
      backgroundColor: '#f8fafc',
    });

    // Add placeholder sequence visualization
    const text = new Text('ATCG...', {
      left: 50,
      top: 50,
      fill: '#2C5282',
      fontFamily: 'monospace',
      fontSize: 20,
    });

    fabricRef.current.add(text);

    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full overflow-x-auto">
      <canvas ref={canvasRef} className="border border-gray-200 rounded-lg" />
    </div>
  );
};