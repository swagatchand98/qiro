import React from 'react';
import { DoorConfiguration, MeasurementUnit } from '../types';
import { convertToMm } from './calculations';
import { masterData } from '../data/masterData';

interface DiagramProps {
  door: DoorConfiguration;
  width?: number;
  height?: number;
}

export const DoorDiagram: React.FC<DiagramProps> = ({ 
  door, 
  width = 400, 
  height = 600 
}) => {
  const doorHeightMm = convertToMm(door.height, door.measurementUnit);
  const doorWidthMm = convertToMm(door.width, door.measurementUnit);
  
  const frameProfile = masterData.frameProfiles.find(f => f.code === door.frameProfileCode);
  const frameThickness = frameProfile?.width || 25;
  
  // Calculate scale to fit diagram in SVG viewBox
  const padding = 60;
  const scale = Math.min(
    (width - 2 * padding) / doorWidthMm,
    (height - 2 * padding) / doorHeightMm
  );
  
  const scaledWidth = doorWidthMm * scale;
  const scaledHeight = doorHeightMm * scale;
  const scaledFrameThickness = frameThickness * scale;
  
  // Center the door in the SVG
  const offsetX = (width - scaledWidth) / 2;
  const offsetY = (height - scaledHeight) / 2;
  
  // Glass area (inner rectangle)
  const glassX = offsetX + scaledFrameThickness;
  const glassY = offsetY + scaledFrameThickness;
  const glassWidth = scaledWidth - 2 * scaledFrameThickness;
  const glassHeight = scaledHeight - 2 * scaledFrameThickness;
  
  // Format measurements for display
  const formatMeasurement = (value: number, unit: MeasurementUnit): string => {
    return unit === 'mm' ? `${Math.round(value)} mm` : `${value.toFixed(2)}"`;
  };
  
  const widthLabel = formatMeasurement(door.width, door.measurementUnit);
  const heightLabel = formatMeasurement(door.height, door.measurementUnit);
  
  // Render different content based on door type
  const renderDoorContent = () => {
    if (door.doorType === 'double') {
      const panelWidth = scaledWidth / 2;
      const leftGlassX = glassX;
      const rightGlassX = glassX + panelWidth;
      const panelGlassWidth = glassWidth / 2 - scaledFrameThickness / 2;
      const leftHandleX = leftGlassX + panelGlassWidth - 10;
      const rightHandleX = rightGlassX + 10;
      const handleY = offsetY + scaledHeight / 2;
      
      return (
        <>
          {/* Left Panel */}
          <rect x={offsetX} y={offsetY} width={panelWidth} height={scaledHeight} fill="#8B4513" stroke="#654321" strokeWidth="2" />
          <rect x={leftGlassX} y={glassY} width={panelGlassWidth} height={glassHeight} fill="url(#glassPattern)" stroke="#4A90E2" strokeWidth="1" opacity="0.8" />
          <text x={leftGlassX + panelGlassWidth / 2} y={glassY + glassHeight / 2} textAnchor="middle" className="text-xs" fill="#4A90E2">GLASS</text>
          
          {/* Right Panel */}
          <rect x={offsetX + panelWidth} y={offsetY} width={panelWidth} height={scaledHeight} fill="#8B4513" stroke="#654321" strokeWidth="2" />
          <rect x={rightGlassX} y={glassY} width={panelGlassWidth} height={glassHeight} fill="url(#glassPattern)" stroke="#4A90E2" strokeWidth="1" opacity="0.8" />
          <text x={rightGlassX + panelGlassWidth / 2} y={glassY + glassHeight / 2} textAnchor="middle" className="text-xs" fill="#4A90E2">GLASS</text>
          
          {/* Center Line */}
          <line x1={offsetX + panelWidth} y1={offsetY} x2={offsetX + panelWidth} y2={offsetY + scaledHeight} stroke="#654321" strokeWidth="2" />
          
          {/* Handles */}
          <circle cx={leftHandleX} cy={handleY} r={6} fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
          <circle cx={rightHandleX} cy={handleY} r={6} fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
        </>
      );
    } else if (door.doorType === 'lift-up') {
      const handleX = offsetX + scaledWidth / 2;
      const handleY = offsetY + scaledHeight - 30;
      
      return (
        <>
          <rect x={offsetX} y={offsetY} width={scaledWidth} height={scaledHeight} fill="#8B4513" stroke="#654321" strokeWidth="2" />
          <rect x={glassX} y={glassY} width={glassWidth} height={glassHeight} fill="url(#glassPattern)" stroke="#4A90E2" strokeWidth="1" opacity="0.8" />
          <text x={glassX + glassWidth / 2} y={glassY + glassHeight / 2} textAnchor="middle" className="text-xs" fill="#4A90E2">GLASS</text>
          
          {/* Bottom Handle Bar */}
          <rect x={handleX - 30} y={handleY} width={60} height={10} fill="#FFD700" stroke="#DAA520" strokeWidth="1" rx="3" />
          
          {/* Lift Arrows */}
          <path d={`M ${offsetX + 15} ${offsetY + scaledHeight / 2} L ${offsetX + 15} ${offsetY + 30}`} stroke="#4CAF50" strokeWidth="2" markerEnd="url(#arrowhead)" />
          <path d={`M ${offsetX + scaledWidth - 15} ${offsetY + scaledHeight / 2} L ${offsetX + scaledWidth - 15} ${offsetY + 30}`} stroke="#4CAF50" strokeWidth="2" markerEnd="url(#arrowhead)" />
        </>
      );
    } else if (door.doorType === 'sliding') {
      const panelWidth = scaledWidth / 2;
      const leftPanelX = offsetX;
      const rightPanelX = offsetX + panelWidth * 0.3;
      const leftHandleX = leftPanelX + panelWidth - 15;
      const rightHandleX = rightPanelX + 15;
      const handleY = offsetY + scaledHeight / 2;
      
      return (
        <>
          {/* Track */}
          <rect x={offsetX - 10} y={offsetY - 10} width={scaledWidth + 20} height={5} fill="#999" stroke="#666" strokeWidth="1" />
          
          {/* Right Panel (back) */}
          <rect x={rightPanelX} y={offsetY} width={panelWidth} height={scaledHeight} fill="#A0826D" stroke="#654321" strokeWidth="2" opacity="0.7" />
          <rect x={rightPanelX + scaledFrameThickness} y={glassY} width={panelWidth - 2 * scaledFrameThickness} height={glassHeight} fill="url(#glassPattern)" stroke="#4A90E2" strokeWidth="1" opacity="0.5" />
          
          {/* Left Panel (front) */}
          <rect x={leftPanelX} y={offsetY} width={panelWidth} height={scaledHeight} fill="#8B4513" stroke="#654321" strokeWidth="2" />
          <rect x={leftPanelX + scaledFrameThickness} y={glassY} width={panelWidth - 2 * scaledFrameThickness} height={glassHeight} fill="url(#glassPattern)" stroke="#4A90E2" strokeWidth="1" opacity="0.8" />
          <text x={leftPanelX + panelWidth / 2} y={glassY + glassHeight / 2} textAnchor="middle" className="text-xs" fill="#4A90E2">GLASS</text>
          
          {/* Handles */}
          <circle cx={leftHandleX} cy={handleY} r={6} fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
          <circle cx={rightHandleX} cy={handleY} r={5} fill="#FFD700" stroke="#DAA520" strokeWidth="1" opacity="0.7" />
          
          {/* Sliding Arrow */}
          <path d={`M ${offsetX + scaledWidth / 2} ${offsetY + scaledHeight + 25} L ${offsetX + scaledWidth / 2 + 40} ${offsetY + scaledHeight + 25}`} stroke="#4CAF50" strokeWidth="2" markerEnd="url(#arrowhead)" />
        </>
      );
    } else if (door.doorType === 'bi-fold') {
      const panelWidth = scaledWidth / 2;
      const leftGlassX = glassX;
      const rightGlassX = glassX + panelWidth;
      const panelGlassWidth = glassWidth / 2 - scaledFrameThickness / 2;
      const handleY = offsetY + scaledHeight / 2;
      const leftHandleX = leftGlassX + panelGlassWidth / 2;
      const rightHandleX = rightGlassX + panelGlassWidth / 2;
      
      return (
        <>
          {/* Left Panel */}
          <rect x={offsetX} y={offsetY} width={panelWidth} height={scaledHeight} fill="#8B4513" stroke="#654321" strokeWidth="2" />
          <rect x={leftGlassX} y={glassY} width={panelGlassWidth} height={glassHeight} fill="url(#glassPattern)" stroke="#4A90E2" strokeWidth="1" opacity="0.8" />
          <text x={leftGlassX + panelGlassWidth / 2} y={glassY + glassHeight / 2} textAnchor="middle" className="text-xs" fill="#4A90E2">GLASS</text>
          
          {/* Right Panel */}
          <rect x={offsetX + panelWidth} y={offsetY} width={panelWidth} height={scaledHeight} fill="#8B4513" stroke="#654321" strokeWidth="2" />
          <rect x={rightGlassX} y={glassY} width={panelGlassWidth} height={glassHeight} fill="url(#glassPattern)" stroke="#4A90E2" strokeWidth="1" opacity="0.8" />
          <text x={rightGlassX + panelGlassWidth / 2} y={glassY + glassHeight / 2} textAnchor="middle" className="text-xs" fill="#4A90E2">GLASS</text>
          
          {/* Center Fold Line */}
          <line x1={offsetX + panelWidth} y1={offsetY} x2={offsetX + panelWidth} y2={offsetY + scaledHeight} stroke="#654321" strokeWidth="2" strokeDasharray="5,5" />
          
          {/* Handles */}
          <circle cx={leftHandleX} cy={handleY} r={6} fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
          <circle cx={rightHandleX} cy={handleY} r={6} fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
          
          {/* Folding Arrows */}
          <path d={`M ${offsetX + panelWidth} ${offsetY + 40} Q ${offsetX + panelWidth - 25} ${offsetY + 50}, ${offsetX + panelWidth - 20} ${offsetY + 60}`} stroke="#4CAF50" strokeWidth="2" fill="none" />
          <path d={`M ${offsetX + panelWidth} ${offsetY + scaledHeight - 40} Q ${offsetX + panelWidth + 25} ${offsetY + scaledHeight - 50}, ${offsetX + panelWidth + 20} ${offsetY + scaledHeight - 60}`} stroke="#4CAF50" strokeWidth="2" fill="none" />
        </>
      );
    } else {
      // Single door
      const handleX = door.handlePosition === 'left' 
        ? offsetX + scaledFrameThickness / 2
        : door.handlePosition === 'right'
        ? offsetX + scaledWidth - scaledFrameThickness / 2
        : offsetX + scaledWidth / 2;
      
      const handleY = offsetY + (door.handleOffset * scale);
      const handleHeight = scaledHeight * 0.6;
      
      const hingeX = door.hingePosition === 'left' ? offsetX : offsetX + scaledWidth;
      const hingeTopY = offsetY + 50;
      const hingeBottomY = offsetY + scaledHeight - 50;
      
      return (
        <>
          <rect x={offsetX} y={offsetY} width={scaledWidth} height={scaledHeight} fill="#8B4513" stroke="#654321" strokeWidth="2" />
          <rect x={glassX} y={glassY} width={glassWidth} height={glassHeight} fill="url(#glassPattern)" stroke="#4A90E2" strokeWidth="1" opacity="0.8" />
          <text x={glassX + glassWidth / 2} y={glassY + glassHeight / 2} textAnchor="middle" className="text-xs" fill="#4A90E2">GLASS</text>
          
          {/* Handle */}
          {door.handlePosition !== 'none' && (
            <g>
              <rect x={handleX - 3} y={handleY} width={6} height={handleHeight} fill="#FFD700" stroke="#DAA520" strokeWidth="1" rx="2" />
              <circle cx={handleX} cy={handleY + handleHeight / 2} r={8} fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
            </g>
          )}
          
          {/* Hinges */}
          <circle cx={hingeX} cy={hingeTopY} r={6} fill="#666" stroke="#333" strokeWidth="1" />
          <circle cx={hingeX} cy={hingeTopY} r={3} fill="#333" />
          <circle cx={hingeX} cy={hingeBottomY} r={6} fill="#666" stroke="#333" strokeWidth="1" />
          <circle cx={hingeX} cy={hingeBottomY} r={3} fill="#333" />
          {door.hingeQuantity >= 3 && (
            <>
              <circle cx={hingeX} cy={offsetY + scaledHeight / 2} r={6} fill="#666" stroke="#333" strokeWidth="1" />
              <circle cx={hingeX} cy={offsetY + scaledHeight / 2} r={3} fill="#333" />
            </>
          )}
          
          {/* Opening Direction */}
          {door.hingePosition === 'left' && (
            <path d={`M ${offsetX + scaledWidth - 20} ${offsetY + scaledHeight / 2} Q ${offsetX + scaledWidth + 20} ${offsetY + scaledHeight / 2}, ${offsetX + scaledWidth - 20} ${offsetY + scaledHeight / 2 + 40}`} fill="none" stroke="#4CAF50" strokeWidth="2" markerEnd="url(#arrowhead)" />
          )}
          {door.hingePosition === 'right' && (
            <path d={`M ${offsetX + 20} ${offsetY + scaledHeight / 2} Q ${offsetX - 20} ${offsetY + scaledHeight / 2}, ${offsetX + 20} ${offsetY + scaledHeight / 2 + 40}`} fill="none" stroke="#4CAF50" strokeWidth="2" markerEnd="url(#arrowhead)" />
          )}
        </>
      );
    }
  };
  
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      className="border border-gray-300 bg-white"
    >
      <defs>
        {/* Define patterns and markers */}
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="5"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#333" />
        </marker>
        
        <pattern
          id="glassPattern"
          patternUnits="userSpaceOnUse"
          width="20"
          height="20"
        >
          <line x1="0" y1="0" x2="20" y2="20" stroke="#e0e0e0" strokeWidth="0.5" />
        </pattern>
      </defs>
      
      {/* Title */}
      <text
        x={width / 2}
        y={20}
        textAnchor="middle"
        className="font-semibold text-sm"
        fill="#333"
      >
        {door.doorName} - {door.doorType.toUpperCase()}
      </text>
      
      {/* Door content based on type */}
      {renderDoorContent()}
      
      {/* Width dimension line (top) */}
      <g>
        <line
          x1={offsetX}
          y1={offsetY - 15  }
          x2={offsetX + scaledWidth}
          y2={offsetY - 15}
          stroke="#333"
          strokeWidth="1"
          markerStart="url(#arrowhead)"
          markerEnd="url(#arrowhead)"
        />
        <text
          x={offsetX + scaledWidth / 2}
          y={offsetY - 22}
          textAnchor="middle"
          className="text-xs font-semibold"
          fill="#333"
        >
          {widthLabel}
        </text>
      </g>
      
      {/* Height dimension line (right) */}
      <g>
        <line
          x1={offsetX + scaledWidth + 30}
          y1={offsetY}
          x2={offsetX + scaledWidth + 30}
          y2={offsetY + scaledHeight}
          stroke="#333"
          strokeWidth="1"
          markerStart="url(#arrowhead)"
          markerEnd="url(#arrowhead)"
        />
        <text
          x={offsetX + scaledWidth + 35}
          y={offsetY + scaledHeight / 2}
          textAnchor="start"
          className="text-xs font-semibold"
          fill="#333"
          transform={`rotate(90, ${offsetX + scaledWidth + 35}, ${offsetY + scaledHeight / 2})`}
        >
          {heightLabel}
        </text>
      </g>
      
      {/* Door info at bottom */}
      <g>
        <text x={width / 2} y={height - 35} textAnchor="middle" className="text-xs" fill="#666">
          Type: {door.doorType} | Qty: {door.quantity} | Carcass: {door.carcassThickness}mm
        </text>
        <text x={width / 2} y={height - 20} textAnchor="middle" className="text-xs" fill="#666">
          Frame: {frameProfile?.name || 'N/A'}
        </text>
        <text x={width / 2} y={height - 5} textAnchor="middle" className="text-xs" fill="#666">
          Glass: {masterData.glassTypes.find(g => g.code === door.glassTypeCode)?.name || 'N/A'}
        </text>
      </g>
    </svg>
  );
};

