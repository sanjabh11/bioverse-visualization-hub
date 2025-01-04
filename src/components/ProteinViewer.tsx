import { useRef } from 'react';

export const ProteinViewer = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-[400px] rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center"
    >
      <p className="text-gray-500">Structure viewer will be initialized here</p>
    </div>
  );
};