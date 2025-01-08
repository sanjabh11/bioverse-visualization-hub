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
        const plugin = pluginRef.current;
        await plugin.clear();

        // Remove any existing error messages
        if (containerRef.current) {
          const existingText = containerRef.current.querySelector('.text-display');
          if (existingText) {
            existingText.remove();
          }
        }

        // Extract PDB ID if present
        const pdbMatch = structure.match(/PDB ID: (\w+)/);
        if (pdbMatch) {
          const pdbId = pdbMatch[1];
          try {
            // Fetch PDB data
            const response = await fetch(`https://files.rcsb.org/download/${pdbId}.pdb`);
            if (!response.ok) {
              throw new Error(`Failed to fetch PDB structure: ${response.status}`);
            }
            const pdbData = await response.text();
            
            // Load the fetched data
            const data = await plugin.builders.data.rawData({ data: pdbData });
            const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb');
            const model = await plugin.builders.structure.createModel(trajectory);
            const modelStructure = await plugin.builders.structure.createStructure(model);

            await plugin.builders.structure.representation.addRepresentation(modelStructure, {
              type: 'cartoon',
              color: 'chain-id'
            });

            if (plugin.canvas3d) {
              await plugin.canvas3d.commit();
            }
            return;
          } catch (pdbError) {
            console.error('Failed to load from PDB:', pdbError);
            throw pdbError;
          }
        }

        // If no PDB ID, try loading as raw data
        const data = await plugin.builders.data.rawData({ data: structure });
        const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb');
        const model = await plugin.builders.structure.createModel(trajectory);
        const modelStructure = await plugin.builders.structure.createStructure(model);

        await plugin.builders.structure.representation.addRepresentation(modelStructure, {
          type: 'cartoon',
          color: 'chain-id'
        });

        if (plugin.canvas3d) {
          await plugin.canvas3d.commit();
        }

      } catch (error) {
        console.error('Failed to load structure:', error);
        showError(error.message);
      }
    };

    loadStructure();
  }, [structure]);

  const showError = (message: string) => {
    if (!containerRef.current) return;
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
      <p>${message}</p>
      <pre class="mt-4 text-sm text-gray-600 whitespace-pre-wrap">${structure}</pre>
    </div>`;
    containerRef.current.appendChild(element);
  };

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