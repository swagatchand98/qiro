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
    if (door.doorType === 'openable' && door.width > 1200) {
      // Wide openable door (render as double panel)
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
    } else if (door.doorType === 'air-hinge') {
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
    } else if (door.doorType === 'pin-hinge') {
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
      
      const handleY = offsetY + ((door.handleOffset || 500) * scale);
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
          {(door.hingeQuantity || 2) >= 3 && (
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
      
      {/* Divider lines */}
      {door.hasDividers && door.dividerConfig && (
        <g>
          {/* Horizontal dividers (from top) */}
          {door.dividerConfig.horizontal?.map((positionMm, idx) => {
            const scaledPosition = positionMm * scale;
            const dividerY = offsetY + scaledPosition;
            if (dividerY > offsetY && dividerY < offsetY + scaledHeight) {
              return (
                <g key={`h-divider-${idx}`}>
                  <line
                    x1={glassX}
                    y1={dividerY}
                    x2={glassX + glassWidth}
                    y2={dividerY}
                    stroke="#FF6B6B"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={glassX + glassWidth + 5}
                    y={dividerY + 4}
                    className="text-xs font-medium"
                    fill="#FF6B6B"
                  >
                    {positionMm}mm
                  </text>
                </g>
              );
            }
            return null;
          })}
          
          {/* Vertical dividers (from left) */}
          {door.dividerConfig.vertical?.map((positionMm, idx) => {
            const scaledPosition = positionMm * scale;
            const dividerX = offsetX + scaledPosition;
            if (dividerX > offsetX && dividerX < offsetX + scaledWidth) {
              return (
                <g key={`v-divider-${idx}`}>
                  <line
                    x1={dividerX}
                    y1={glassY}
                    x2={dividerX}
                    y2={glassY + glassHeight}
                    stroke="#4ECDC4"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={dividerX}
                    y={glassY - 8}
                    textAnchor="middle"
                    className="text-xs font-medium"
                    fill="#4ECDC4"
                  >
                    {positionMm}mm
                  </text>
                </g>
              );
            }
            return null;
          })}
        </g>
      )}
      
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
  
  if (door.doorType === 'openable' && door.width > 1200) {
    // Wide openable door - two panels side by side
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
  } else if (door.doorType === 'openable') {
    // Standard openable door
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
  } else if (door.doorType === 'air-hinge') {
    // Air-hinge door with upward opening indication
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
  } else if (door.doorType === 'pin-hinge') {
    // Pin-hinge door with folding panels
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
        ${door.doorType.charAt(0).toUpperCase() + door.doorType.slice(1)} | Qty: ${door.quantity} | ${door.doorType === 'sliding' || door.doorType === 'pin-hinge' ? 'Panels: 2' : 'Hinge: ' + door.hingePosition}
      </text>
    </svg>
  `;
};

// PREMIUM ELEVATION DIAGRAM - Professional CAD/AutoCAD style technical drawing
export const generatePremiumElevationSVG = (door: DoorConfiguration): string => {
  const doorHeightMm = convertToMm(door.height, door.measurementUnit);
  const doorWidthMm = convertToMm(door.width, door.measurementUnit);
  
  const frameProfile = masterData.frameProfiles.find(f => f.code === door.frameProfileCode || door.profileCode);
  const handleProfile = masterData.handleProfiles.find(h => h.code === door.handleProfileCode);
  const hingeProduct = masterData.products?.find(p => p.code === door.hingeCode && p.productType === 'hinge');
  
  const width = 600;
  const height = 750;
  const padding = 100;
  const scale = Math.min(
    (width - 2 * padding) / doorWidthMm,
    (height - 2 * padding - 120) / doorHeightMm
  );
  
  const scaledWidth = doorWidthMm * scale;
  const scaledHeight = doorHeightMm * scale;
  
  const offsetX = (width - scaledWidth) / 2;
  const offsetY = padding + 50;
  
  // Handle calculations
  const handleSide = door.handlePosition === 'left' ? 'LEFT' : door.handlePosition === 'right' ? 'RIGHT' : door.handlePosition === 'center' ? 'CENTER' : 'NONE';
  const handleOffset = door.handleOffset || 100;
  const handleTopClearance = handleOffset;
  const handleBottomClearance = doorHeightMm - handleOffset - (doorHeightMm - 2 * handleOffset);
  const handleLength = doorHeightMm - handleTopClearance - handleBottomClearance;
  
  const handleX = door.handlePosition === 'left' 
    ? offsetX + 5
    : door.handlePosition === 'right'
    ? offsetX + scaledWidth - 5
    : offsetX + scaledWidth / 2;
  const handleYTop = offsetY + (handleTopClearance * scale);
  const handleYBottom = offsetY + scaledHeight - (handleBottomClearance * scale);
  
  // Hinge positions
  const hingePositions = door.hingePositionMm || [];
  const hingeSide = door.hingePosition || 'left';
  const hingeX = hingeSide === 'left' ? offsetX : offsetX + scaledWidth;
  
  // Divider positions
  const dividerHorizontal = door.dividerConfig?.horizontal || [];
  const dividerVertical = door.dividerConfig?.vertical || [];
  
  // Generate hinge callouts
  let hingesHTML = '';
  hingePositions.forEach((positionMm, index) => {
    const scaledY = offsetY + (positionMm * scale);
    if (scaledY >= offsetY && scaledY <= offsetY + scaledHeight) {
      const calloutX = hingeX + (hingeSide === 'left' ? -40 : 40);
      hingesHTML += `
        <g>
          <!-- Hinge point -->
          <circle cx="${hingeX}" cy="${scaledY}" r="5" fill="none" stroke="#FF6B35" stroke-width="2"/>
          <circle cx="${hingeX}" cy="${scaledY}" r="2" fill="#FF6B35"/>
          
          <!-- Extension line -->
          <line x1="${hingeX}" y1="${scaledY}" x2="${calloutX - (hingeSide === 'left' ? 15 : -15)}" y2="${scaledY}" 
                stroke="#9C27B0" stroke-width="1" stroke-dasharray="3,2"/>
          
          <!-- Dimension line -->
          <line x1="${calloutX}" y1="${offsetY}" x2="${calloutX}" y2="${scaledY}" 
                stroke="#9C27B0" stroke-width="1.5"/>
          <polygon points="${calloutX - 3},${scaledY - 5} ${calloutX + 3},${scaledY - 5} ${calloutX},${scaledY}" 
                   fill="#9C27B0"/>
          
          <!-- Dimension text -->
          <rect x="${calloutX - 25}" y="${scaledY / 2 - 8}" width="50" height="16" 
                fill="#FFF" stroke="#9C27B0" stroke-width="1"/>
          <text x="${calloutX}" y="${scaledY / 2 + 4}" text-anchor="middle" 
                font-size="10" font-family="Arial, sans-serif" font-weight="bold" fill="#000">
            ${Math.round(positionMm)}mm
          </text>
          
          <!-- Hinge label -->
          <text x="${calloutX + (hingeSide === 'left' ? -35 : 35)}" y="${scaledY + 4}" 
                text-anchor="${hingeSide === 'left' ? 'end' : 'start'}" 
                font-size="9" font-family="Arial, sans-serif" fill="#FF6B35" font-weight="bold">
            H${index + 1}
          </text>
        </g>
      `;
    }
  });
  
  // Generate divider lines
  let dividersHTML = '';
  dividerHorizontal.forEach((positionMm, index) => {
    const scaledY = offsetY + (positionMm * scale);
    if (scaledY > offsetY && scaledY < offsetY + scaledHeight) {
      dividersHTML += `
        <line x1="${offsetX}" y1="${scaledY}" x2="${offsetX + scaledWidth}" y2="${scaledY}" 
              stroke="#FF6B35" stroke-width="2"/>
        <text x="${offsetX + scaledWidth + 10}" y="${scaledY + 4}" 
              font-size="9" font-family="Arial, sans-serif" fill="#FF6B35" font-weight="bold">
          H-DIV: ${Math.round(positionMm)}mm
        </text>
      `;
    }
  });
  
  dividerVertical.forEach((positionMm, index) => {
    const scaledX = offsetX + (positionMm * scale);
    if (scaledX > offsetX && scaledX < offsetX + scaledWidth) {
      dividersHTML += `
        <line x1="${scaledX}" y1="${offsetY}" x2="${scaledX}" y2="${offsetY + scaledHeight}" 
              stroke="#FF6B35" stroke-width="2"/>
        <text x="${scaledX}" y="${offsetY - 10}" text-anchor="middle"
              font-size="9" font-family="Arial, sans-serif" fill="#FF6B35" font-weight="bold">
          V-DIV: ${Math.round(positionMm)}mm
        </text>
      `;
    }
  });
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrowStart" markerWidth="10" markerHeight="10" refX="0" refY="5" orient="auto">
          <polygon points="10 0, 10 10, 0 5" fill="#9C27B0"/>
        </marker>
        <marker id="arrowEnd" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
          <polygon points="0 0, 10 5, 0 10" fill="#9C27B0"/>
        </marker>
      </defs>
      
      <!-- White background -->
      <rect width="${width}" height="${height}" fill="#FFFFFF"/>
      
      <!-- Title Block -->
      <text x="${width / 2}" y="30" text-anchor="middle" 
            font-size="18" font-family="Arial, sans-serif" font-weight="bold" fill="#000">
        WARDROBE SHUTTER - ELEVATION DRAWING
      </text>
      <text x="${width / 2}" y="48" text-anchor="middle" 
            font-size="11" font-family="Arial, sans-serif" fill="#666">
        ${door.doorName.toUpperCase()} | ${door.doorType.toUpperCase()}
      </text>
      
      <!-- Shutter outline (thin black lines) -->
      <rect x="${offsetX}" y="${offsetY}" width="${scaledWidth}" height="${scaledHeight}" 
            fill="none" stroke="#000" stroke-width="2"/>
      
      <!-- Inner frame detail -->
      <rect x="${offsetX + 10}" y="${offsetY + 10}" width="${scaledWidth - 20}" height="${scaledHeight - 20}" 
            fill="none" stroke="#000" stroke-width="1" stroke-dasharray="5,3"/>
      
      <!-- Full-length handle (gold/yellow) -->
      ${door.hasHandle ? `
        <g>
          <!-- Handle bar -->
          <rect x="${handleX - 4}" y="${handleYTop}" width="8" height="${handleYBottom - handleYTop}" 
                fill="#FFD700" stroke="#B8860B" stroke-width="2" rx="4"/>
          
          <!-- Top mounting point -->
          <circle cx="${handleX}" cy="${handleYTop}" r="6" fill="#FFD700" stroke="#B8860B" stroke-width="2"/>
          <circle cx="${handleX}" cy="${handleYTop}" r="2" fill="#B8860B"/>
          
          <!-- Bottom mounting point -->
          <circle cx="${handleX}" cy="${handleYBottom}" r="6" fill="#FFD700" stroke="#B8860B" stroke-width="2"/>
          <circle cx="${handleX}" cy="${handleYBottom}" r="2" fill="#B8860B"/>
          
          <!-- Middle mounting points -->
          <circle cx="${handleX}" cy="${(handleYTop + handleYBottom) / 2}" r="6" fill="#FFD700" stroke="#B8860B" stroke-width="2"/>
          <circle cx="${handleX}" cy="${(handleYTop + handleYBottom) / 2}" r="2" fill="#B8860B"/>
          
          <!-- Handle callout arrow -->
          <line x1="${handleX + 15}" y1="${(handleYTop + handleYBottom) / 2}" 
                x2="${handleX + 50}" y2="${(handleYTop + handleYBottom) / 2}" 
                stroke="#FF6B35" stroke-width="1.5"/>
          <polygon points="${handleX + 50},${(handleYTop + handleYBottom) / 2 - 4} ${handleX + 50},${(handleYTop + handleYBottom) / 2 + 4} ${handleX + 58},${(handleYTop + handleYBottom) / 2}" 
                   fill="#FF6B35"/>
          
          <!-- Handle label -->
          <text x="${handleX + 65}" y="${(handleYTop + handleYBottom) / 2 - 8}" 
                font-size="10" font-family="Arial, sans-serif" font-weight="bold" fill="#FF6B35">
            FULL LENGTH HANDLE
          </text>
          <text x="${handleX + 65}" y="${(handleYTop + handleYBottom) / 2 + 5}" 
                font-size="9" font-family="Arial, sans-serif" fill="#666">
            Position: ${handleSide}
          </text>
          <text x="${handleX + 65}" y="${(handleYTop + handleYBottom) / 2 + 17}" 
                font-size="9" font-family="Arial, sans-serif" fill="#666">
            Code: ${handleProfile?.code || 'N/A'}
          </text>
        </g>
      ` : ''}
      
      <!-- Dividers -->
      ${dividersHTML}
      
      <!-- Hinges with measurements -->
      ${hingesHTML}
      
      <!-- Width Dimension (top) -->
      <line x1="${offsetX - 30}" y1="${offsetY - 35}" x2="${offsetX}" y2="${offsetY - 35}" 
            stroke="#9C27B0" stroke-width="1.5"/>
      <line x1="${offsetX}" y1="${offsetY - 35}" x2="${offsetX + scaledWidth}" y2="${offsetY - 35}" 
            stroke="#9C27B0" stroke-width="2" marker-start="url(#arrowStart)" marker-end="url(#arrowEnd)"/>
      <line x1="${offsetX + scaledWidth}" y1="${offsetY - 35}" x2="${offsetX + scaledWidth + 30}" y2="${offsetY - 35}" 
            stroke="#9C27B0" stroke-width="1.5"/>
      
      <!-- Width dimension box -->
      <rect x="${offsetX + scaledWidth / 2 - 45}" y="${offsetY - 48}" width="90" height="20" 
            fill="#FFF" stroke="#9C27B0" stroke-width="2"/>
      <text x="${offsetX + scaledWidth / 2}" y="${offsetY - 32}" text-anchor="middle" 
            font-size="13" font-family="Arial, sans-serif" font-weight="bold" fill="#000">
        WIDTH: ${Math.round(doorWidthMm)}mm
      </text>
      
      <!-- Height Dimension (right side) - Complete breakdown -->
      <g>
        <!-- Main dimension line -->
        <line x1="${offsetX + scaledWidth + 50}" y1="${offsetY - 30}" 
              x2="${offsetX + scaledWidth + 50}" y2="${offsetY}" 
              stroke="#9C27B0" stroke-width="1.5"/>
        <line x1="${offsetX + scaledWidth + 50}" y1="${offsetY}" 
              x2="${offsetX + scaledWidth + 50}" y2="${offsetY + scaledHeight}" 
              stroke="#9C27B0" stroke-width="2" marker-start="url(#arrowStart)" marker-end="url(#arrowEnd)"/>
        <line x1="${offsetX + scaledWidth + 50}" y1="${offsetY + scaledHeight}" 
              x2="${offsetX + scaledWidth + 50}" y2="${offsetY + scaledHeight + 30}" 
              stroke="#9C27B0" stroke-width="1.5"/>
        
        <!-- Total height dimension box -->
        <rect x="${offsetX + scaledWidth + 58}" y="${offsetY + scaledHeight / 2 - 10}" width="100" height="20" 
              fill="#FFF" stroke="#9C27B0" stroke-width="2"/>
        <text x="${offsetX + scaledWidth + 108}" y="${offsetY + scaledHeight / 2 + 5}" text-anchor="middle" 
              font-size="13" font-family="Arial, sans-serif" font-weight="bold" fill="#000">
          HEIGHT: ${Math.round(doorHeightMm)}mm
        </text>
      </g>
      
      <!-- Left side vertical breakdown with handle clearances -->
      ${door.hasHandle ? `
      <g>
        <!-- Extension lines -->
        <line x1="${offsetX}" y1="${offsetY}" x2="${offsetX - 40}" y2="${offsetY}" 
              stroke="#9C27B0" stroke-width="1"/>
        <line x1="${offsetX}" y1="${handleYTop}" x2="${offsetX - 40}" y2="${handleYTop}" 
              stroke="#9C27B0" stroke-width="1"/>
        <line x1="${offsetX}" y1="${handleYBottom}" x2="${offsetX - 40}" y2="${handleYBottom}" 
              stroke="#9C27B0" stroke-width="1"/>
        <line x1="${offsetX}" y1="${offsetY + scaledHeight}" x2="${offsetX - 40}" y2="${offsetY + scaledHeight}" 
              stroke="#9C27B0" stroke-width="1"/>
        
        <!-- Top clearance dimension -->
        <line x1="${offsetX - 35}" y1="${offsetY}" x2="${offsetX - 35}" y2="${handleYTop}" 
              stroke="#9C27B0" stroke-width="1.5" marker-start="url(#arrowStart)" marker-end="url(#arrowEnd)"/>
        <rect x="${offsetX - 70}" y="${(offsetY + handleYTop) / 2 - 8}" width="30" height="16" 
              fill="#FFF" stroke="#9C27B0" stroke-width="1"/>
        <text x="${offsetX - 55}" y="${(offsetY + handleYTop) / 2 + 4}" text-anchor="middle" 
              font-size="9" font-family="Arial, sans-serif" font-weight="bold" fill="#000">
          ${Math.round(handleTopClearance)}
        </text>
        
        <!-- Handle length dimension -->
        <line x1="${offsetX - 25}" y1="${handleYTop}" x2="${offsetX - 25}" y2="${handleYBottom}" 
              stroke="#FFD700" stroke-width="2.5"/>
        <rect x="${offsetX - 60}" y="${(handleYTop + handleYBottom) / 2 - 8}" width="30" height="16" 
              fill="#FFF" stroke="#FFD700" stroke-width="1"/>
        <text x="${offsetX - 45}" y="${(handleYTop + handleYBottom) / 2 + 4}" text-anchor="middle" 
              font-size="9" font-family="Arial, sans-serif" font-weight="bold" fill="#000">
          ${Math.round(handleLength)}
        </text>
        
        <!-- Bottom clearance dimension -->
        <line x1="${offsetX - 35}" y1="${handleYBottom}" x2="${offsetX - 35}" y2="${offsetY + scaledHeight}" 
              stroke="#9C27B0" stroke-width="1.5" marker-start="url(#arrowStart)" marker-end="url(#arrowEnd)"/>
        <rect x="${offsetX - 70}" y="${(handleYBottom + offsetY + scaledHeight) / 2 - 8}" width="30" height="16" 
              fill="#FFF" stroke="#9C27B0" stroke-width="1"/>
        <text x="${offsetX - 55}" y="${(handleYBottom + offsetY + scaledHeight) / 2 + 4}" text-anchor="middle" 
              font-size="9" font-family="Arial, sans-serif" font-weight="bold" fill="#000">
          ${Math.round(handleBottomClearance)}
        </text>
        
        <!-- Labels -->
        <text x="${offsetX - 75}" y="${(offsetY + handleYTop) / 2}" text-anchor="end" 
              font-size="8" font-family="Arial, sans-serif" fill="#666">
          TOP CLEARANCE
        </text>
        <text x="${offsetX - 65}" y="${(handleYTop + handleYBottom) / 2}" text-anchor="end" 
              font-size="8" font-family="Arial, sans-serif" fill="#B8860B" font-weight="bold">
          HANDLE LENGTH
        </text>
        <text x="${offsetX - 75}" y="${(handleYBottom + offsetY + scaledHeight) / 2}" text-anchor="end" 
              font-size="8" font-family="Arial, sans-serif" fill="#666">
          BOTTOM CLEARANCE
        </text>
      </g>
      ` : ''}
      
      <!-- Technical Notes Box -->
      <g>
        <rect x="30" y="${height - 170}" width="${width - 60}" height="150" 
              fill="#F5F5F5" stroke="#000" stroke-width="2"/>
        <rect x="30" y="${height - 170}" width="${width - 60}" height="28" 
              fill="#000"/>
        <text x="${width / 2}" y="${height - 149}" text-anchor="middle" 
              font-size="13" font-family="Arial, sans-serif" font-weight="bold" fill="#FFF">
          TECHNICAL SPECIFICATIONS
        </text>
        
        <!-- Specification grid -->
        <text x="45" y="${height - 125}" font-size="10" font-family="Arial, sans-serif" font-weight="bold" fill="#000">
          ITEM
        </text>
        <text x="180" y="${height - 125}" font-size="10" font-family="Arial, sans-serif" font-weight="bold" fill="#000">
          SPECIFICATION
        </text>
        <text x="420" y="${height - 125}" font-size="10" font-family="Arial, sans-serif" font-weight="bold" fill="#000">
          CODE
        </text>
        
        <line x1="40" y1="${height - 118}" x2="${width - 40}" y2="${height - 118}" stroke="#000" stroke-width="1"/>
        
        <!-- Rows -->
        <text x="45" y="${height - 103}" font-size="9" font-family="Arial, sans-serif" fill="#333">Door Type:</text>
        <text x="180" y="${height - 103}" font-size="9" font-family="Arial, sans-serif" fill="#666">${door.doorType.toUpperCase()}</text>
        <text x="420" y="${height - 103}" font-size="9" font-family="Arial, sans-serif" fill="#666">-</text>
        
        <text x="45" y="${height - 88}" font-size="9" font-family="Arial, sans-serif" fill="#333">Frame Profile:</text>
        <text x="180" y="${height - 88}" font-size="9" font-family="Arial, sans-serif" fill="#666">${frameProfile?.name || 'N/A'}</text>
        <text x="420" y="${height - 88}" font-size="9" font-family="Arial, sans-serif" fill="#666">${frameProfile?.code || 'N/A'}</text>
        
        <text x="45" y="${height - 73}" font-size="9" font-family="Arial, sans-serif" fill="#333">Handle:</text>
        <text x="180" y="${height - 73}" font-size="9" font-family="Arial, sans-serif" fill="#666">${handleProfile?.name || 'None'}</text>
        <text x="420" y="${height - 73}" font-size="9" font-family="Arial, sans-serif" fill="#666">${handleProfile?.code || 'N/A'}</text>
        
        <text x="45" y="${height - 58}" font-size="9" font-family="Arial, sans-serif" fill="#333">Hinge:</text>
        <text x="180" y="${height - 58}" font-size="9" font-family="Arial, sans-serif" fill="#666">${hingeProduct?.name || 'Standard'}</text>
        <text x="420" y="${height - 58}" font-size="9" font-family="Arial, sans-serif" fill="#666">${hingeProduct?.code || door.hingeCode || 'N/A'}</text>
        
        <text x="45" y="${height - 43}" font-size="9" font-family="Arial, sans-serif" fill="#333">Quantity:</text>
        <text x="180" y="${height - 43}" font-size="9" font-family="Arial, sans-serif" fill="#666">${door.quantity} Unit${door.quantity > 1 ? 's' : ''}</text>
        <text x="420" y="${height - 43}" font-size="9" font-family="Arial, sans-serif" fill="#666">-</text>
        
        <text x="45" y="${height - 28}" font-size="9" font-family="Arial, sans-serif" fill="#333">Hinge Position:</text>
        <text x="180" y="${height - 28}" font-size="9" font-family="Arial, sans-serif" fill="#666">${hingeSide.toUpperCase()} | Count: ${hingePositions.length}</text>
        <text x="420" y="${height - 28}" font-size="9" font-family="Arial, sans-serif" fill="#666">-</text>
      </g>
      
      <!-- Footer -->
      <text x="${width / 2}" y="${height - 8}" text-anchor="middle" 
            font-size="9" font-family="Arial, sans-serif" fill="#999">
        QIRO Glass Solutions | All dimensions in millimetres (mm) | Not to scale
      </text>
    </svg>
  `;
};
