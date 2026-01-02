import jsPDF from 'jspdf';
import {
  QuotationData,
  DoorConfiguration,
  DoorCalculation,
  CostSummary,
} from '../types';
import { masterData } from '../data/masterData';
import {
  formatCurrency,
  formatDate,
  calculateDoorCosts,
  calculateCostSummary,
} from './calculations';
import { generateDoorDiagramSVG, generatePremiumElevationSVG } from './diagramGenerator';
import { generateCuttingSchemaeSVG } from './cuttingSchemaGenerator';

export const generateQuotationPDF = async (
  quotation: QuotationData,
  doorCalculations: DoorCalculation[],
  costSummary: CostSummary
): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Helper function to add minimal header
  const addMinimalHeader = (isFirstPage: boolean = false) => {
    // Top black bar
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    // Company name in white
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text('QIRO', pageWidth/2 , 20, { align: 'center'});

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.15);
    doc.line(margin, 27, pageWidth - margin, 27);
    
    return 40; // Return starting yPos after header
  };

  // ===== PAGE 1: QUOTATION =====
  
  yPos = addMinimalHeader(true);

  // Customer Details - Clean Layout
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER DETAILS', margin, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text('Name:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.customerName, margin + 25, yPos);
  
  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', pageWidth - margin - 60, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(quotation.date), pageWidth - margin - 25, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Mobile:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.mobileNumber, margin + 25, yPos);
  
  doc.setFont('helvetica', 'bold');
  doc.text('ID:', pageWidth - margin - 60, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.id, pageWidth - margin - 25, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Project:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.projectName, margin + 25, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Address:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  const addressText = doc.splitTextToSize(quotation.address, pageWidth - margin * 2 - 25);
  doc.text(addressText, margin + 25, yPos);
  yPos += addressText.length * 5 + 10;
  
  // Door Details Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SHUTTER CONFIGURATION', margin, yPos);
  yPos += 8;
  
  // Table header with black background
  doc.setFillColor(0, 0, 0);
  doc.setTextColor(255, 255, 255);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 7, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SHUTTER NAME', margin + 2, yPos);
  doc.text('TYPE', margin + 55, yPos);
  doc.text('SIZE', margin + 95, yPos);
  doc.text('QTY', margin + 125, yPos);
  doc.text('AMOUNT', pageWidth - margin - 2, yPos, { align: 'right' });
  
  yPos += 7;
  
  // Table rows with minimal styling
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setDrawColor(220, 220, 220);
  
  quotation.doors.forEach((door, index) => {
    const calc = doorCalculations.find(c => c.doorId === door.id);
    if (!calc) return;
    
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = addMinimalHeader();
    }
    
    doc.text(door.doorName, margin + 2, yPos);
    doc.text(door.doorType.toUpperCase(), margin + 55, yPos);
    doc.text(`${door.width}×${door.height} ${door.measurementUnit}`, margin + 95, yPos);
    doc.text(door.quantity.toString(), margin + 125, yPos);
    doc.text(formatCurrency(calc.totalCost), pageWidth - margin - 5, yPos, { align: 'right' });
    
    // Thin separator line
    yPos += 6;
    doc.setLineWidth(0.1);
    doc.line(margin, yPos - 4, pageWidth - margin, yPos - 4);
    yPos += 1;
  });
  
  yPos += 10;
  
  // Payment Summary (NO COST BREAKDOWN - CLIENT FACING)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PAYMENT SUMMARY', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  // Only show final calculation stages
  doc.text('Job Total', margin, yPos);
  doc.text(formatCurrency(costSummary.taxableAmount + costSummary.discount), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 6;
  
  // Discount (if applicable)
  if (costSummary.discount > 0) {
    doc.setTextColor(0, 150, 0);
    doc.text(`Discount (${quotation.globalDiscount}%)`, margin, yPos);
    doc.text(`- ${formatCurrency(costSummary.discount)}`, pageWidth - margin - 5, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    yPos += 6;
  }
  
  // Subtotal line
  yPos += 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;
  
  // Taxable Amount
  doc.text('Subtotal', margin, yPos);
  doc.text(formatCurrency(costSummary.taxableAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 6;
  
  // GST
  doc.text(`GST (${quotation.gstPercentage}%)`, margin, yPos);
  doc.text(formatCurrency(costSummary.gstAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 6;
  
  // Final Amount line
  yPos += 3;
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
  // Final Payable Amount - Highlighted
  doc.setFillColor(0, 0, 0);
  doc.setTextColor(255, 255, 255);
  doc.rect(margin, yPos - 6, pageWidth - 2 * margin, 10, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL PAYABLE', margin + 2, yPos);
  doc.text(formatCurrency(costSummary.finalAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  
  yPos += 12;
  
  // Savings Message
  if (costSummary.totalSavings > 0) {
    doc.setTextColor(0, 150, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `★ You save ${formatCurrency(costSummary.totalSavings)} ★`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
    yPos += 8;
  }
  
  // Important Notes Box
  yPos += 5;
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 2, 2, 'FD');
  yPos += 6;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('📋 IMPORTANT:', margin + 3, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('• Quotation valid for 30 days from date of issue', margin + 3, yPos);
  yPos += 4;
  doc.text('• 50% advance payment required before fabrication', margin + 3, yPos);
  yPos += 4;
  doc.text('• Delivery timeline: 7-10 working days (subject to material availability)', margin + 3, yPos);
  yPos += 4;
  doc.text('• All measurements to be verified on-site before fabrication', margin + 3, yPos);
  
  yPos += 10;
  
  // Footer
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.1);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'This is a system-generated quotation | info@qiro.com',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  
  // ===== PAGE 2+: TECHNICAL DOOR DETAILS =====
  
  // Process each door sequentially to handle async diagram generation
  const processDoor = async (door: DoorConfiguration) => {
    doc.addPage();
    yPos = addMinimalHeader();
    
    const calc = doorCalculations.find(c => c.doorId === door.id);
    if (!calc) return;
    
    // Door Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(door.doorName.toUpperCase(), margin, yPos);
    yPos += 4;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(door.doorType.toUpperCase(), margin, yPos);
    yPos += 10;
    
    // Door Specifications
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SPECIFICATIONS', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const frameProfile = masterData.frameProfiles.find(f => f.code === door.frameProfileCode);
    const handleProfile = masterData.handleProfiles.find(h => h.code === door.handleProfileCode);
    const glassType = masterData.glassTypes.find(g => g.code === door.glassTypeCode);
    
    const specs = [
      ['Door Type', door.doorType],
      ['Dimensions', `${door.width} × ${door.height} ${door.measurementUnit}`],
      ['Quantity', door.quantity.toString()],
      ['Frame Profile', `${frameProfile?.name || 'N/A'} (${frameProfile?.code})`],
      ['Handle Profile', handleProfile ? `${handleProfile.name} (${handleProfile.code})` : 'None'],
      ['Handle Position', door.handlePosition],
      ['Glass Type', `${glassType?.name || 'N/A'} (${glassType?.code})`],
      ['Glass Area', `${calc.glassArea} sq.ft (${calc.glassAreaWithWastage} sq.ft with wastage)`],
      ['Hinge Position', door.hingePosition],
      ['Hinge Code', door.hingeCode || 'N/A'],
      ['Hinge Quantity', (door.hingeQuantity || 2).toString()],
      ['Carcass Thickness', `${door.carcassThickness} mm`],
    ];
    
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    
    specs.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label || '', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value || '', margin + 55, yPos);
      yPos += 6;
      doc.line(margin, yPos - 4, pageWidth - margin, yPos - 4);
      yPos += 0.5;
    });
    
    yPos += 8;
    
    // Material Images Section (if available)
    const materialImages: Array<{ label: string; image: string | undefined }> = [
      { label: 'Frame Profile', image: frameProfile?.imageUrl },
      { label: 'Handle Profile', image: handleProfile?.imageUrl },
      { label: 'Glass Type', image: glassType?.imageUrl },
    ];
    
    // Add connector image if door has connectors
    if (door.connectorCode) {
      const connector = masterData.connectorTypes.find(c => c.code === door.connectorCode);
      if (connector?.imageUrl) {
        materialImages.push({ label: 'Connector', image: connector.imageUrl });
      }
    }
    
    const availableImages = materialImages.filter(item => item.image);
    
    if (availableImages.length > 0) {
      // Check if we need a new page
      const imagesHeight = 60; // Height needed for larger images section
      if (yPos > pageHeight - imagesHeight - 40) {
        doc.addPage();
        yPos = addMinimalHeader();
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('MATERIALS USED', margin, yPos);
      yPos += 8;
      
      // Display images in a grid (3 per row for better fit)
      const imageSize = 35; // Increased from 25mm to 35mm
      const imageSpacing = 15;
      const imagesPerRow = 3;
      let currentX = margin;
      let currentRow = 0;
      
      for (let i = 0; i < availableImages.length; i++) {
        const item = availableImages[i];
        const col = i % imagesPerRow;
        
        if (col === 0 && i > 0) {
          currentRow++;
          currentX = margin;
        } else if (col > 0) {
          currentX = margin + (col * (imageSize + imageSpacing));
        }
        
        const imageY = yPos + (currentRow * (imageSize + 15));
        
        try {
          if (item.image) {
            // Draw border with shadow effect
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.rect(currentX, imageY, imageSize, imageSize);
            
            // Add image
            doc.addImage(item.image, 'JPEG', currentX + 1, imageY + 1, imageSize - 2, imageSize - 2);
            
            // Add label below image with background
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(item.label, currentX + imageSize / 2, imageY + imageSize + 5, { align: 'center' });
            doc.setTextColor(0, 0, 0);
          }
        } catch (error) {
          console.error(`Error adding ${item.label} image:`, error);
        }
      }
      
      // Update yPos to account for all image rows
      yPos += Math.ceil(availableImages.length / imagesPerRow) * (imageSize + 15) + 8;
    }
    
    // DUAL DIAGRAMS: Technical + Premium Elevation
    if (yPos > pageHeight - 125) {
      doc.addPage();
      yPos = addMinimalHeader();
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TECHNICAL DRAWINGS', margin, yPos);
    yPos += 8;
    
    // Generate both SVG diagrams
    try {
      const technicalSVG = generateDoorDiagramSVG(door, calc.glassArea);
      const elevationSVG = generatePremiumElevationSVG(door);
      
      // Diagram dimensions
      const diagramWidth = 80;
      const diagramHeight = 100;
      const technicalX = margin + 5;
      const elevationX = pageWidth - margin - diagramWidth - 5;
      const diagramY = yPos;
      
      // Add Technical Diagram (left)
      await new Promise<void>((resolve) => {
        const img = new Image();
        const svgBlob = new Blob([technicalSVG], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 500;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const pngDataUrl = canvas.toDataURL('image/png');
            doc.addImage(pngDataUrl, 'PNG', technicalX, diagramY, diagramWidth, diagramHeight);
          }
          
          URL.revokeObjectURL(url);
          resolve();
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        
        img.src = url;
      });
      
      // Add Premium Elevation Diagram (right)
      await new Promise<void>((resolve) => {
        const img = new Image();
        const svgBlob = new Blob([elevationSVG], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 500;
          canvas.height = 650;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const pngDataUrl = canvas.toDataURL('image/png');
            doc.addImage(pngDataUrl, 'PNG', elevationX, diagramY, diagramWidth, diagramHeight);
          }
          
          URL.revokeObjectURL(url);
          resolve();
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        
        img.src = url;
      });
      
      // Labels
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Technical View', technicalX + diagramWidth / 2, diagramY + diagramHeight + 4, { align: 'center' });
      doc.text('Elevation View', elevationX + diagramWidth / 2, diagramY + diagramHeight + 4, { align: 'center' });
      
      // Update yPos after diagrams
      yPos = diagramY + diagramHeight + 15;
      
      doc.setTextColor(0, 0, 0);
    } catch (error) {
      // Fallback if diagram generation fails
      console.error('Diagram generation error:', error);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Technical diagrams unavailable', pageWidth / 2, yPos, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPos += 10;
    }
    
    // Cutting Schema Diagram - After door diagrams
    if (yPos > pageHeight - 120) {
      doc.addPage();
      yPos = addMinimalHeader();
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('CUTTING SCHEMA', margin, yPos);
    yPos += 8;
    
    // Generate and embed cutting schema diagram
    try {
      const schemaString = generateCuttingSchemaeSVG(door, calc.cuttingScheme);
      
      const schemaWidth = 150;
      const schemaHeight = 100;
      const schemaX = (pageWidth - schemaWidth) / 2;
      const schemaY = yPos;
      
      await new Promise<void>((resolve) => {
        const img = new Image();
        const svgBlob = new Blob([schemaString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 550;
          canvas.height = 400;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const pngDataUrl = canvas.toDataURL('image/png');
            doc.addImage(pngDataUrl, 'PNG', schemaX, schemaY, schemaWidth, schemaHeight);
          }
          
          URL.revokeObjectURL(url);
          resolve();
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        
        img.src = url;
      });
      
      yPos += schemaHeight + 10;
      
    } catch (error) {
      console.error('Cutting schema diagram error:', error);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('Cutting schema diagram unavailable', pageWidth / 2, yPos, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPos += 10;
    }
    
    // ===== DETAILED COST BREAKDOWN FOR THIS DOOR =====
    if (yPos > pageHeight - 130) {
      doc.addPage();
      yPos = addMinimalHeader();
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('COST BREAKDOWN', margin, yPos);
    yPos += 8;
    
    // Cost Table Header
    doc.setFillColor(0, 0, 0);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 7, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('ITEM', margin + 2, yPos);
    doc.text('SPECIFICATION', margin + 45, yPos);
    doc.text('QTY/SIZE', margin + 100, yPos);
    doc.text('COST', pageWidth - margin - 2, yPos, { align: 'right' });
    
    yPos += 7;
    
    // Cost breakdown rows
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setDrawColor(220, 220, 220);
    
    const costItems = [
      {
        item: 'Frame Profile',
        spec: `${frameProfile?.name} (${frameProfile?.code})`,
        qty: `${calc.totalProfileLength.toFixed(2)}m`,
        cost: calc.frameCost
      },
    ];
    
    // Add handle if exists
    if (door.hasHandle && handleProfile) {
      costItems.push({
        item: 'Handle Profile',
        spec: `${handleProfile.name} (${handleProfile.code})`,
        qty: `${calc.totalHandleLength?.toFixed(2) || 0}m`,
        cost: calc.handleCost
      });
    }
    
    // Add glass
    costItems.push({
      item: 'Glass',
      spec: `${glassType?.name} (${glassType?.code})`,
      qty: `${calc.glassAreaWithWastage.toFixed(2)} sq.ft`,
      cost: calc.glassCost
    });
    
    // Add connectors
    if (calc.connectorsRequired > 0) {
      const connector = masterData.connectorTypes.find(c => c.code === door.connectorCode);
      costItems.push({
        item: 'Connectors',
        spec: `${connector?.name || 'Standard'} (${door.connectorCode})`,
        qty: `${calc.connectorsRequired} pcs`,
        cost: calc.connectorCost
      });
    }
    
    // Add hinges if applicable
    if (calc.hingeCount && calc.hingeCount > 0) {
      costItems.push({
        item: 'Hinges',
        spec: `${door.hingeCode || 'Standard'}`,
        qty: `${calc.hingeCount} pcs`,
        cost: calc.hingeCost
      });
    }
    
    // Add dividers if applicable
    if (door.hasDividers && calc.dividerLength && calc.dividerLength > 0) {
      costItems.push({
        item: 'Dividers',
        spec: `Profile + Connectors`,
        qty: `${calc.dividerLength.toFixed(2)}m`,
        cost: calc.dividerCost
      });
    }
    
    // Add sliding system if applicable
    if (door.doorType === 'sliding' && calc.slidingSystemCost > 0) {
      const slidingSystem = masterData.products?.find(p => p.code === door.slidingSystemCode);
      costItems.push({
        item: 'Sliding System',
        spec: slidingSystem?.name || door.slidingSystemCode || 'Standard Kit',
        qty: '1 set',
        cost: calc.slidingSystemCost
      });
    }
    
    // Add gasket if applicable
    if (calc.gasketCost > 0) {
      costItems.push({
        item: 'Gasket',
        spec: door.gasketCode || 'Standard',
        qty: `${calc.totalProfileLength.toFixed(2)}m`,
        cost: calc.gasketCost
      });
    }
    
    // Add lock if applicable
    if (calc.lockCost > 0) {
      costItems.push({
        item: 'Lock',
        spec: door.lockCode || 'Standard',
        qty: '1 pc',
        cost: calc.lockCost
      });
    }
    
    // Render all cost items
    costItems.forEach(item => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = addMinimalHeader();
      }
      
      doc.text(item.item, margin + 2, yPos);
      doc.text(item.spec, margin + 45, yPos);
      doc.text(item.qty, margin + 100, yPos);
      doc.text(formatCurrency(item.cost), pageWidth - margin - 5, yPos, { align: 'right' });
      
      yPos += 5;
      doc.setLineWidth(0.1);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 2;
    });
    
    // Subtotal for this door
    yPos += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Cost Per Unit:', margin + 2, yPos);
    doc.text(formatCurrency(calc.totalSellingPrice), pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 6;
    
    doc.text(`Quantity:`, margin + 2, yPos);
    doc.text(`× ${door.quantity}`, pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 6;
    
    // Total line
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;
    
    // Total for this door
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
    doc.setFontSize(10);
    doc.text('Total for this Shutter:', margin + 2, yPos);
    doc.text(formatCurrency(calc.totalOrderValue), pageWidth - margin - 5, yPos, { align: 'right' });
    
    yPos += 15;
    doc.setFont('helvetica', 'normal');
    
    // Material Images Section - Show after diagrams for better visibility
    const connector = door.connectorCode ? masterData.connectorTypes.find(c => c.code === door.connectorCode) : undefined;
    const materialImagesList: Array<{ label: string; image: string | undefined; name: string }> = [
      { label: 'Frame Profile', image: frameProfile?.imageUrl, name: frameProfile?.name || 'N/A' },
      { label: 'Handle Profile', image: handleProfile?.imageUrl, name: handleProfile?.name || 'N/A' },
      { label: 'Glass Type', image: glassType?.imageUrl, name: glassType?.name || 'N/A' },
      { label: 'Connector', image: connector?.imageUrl, name: connector?.name || 'N/A' },
    ];
    
    const availableMaterialImages = materialImagesList.filter(item => item.image);
    
    if (availableMaterialImages.length > 0) {
      // Add new page for materials
      doc.addPage();
      yPos = addMinimalHeader();
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('MATERIALS USED', margin, yPos);
      yPos += 2;
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, margin + 60, yPos);
      yPos += 12;
      
      // Display images in a 2x2 grid with larger size
      const imageSize = 60; // Large images
      const imageSpacing = 20;
      const imagesPerRow = 2;
      
      for (let i = 0; i < availableMaterialImages.length; i++) {
        const item = availableMaterialImages[i];
        const row = Math.floor(i / imagesPerRow);
        const col = i % imagesPerRow;
        
        const imageX = margin + (col * (imageSize + imageSpacing + 40));
        const imageY = yPos + (row * (imageSize + 25));
        
        try {
          if (item.image) {
            // Draw border
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.8);
            doc.rect(imageX, imageY, imageSize, imageSize);
            
            // Add image
            doc.addImage(item.image, 'JPEG', imageX + 1, imageY + 1, imageSize - 2, imageSize - 2);
            
            // Add label and name below image
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(item.label, imageX + imageSize / 2, imageY + imageSize + 6, { align: 'center' });
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(60, 60, 60);
            doc.text(item.name, imageX + imageSize / 2, imageY + imageSize + 11, { align: 'center' });
            doc.setTextColor(0, 0, 0);
          }
        } catch (error) {
          console.error(`Error adding ${item.label} image:`, error);
        }
      }
    }
    
    // Footer
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    const pageNumber = doc.internal.pages.length - 1;
    doc.text(
      `Page ${pageNumber} | Door: ${door.doorName}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  };
  
  // Process all doors sequentially
  for (const door of quotation.doors) {
    await processDoor(door);
  }
  
  // ===== COMPREHENSIVE COST SUMMARY PAGE =====
  
  doc.addPage();
  yPos = addMinimalHeader();
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPLETE COST SUMMARY', margin, yPos);
  yPos += 2;
  
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, margin + 90, yPos);
  yPos += 12;
  
  // Component-wise Breakdown
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('MATERIAL BREAKDOWN', margin, yPos);
  yPos += 8;
  
  doc.setFillColor(0, 0, 0);
  doc.setTextColor(255, 255, 255);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 7, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPONENT', margin + 2, yPos);
  doc.text('AMOUNT', pageWidth - margin - 2, yPos, { align: 'right' });
  
  yPos += 7;
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setDrawColor(220, 220, 220);
  
  const componentBreakdown = [
    { name: 'Frame Profiles', amount: costSummary.totalProfileCost },
    { name: 'Handle Profiles', amount: costSummary.totalHandleCost },
    { name: 'Glass', amount: costSummary.totalGlassCost },
    { name: 'Connectors', amount: costSummary.totalConnectorCost },
    { name: 'Hinges', amount: costSummary.totalHingeCost },
    { name: 'Locks', amount: costSummary.totalLockCost },
    { name: 'Gaskets', amount: costSummary.totalGasketCost },
    { name: 'Sliding Systems', amount: costSummary.totalSlidingSystemCost },
    { name: 'Dividers', amount: costSummary.totalDividerCost },
  ];
  
  // Only show components with non-zero amounts
  componentBreakdown.forEach(item => {
    if (item.amount > 0) {
      doc.text(item.name, margin + 2, yPos);
      doc.text(formatCurrency(item.amount), pageWidth - margin - 5, yPos, { align: 'right' });
      yPos += 5;
      doc.setLineWidth(0.1);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 2;
    }
  });
  
  // Material Subtotal
  yPos += 3;
  doc.setFont('helvetica', 'bold');
  doc.text('Material Subtotal:', margin + 2, yPos);
  doc.text(formatCurrency(costSummary.materialSubtotal), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 8;
  
  // Additional & Optional Items
  if (quotation.additionalComponents.length > 0 || quotation.optionalItems.length > 0) {
    doc.setFontSize(10);
    doc.text('ADDITIONAL ITEMS', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    if (costSummary.totalAdditionalCost > 0) {
      doc.text('Additional Components', margin + 2, yPos);
      doc.text(formatCurrency(costSummary.totalAdditionalCost), pageWidth - margin - 5, yPos, { align: 'right' });
      yPos += 5;
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 2;
    }
    
    if (costSummary.totalOptionalCost > 0) {
      doc.text('Optional Items', margin + 2, yPos);
      doc.text(formatCurrency(costSummary.totalOptionalCost), pageWidth - margin - 5, yPos, { align: 'right' });
      yPos += 5;
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 2;
    }
    
    yPos += 5;
  }
  
  // Making Charges
  yPos += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('FABRICATION CHARGES', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Making Charges', margin + 2, yPos);
  doc.text(formatCurrency(costSummary.makingCharges), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 5;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 2;
  
  // Subtotal with Making
  yPos += 3;
  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal (with Fabrication):', margin + 2, yPos);
  doc.text(formatCurrency(costSummary.subtotalWithMaking), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 10;
  
  // Discount Section
  doc.setFillColor(240, 250, 240);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 12, 'FD');
  
  doc.setFontSize(9);
  if (costSummary.discount > 0) {
    doc.setTextColor(0, 150, 0);
    doc.text(`Discount (${quotation.globalDiscount}%)`, margin + 2, yPos);
    doc.text(`- ${formatCurrency(costSummary.discount)}`, pageWidth - margin - 5, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    yPos += 7;
    
    doc.setFont('helvetica', 'normal');
    doc.text('Taxable Amount:', margin + 2, yPos);
    doc.text(formatCurrency(costSummary.taxableAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  } else {
    doc.text('Taxable Amount:', margin + 2, yPos);
    doc.text(formatCurrency(costSummary.taxableAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  }
  
  yPos += 10;
  
  // GST Section
  doc.setFillColor(245, 245, 250);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.text(`GST (${quotation.gstPercentage}%)`, margin + 2, yPos);
  doc.text(formatCurrency(costSummary.gstAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  
  yPos += 12;
  
  // Final Amount - Highlighted
  doc.setLineWidth(1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
  doc.setFillColor(0, 0, 0);
  doc.setTextColor(255, 255, 255);
  doc.rect(margin, yPos - 6, pageWidth - 2 * margin, 12, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL PAYABLE', margin + 2, yPos);
  doc.text(formatCurrency(costSummary.finalAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  
  yPos += 15;
  doc.setTextColor(0, 0, 0);
  
  // Savings Message
  if (costSummary.totalSavings > 0) {
    doc.setTextColor(0, 150, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `★ Total Savings: ${formatCurrency(costSummary.totalSavings)} ★`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
    yPos += 10;
  }
  
  // Door-wise Summary Table
  yPos += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DOOR-WISE SUMMARY', margin, yPos);
  yPos += 8;
  
  doc.setFillColor(0, 0, 0);
  doc.setTextColor(255, 255, 255);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 7, 'F');
  
  doc.setFontSize(8);
  doc.text('DOOR NAME', margin + 2, yPos);
  doc.text('QTY', margin + 70, yPos);
  doc.text('PER UNIT', margin + 95, yPos);
  doc.text('TOTAL', pageWidth - margin - 2, yPos, { align: 'right' });
  
  yPos += 7;
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  quotation.doors.forEach((door, index) => {
    const calc = doorCalculations.find(c => c.doorId === door.id);
    if (!calc) return;
    
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = addMinimalHeader();
    }
    
    doc.text(door.doorName, margin + 2, yPos);
    doc.text(door.quantity.toString(), margin + 70, yPos);
    doc.text(formatCurrency(calc.totalSellingPrice), margin + 95, yPos);
    doc.text(formatCurrency(calc.totalOrderValue), pageWidth - margin - 5, yPos, { align: 'right' });
    
    yPos += 5;
    doc.setLineWidth(0.1);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 2;
  });
  
  // ===== FINAL PAGE: TERMS & CONDITIONS =====
  
  doc.addPage();
  yPos = addMinimalHeader();
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMS & CONDITIONS', margin, yPos);
  yPos += 2;
  
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, margin + 80, yPos);
  yPos += 10;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Measurement Accuracy', margin, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const measurementText = 'All measurements should be verified on-site before fabrication. QIRO is not responsible for errors in measurements provided by the customer.';
  const measurementLines = doc.splitTextToSize(measurementText, pageWidth - 2 * margin);
  doc.text(measurementLines, margin, yPos);
  yPos += measurementLines.length * 4 + 8;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('2. Glass Wastage', margin, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const wastageText = `Glass wastage of ${quotation.glassWastagePercentage}% has been applied to account for cutting and fitting. Actual wastage may vary based on site conditions.`;
  const wastageLines = doc.splitTextToSize(wastageText, pageWidth - 2 * margin);
  doc.text(wastageLines, margin, yPos);
  yPos += wastageLines.length * 4 + 8;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('3. Quotation Validity', margin, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('This quotation is valid for 30 days from the date of issue. Prices are subject to change thereafter.', margin, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('4. Payment Terms', margin, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const paymentText = '50% advance payment required before fabrication. Balance 50% due upon delivery and before installation.';
  doc.text(paymentText, margin, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('5. Delivery Timeline', margin, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const deliveryText = 'Standard delivery timeline is 7-10 working days from advance payment clearance. Subject to material availability and site readiness. Custom orders may require additional time.';
  const deliveryLines = doc.splitTextToSize(deliveryText, pageWidth - 2 * margin);
  doc.text(deliveryLines, margin, yPos);
  yPos += deliveryLines.length * 4 + 8;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('6. Installation', margin, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Installation charges are separate and will be quoted based on site requirements.', margin, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('7. Warranty', margin, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const warrantyText = '1-year warranty on manufacturing defects. Warranty does not cover damage from mishandling, improper installation, or natural wear and tear.';
  const warrantyLines = doc.splitTextToSize(warrantyText, pageWidth - 2 * margin);
  doc.text(warrantyLines, margin, yPos);
  yPos += warrantyLines.length * 4 + 8;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('8. Scope of Work', margin, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const scopeText = 'This quotation covers supply of materials and fabrication only. Installation, site preparation, structural modifications, and transportation are quoted separately unless explicitly mentioned.';
  const scopeLines = doc.splitTextToSize(scopeText, pageWidth - 2 * margin);
  doc.text(scopeLines, margin, yPos);
  yPos += scopeLines.length * 4 + 15;
  
  // Contact Section
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CONTACT INFORMATION', margin, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('QIRO Glass Solutions', margin, yPos);
  yPos += 5;
  doc.text('Email: info@qiro.com', margin, yPos);
  yPos += 5;
  doc.text('Phone: +91-XXXXXXXXXX', margin, yPos);
  yPos += 5;
  doc.text('Website: www.qiro.com', margin, yPos);
  
  // Footer
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.1);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.text(
    `Generated on ${formatDate(new Date().toISOString())} | QIRO Glass Solutions`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  
  // Save PDF
  doc.save(`Quotation_${quotation.id}_${quotation.customerName.replace(/\s+/g, '_')}.pdf`);
};
