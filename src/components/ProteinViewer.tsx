import { useEffect, useRef } from 'react';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';
import { PluginSpec } from 'molstar/lib/mol-plugin/spec';
import { StateTransform } from 'molstar/lib/mol-state';
import { BuiltInTrajectoryFormat } from 'molstar/lib/mol-plugin-state/formats/trajectory';
import { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects';
import { Asset } from 'molstar/lib/mol-util/assets';

interface ProteinViewerProps {
  structure?: string;
  isLoading?: boolean;
}

export const ProteinViewer = ({ structure, isLoading }: ProteinViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginUIContext | null>(null);

  useEffect(() => {
    // Initialize Mol* Viewer
    const initViewer = async () => {
      if (!containerRef.current) return;
      
      // Clean up any existing viewer
      if (pluginRef.current) {
        pluginRef.current.dispose();
      }

      // Create new viewer instance with proper configuration
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

        // Initialize default behaviors after plugin creation
        await plugin.init();
      } catch (error) {
        console.error('Failed to initialize Mol* viewer:', error);
      }
    };

    initViewer();

    // Cleanup on unmount
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
        // Clear existing content
        await pluginRef.current.clear();

        // Remove any existing text display
        if (containerRef.current) {
          const existingText = containerRef.current.querySelector('.text-display');
          if (existingText) {
            existingText.remove();
          }
        }

        // Try to fetch PDB data for the protein
        try {
          const pdbId = structure.match(/PDB ID: (\w+)/)?.[1];
          if (pdbId) {
            const url = `https://files.rcsb.org/download/${pdbId}.pdb`;
            const data = await fetch(url);
            if (data.ok) {
              const pdbData = await data.text();
              
              // Load PDB data into Mol*
              const plugin = pluginRef.current;
              const trajectory = await plugin.builders.structure.parseTrajectory(
                Asset.fromData(pdbData), 
                'pdb'
              );
              
              const model = await plugin.builders.structure.createModel(trajectory);
              const structure = await plugin.builders.structure.createStructure(model);
              
              const representation = await plugin.builders.structure.representation.addRepresentation(
                structure,
                { type: 'cartoon', color: 'chain-id' }
              );
              
              await plugin.canvas3d?.resetCamera();
              return;
            }
          }
        } catch (error) {
          console.error('Failed to load PDB structure:', error);
        }

        // If no PDB data, show text prediction
        const element = document.createElement('div');
        element.className = 'text-display';
        element.style.padding = '20px';
        element.style.color = '#000';
        element.style.backgroundColor = '#fff';
        element.style.maxHeight = '100%';
        element.style.overflow = 'auto';
        element.style.position = 'absolute';
        element.style.inset = '0';
        element.innerHTML = `<pre>${structure}</pre>`;

        containerRef.current?.appendChild(element);
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