// Function to convert React component to SVG string for PDF generation
export const generateDoorDiagramSVG = (door: DoorConfiguration, glassArea?: number): string => {
  const doorHeightMm = convertToMm(door.height, door.measurementUnit);
  const doorWidthMm = convertToMm(door.width, door.measurementUnit);
  
  const frameProfile = masterData.frameProfiles.find(f => f.code === door.frameProfileCode);
  const frameThickness = frameProfile?.width || 25;
  
  const width = 400;
  const height = 500;
  const padding = 40;
  const scale = Math.min(
    (width - 2 * padding) / doorWidthMm,
    (height - 2 * padding) / doorHeightMm
  );
  
  const scaledWidth = doorWidthMm * scale;
  const scaledHeight = doorHeightMm * scale;
  const scaledFrameThickness = frameThickness * scale;
  
  const offsetX = (width - scaledWidth) / 2;
  const offsetY = (height - scaledHeight) / 2;
  
  const glassX = offsetX + scaledFrameThickness;
  const glassY = offsetY + scaledFrameThickness;
  const glassWidth = scaledWidth - 2 * scaledFrameThickness;
  const glassHeight = scaledHeight - 2 * scaledFrameThickness;
  
  const formatMeasurement = (value: number, unit: MeasurementUnit): string => {
    return unit === 'mm' ? `${Math.round(value)} mm` : `${value.toFixed(2)}"`;
  };
  
  const widthLabel = formatMeasurement(door.width, door.measurementUnit);
  const heightLabel = formatMeasurement(door.height, door.measurementUnit);
  
  // Generate different diagrams based on door type
  let doorContent = '';
  
  if (door.doorType === 'single') {
    // Single door
    const handleY = offsetY + scaledHeight / 2;
    const handleX = door.handlePosition === 'left' 
      ? offsetX + 5
      : door.handlePosition === 'right'
      ? offsetX + scaledWidth - 5
      : offsetX + scaledWidth / 2;
    
    doorContent = `
      <!-- Door Frame -->
      <rect x="${offsetX}" y="${offsetY}" width="${scaledWidth}" height="${scaledHeight}" 
            fill="#8B4513" stroke="#000" stroke-width="2" />
      
      <!-- Glass Area -->
      <rect x="${glassX}" y="${glassY}" width="${glassWidth}" height="${glassHeight}" 
            fill="#B3E5FC" stroke="#0277BD" stroke-width="1.5" opacity="0.7" />
      
      <text x="${glassX + glassWidth / 2}" y="${glassY + glassHeight / 2}" 
            text-anchor="middle" font-size="14" font-weight="bold" fill="#01579B">GLASS</text>
      
      <!-- Handle -->
      <circle cx="${handleX}" cy="${handleY}" r="6" fill="#FFD700" stroke="#000" stroke-width="1.5" />
      <text x="${handleX}" y="${handleY + 20}" text-anchor="middle" font-size="10" fill="#000">Handle</text>
    `;
  } else if (door.doorType === 'double') {
    // Double door - two panels side by side
    const panelWidth = scaledWidth / 2;
    const leftGlassX = glassX;
    const rightGlassX = glassX + panelWidth;
    const panelGlassWidth = glassWidth / 2 - scaledFrameThickness / 2;
    
    const leftHandleX = leftGlassX + panelGlassWidth - 10;
    const rightHandleX = rightGlassX + 10;
    const handleY = offsetY + scaledHeight / 2;
    
    doorContent = `
      <!-- Left Panel Frame -->
      <rect x="${offsetX}" y="${offsetY}" width="${panelWidth}" height="${scaledHeight}" 
            fill="#8B4513" stroke="#000" stroke-width="2" />
      
      <!-- Right Panel Frame -->
      <rect x="${offsetX + panelWidth}" y="${offsetY}" width="${panelWidth}" height="${scaledHeight}" 
            fill="#8B4513" stroke="#000" stroke-width="2" />
      
      <!-- Left Glass -->
      <rect x="${leftGlassX}" y="${glassY}" width="${panelGlassWidth}" height="${glassHeight}" 
            fill="#B3E5FC" stroke="#0277BD" stroke-width="1.5" opacity="0.7" />
      <text x="${leftGlassX + panelGlassWidth / 2}" y="${glassY + glassHeight / 2}" 
            text-anchor="middle" font-size="12" font-weight="bold" fill="#01579B">GLASS</text>
      
      <!-- Right Glass -->
      <rect x="${rightGlassX}" y="${glassY}" width="${panelGlassWidth}" height="${glassHeight}" 
            fill="#B3E5FC" stroke="#0277BD" stroke-width="1.5" opacity="0.7" />
      <text x="${rightGlassX + panelGlassWidth / 2}" y="${glassY + glassHeight / 2}" 
            text-anchor="middle" font-size="12" font-weight="bold" fill="#01579B">GLASS</text>
      
      <!-- Center Line -->
      <line x1="${offsetX + panelWidth}" y1="${offsetY}" x2="${offsetX + panelWidth}" y2="${offsetY + scaledHeight}" 
            stroke="#000" stroke-width="2" />
      
      <!-- Handles -->
      <circle cx="${leftHandleX}" cy="${handleY}" r="5" fill="#FFD700" stroke="#000" stroke-width="1.5" />
      <circle cx="${rightHandleX}" cy="${handleY}" r="5" fill="#FFD700" stroke="#000" stroke-width="1.5" />
    `;
  } else if (door.doorType === 'lift-up') {
    // Lift-up door with upward opening indication
    const handleX = offsetX + scaledWidth / 2;
    const handleY = offsetY + scaledHeight - 30;
    
    doorContent = `
      <!-- Door Frame -->
      <rect x="${offsetX}" y="${offsetY}" width="${scaledWidth}" height="${scaledHeight}" 
            fill="#8B4513" stroke="#000" stroke-width="2" />
      
      <!-- Glass Area -->
      <rect x="${glassX}" y="${glassY}" width="${glassWidth}" height="${glassHeight}" 
            fill="#B3E5FC" stroke="#0277BD" stroke-width="1.5" opacity="0.7" />
      
      <text x="${glassX + glassWidth / 2}" y="${glassY + glassHeight / 2}" 
            text-anchor="middle" font-size="14" font-weight="bold" fill="#01579B">GLASS</text>
      
      <!-- Handle (bottom center) -->
      <rect x="${handleX - 20}" y="${handleY}" width="40" height="8" fill="#FFD700" stroke="#000" stroke-width="1.5" rx="2" />
      <text x="${handleX}" y="${handleY + 20}" text-anchor="middle" font-size="10" fill="#000">Handle</text>
      
      <!-- Lift mechanism arrows -->
      <path d="M ${offsetX + 10} ${offsetY + scaledHeight / 2} L ${offsetX + 10} ${offsetY + 20} L ${offsetX + 5} ${offsetY + 30} M ${offsetX + 10} ${offsetY + 20} L ${offsetX + 15} ${offsetY + 30}" 
            stroke="#4CAF50" stroke-width="2" fill="none" />
      <path d="M ${offsetX + scaledWidth - 10} ${offsetY + scaledHeight / 2} L ${offsetX + scaledWidth - 10} ${offsetY + 20} L ${offsetX + scaledWidth - 15} ${offsetY + 30} M ${offsetX + scaledWidth - 10} ${offsetY + 20} L ${offsetX + scaledWidth - 5} ${offsetY + 30}" 
            stroke="#4CAF50" stroke-width="2" fill="none" />
    `;
  } else if (door.doorType === 'sliding') {
    // Sliding door with track indication
    const panelWidth = scaledWidth / 2;
    const leftPanelX = offsetX;
    const rightPanelX = offsetX + panelWidth * 0.3; // Overlapping
    
    const leftHandleX = leftPanelX + panelWidth - 15;
    const rightHandleX = rightPanelX + 15;
    const handleY = offsetY + scaledHeight / 2;
    
    doorContent = `
      <!-- Track (top) -->
      <rect x="${offsetX - 10}" y="${offsetY - 10}" width="${scaledWidth + 20}" height="5" 
            fill="#999" stroke="#666" stroke-width="1" />
      
      <!-- Right Panel (back) -->
      <rect x="${rightPanelX}" y="${offsetY}" width="${panelWidth}" height="${scaledHeight}" 
            fill="#A0826D" stroke="#000" stroke-width="2" opacity="0.7" />
      <rect x="${rightPanelX + scaledFrameThickness}" y="${glassY}" width="${panelWidth - 2 * scaledFrameThickness}" height="${glassHeight}" 
            fill="#B3E5FC" stroke="#0277BD" stroke-width="1" opacity="0.5" />
      
      <!-- Left Panel (front) -->
      <rect x="${leftPanelX}" y="${offsetY}" width="${panelWidth}" height="${scaledHeight}" 
            fill="#8B4513" stroke="#000" stroke-width="2" />
      <rect x="${leftPanelX + scaledFrameThickness}" y="${glassY}" width="${panelWidth - 2 * scaledFrameThickness}" height="${glassHeight}" 
            fill="#B3E5FC" stroke="#0277BD" stroke-width="1.5" opacity="0.7" />
      <text x="${leftPanelX + panelWidth / 2}" y="${glassY + glassHeight / 2}" 
            text-anchor="middle" font-size="12" font-weight="bold" fill="#01579B">GLASS</text>
      
      <!-- Handles -->
      <circle cx="${leftHandleX}" cy="${handleY}" r="5" fill="#FFD700" stroke="#000" stroke-width="1.5" />
      <circle cx="${rightHandleX}" cy="${handleY}" r="4" fill="#FFD700" stroke="#000" stroke-width="1" opacity="0.7" />
      
      <!-- Sliding arrow -->
      <path d="M ${offsetX + scaledWidth / 2} ${offsetY + scaledHeight + 20} L ${offsetX + scaledWidth / 2 + 30} ${offsetY + scaledHeight + 20} L ${offsetX + scaledWidth / 2 + 25} ${offsetY + scaledHeight + 15} M ${offsetX + scaledWidth / 2 + 30} ${offsetY + scaledHeight + 20} L ${offsetX + scaledWidth / 2 + 25} ${offsetY + scaledHeight + 25}" 
            stroke="#4CAF50" stroke-width="2" fill="none" />
    `;
  } else if (door.doorType === 'bi-fold') {
    // Bi-fold door with folding panels
    const panelWidth = scaledWidth / 2;
    const leftGlassX = glassX;
    const rightGlassX = glassX + panelWidth;
    const panelGlassWidth = glassWidth / 2 - scaledFrameThickness / 2;
    
    const handleY = offsetY + scaledHeight / 2;
    const leftHandleX = leftGlassX + panelGlassWidth / 2;
    const rightHandleX = rightGlassX + panelGlassWidth / 2;
    
    doorContent = `
      <!-- Left Panel Frame -->
      <rect x="${offsetX}" y="${offsetY}" width="${panelWidth}" height="${scaledHeight}" 
            fill="#8B4513" stroke="#000" stroke-width="2" />
      
      <!-- Right Panel Frame -->
      <rect x="${offsetX + panelWidth}" y="${offsetY}" width="${panelWidth}" height="${scaledHeight}" 
            fill="#8B4513" stroke="#000" stroke-width="2" />
      
      <!-- Left Glass -->
      <rect x="${leftGlassX}" y="${glassY}" width="${panelGlassWidth}" height="${glassHeight}" 
            fill="#B3E5FC" stroke="#0277BD" stroke-width="1.5" opacity="0.7" />
      <text x="${leftGlassX + panelGlassWidth / 2}" y="${glassY + glassHeight / 2}" 
            text-anchor="middle" font-size="11" font-weight="bold" fill="#01579B">GLASS</text>
      
      <!-- Right Glass -->
      <rect x="${rightGlassX}" y="${glassY}" width="${panelGlassWidth}" height="${glassHeight}" 
            fill="#B3E5FC" stroke="#0277BD" stroke-width="1.5" opacity="0.7" />
      <text x="${rightGlassX + panelGlassWidth / 2}" y="${glassY + glassHeight / 2}" 
            text-anchor="middle" font-size="11" font-weight="bold" fill="#01579B">GLASS</text>
      
      <!-- Center Fold Line -->
      <line x1="${offsetX + panelWidth}" y1="${offsetY}" x2="${offsetX + panelWidth}" y2="${offsetY + scaledHeight}" 
            stroke="#000" stroke-width="2" stroke-dasharray="5,5" />
      
      <!-- Handles -->
      <circle cx="${leftHandleX}" cy="${handleY}" r="5" fill="#FFD700" stroke="#000" stroke-width="1.5" />
      <circle cx="${rightHandleX}" cy="${handleY}" r="5" fill="#FFD700" stroke="#000" stroke-width="1.5" />
      
      <!-- Folding arrows -->
      <path d="M ${offsetX + panelWidth} ${offsetY + 30} Q ${offsetX + panelWidth - 20} ${offsetY + 40}, ${offsetX + panelWidth - 15} ${offsetY + 50}" 
            stroke="#4CAF50" stroke-width="2" fill="none" />
      <path d="M ${offsetX + panelWidth} ${offsetY + scaledHeight - 30} Q ${offsetX + panelWidth + 20} ${offsetY + scaledHeight - 40}, ${offsetX + panelWidth + 15} ${offsetY + scaledHeight - 50}" 
            stroke="#4CAF50" stroke-width="2" fill="none" />
    `;
  }
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <polygon points="0 0, 8 4, 0 8" fill="#000" />
        </marker>
      </defs>
      
      <!-- Title -->
      <text x="${width / 2}" y="25" text-anchor="middle" font-weight="bold" font-size="16" fill="#000">
        ${door.doorName.toUpperCase()}
      </text>
      
      ${doorContent}
      
      <!-- Width Dimension -->
      <line x1="${offsetX}" y1="${offsetY - 20}" x2="${offsetX + scaledWidth}" y2="${offsetY - 20}" 
            stroke="#000" stroke-width="1.5" marker-start="url(#arrowhead)" marker-end="url(#arrowhead)" />
      <text x="${offsetX + scaledWidth / 2}" y="${offsetY - 25}" text-anchor="middle" 
            font-size="13" font-weight="bold" fill="#000">${widthLabel}</text>
      
      <!-- Height Dimension -->
      <line x1="${offsetX + scaledWidth + 20}" y1="${offsetY}" 
            x2="${offsetX + scaledWidth + 20}" y2="${offsetY + scaledHeight}" 
            stroke="#000" stroke-width="1.5" marker-start="url(#arrowhead)" marker-end="url(#arrowhead)" />
      <text x="${offsetX + scaledWidth + 25}" y="${offsetY + scaledHeight / 2}" 
            text-anchor="start" font-size="13" font-weight="bold" fill="#000">${heightLabel}</text>
      
      <!-- Details -->
      <text x="${width / 2}" y="${height - 15}" text-anchor="middle" font-size="11" fill="#333">
        ${door.doorType.charAt(0).toUpperCase() + door.doorType.slice(1)} | Qty: ${door.quantity} | ${door.doorType === 'sliding' || door.doorType === 'bi-fold' ? 'Panels: 2' : 'Hinge: ' + door.hingePosition}
      </text>
    </svg>
  `;
};
