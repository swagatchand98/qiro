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
import { generateDoorDiagramSVG } from './diagramGenerator';
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
  doc.text('DOOR CONFIGURATION', margin, yPos);
  yPos += 8;
  
  // Table header with black background
  doc.setFillColor(0, 0, 0);
  doc.setTextColor(255, 255, 255);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 7, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DOOR NAME', margin + 2, yPos);
  doc.text('TYPE', margin + 50, yPos);
  doc.text('SIZE', margin + 85, yPos);
  doc.text('QTY', margin + 120, yPos);
  doc.text('COST', pageWidth - margin - 2, yPos, { align: 'right' });
  
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
    doc.text(door.doorType, margin + 50, yPos);
    doc.text(`${door.width}×${door.height}${door.measurementUnit}`, margin + 85, yPos);
    doc.text(door.quantity.toString(), margin + 120, yPos);
    doc.text(formatCurrency(calc.totalCost), pageWidth - margin - 5, yPos, { align: 'right' });
    
    // Thin separator line
    yPos += 6;
    doc.setLineWidth(0.1);
    doc.line(margin, yPos - 4, pageWidth - margin, yPos - 4);
    yPos += 1;
  });
  
  yPos += 8;
  
  // Cost Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('COST SUMMARY', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const summaryItems = [
    { label: 'Hardware Cost (Frame + Handle + Connectors)', value: costSummary.totalHardwareCost },
    { label: 'Glass Cost', value: costSummary.totalGlassCost },
    { label: 'Additional Components', value: costSummary.totalAdditionalCost },
    { label: 'Optional Items', value: costSummary.totalOptionalCost },
  ];
  
  summaryItems.forEach(item => {
    doc.text(item.label, margin, yPos);
    doc.text(formatCurrency(item.value), pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 5;
  });
  
  // Subtotal
  yPos += 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', margin, yPos);
  doc.text(formatCurrency(costSummary.subtotal), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 5;
  
  // Discount
  if (costSummary.discount > 0) {
    doc.text(`Discount (${quotation.globalDiscount}%)`, margin, yPos);
    doc.text(`-${formatCurrency(costSummary.discount)}`, pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 5;
  }
  
  // Taxable Amount
  doc.text('Taxable Amount', margin, yPos);
  doc.text(formatCurrency(costSummary.taxableAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 5;
  
  // GST
  doc.text(`GST (${quotation.gstPercentage}%)`, margin, yPos);
  doc.text(formatCurrency(costSummary.gstAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 5;
  
  // Final Amount
  yPos += 2;
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 7;
  
  doc.setFillColor(0, 0, 0);
  doc.setTextColor(255, 255, 255);
  doc.rect(margin, yPos - 6, pageWidth - 2 * margin, 10, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL AMOUNT', margin + 2, yPos);
  doc.text(formatCurrency(costSummary.finalAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  
  yPos += 12;
  
  // Savings Message
  if (costSummary.totalSavings > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `You save ${formatCurrency(costSummary.totalSavings)} on this quotation`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );
  }
  
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
      ['Hinge Code', door.hingeCode],
      ['Hinge Quantity', door.hingeQuantity.toString()],
      ['Carcass Thickness', `${door.carcassThickness} mm`],
    ];
    
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    
    specs.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 55, yPos);
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
    
    // Cost Breakdown
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('COST BREAKDOWN', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const costItems = [
      ['Frame Cost', calc.frameCost],
      ['Handle Cost', calc.handleCost],
      ['Glass Cost', calc.glassCost],
      ['Connector Cost', calc.connectorCost],
    ];
    
    costItems.forEach(([label, value]) => {
      doc.text(label, margin, yPos);
      doc.text(formatCurrency(value as number), pageWidth - margin - 5, yPos, { align: 'right' });
      yPos += 6;
    });
    
    yPos += 2;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total Cost', margin, yPos);
    doc.text(formatCurrency(calc.totalCost), pageWidth - margin - 5, yPos, { align: 'right' });
    
    yPos += 12;
    
    // Door Diagram
    if (yPos > pageHeight - 125) {
      doc.addPage();
      yPos = addMinimalHeader();
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DOOR DIAGRAM', margin, yPos);
    yPos += 8;
    
    // Generate SVG and convert to PNG for PDF embedding
    try {
      const svgString = generateDoorDiagramSVG(door, calc.glassArea);
      
      // Diagram dimensions
      const diagramWidth = 70;
      const diagramHeight = 90;
      let diagramX = margin;
      const diagramY = yPos;
      
      // If there's a reference image, show both side by side
      if (door.referenceImage) {
        diagramX = margin; // Technical diagram on left
        const photoX = margin + diagramWidth + 10; // Photo on right
        
        // Add technical diagram
        await new Promise<void>((resolve) => {
          const img = new Image();
          const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
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
              doc.addImage(pngDataUrl, 'PNG', diagramX, diagramY, diagramWidth, diagramHeight);
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
        
        // Add reference photo
        try {
          doc.addImage(door.referenceImage, 'JPEG', photoX, diagramY, diagramWidth, diagramHeight);
          
          // Labels
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text('Technical Drawing', diagramX + diagramWidth / 2, diagramY + diagramHeight + 4, { align: 'center' });
          doc.text('Door Photo', photoX + diagramWidth / 2, diagramY + diagramHeight + 4, { align: 'center' });
          
          // Update yPos after diagrams
          yPos = diagramY + diagramHeight + 15;
          
        } catch (photoError) {
          console.error('Error adding reference photo:', photoError);
          yPos = diagramY + diagramHeight + 15;
        }
        
      } else {
        // Only technical diagram, centered
        diagramX = (pageWidth - diagramWidth) / 2;
        
        await new Promise<void>((resolve) => {
          const img = new Image();
          const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
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
              doc.addImage(pngDataUrl, 'PNG', diagramX, diagramY, diagramWidth, diagramHeight);
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
        
        // Add note below diagram
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text('* Diagram not to scale', pageWidth / 2, diagramY + diagramHeight + 5, { align: 'center' });
      }
      
      // Update yPos after diagrams
      yPos = diagramY + diagramHeight + 15;
      
      doc.setTextColor(0, 0, 0);
    } catch (error) {
      // Fallback if diagram generation fails
      console.error('Diagram generation error:', error);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Technical diagram unavailable', pageWidth / 2, yPos, { align: 'center' });
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
  doc.text('50% advance payment required before fabrication. Balance due upon delivery.', margin, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('5. Delivery', margin, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Delivery timeline will be communicated separately. Subject to material availability and site readiness.', margin, yPos);
  yPos += 10;
  
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
  doc.text('1-year warranty on manufacturing defects. Does not cover damage from mishandling or improper installation.', margin, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('8. Confidentiality', margin, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const confidentialText = 'This quotation is for internal business use only. It includes detailed fabrication specifications and should not be shared with external parties without authorization.';
  const confidentialLines = doc.splitTextToSize(confidentialText, pageWidth - 2 * margin);
  doc.text(confidentialLines, margin, yPos);
  yPos += confidentialLines.length * 4 + 15;
  
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
