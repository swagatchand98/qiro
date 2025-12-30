import { DoorConfiguration, CuttingScheme } from '../types';

// Generate visual cutting scheme diagram as SVG string
export const generateCuttingSchemaeSVG = (
  door: DoorConfiguration,
  cuttingScheme: CuttingScheme
): string => {
  const width = 550;
  const height = 400;
  const margin = 30;
  const barHeight = 35;
  const barSpacing = 15;
  
  // Find the longest piece to scale everything
  const allPieces = [
    ...cuttingScheme.frameVerticalPieces,
    ...cuttingScheme.frameHorizontalPieces,
    ...cuttingScheme.handlePieces
  ];
  const maxLength = Math.max(...allPieces);
  const availableWidth = width - 2 * margin - 100; // 100 for labels
  const scale = availableWidth / maxLength;
  
  let yPos = margin + 25;
  let svgContent = '';
  
  // Frame Vertical Pieces
  if (cuttingScheme.frameVerticalPieces.length > 0) {
    svgContent += `
      <text x="${margin}" y="${yPos}" font-size="11" font-weight="bold" fill="#000">Frame Vertical:</text>
    `;
    yPos += 15;
    
    cuttingScheme.frameVerticalPieces.forEach((length, index) => {
      const barWidth = length * scale;
      const barX = margin + 80;
      
      // Bar with gradient
      svgContent += `
        <rect x="${barX}" y="${yPos}" width="${barWidth}" height="${barHeight}" 
              fill="#8B4513" stroke="#654321" stroke-width="2" rx="2" />
        <rect x="${barX}" y="${yPos}" width="${barWidth}" height="${barHeight / 2}" 
              fill="#A0826D" opacity="0.5" rx="2" />
        
        <text x="${barX + barWidth / 2}" y="${yPos + barHeight / 2 + 5}" 
              text-anchor="middle" font-size="10" font-weight="bold" fill="#FFF">
          ${length}mm
        </text>
        
        <text x="${barX + barWidth + 5}" y="${yPos + barHeight / 2 + 5}" 
              font-size="9" fill="#666">#${index + 1}</text>
      `;
      yPos += barHeight + barSpacing;
    });
    
    yPos += 10;
  }
  
  // Frame Horizontal Pieces
  if (cuttingScheme.frameHorizontalPieces.length > 0) {
    svgContent += `
      <text x="${margin}" y="${yPos}" font-size="11" font-weight="bold" fill="#000">Frame Horizontal:</text>
    `;
    yPos += 15;
    
    cuttingScheme.frameHorizontalPieces.forEach((length, index) => {
      const barWidth = length * scale;
      const barX = margin + 80;
      
      // Bar with gradient
      svgContent += `
        <rect x="${barX}" y="${yPos}" width="${barWidth}" height="${barHeight}" 
              fill="#8B4513" stroke="#654321" stroke-width="2" rx="2" />
        <rect x="${barX}" y="${yPos}" width="${barWidth}" height="${barHeight / 2}" 
              fill="#A0826D" opacity="0.5" rx="2" />
        
        <text x="${barX + barWidth / 2}" y="${yPos + barHeight / 2 + 5}" 
              text-anchor="middle" font-size="10" font-weight="bold" fill="#FFF">
          ${length}mm
        </text>
        
        <text x="${barX + barWidth + 5}" y="${yPos + barHeight / 2 + 5}" 
              font-size="9" fill="#666">#${index + 1}</text>
      `;
      yPos += barHeight + barSpacing;
    });
    
    yPos += 10;
  }
  
  // Handle Pieces
  if (cuttingScheme.handlePieces.length > 0) {
    svgContent += `
      <text x="${margin}" y="${yPos}" font-size="11" font-weight="bold" fill="#000">Handle Pieces:</text>
    `;
    yPos += 15;
    
    cuttingScheme.handlePieces.forEach((length, index) => {
      const barWidth = length * scale;
      const barX = margin + 80;
      
      // Bar with different color for handles
      svgContent += `
        <rect x="${barX}" y="${yPos}" width="${barWidth}" height="${barHeight}" 
              fill="#FFD700" stroke="#DAA520" stroke-width="2" rx="2" />
        <rect x="${barX}" y="${yPos}" width="${barWidth}" height="${barHeight / 2}" 
              fill="#FFF" opacity="0.3" rx="2" />
        
        <text x="${barX + barWidth / 2}" y="${yPos + barHeight / 2 + 5}" 
              text-anchor="middle" font-size="10" font-weight="bold" fill="#333">
          ${length}mm
        </text>
        
        <text x="${barX + barWidth + 5}" y="${yPos + barHeight / 2 + 5}" 
              font-size="9" fill="#666">#${index + 1}</text>
      `;
      yPos += barHeight + barSpacing;
    });
  }
  
  // Summary box at bottom
  const summaryY = height - 60;
  svgContent += `
    <rect x="${margin}" y="${summaryY}" width="${width - 2 * margin}" height="50" 
          fill="#F5F5F5" stroke="#000" stroke-width="1" rx="3" />
    
    <text x="${margin + 10}" y="${summaryY + 20}" font-size="10" font-weight="bold" fill="#000">
      Total Frame Length: ${cuttingScheme.totalFrameLength}mm
    </text>
    
    <text x="${margin + 10}" y="${summaryY + 38}" font-size="10" font-weight="bold" fill="#000">
      Total Handle Length: ${cuttingScheme.totalHandleLength}mm
    </text>
    
    <text x="${width - margin - 10}" y="${summaryY + 29}" text-anchor="end" font-size="9" fill="#666">
      Total Pieces: ${allPieces.length}
    </text>
  `;
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="dimensionArrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <polygon points="0 0, 8 4, 0 8" fill="#333" />
        </marker>
      </defs>
      
      <!-- Title -->
      <text x="${width / 2}" y="20" text-anchor="middle" font-weight="bold" font-size="14" fill="#000">
        CUTTING SCHEMA - ${door.doorName.toUpperCase()}
      </text>
      
      ${svgContent}
      
      <!-- Legend -->
      <rect x="${width - margin - 120}" y="${margin}" width="20" height="12" fill="#8B4513" stroke="#654321" stroke-width="1" />
      <text x="${width - margin - 95}" y="${margin + 10}" font-size="9" fill="#333">Frame Profile</text>
      
      <rect x="${width - margin - 120}" y="${margin + 18}" width="20" height="12" fill="#FFD700" stroke="#DAA520" stroke-width="1" />
      <text x="${width - margin - 95}" y="${margin + 28}" font-size="9" fill="#333">Handle Profile</text>
    </svg>
  `;
};
