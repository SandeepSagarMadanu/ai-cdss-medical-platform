"use client";

import { useState } from "react";
import { Eye, Layers, ZoomIn, Info, EyeOff } from "lucide-react";

interface MedicalViewerProps {
  scan: {
    id: number;
    patient_name: string;
    scan_type: string;
    original_image_path: string;
    gradcam_image_path: string | null;
    status: string;
  };
}

export default function MedicalViewer({ scan }: MedicalViewerProps) {
  const [opacity, setOpacity] = useState(0.5);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [activeTab, setActiveTab] = useState<"side-by-side" | "overlay">("overlay");
  
  const originalUrl = scan.original_image_path;
  const gradcamUrl = scan.gradcam_image_path || originalUrl;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
      {/* Viewer Header */}
      <div className="px-5 py-4 border-b border-border bg-slate-950 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Eye className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-white uppercase tracking-wider">DICOM Image Viewer Workspace</span>
        </div>
        <div className="flex space-x-1.5 bg-slate-900 border border-border p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab("overlay")}
            className={`px-2.5 py-1 text-[10px] font-bold rounded ${activeTab === 'overlay' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Overlay Map
          </button>
          <button 
            onClick={() => setActiveTab("side-by-side")}
            className={`px-2.5 py-1 text-[10px] font-bold rounded ${activeTab === 'side-by-side' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Side-by-Side
          </button>
        </div>
      </div>

      {/* Viewer Screen */}
      <div className="bg-slate-950 p-4 sm:p-6 flex flex-col items-center justify-center min-h-[260px] border-b border-border relative">
        {activeTab === "side-by-side" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div className="space-y-2 text-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Modality Primary Input</span>
              <div className="border border-border rounded-xl overflow-hidden bg-slate-900 flex justify-center items-center h-48 sm:h-64 relative">
                <img src={originalUrl} alt="Original Scan" className="max-h-full max-w-full object-contain" />
              </div>
            </div>
            <div className="space-y-2 text-center">
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider">XAI Grad-CAM Focus Mapping</span>
              <div className="border border-border rounded-xl overflow-hidden bg-slate-900 flex justify-center items-center h-48 sm:h-64 relative">
                <img src={gradcamUrl} alt="Grad-CAM Scan" className="max-h-full max-w-full object-contain" />
              </div>
            </div>
          </div>
        ) : (
          /* Overlay Blend Mode */
          <div className="relative border border-border rounded-xl overflow-hidden bg-slate-900 flex justify-center items-center h-64 sm:h-80 w-full max-w-lg">
            {/* Base Image */}
            <img 
              src={originalUrl} 
              alt="Original Scan" 
              className="absolute max-h-full max-w-full object-contain pointer-events-none" 
            />
            {/* Heatmap Layer */}
            {showHeatmap && (
              <img 
                src={gradcamUrl} 
                alt="Grad-CAM Layer" 
                className="absolute max-h-full max-w-full object-contain mix-blend-screen transition-opacity duration-150" 
                style={{ opacity: opacity }}
              />
            )}
          </div>
        )}

        <div className="absolute bottom-2 right-4 flex items-center space-x-1.5 text-[8px] text-slate-600 font-bold uppercase tracking-widest">
          <span>AI Clinical Diagnostics</span>
        </div>
      </div>

      {/* Viewer controls */}
      <div className="p-5 bg-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        {activeTab === "overlay" && (
          <div className="flex items-center space-x-3 w-full md:max-w-xs">
            <Layers className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-400 font-semibold shrink-0">Map Opacity:</span>
            <input 
              type="range" 
              min="0.1" 
              max="1" 
              step="0.05" 
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              disabled={!showHeatmap}
              className="w-full h-1 bg-slate-900 border border-border rounded-lg appearance-none cursor-pointer accent-primary" 
            />
            <span className="text-[10px] text-slate-400 font-mono w-8 text-right">{Math.round(opacity * 100)}%</span>
          </div>
        )}

        <div className="flex items-center space-x-3 ml-auto">
          {activeTab === "overlay" && (
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center space-x-1.5 ${showHeatmap ? 'bg-primary bg-opacity-10 border-primary text-primary' : 'bg-slate-900 border-border text-slate-400 hover:text-white'}`}
            >
              {showHeatmap ? (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  <span>Disable Heatmap</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>Enable Heatmap</span>
                </>
              )}
            </button>
          )}

          <div className="p-2.5 bg-slate-900 border border-border rounded-lg text-slate-400 flex items-center space-x-1.5 text-[10px] font-semibold">
            <Info className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Resolution: Standard 512x512 matrix matrix interpolation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
