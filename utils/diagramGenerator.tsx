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
      
      const handleY = door.handlePosition === 'bottom'
        ? offsetY + scaledHeight - scaledFrameThickness / 2
        : offsetY + ((door.handleOffset || 500) * scale);
      const handleHeight = door.handlePosition === 'bottom' ? scaledWidth * 0.3 : scaledHeight * 0.6;
      
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
              {door.handlePosition === 'bottom' ? (
                <>
                  <rect x={handleX - handleHeight / 2} y={handleY - 3} width={handleHeight} height={6} fill="#FFD700" stroke="#DAA520" strokeWidth="1" rx="2" />
                  <circle cx={handleX} cy={handleY} r={8} fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
                </>
              ) : (
                <>
                  <rect x={handleX - 3} y={handleY} width={6} height={handleHeight} fill="#FFD700" stroke="#DAA520" strokeWidth="1" rx="2" />
                  <circle cx={handleX} cy={handleY + handleHeight / 2} r={8} fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
                </>
              )}
            </g>
          )}
          
          {/* 3 Lines on handle side */}
          {door.handlePosition === 'left' && (
            <g>
              <line x1={offsetX + 2} y1={offsetY + scaledHeight * 0.25} x2={offsetX + 2} y2={offsetY + scaledHeight * 0.35} stroke="#FFD700" strokeWidth="3" />
              <line x1={offsetX + 2} y1={offsetY + scaledHeight * 0.45} x2={offsetX + 2} y2={offsetY + scaledHeight * 0.55} stroke="#FFD700" strokeWidth="3" />
              <line x1={offsetX + 2} y1={offsetY + scaledHeight * 0.65} x2={offsetX + 2} y2={offsetY + scaledHeight * 0.75} stroke="#FFD700" strokeWidth="3" />
            </g>
          )}
          {door.handlePosition === 'right' && (
            <g>
              <line x1={offsetX + scaledWidth - 2} y1={offsetY + scaledHeight * 0.25} x2={offsetX + scaledWidth - 2} y2={offsetY + scaledHeight * 0.35} stroke="#FFD700" strokeWidth="3" />
              <line x1={offsetX + scaledWidth - 2} y1={offsetY + scaledHeight * 0.45} x2={offsetX + scaledWidth - 2} y2={offsetY + scaledHeight * 0.55} stroke="#FFD700" strokeWidth="3" />
              <line x1={offsetX + scaledWidth - 2} y1={offsetY + scaledHeight * 0.65} x2={offsetX + scaledWidth - 2} y2={offsetY + scaledHeight * 0.75} stroke="#FFD700" strokeWidth="3" />
            </g>
          )}
          {door.handlePosition === 'bottom' && (
            <g>
              <line x1={offsetX + scaledWidth * 0.25} y1={offsetY + scaledHeight - 2} x2={offsetX + scaledWidth * 0.35} y2={offsetY + scaledHeight - 2} stroke="#FFD700" strokeWidth="3" />
              <line x1={offsetX + scaledWidth * 0.45} y1={offsetY + scaledHeight - 2} x2={offsetX + scaledWidth * 0.55} y2={offsetY + scaledHeight - 2} stroke="#FFD700" strokeWidth="3" />
              <line x1={offsetX + scaledWidth * 0.65} y1={offsetY + scaledHeight - 2} x2={offsetX + scaledWidth * 0.75} y2={offsetY + scaledHeight - 2} stroke="#FFD700" strokeWidth="3" />
            </g>
          )}
          
          {/* Hinges */}
          {door.hingePosition !== 'none' && door.hingePosition !== 'top' && (
            <>
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
            </>
          )}
          {door.hingePosition === 'top' && (
            <>
              <circle cx={offsetX + scaledWidth * 0.25} cy={offsetY} r={6} fill="#666" stroke="#333" strokeWidth="1" />
              <circle cx={offsetX + scaledWidth * 0.25} cy={offsetY} r={3} fill="#333" />
              <circle cx={offsetX + scaledWidth * 0.75} cy={offsetY} r={6} fill="#666" stroke="#333" strokeWidth="1" />
              <circle cx={offsetX + scaledWidth * 0.75} cy={offsetY} r={3} fill="#333" />
              {(door.hingeQuantity || 2) >= 3 && (
                <>
                  <circle cx={offsetX + scaledWidth / 2} cy={offsetY} r={6} fill="#666" stroke="#333" strokeWidth="1" />
                  <circle cx={offsetX + scaledWidth / 2} cy={offsetY} r={3} fill="#333" />
                </>
              )}
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
  const glassType = masterData.glassTypes.find(g => g.code === door.glassTypeCode);
  const slidingBundle = masterData.slidingBundles?.find(b => b.code === door.slidingSystemCode);
  
  const width = 700;
  const height = 850;
  const padding = 120;
  const scale = Math.min(
    (width - 2 * padding) / doorWidthMm,
    (height - 2 * padding - 120) / doorHeightMm
  );
  
  const scaledWidth = doorWidthMm * scale;
  const scaledHeight = doorHeightMm * scale;
  
  const offsetX = (width - scaledWidth) / 2;
  const offsetY = padding + 50;
  
  // Frame profile width for double-line rendering
  const frameThickness = (frameProfile?.width || 40) * scale;
  const frameInnerGap = 3; // Gap between double lines
  
  // Handle calculations
  const handleSide = door.handlePosition === 'left' ? 'LEFT' : 
                     door.handlePosition === 'right' ? 'RIGHT' : 
                     door.handlePosition === 'bottom' ? 'BOTTOM' : 'NONE';
  const handleOffset = door.handleOffset || 100;
  const handleTopClearance = handleOffset;
  const handleBottomClearance = doorHeightMm - handleOffset - (doorHeightMm - 2 * handleOffset);
  const handleLength = doorHeightMm - handleTopClearance - handleBottomClearance;
  
  const handleX = door.handlePosition === 'left' 
    ? offsetX + 5
    : door.handlePosition === 'right'
    ? offsetX + scaledWidth - 5
    : offsetX + scaledWidth / 2;
  const handleYTop = door.handlePosition === 'bottom' 
    ? offsetY + scaledHeight - 10
    : offsetY + (handleTopClearance * scale);
  const handleYBottom = door.handlePosition === 'bottom'
    ? offsetY + scaledHeight - 5
    : offsetY + scaledHeight - (handleBottomClearance * scale);
  
  // Hinge positions
  const hingePositions = door.hingePositionMm || [];
  const hingeSide = door.hingePosition || 'left';
  const hingeX = hingeSide === 'left' ? offsetX : offsetX + scaledWidth;
  
  // Divider positions
  const dividerHorizontal = door.dividerConfig?.horizontal || [];
  const dividerVertical = door.dividerConfig?.vertical || [];

  // Generate door-type specific content
  let doorSpecificHTML = '';
  
  if (door.doorType === 'sliding') {
    // Sliding door - show track and overlapping panels
    const panelWidth = scaledWidth * 0.55;
    const handleSideIsLeft = door.handlePosition === 'left';
    const handleSideIsRight = door.handlePosition === 'right';
    
    doorSpecificHTML = `
      <!-- Sliding Track -->
      <rect x="${offsetX - 10}" y="${offsetY - 15}" width="${scaledWidth + 20}" height="8" 
            fill="#999" stroke="#666" stroke-width="1.5"/>
      <text x="${offsetX + scaledWidth / 2}" y="${offsetY - 20}" text-anchor="middle" 
            font-size="8" font-family="Arial, sans-serif" fill="#666">
        SLIDING TRACK
      </text>
      
      <!-- Back Panel (lighter) -->
      <rect x="${offsetX + scaledWidth - panelWidth}" y="${offsetY}" width="${panelWidth}" height="${scaledHeight}" 
            fill="none" stroke="#999" stroke-width="2" opacity="0.5"/>
      <rect x="${offsetX + scaledWidth - panelWidth + frameThickness}" y="${offsetY + frameThickness}" 
            width="${panelWidth - 2 * frameThickness}" height="${scaledHeight - 2 * frameThickness}" 
            fill="none" stroke="#999" stroke-width="1.5" opacity="0.5"/>
      
      <!-- Front Panel (darker) -->
      <rect x="${offsetX}" y="${offsetY}" width="${panelWidth}" height="${scaledHeight}" 
            fill="none" stroke="#000" stroke-width="2.5"/>
      <rect x="${offsetX + frameThickness}" y="${offsetY + frameThickness}" 
            width="${panelWidth - 2 * frameThickness}" height="${scaledHeight - 2 * frameThickness}" 
            fill="none" stroke="#000" stroke-width="2"/>
      
      <!-- Third line on handle side (front panel) -->
      ${handleSideIsLeft ? `
        <line x1="${offsetX + frameInnerGap}" y1="${offsetY}" 
              x2="${offsetX + frameInnerGap}" y2="${offsetY + scaledHeight}" 
              stroke="#000" stroke-width="1.5"/>
      ` : handleSideIsRight ? `
        <line x1="${offsetX + panelWidth - frameInnerGap}" y1="${offsetY}" 
              x2="${offsetX + panelWidth - frameInnerGap}" y2="${offsetY + scaledHeight}" 
              stroke="#000" stroke-width="1.5"/>
      ` : ''}
      
      <!-- Sliding direction arrow -->
      <line x1="${offsetX + panelWidth / 2}" y1="${offsetY + scaledHeight + 25}" 
            x2="${offsetX + panelWidth / 2 + 60}" y2="${offsetY + scaledHeight + 25}" 
            stroke="#4CAF50" stroke-width="2" marker-end="url(#arrowSlide)"/>
      <text x="${offsetX + panelWidth / 2 + 70}" y="${offsetY + scaledHeight + 30}" 
            font-size="9" font-family="Arial, sans-serif" fill="#4CAF50" font-weight="bold">
        SLIDE DIRECTION
      </text>
    `;
  } else if (door.doorType === 'pin-hinge' || door.doorType === 'air-hinge') {
    // Bi-fold/Pin-hinge door - show fold line and panels
    const panelWidth = scaledWidth / 2;
    const handleSideIsLeft = door.handlePosition === 'left';
    const handleSideIsRight = door.handlePosition === 'right';
    
    doorSpecificHTML = `
      <!-- Left Panel -->
      <rect x="${offsetX}" y="${offsetY}" width="${panelWidth}" height="${scaledHeight}" 
            fill="none" stroke="#000" stroke-width="2.5"/>
      <rect x="${offsetX + frameThickness}" y="${offsetY + frameThickness}" 
            width="${panelWidth - 2 * frameThickness}" height="${scaledHeight - 2 * frameThickness}" 
            fill="none" stroke="#000" stroke-width="2"/>
      ${handleSideIsLeft ? `
        <line x1="${offsetX + frameInnerGap}" y1="${offsetY}" 
              x2="${offsetX + frameInnerGap}" y2="${offsetY + scaledHeight}" 
              stroke="#000" stroke-width="1.5"/>
      ` : ''}
      
      <!-- Right Panel -->
      <rect x="${offsetX + panelWidth}" y="${offsetY}" width="${panelWidth}" height="${scaledHeight}" 
            fill="none" stroke="#000" stroke-width="2.5"/>
      <rect x="${offsetX + panelWidth + frameThickness}" y="${offsetY + frameThickness}" 
            width="${panelWidth - 2 * frameThickness}" height="${scaledHeight - 2 * frameThickness}" 
            fill="none" stroke="#000" stroke-width="2"/>
      ${handleSideIsRight ? `
        <line x1="${offsetX + scaledWidth - frameInnerGap}" y1="${offsetY}" 
              x2="${offsetX + scaledWidth - frameInnerGap}" y2="${offsetY + scaledHeight}" 
              stroke="#000" stroke-width="1.5"/>
      ` : ''}
      
      <!-- Center fold line -->
      <line x1="${offsetX + panelWidth}" y1="${offsetY}" 
            x2="${offsetX + panelWidth}" y2="${offsetY + scaledHeight}" 
            stroke="#FF6B35" stroke-width="2" stroke-dasharray="10,5"/>
      <text x="${offsetX + panelWidth}" y="${offsetY - 5}" text-anchor="middle" 
            font-size="8" font-family="Arial, sans-serif" fill="#FF6B35" font-weight="bold">
        FOLD LINE
      </text>
      
      <!-- Folding arrows -->
      <path d="M ${offsetX + panelWidth - 30} ${offsetY + scaledHeight / 3} 
               Q ${offsetX + panelWidth - 15} ${offsetY + scaledHeight / 3 - 20}, 
                 ${offsetX + panelWidth} ${offsetY + scaledHeight / 3 - 25}" 
            stroke="#4CAF50" stroke-width="2" fill="none" marker-end="url(#arrowSlide)"/>
      <path d="M ${offsetX + panelWidth + 30} ${offsetY + 2 * scaledHeight / 3} 
               Q ${offsetX + panelWidth + 15} ${offsetY + 2 * scaledHeight / 3 + 20}, 
                 ${offsetX + panelWidth} ${offsetY + 2 * scaledHeight / 3 + 25}" 
            stroke="#4CAF50" stroke-width="2" fill="none" marker-end="url(#arrowSlide)"/>
    `;
  } else {
    // Standard openable door
    const handleSideIsLeft = door.handlePosition === 'left';
    const handleSideIsRight = door.handlePosition === 'right';
    const handleSideIsBottom = door.handlePosition === 'bottom';
    
    doorSpecificHTML = `
      <!-- Outer frame outline (main body) -->
      <rect x="${offsetX}" y="${offsetY}" width="${scaledWidth}" height="${scaledHeight}" 
            fill="none" stroke="#000" stroke-width="2.5"/>
      
      <!-- Inner frame line (creates double-line effect) -->
      <rect x="${offsetX + frameThickness}" y="${offsetY + frameThickness}" 
            width="${scaledWidth - 2 * frameThickness}" height="${scaledHeight - 2 * frameThickness}" 
            fill="none" stroke="#000" stroke-width="2"/>
      
      <!-- Third line on handle side (scaled properly with frame thickness) -->
      ${handleSideIsLeft ? `
        <line x1="${offsetX + frameThickness / 2}" y1="${offsetY}" 
              x2="${offsetX + frameThickness / 2}" y2="${offsetY + scaledHeight}" 
              stroke="#000" stroke-width="1.5"/>
      ` : handleSideIsRight ? `
        <line x1="${offsetX + scaledWidth - frameThickness / 2}" y1="${offsetY}" 
              x2="${offsetX + scaledWidth - frameThickness / 2}" y2="${offsetY + scaledHeight}" 
              stroke="#000" stroke-width="1.5"/>
      ` : handleSideIsBottom ? `
        <line x1="${offsetX}" y1="${offsetY + scaledHeight - frameThickness / 2}" 
              x2="${offsetX + scaledWidth}" y2="${offsetY + scaledHeight - frameThickness / 2}" 
              stroke="#000" stroke-width="1.5"/>
      ` : ''}
    `;
  }
  
  // Generate hinge callouts - with prominent dark spots
  let hingesHTML = '';
  
  if (hingeSide === 'top') {
    // Top hinges - draw horizontally along the top edge
    // Distribute evenly based on number of hinges
    const hingeCount = hingePositions.length || 2;
    const spacing = scaledWidth / (hingeCount + 1);
    
    for (let i = 0; i < hingeCount; i++) {
      const scaledX = offsetX + spacing * (i + 1);
      const labelY = offsetY - 50;
      hingesHTML += `
        <g>
          <!-- Hinge mounting point as dark olive spot on top frame -->
          <circle cx="${scaledX}" cy="${offsetY}" r="8" fill="#3d5a3d" stroke="#000" stroke-width="2.5"/>
          <circle cx="${scaledX}" cy="${offsetY}" r="3" fill="#1a1a1a"/>
          
          <!-- Leader line -->
          <line x1="${scaledX}" y1="${offsetY - 8}" 
                x2="${scaledX}" y2="${labelY + 8}" 
                stroke="#666" stroke-width="1.5"/>
          
          <!-- Hinge label -->
          <rect x="${scaledX - 25}" y="${labelY - 10}" 
                width="50" height="16" fill="#FFF" stroke="#666" stroke-width="1"/>
          <text x="${scaledX}" y="${labelY }" text-anchor="middle" 
                font-size="8" font-family="Arial, sans-serif" font-weight="bold" fill="#000">
            HINGE ${i + 1}
          </text>
        </g>
      `;
    }
  } else {
    // Left/Right hinges - draw vertically along the side
    hingePositions.forEach((positionMm, index) => {
      const scaledY = offsetY + (positionMm * scale);
      if (scaledY >= offsetY && scaledY <= offsetY + scaledHeight) {
        const labelX = hingeX + (hingeSide === 'left' ? -60 : 60);
        hingesHTML += `
          <g>
            <!-- Hinge mounting point as dark olive spot on frame -->
            <circle cx="${hingeX}" cy="${scaledY}" r="8" fill="#3d5a3d" stroke="#000" stroke-width="2.5"/>
            <circle cx="${hingeX}" cy="${scaledY}" r="3" fill="#1a1a1a"/>
            
            <!-- Leader line -->
            <line x1="${hingeX + (hingeSide === 'left' ? -10 : 10)}" y1="${scaledY}" 
                  x2="${labelX - (hingeSide === 'left' ? 8 : -8)}" y2="${scaledY}" 
                  stroke="#666" stroke-width="1.5"/>
            
            <!-- Hinge label -->
            <rect x="${labelX - (hingeSide === 'left' ? 50 : -2)}" y="${scaledY - 12}" 
                  width="50" height="24" fill="#FFF" stroke="#666" stroke-width="1"/>
            <text x="${labelX - (hingeSide === 'left' ? 25 : -27)}" y="${scaledY - 2}" text-anchor="middle" 
                  font-size="8" font-family="Arial, sans-serif" font-weight="bold" fill="#000">
              HINGE ${index + 1}
            </text>
            <text x="${labelX - (hingeSide === 'left' ? 25 : -27)}" y="${scaledY + 8}" text-anchor="middle" 
                  font-size="7" font-family="Arial, sans-serif" fill="#666">
              ${hingeProduct?.code || door.hingeCode || 'STD'}
            </text>
          </g>
        `;
      }
    });
  }
  
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
        <!-- Cleaner arrow markers -->
        <marker id="arrowStart" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto">
          <polygon points="8 0, 8 8, 0 4" fill="#666"/>
        </marker>
        <marker id="arrowEnd" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
          <polygon points="0 0, 8 4, 0 8" fill="#666"/>
        </marker>
        <!-- Green arrow for door motion indicators -->
        <marker id="arrowSlide" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
          <polygon points="0 0, 10 5, 0 10" fill="#28A745"/>
        </marker>
      </defs>
      
      <!-- White background -->
      <rect width="${width}" height="${height}" fill="#FFFFFF"/>
      
      <!-- Title Block -->
      <text x="${width / 2}" y="30" text-anchor="middle" 
            font-size="16" font-family="Arial, sans-serif" font-weight="bold" fill="#000">
        WARDROBE SHUTTER - ELEVATION DRAWING
      </text>
      <text x="${width / 2}" y="48" text-anchor="middle" 
            font-size="10" font-family="Arial, sans-serif" fill="#666">
        ${door.doorName.toUpperCase()} | ${door.doorType.toUpperCase()}
      </text>
      
      <!-- DOOR TYPE SPECIFIC RENDERING -->
      ${doorSpecificHTML}
      
      <!-- FRAME PROFILE CALLOUT (Top Left) -->
      <g>
        <line x1="${offsetX + 15}" y1="${offsetY + 5}" 
              x2="${offsetX - 35}" y2="${offsetY - 30}" 
              stroke="#0066CC" stroke-width="0.8"/>
        <text x="${offsetX - 85}" y="${offsetY - 43}" text-anchor="middle"
              font-size="8" font-family="Arial, sans-serif" font-weight="bold" fill="#0066CC">
          FRAME PROFILE
        </text>
        <text x="${offsetX - 85}" y="${offsetY - 30}" text-anchor="middle"
              font-size="7" font-family="Arial, sans-serif" fill="#666">
          ${frameProfile?.name || 'N/A'}
        </text>
        <text x="${offsetX - 85}" y="${offsetY - 36.5}" text-anchor="middle"
              font-size="7" font-family="Arial, sans-serif" fill="#666">
          Code: ${frameProfile?.code || 'N/A'}
        </text>
      </g>
      
      <!-- GLASS LABEL (Top Right) -->
      <g>
        <line x1="${offsetX + scaledWidth - 15}" y1="${offsetY + scaledHeight / 3}" 
              x2="${offsetX + scaledWidth + 35}" y2="${offsetY + scaledHeight / 3 - 20}" 
              stroke="#FF8C00" stroke-width="0.8"/>
        <text x="${offsetX + scaledWidth + 75}" y="${offsetY + scaledHeight / 3 - 33}" text-anchor="middle"
              font-size="8" font-family="Arial, sans-serif" font-weight="bold" fill="#FF8C00">
          GLASS
        </text>
        <text x="${offsetX + scaledWidth + 75}" y="${offsetY + scaledHeight / 3 - 20}" text-anchor="middle"
              font-size="7" font-family="Arial, sans-serif" fill="#666">
          ${glassType?.name || 'Clear Glass'}
        </text>
        <text x="${offsetX + scaledWidth + 75}" y="${offsetY + scaledHeight / 3 - 26.5}" text-anchor="middle"
              font-size="7" font-family="Arial, sans-serif" fill="#666">
          ${glassType?.code || 'GL003'}
        </text>
      </g>
      
      <!-- Handle callout (no visible handle bar, just label) -->
      ${door.hasHandle ? `
        <g>
          <!-- Handle callout line -->
          <line x1="${handleX + (door.handlePosition === 'bottom' ? 0 : door.handlePosition === 'right' ? -8 : 8)}" y1="${door.handlePosition === 'bottom' ? offsetY + scaledHeight + 15 : (handleYTop + handleYBottom) / 2}" 
                x2="${handleX + (door.handlePosition === 'bottom' ? 0 : door.handlePosition === 'right' ? -45 : 45)}" y2="${door.handlePosition === 'bottom' ? offsetY + scaledHeight + 35 : (handleYTop + handleYBottom) / 2}" 
                stroke="#B8860B" stroke-width="0.8"/>
          
          <!-- Handle label -->
          <text x="${handleX + (door.handlePosition === 'bottom' ? 0 : door.handlePosition === 'right' ? -85 : 85)}" y="${door.handlePosition === 'bottom' ? offsetY + scaledHeight + 42 : (handleYTop + handleYBottom) / 2 - 10}" 
                text-anchor="middle" font-size="8" font-family="Arial, sans-serif" font-weight="bold" fill="#B8860B">
            HANDLE
          </text>
          <text x="${handleX + (door.handlePosition === 'bottom' ? 0 : door.handlePosition === 'right' ? -85 : 85)}" y="${door.handlePosition === 'bottom' ? offsetY + scaledHeight + 55 : (handleYTop + handleYBottom) / 2 + 3}" 
                text-anchor="middle" font-size="7" font-family="Arial, sans-serif" fill="#666">
            ${handleProfile?.name || 'Standard Handle Profile'}
          </text>
          <text x="${handleX + (door.handlePosition === 'bottom' ? 0 : door.handlePosition === 'right' ? -85 : 85)}" y="${door.handlePosition === 'bottom' ? offsetY + scaledHeight + 48.5 : (handleYTop + handleYBottom) / 2 - 3.5}" 
                text-anchor="middle" font-size="7" font-family="Arial, sans-serif" fill="#666">
            ${handleProfile?.code || 'HP001'}
          </text>
        </g>
      ` : ''}
      
      <!-- Dividers -->
      ${dividersHTML}
      
      <!-- Hinges with measurements -->
      ${hingesHTML}
      
      <!-- Width Dimension (top) - Minimal style -->
      <g>
        <line x1="${offsetX}" y1="${offsetY - 25}" x2="${offsetX + scaledWidth}" y2="${offsetY - 25}" 
              stroke="#666" stroke-width="1" marker-start="url(#arrowStart)" marker-end="url(#arrowEnd)"/>
        <rect x="${offsetX + scaledWidth / 2 - 40}" y="${offsetY - 37}" width="80" height="18" 
              fill="#FFF" stroke="#666" stroke-width="1"/>
        <text x="${offsetX + scaledWidth / 2}" y="${offsetY - 24}" text-anchor="middle" 
              font-size="8" font-family="Arial, sans-serif" font-weight="bold" fill="#000">
          WIDTH: ${Math.round(doorWidthMm)}mm
        </text>
      </g>
      
      <!-- Height Dimension (right side) - Minimal style -->
      <g>
        <line x1="${offsetX + scaledWidth + 30}" y1="${offsetY}" 
              x2="${offsetX + scaledWidth + 30}" y2="${offsetY + scaledHeight}" 
              stroke="#666" stroke-width="1" marker-start="url(#arrowStart)" marker-end="url(#arrowEnd)"/>
        <rect x="${offsetX + scaledWidth + 38}" y="${offsetY + scaledHeight / 2 - 10}" width="90" height="20" 
              fill="#FFF" stroke="#666" stroke-width="1"/>
        <text x="${offsetX + scaledWidth + 80}" y="${offsetY + scaledHeight / 2 + 4}" text-anchor="middle" 
              font-size="8" font-family="Arial, sans-serif" font-weight="bold" fill="#000">
          HEIGHT: ${Math.round(doorHeightMm)}mm
        </text>
      </g>
      
      <!-- Left side handle clearances (if handle exists and not bottom position) -->
      <!-- Left side handle clearances removed as requested -->
      
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
