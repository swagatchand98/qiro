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

export const generateQuotationPDF = async (
  quotation: QuotationData,
  doorCalculations: DoorCalculation[],
  costSummary: CostSummary
): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // ===== PAGE 1: COMMERCIAL QUOTATION =====
  
  // Header - Company Branding
  doc.setFillColor(41, 98, 255);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('QIRO GLASS SOLUTIONS', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Premium Glass & Frame Solutions', pageWidth / 2, 28, { align: 'center' });
  doc.text('Contact: +91-XXXXXXXXXX | Email: info@qiro.com', pageWidth / 2, 35, { align: 'center' });
  
  yPos = 50;
  
  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  // Customer Details Box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'FD');
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Details:', margin + 5, yPos);
  
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${quotation.customerName}`, margin + 5, yPos);
  doc.text(`Date: ${formatDate(quotation.date)}`, pageWidth - margin - 50, yPos);
  
  yPos += 6;
  doc.text(`Mobile: ${quotation.mobileNumber}`, margin + 5, yPos);
  doc.text(`Quotation ID: ${quotation.id}`, pageWidth - margin - 50, yPos);
  
  yPos += 6;
  doc.text(`Project: ${quotation.projectName}`, margin + 5, yPos);
  
  yPos += 6;
  doc.text(`Address: ${quotation.address}`, margin + 5, yPos);
  
  yPos += 12;
  
  // Door Details Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Door Configuration Summary', margin, yPos);
  yPos += 8;
  
  // Table header
  doc.setFillColor(41, 98, 255);
  doc.setTextColor(255, 255, 255);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
  
  doc.setFontSize(9);
  doc.text('Door Name', margin + 2, yPos);
  doc.text('Type', margin + 45, yPos);
  doc.text('Size', margin + 70, yPos);
  doc.text('Qty', margin + 105, yPos);
  doc.text('Cost', margin + 120, yPos, { align: 'right' });
  
  yPos += 8;
  
  // Table rows
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  quotation.doors.forEach((door, index) => {
    const calc = doorCalculations.find(c => c.doorId === door.id);
    if (!calc) return;
    
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    
    if (index % 2 === 0) {
      doc.setFillColor(248, 249, 250);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 7, 'F');
    
    doc.text(door.doorName, margin + 2, yPos);
    doc.text(door.doorType, margin + 45, yPos);
    doc.text(`${door.width}x${door.height} ${door.measurementUnit}`, margin + 70, yPos);
    doc.text(door.quantity.toString(), margin + 105, yPos);
    doc.text(formatCurrency(calc.totalCost), margin + 120, yPos, { align: 'right' });
    
    yPos += 7;
  });
  
  yPos += 5;
  
  // Cost Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Cost Summary', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const summaryItems = [
    { label: 'Hardware Cost (Frame + Handle + Connectors)', value: costSummary.totalHardwareCost },
    { label: 'Glass Cost', value: costSummary.totalGlassCost },
    { label: 'Additional Components', value: costSummary.totalAdditionalCost },
    { label: 'Optional Items', value: costSummary.totalOptionalCost },
  ];
  
  summaryItems.forEach(item => {
    doc.text(item.label, margin + 5, yPos);
    doc.text(formatCurrency(item.value), pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 6;
  });
  
  // Subtotal
  yPos += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal', margin + 5, yPos);
  doc.text(formatCurrency(costSummary.subtotal), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 6;
  
  // Discount
  if (costSummary.discount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 53, 69);
    doc.text(`Discount (${quotation.globalDiscount}%)`, margin + 5, yPos);
    doc.text(`- ${formatCurrency(costSummary.discount)}`, pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 6;
    doc.setTextColor(0, 0, 0);
  }
  
  // Taxable Amount
  doc.setFont('helvetica', 'normal');
  doc.text('Taxable Amount', margin + 5, yPos);
  doc.text(formatCurrency(costSummary.taxableAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 6;
  
  // GST
  doc.text(`GST (${quotation.gstPercentage}%)`, margin + 5, yPos);
  doc.text(formatCurrency(costSummary.gstAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 6;
  
  // Final Amount
  yPos += 2;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;
  
  doc.setFillColor(41, 98, 255);
  doc.setTextColor(255, 255, 255);
  doc.roundedRect(margin, yPos - 5, pageWidth - 2 * margin, 10, 2, 2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('FINAL AMOUNT', margin + 5, yPos + 2);
  doc.text(formatCurrency(costSummary.finalAmount), pageWidth - margin - 5, yPos + 2, { align: 'right' });
  
  yPos += 15;
  
  // Savings Message
  if (costSummary.totalSavings > 0) {
    doc.setTextColor(40, 167, 69);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `🎉 You save ${formatCurrency(costSummary.totalSavings)} on this quotation!`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );
  }
  
  // Footer
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'This is a system-generated quotation. For queries, contact us at info@qiro.com',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  
  // ===== PAGE 2+: TECHNICAL DOOR DETAILS =====
  
  for (const door of quotation.doors) {
    doc.addPage();
    yPos = margin;
    
    const calc = doorCalculations.find(c => c.doorId === door.id);
    if (!calc) continue;
    
    // Page Header
    doc.setFillColor(52, 152, 219);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TECHNICAL DOOR SPECIFICATION', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${door.doorName} | ${door.doorType.toUpperCase()}`, pageWidth / 2, 23, { align: 'center' });
    
    yPos = 40;
    
    // Door Specifications
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Door Specifications', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const frameProfile = masterData.frameProfiles.find(f => f.code === door.frameProfileCode);
    const handleProfile = masterData.handleProfiles.find(h => h.code === door.handleProfileCode);
    const glassType = masterData.glassTypes.find(g => g.code === door.glassTypeCode);
    
    const specs = [
      ['Door Type', door.doorType],
      ['Dimensions', `${door.width} x ${door.height} ${door.measurementUnit}`],
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
    
    specs.forEach(([label, value], index) => {
      if (index % 2 === 0) {
        doc.setFillColor(248, 249, 250);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 6, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', margin + 2, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 60, yPos);
      yPos += 6;
    });
    
    yPos += 5;
    
    // Cutting Scheme
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Cutting Scheme', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Frame Vertical Pieces (mm):', margin + 2, yPos);
    doc.text(calc.cuttingScheme.frameVerticalPieces.join(', '), margin + 60, yPos);
    yPos += 6;
    
    doc.text('Frame Horizontal Pieces (mm):', margin + 2, yPos);
    doc.text(calc.cuttingScheme.frameHorizontalPieces.join(', '), margin + 60, yPos);
    yPos += 6;
    
    if (calc.cuttingScheme.handlePieces.length > 0) {
      doc.text('Handle Pieces (mm):', margin + 2, yPos);
      doc.text(calc.cuttingScheme.handlePieces.join(', '), margin + 60, yPos);
      yPos += 6;
    }
    
    doc.text('Total Frame Length:', margin + 2, yPos);
    doc.text(`${calc.cuttingScheme.totalFrameLength} mm`, margin + 60, yPos);
    yPos += 6;
    
    if (calc.cuttingScheme.totalHandleLength > 0) {
      doc.text('Total Handle Length:', margin + 2, yPos);
      doc.text(`${calc.cuttingScheme.totalHandleLength} mm`, margin + 60, yPos);
      yPos += 6;
    }
    
    yPos += 5;
    
    // Cost Breakdown
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Cost Breakdown', margin, yPos);
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
      doc.text(label + ':', margin + 2, yPos);
      doc.text(formatCurrency(value as number), margin + 60, yPos);
      yPos += 6;
    });
    
    yPos += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, margin + 80, yPos);
    yPos += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total Cost:', margin + 2, yPos);
    doc.text(formatCurrency(calc.totalCost), margin + 60, yPos);
    
    // Add diagram (simplified for PDF)
    // Note: For a full implementation, you'd convert the SVG to an image
    yPos += 15;
    if (yPos < pageHeight - 60) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text('Technical Diagram:', margin, yPos);
      doc.setDrawColor(150, 150, 150);
      doc.rect(margin, yPos + 2, 80, 100);
      doc.text('[Diagram embedded in web version]', pageWidth / 2, yPos + 52, { align: 'center' });
    }
    
    // Footer
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    const pageNumber = doc.internal.pages.length - 1;
    doc.text(
      `Page ${pageNumber} | Door: ${door.doorName}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
  
  // ===== FINAL PAGE: DISCLAIMERS & NOTES =====
  
  doc.addPage();
  yPos = margin;
  
  doc.setFillColor(255, 193, 7);
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPORTANT NOTES & DISCLAIMERS', pageWidth / 2, 15, { align: 'center' });
  
  yPos = 40;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('⚠️ Measurement Accuracy:', margin, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const measurementText = 'All measurements should be verified on-site before fabrication. QIRO is not responsible for errors in measurements provided by the customer.';
  const measurementLines = doc.splitTextToSize(measurementText, pageWidth - 2 * margin);
  doc.text(measurementLines, margin, yPos);
  yPos += measurementLines.length * 5 + 5;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('🔍 Glass Wastage:', margin, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const wastageText = `Glass wastage of ${quotation.glassWastagePercentage}% has been applied to account for cutting and fitting. Actual wastage may vary.`;
  const wastageLines = doc.splitTextToSize(wastageText, pageWidth - 2 * margin);
  doc.text(wastageLines, margin, yPos);
  yPos += wastageLines.length * 5 + 5;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('📋 Internal Use Only:', margin, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const internalText = 'This quotation is for internal business use only. It includes detailed fabrication specifications and should not be shared with external parties without authorization.';
  const internalLines = doc.splitTextToSize(internalText, pageWidth - 2 * margin);
  doc.text(internalLines, margin, yPos);
  yPos += internalLines.length * 5 + 5;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('✅ Validity:', margin, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('This quotation is valid for 30 days from the date of issue.', margin, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('📞 Support:', margin, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('For any questions or clarifications, please contact us:', margin, yPos);
  yPos += 5;
  doc.text('Email: info@qiro.com', margin + 5, yPos);
  yPos += 5;
  doc.text('Phone: +91-XXXXXXXXXX', margin + 5, yPos);
  
  // Footer
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.text(
    `Generated on ${formatDate(new Date().toISOString())} | QIRO Glass Solutions`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  
  // Save PDF
  doc.save(`Quotation_${quotation.id}_${quotation.customerName.replace(/\s+/g, '_')}.pdf`);
};
