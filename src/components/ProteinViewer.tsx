import { useEffect, useRef } from 'react';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';
import { PluginSpec } from 'molstar/lib/mol-plugin/spec';

interface ProteinViewerProps {
  structure?: string;
  isLoading?: boolean;
}

export const ProteinViewer = ({ structure, isLoading }: ProteinViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginUIContext | null>(null);

  useEffect(() => {
    const initViewer = async () => {
      if (!containerRef.current) return;
      
      if (pluginRef.current) {
        pluginRef.current.dispose();
      }

      const defaultSpec: PluginSpec = {
        ...DefaultPluginUISpec,
        config: [
          [PluginConfig.Viewport.ShowAnimation, false],
          [PluginConfig.Viewport.ShowControls, true],
          [PluginConfig.Viewport.ShowSelectionMode, false],
        ],
        behaviors: [],
        layout: {
          initial: {
            isExpanded: false,
            showControls: true,
            controlsDisplay: 'reactive'
          }
        }
      };

      try {
        const plugin = await createPluginUI(containerRef.current, defaultSpec);
        pluginRef.current = plugin;
        await plugin.init();
      } catch (error) {
        console.error('Failed to initialize Mol* viewer:', error);
      }
    };

    initViewer();

    return () => {
      if (pluginRef.current) {
        pluginRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    const loadStructure = async () => {
      if (!pluginRef.current || !structure) return;

      try {
        await pluginRef.current.clear();

        if (containerRef.current) {
          const existingText = containerRef.current.querySelector('.text-display');
          if (existingText) {
            existingText.remove();
          }
        }

        try {
          const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
          
          // Extract structure identifiers
          console.log('Structure data:', structure);
          
          // Try to extract AlphaFold ID first
          let alphafoldId = null;
          let pdbId = null;
          
          // Try different patterns for AlphaFold URL
          const alphafoldPatterns = [
            /alphafold\.ebi\.ac\.uk\/files\/AF-(.*?)-F1-model_v4\.pdb/,
            /alphafold\.ebi\.ac\.uk\/files\/(.*?)\.pdb/,
            /AF-(.*?)-F1-model_v4\.pdb/
          ];
          
          for (const pattern of alphafoldPatterns) {
            const match = structure.match(pattern);
            if (match) {
              alphafoldId = match[1];
              break;
            }
          }
          
          // Extract PDB ID
          const pdbMatch = structure.match(/PDB ID: (\w+)/);
          if (pdbMatch) {
            pdbId = pdbMatch[1];
          }
          
          console.log('Extracted IDs:', { alphafoldId, pdbId });
          
          // Try to load structure
          const plugin = pluginRef.current;
          let structureData = null;
          let errorMessage = '';
          
          // First try AlphaFold if we have an ID
          if (alphafoldId) {
            const url = `${SERVER_URL}/api/structure/alphafold/${alphafoldId}`;
            console.log('Attempting to load AlphaFold structure from:', url);
            
            try {
              const response = await fetch(url);
              if (response.ok) {
                const text = await response.text();
                if (text.includes('ATOM') || text.includes('HETATM')) {
                  structureData = text;
                  console.log('Successfully loaded AlphaFold structure');
                } else {
                  console.error('Invalid AlphaFold data received');
                  errorMessage = 'Invalid AlphaFold data received';
                }
              } else {
                console.error('Failed to fetch AlphaFold structure:', response.status);
                errorMessage = `Failed to fetch AlphaFold structure: ${response.status}`;
              }
            } catch (error) {
              console.error('Error loading AlphaFold structure:', error);
              errorMessage = error.message;
            }
          }
          
          // If AlphaFold failed and we have a PDB ID, try that
          if (!structureData && pdbId) {
            const url = `${SERVER_URL}/api/structure/pdb/${pdbId}`;
            console.log('Attempting to load PDB structure from:', url);
            
            try {
              const response = await fetch(url);
              if (response.ok) {
                const text = await response.text();
                if (text.includes('ATOM') || text.includes('HETATM')) {
                  structureData = text;
                  console.log('Successfully loaded PDB structure');
                } else {
                  console.error('Invalid PDB data received');
                  errorMessage = 'Invalid PDB data received';
                }
              } else {
                console.error('Failed to fetch PDB structure:', response.status);
                errorMessage = `Failed to fetch PDB structure: ${response.status}`;
              }
            } catch (error) {
              console.error('Error loading PDB structure:', error);
              errorMessage = error.message;
            }
          }
          
          // If we have structure data, try to load it
          if (structureData) {
            try {
              // Load structure data directly
              const data = await plugin.builders.data.rawData({ data: structureData });
              const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb');
              const model = await plugin.builders.structure.createModel(trajectory);
              const structure = await plugin.builders.structure.createStructure(model);
              
              // Add representation
              await plugin.builders.structure.representation.addRepresentation(structure, {
                type: 'cartoon',
                color: 'chain-id'
              });
              
              return;
            } catch (error) {
              console.error('Error loading structure into viewer:', error);
              errorMessage = `Error loading structure into viewer: ${error.message}`;
            }
          }
          
          // If we get here, show error or text prediction
          const element = document.createElement('div');
          element.className = 'text-display';
          element.style.padding = '20px';
          element.style.backgroundColor = '#fff';
          element.style.maxHeight = '100%';
          element.style.overflow = 'auto';
          element.style.position = 'absolute';
          element.style.inset = '0';
          
          if (errorMessage) {
            element.style.color = '#dc2626';
            element.innerHTML = `<div class="flex flex-col gap-4">
              <p class="text-red-600 font-semibold">Failed to load structure:</p>
              <p>${errorMessage}</p>
              <pre class="mt-4 text-sm text-gray-600 whitespace-pre-wrap">${structure}</pre>
            </div>`;
          } else {
            element.style.color = '#000';
            element.innerHTML = `<pre>${structure}</pre>`;
          }
          
          containerRef.current?.appendChild(element);
        } catch (error) {
          console.error('Failed to load structure:', error);
          
          // Show error message to user
          const element = document.createElement('div');
          element.className = 'text-display';
          element.style.padding = '20px';
          element.style.color = '#dc2626';
          element.style.backgroundColor = '#fff';
          element.style.maxHeight = '100%';
          element.style.overflow = 'auto';
          element.style.position = 'absolute';
          element.style.inset = '0';
          element.innerHTML = `<div class="flex flex-col gap-4">
            <p class="text-red-600 font-semibold">Failed to load structure:</p>
            <p>${error.message}</p>
            <pre class="mt-4 text-sm text-gray-600 whitespace-pre-wrap">${structure}</pre>
          </div>`;
          
          containerRef.current?.appendChild(element);
        }
      } catch (error) {
        console.error('Failed to load structure:', error);
      }
    };

    loadStructure();
  }, [structure]);

  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden bg-gray-100">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bio-primary"></div>
        </div>
      )}
      <div 
        ref={containerRef} 
        className="w-full h-full relative"
        style={{ visibility: isLoading ? 'hidden' : 'visible' }}
      />
    </div>
  );
};