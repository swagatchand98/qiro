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
  
  // Handle position calculation
  const handleX = door.handlePosition === 'left' 
    ? offsetX + scaledFrameThickness / 2
    : door.handlePosition === 'right'
    ? offsetX + scaledWidth - scaledFrameThickness / 2
    : offsetX + scaledWidth / 2;
  
  const handleY = offsetY + (door.handleOffset * scale);
  const handleHeight = scaledHeight * 0.6; // Handle is 60% of door height
  
  // Hinge positions
  const hingeX = door.hingePosition === 'left' 
    ? offsetX 
    : offsetX + scaledWidth;
  
  const hingeTopY = offsetY + 50;
  const hingeBottomY = offsetY + scaledHeight - 50;
  
  // Format measurements for display
  const formatMeasurement = (value: number, unit: MeasurementUnit): string => {
    return unit === 'mm' ? `${Math.round(value)} mm` : `${value.toFixed(2)}"`;
  };
  
  const widthLabel = formatMeasurement(door.width, door.measurementUnit);
  const heightLabel = formatMeasurement(door.height, door.measurementUnit);
  
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
      
      {/* Door outer frame */}
      <rect
        x={offsetX}
        y={offsetY}
        width={scaledWidth}
        height={scaledHeight}
        fill="#8B4513"
        stroke="#654321"
        strokeWidth="2"
      />
      
      {/* Glass area */}
      <rect
        x={glassX}
        y={glassY}
        width={glassWidth}
        height={glassHeight}
        fill="url(#glassPattern)"
        stroke="#4A90E2"
        strokeWidth="1"
        opacity="0.8"
      />
      
      {/* Glass label */}
      <text
        x={glassX + glassWidth / 2}
        y={glassY + glassHeight / 2}
        textAnchor="middle"
        className="text-xs"
        fill="#4A90E2"
      >
        GLASS
      </text>
      
      {/* Handle (if present) */}
      {door.handlePosition !== 'none' && (
        <g>
          <rect
            x={handleX - 3}
            y={handleY}
            width={6}
            height={handleHeight}
            fill="#FFD700"
            stroke="#DAA520"
            strokeWidth="1"
            rx="2"
          />
          <circle
            cx={handleX}
            cy={handleY + handleHeight / 2}
            r={8}
            fill="#FFD700"
            stroke="#DAA520"
            strokeWidth="1"
          />
          <text
            x={handleX + 15}
            y={handleY + handleHeight / 2 + 4}
            className="text-xs"
            fill="#333"
          >
            Handle
          </text>
        </g>
      )}
      
      {/* Hinges */}
      <g>
        {/* Top hinge */}
        <circle cx={hingeX} cy={hingeTopY} r={6} fill="#666" stroke="#333" strokeWidth="1" />
        <circle cx={hingeX} cy={hingeTopY} r={3} fill="#333" />
        
        {/* Bottom hinge */}
        <circle cx={hingeX} cy={hingeBottomY} r={6} fill="#666" stroke="#333" strokeWidth="1" />
        <circle cx={hingeX} cy={hingeBottomY} r={3} fill="#333" />
        
        {/* Middle hinge (if 3+ hinges) */}
        {door.hingeQuantity >= 3 && (
          <>
            <circle 
              cx={hingeX} 
              cy={offsetY + scaledHeight / 2} 
              r={6} 
              fill="#666" 
              stroke="#333" 
              strokeWidth="1" 
            />
            <circle 
              cx={hingeX} 
              cy={offsetY + scaledHeight / 2} 
              r={3} 
              fill="#333" 
            />
          </>
        )}
        
        <text
          x={hingeX + (door.hingePosition === 'left' ? -25 : 15)}
          y={hingeTopY - 10}
          className="text-xs"
          fill="#333"
        >
          {door.hingeCode}
        </text>
      </g>
      
      {/* Width dimension line (top) */}
      <g>
        <line
          x1={offsetX}
          y1={offsetY - 30}
          x2={offsetX + scaledWidth}
          y2={offsetY - 30}
          stroke="#333"
          strokeWidth="1"
          markerStart="url(#arrowhead)"
          markerEnd="url(#arrowhead)"
        />
        <text
          x={offsetX + scaledWidth / 2}
          y={offsetY - 35}
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
      
      {/* Frame thickness indicator */}
      <g>
        <line
          x1={offsetX}
          y1={offsetY}
          x2={glassX}
          y2={glassY}
          stroke="#FF6B6B"
          strokeWidth="1"
          strokeDasharray="3,3"
        />
        <text
          x={offsetX + 5}
          y={offsetY + 15}
          className="text-xs"
          fill="#FF6B6B"
        >
          Frame: {frameThickness}mm
        </text>
      </g>
      
      {/* Opening direction indicator */}
      <g>
        {door.hingePosition === 'left' && (
          <path
            d={`M ${offsetX + scaledWidth - 20} ${offsetY + scaledHeight / 2} 
                Q ${offsetX + scaledWidth + 20} ${offsetY + scaledHeight / 2},
                  ${offsetX + scaledWidth - 20} ${offsetY + scaledHeight / 2 + 40}`}
            fill="none"
            stroke="#4CAF50"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
        )}
        {door.hingePosition === 'right' && (
          <path
            d={`M ${offsetX + 20} ${offsetY + scaledHeight / 2} 
                Q ${offsetX - 20} ${offsetY + scaledHeight / 2},
                  ${offsetX + 20} ${offsetY + scaledHeight / 2 + 40}`}
            fill="none"
            stroke="#4CAF50"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
        )}
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
export const generateDoorDiagramSVG = (door: DoorConfiguration): string => {
  const doorHeightMm = convertToMm(door.height, door.measurementUnit);
  const doorWidthMm = convertToMm(door.width, door.measurementUnit);
  
  const frameProfile = masterData.frameProfiles.find(f => f.code === door.frameProfileCode);
  const frameThickness = frameProfile?.width || 25;
  
  const width = 400;
  const height = 600;
  const padding = 60;
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
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
          <polygon points="0 0, 10 3, 0 6" fill="#333" />
        </marker>
      </defs>
      
      <text x="${width / 2}" y="20" text-anchor="middle" font-weight="600" font-size="14" fill="#333">
        ${door.doorName} - ${door.doorType.toUpperCase()}
      </text>
      
      <rect x="${offsetX}" y="${offsetY}" width="${scaledWidth}" height="${scaledHeight}" 
            fill="#8B4513" stroke="#654321" stroke-width="2" />
      
      <rect x="${glassX}" y="${glassY}" width="${glassWidth}" height="${glassHeight}" 
            fill="#E3F2FD" stroke="#4A90E2" stroke-width="1" opacity="0.8" />
      
      <text x="${glassX + glassWidth / 2}" y="${glassY + glassHeight / 2}" 
            text-anchor="middle" font-size="12" fill="#4A90E2">GLASS</text>
      
      <line x1="${offsetX}" y1="${offsetY - 30}" x2="${offsetX + scaledWidth}" y2="${offsetY - 30}" 
            stroke="#333" stroke-width="1" marker-start="url(#arrowhead)" marker-end="url(#arrowhead)" />
      <text x="${offsetX + scaledWidth / 2}" y="${offsetY - 35}" text-anchor="middle" 
            font-size="12" font-weight="600" fill="#333">${widthLabel}</text>
      
      <line x1="${offsetX + scaledWidth + 30}" y1="${offsetY}" 
            x2="${offsetX + scaledWidth + 30}" y2="${offsetY + scaledHeight}" 
            stroke="#333" stroke-width="1" marker-start="url(#arrowhead)" marker-end="url(#arrowhead)" />
      
      <text x="${width / 2}" y="${height - 20}" text-anchor="middle" font-size="11" fill="#666">
        Qty: ${door.quantity} | Frame: ${frameProfile?.name || 'N/A'} | Glass: ${masterData.glassTypes.find(g => g.code === door.glassTypeCode)?.name || 'N/A'}
      </text>
    </svg>
  `;
};
