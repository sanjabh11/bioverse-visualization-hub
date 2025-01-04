import { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

export const SequenceCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 200,
      backgroundColor: '#f8fafc',
    });

    // Add placeholder sequence visualization
    const text = new fabric.Text('ATCG...', {
      left: 50,
      top: 50,
      fill: '#2C5282',
      fontFamily: 'monospace',
      fontSize: 20,
    });

    canvas.add(text);

    return () => {
      canvas.dispose();
    };
  }, []);

  return (
    <div className="w-full overflow-x-auto">
      <canvas ref={canvasRef} className="border border-gray-200 rounded-lg" />
    </div>
  );
};