import jsPDF from 'jspdf';
import {
  QuotationData,
  DoorConfiguration,
  DoorCalculation,
  CostSummary,
} from '../types';
import { masterData } from '../data/masterData';
import {
  formatCurrencyForPDF,
  formatDate,
  calculateDoorCosts,
  calculateCostSummary,
  convertToMm,
} from './calculations';
import { generatePremiumElevationSVG } from './diagramGenerator';
import { generateCuttingSchemaeSVG } from './cuttingSchemaGenerator';

// Helper function to calculate hinge positions
function calculateHingePositions(heightMm: number, hingeQuantity: number): number[] {
  if (!heightMm || !hingeQuantity || hingeQuantity < 2) return [];
  
  // For very small heights, use proportional positioning
  if (heightMm < 500) {
    const margin = heightMm * 0.15; // 15% margin from top and bottom
    if (hingeQuantity === 2) {
      return [margin, heightMm - margin];
    } else {
      const positions: number[] = [];
      const availableHeight = heightMm - (2 * margin);
      const spacing = availableHeight / (hingeQuantity - 1);
      for (let i = 0; i < hingeQuantity; i++) {
        positions.push(margin + (spacing * i));
      }
      return positions;
    }
  }
  
  // For normal heights, use fixed 200mm margins
  const topMargin = 200; // 200mm from top
  const bottomMargin = 200; // 200mm from bottom
  const availableHeight = heightMm - topMargin - bottomMargin;
  
  if (hingeQuantity === 2) {
    return [topMargin, heightMm - bottomMargin];
  } else {
    const positions: number[] = [];
    const spacing = availableHeight / (hingeQuantity - 1);
    for (let i = 0; i < hingeQuantity; i++) {
      positions.push(topMargin + (spacing * i));
    }
    return positions;
  }
}

// Helper function to ensure hinge positions are calculated
const ensureHingePositions = (door: DoorConfiguration): DoorConfiguration => {
  // ALWAYS recalculate to ensure fresh, accurate positions based on current door dimensions
  const heightMm = convertToMm(door.height, door.measurementUnit);
  const hingeQty = door.hingeQuantity || 2;
  
  if (heightMm > 0 && hingeQty >= 2) {
    const positions = calculateHingePositions(heightMm, hingeQty);
    console.log(`PDF: Calculated ${hingeQty} hinge positions for ${heightMm}mm height:`, positions);
    return {
      ...door,
      hingePositionMm: positions // Force override with freshly calculated positions
    };
  }
  
  console.log(`PDF: No hinge positions calculated (height: ${heightMm}mm, qty: ${hingeQty})`);
  return door;
};

// Generate short, readable quotation ID
export const generateQuotationId = (customerName: string, date: string): string => {
  // Extract first 3-4 letters of customer name
  const namePart = customerName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 4)
    .padEnd(4, 'X');
  
  // Format date as DDMMYY
  const dateObj = new Date(date);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = String(dateObj.getFullYear()).substring(2);
  const datePart = `${day}${month}${year}`;
  
  // Add random 2-digit number for uniqueness
  const randomPart = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  
  return `${namePart}-${datePart}-${randomPart}`;
};

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

  // Load custom font - Neue Haas Display
  const loadCustomFont = async () => {
    try {
      // Load Medium variant for normal text (better rendering)
      const response = await fetch('/font/NeueHaasDisplayMediu.ttf');
      const fontBuffer = await response.arrayBuffer();
      const fontBase64 = btoa(
        new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      doc.addFileToVFS('NeueHaasDisplay-Medium.ttf', fontBase64);
      doc.addFont('NeueHaasDisplay-Medium.ttf', 'NeueHaasDisplay', 'normal');
      
      // Load Bold variant
      const responseBold = await fetch('/font/NeueHaasDisplayBold.ttf');
      const fontBufferBold = await responseBold.arrayBuffer();
      const fontBase64Bold = btoa(
        new Uint8Array(fontBufferBold).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      doc.addFileToVFS('NeueHaasDisplay-Bold.ttf', fontBase64Bold);
      doc.addFont('NeueHaasDisplay-Bold.ttf', 'NeueHaasDisplay', 'bold');
      
      // Set as default font
      doc.setFont('NeueHaasDisplay', 'normal');
      console.log('Custom font loaded successfully');
    } catch (error) {
      console.error('Failed to load custom font:', error);
      // Fallback to helvetica
      doc.setFont('helvetica', 'normal');
    }
  };

  // Load custom font
  await loadCustomFont();

  // Helper function to load and add logo
  const addLogoToHeader = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg'));
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load logo'));
    img.src = '/logo_bg_white.jpeg';
  });
};

// Load logo once at the beginning
let logoDataUrl: string;
try {
  logoDataUrl = await addLogoToHeader();
} catch (error) {
  console.error('Failed to load logo:', error);
  logoDataUrl = ''; // Fallback to no logo
}

// Helper function to add minimal header
const addMinimalHeader = (isFirstPage: boolean = false) => {
  // Top white bar
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  // Add logo if available
  if (logoDataUrl) {
    try {
      // Logo centered, 40mm wide, maintaining aspect ratio
      const logoWidth = 80;
      const logoHeight = 80 ; // Adjust based on your logo's aspect ratio
      const logoX = (pageWidth - logoWidth) / 2;
      const logoY = -20;
      doc.addImage(logoDataUrl, 'JPEG', logoX, logoY, logoWidth, logoHeight);
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
      // Fallback to text
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(32);
      doc.setFont('NeueHaasDisplay', 'bold');
      doc.text('QIRO', pageWidth/2, 20, { align: 'center'});
    }
  } else {
    // Fallback to text if logo failed to load
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(32);
    doc.setFont('NeueHaasDisplay', 'bold');
    doc.text('QIRO', pageWidth/2, 20, { align: 'center'});
  }    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.15);
    doc.line(margin, 32, pageWidth - margin, 32);
    
    return 45; // Return starting yPos after header
  };

  // ===== PAGE 1: QUOTATION =====
  
  yPos = addMinimalHeader(true);

  // Customer Details - Clean Layout
  doc.setFontSize(10);
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('CUSTOMER DETAILS', margin, yPos);
  yPos += 8;
  
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.setFontSize(9);
  
  // Left column
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('Name:', margin, yPos);
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.text(quotation.customerName, margin + 25, yPos);
  
  // Right column
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('Date:', pageWidth - margin - 60, yPos);
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.text(formatDate(quotation.date), pageWidth - margin - 25, yPos);
  yPos += 6;
  
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('Mobile:', margin, yPos);
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.text(quotation.mobileNumber, margin + 25, yPos);
  
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('ID:', pageWidth - margin - 60, yPos);
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.text(quotation.id, pageWidth - margin - 25, yPos);
  yPos += 6;
  
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('Project:', margin, yPos);
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.text(quotation.projectName, margin + 25, yPos);
  yPos += 6;
  
  // Add GST Number if available
  if (quotation.customerGstNumber) {
    doc.setFont('NeueHaasDisplay', 'bold');
    doc.text('GST No:', margin, yPos);
    doc.setFont('NeueHaasDisplay', 'normal');
    doc.text(quotation.customerGstNumber, margin + 25, yPos);
    yPos += 6;
  }
  
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('Address:', margin, yPos);
  doc.setFont('NeueHaasDisplay', 'normal');
  const addressText = doc.splitTextToSize(quotation.address, 80);
  doc.text(addressText, margin + 25, yPos);
  yPos += addressText.length * 5 + 10;
  
  // Door Details Table
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.setFontSize(10);
  doc.text('SHUTTER CONFIGURATION', margin, yPos);
  yPos += 8;
  
  // Table header with black background
  doc.setFillColor(0, 0, 0);
  doc.setTextColor(255, 255, 255);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 7, 'F');
  
  doc.setFontSize(9);
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('SHUTTER NAME', margin + 2, yPos);
  doc.text('TYPE', margin + 55, yPos);
  doc.text('SIZE', margin + 95, yPos);
  doc.text('QTY', margin + 125, yPos);
  doc.text('AMOUNT', pageWidth - margin - 2, yPos, { align: 'right' });
  
  yPos += 7;
  
  // Table rows with minimal styling
  doc.setTextColor(0, 0, 0);
  doc.setFont('NeueHaasDisplay', 'normal');
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
    doc.text(formatCurrencyForPDF(calc.totalCost), pageWidth - margin - 5, yPos, { align: 'right' });
    
    // Thin separator line
    yPos += 6;
    doc.setLineWidth(0.1);
    doc.line(margin, yPos - 4, pageWidth - margin, yPos - 4);
    yPos += 1;
  });
  
  yPos += 10;
  
// Payment Summary (NO COST BREAKDOWN - CLIENT FACING)
doc.setFont('NeueHaasDisplay', 'bold');
doc.setFontSize(10);
doc.text('PAYMENT SUMMARY', margin, yPos);
yPos += 8;

doc.setFontSize(9);
doc.setFont('NeueHaasDisplay', 'normal');  // Only show final calculation stages
  doc.text('Job Total', margin, yPos);
  doc.text(formatCurrencyForPDF(costSummary.taxableAmount + costSummary.discount), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 6;
  
  // Discount (if applicable)
  if (costSummary.discount > 0) {
    doc.setTextColor(0, 150, 0);
    doc.text(`Discount (${quotation.globalDiscount}%)`, margin, yPos);
    doc.text(`- ${formatCurrencyForPDF(costSummary.discount)}`, pageWidth - margin - 5, yPos, { align: 'right' });
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
  doc.text(formatCurrencyForPDF(costSummary.taxableAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 6;
  
  // GST
  doc.text(`GST (${quotation.gstPercentage}%)`, margin, yPos);
  doc.text(formatCurrencyForPDF(costSummary.gstAmount), pageWidth - margin - 5, yPos, { align: 'right' });
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
  
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL PAYABLE', margin + 2, yPos);
  doc.text(formatCurrencyForPDF(costSummary.finalAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  
  yPos += 12;
  
  // Savings Message
  if (costSummary.totalSavings > 0) {
    doc.setTextColor(0, 150, 0);
    doc.setFontSize(9);
    doc.setFont('NeueHaasDisplay', 'bold');
    doc.text(
      `★ You save ${formatCurrencyForPDF(costSummary.totalSavings)} ★`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
    yPos += 8;
  }
  
  yPos += 10;
  
  // Payment QR Code Section
  try {
    const qrResponse = await fetch('/qr.jpeg');
    const qrBlob = await qrResponse.blob();
    const qrDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(qrBlob);
    });
    
    // Add QR code centered
    const qrSize = 50;
    const qrX = (pageWidth - qrSize) / 2;
    doc.addImage(qrDataUrl, 'JPEG', qrX, yPos, qrSize, qrSize);
    yPos += qrSize + 5;
    
    // Payment instruction
    doc.setFontSize(9);
    doc.setFont('NeueHaasDisplay', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Scan to Pay via UPI', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
  } catch (error) {
    console.error('Failed to load QR code:', error);
    yPos += 5;
  }
  
  // Footer
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.1);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.setFont('NeueHaasDisplay', 'normal');
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
    doc.setFont('NeueHaasDisplay', 'bold');
    doc.text(door.doorName.toUpperCase(), margin, yPos);
    yPos += 4;
    
    doc.setFontSize(8);
    doc.setFont('NeueHaasDisplay', 'normal');
    doc.text(door.doorType.toUpperCase(), margin, yPos);
    yPos += 10;
    
    // Door Specifications
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('NeueHaasDisplay', 'bold');
    doc.text('SPECIFICATIONS', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont('NeueHaasDisplay', 'normal');
    
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
      ['Glass Area', `${calc.glassArea} sq.ft`],
      ['Hinge Position', door.hingePosition],
      ['Hinge Code', door.hingeCode || 'N/A'],
      ['Hinge Quantity', (door.hingeQuantity || 2).toString()],
      ['Carcass Thickness', `${door.carcassThickness} mm`],
    ];
    
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    
    specs.forEach(([label, value]) => {
      doc.setFont('NeueHaasDisplay', 'bold');
      doc.text(label || '', margin, yPos);
      doc.setFont('NeueHaasDisplay', 'normal');
      doc.text(value || '', margin + 55, yPos);
      yPos += 6;
      doc.line(margin, yPos - 4, pageWidth - margin, yPos - 4);
      yPos += 0.5;
    });
    
    yPos += 8;
    
    // ===== DETAILED COST BREAKDOWN FOR THIS DOOR =====
    if (yPos > pageHeight - 130) {
      doc.addPage();
      yPos = addMinimalHeader();
    }
    
    doc.setFont('NeueHaasDisplay', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('COST BREAKDOWN', margin, yPos);
    yPos += 8;
    
    // Cost Table Header
    doc.setFillColor(0, 0, 0);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 7, 'F');
    
    doc.setFontSize(8);
    doc.setFont('NeueHaasDisplay', 'bold');
    doc.text('ITEM', margin + 2, yPos);
    doc.text('SPECIFICATION', margin + 45, yPos);
    doc.text('QTY/SIZE', margin + 100, yPos);
    doc.text('COST', pageWidth - margin - 2, yPos, { align: 'right' });
    
    yPos += 7;
    
    // Cost breakdown rows
    doc.setTextColor(0, 0, 0);
    doc.setFont('NeueHaasDisplay', 'normal');
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
        qty: `${calc.totalHandleLength?.toFixed(0) || 0}mm`,
        cost: calc.handleCost
      });
    }
    
    // Add glass
    costItems.push({
      item: 'Glass',
      spec: `${glassType?.name} (${glassType?.code})`,
      qty: `${calc.glassArea.toFixed(2)} sq.ft`,
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
        qty: `${calc.dividerLength.toFixed(0)}mm`,
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
        qty: `${calc.totalProfileLength.toFixed(0)}mm`,
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
      doc.text(formatCurrencyForPDF(item.cost), pageWidth - margin - 5, yPos, { align: 'right' });
      
      yPos += 5;
      doc.setLineWidth(0.1);
      doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);
      yPos += 2;
    });
    
    // Subtotal for this door
    yPos += 3;
    doc.setFont('NeueHaasDisplay', 'bold');
    doc.setFontSize(9);
    doc.text('Cost Per Unit:', margin + 2, yPos);
    doc.text(formatCurrencyForPDF(calc.totalSellingPrice), pageWidth - margin - 5, yPos, { align: 'right' });
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
    doc.text(formatCurrencyForPDF(calc.totalOrderValue), pageWidth - margin - 5, yPos, { align: 'right' });
    
    yPos += 15;
    doc.setFont('NeueHaasDisplay', 'normal');
    
    // ===== TECHNICAL DRAWING SECTION =====
    if (yPos > pageHeight - 125) {
      doc.addPage();
      yPos = addMinimalHeader();
    }
    
    doc.setFont('NeueHaasDisplay', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('TECHNICAL DRAWING', margin, yPos);
    yPos += 8;
    
    // Generate premium elevation SVG diagram
    try {
      // Ensure hinge positions are properly calculated (same as web page)
      const doorWithHinges = ensureHingePositions(door);
      
      // Debug logging
      console.log('PDF Door dimensions:', door.width, 'x', door.height, door.measurementUnit);
      console.log('PDF Hinge positions (original):', door.hingePositionMm);
      console.log('PDF Hinge positions (calculated):', doorWithHinges.hingePositionMm);
      console.log('PDF Hinge quantity:', door.hingeQuantity);
      
      const elevationSVG = generatePremiumElevationSVG(doorWithHinges);
      
      // Diagram dimensions - centered on page
      const diagramWidth = 90;
      const diagramHeight = 110;
      const diagramX = (pageWidth - diagramWidth) / 2;
      const diagramY = yPos;
      
      // Add Premium Elevation Diagram (centered)
      await new Promise<void>((resolve) => {
        const img = new Image();
        const svgBlob = new Blob([elevationSVG], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 700;
          canvas.height = 850;
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
      
      // Label
      doc.setFontSize(7);
      doc.setFont('NeueHaasDisplay', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Technical Elevation View', diagramX + diagramWidth / 2, diagramY + diagramHeight + 4, { align: 'center' });
      
      // Update yPos after diagram
      yPos = diagramY + diagramHeight + 15;
      
      doc.setTextColor(0, 0, 0);
    } catch (error) {
      // Fallback if diagram generation fails
      console.error('Diagram generation error:', error);
      doc.setFontSize(8);
      doc.setFont('NeueHaasDisplay', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Technical diagram unavailable', pageWidth / 2, yPos, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPos += 10;
    }
    
    // ===== USER UPLOADED REFERENCE IMAGE =====
    if (door.referenceImage) {
      // Check if new page needed
      if (yPos > pageHeight - 90) {
        doc.addPage();
        yPos = addMinimalHeader();
      }
      
      doc.setFont('NeueHaasDisplay', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('REFERENCE IMAGE', margin, yPos);
      yPos += 8;
      
      try {
        // Load image to get its dimensions
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            // Calculate aspect ratio
            const aspectRatio = img.width / img.height;
            
            // Maximum dimensions to fit on page
            const maxWidth = 100;
            const maxHeight = 100;
            
            let refImageWidth: number;
            let refImageHeight: number;
            
            // Calculate dimensions maintaining aspect ratio
            if (aspectRatio > 1) {
              // Landscape
              refImageWidth = Math.min(maxWidth, img.width * 0.1); // Scale down
              refImageHeight = refImageWidth / aspectRatio;
            } else {
              // Portrait or square
              refImageHeight = Math.min(maxHeight, img.height * 0.1); // Scale down
              refImageWidth = refImageHeight * aspectRatio;
            }
            
            const refImageX = (pageWidth - refImageWidth) / 2;
            const refImageY = yPos;
            
            // Add border
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.rect(refImageX, refImageY, refImageWidth, refImageHeight);
            
            // Add reference image maintaining aspect ratio
            doc.addImage(door.referenceImage!, 'JPEG', refImageX + 1, refImageY + 1, refImageWidth - 2, refImageHeight - 2);
            
            // Label
            doc.setFontSize(7);
            doc.setFont('NeueHaasDisplay', 'italic');
            doc.setTextColor(100, 100, 100);
            doc.text('Uploaded by customer', refImageX + refImageWidth / 2, refImageY + refImageHeight + 4, { align: 'center' });
            doc.setTextColor(0, 0, 0);
            
            // Update yPos after image
            yPos = refImageY + refImageHeight + 15;
            resolve();
          };
          
          img.onerror = () => {
            console.error('Error loading reference image for dimension calculation');
            resolve();
          };
          
          img.src = door.referenceImage!;
        });
      } catch (error) {
        console.error('Error adding reference image:', error);
        doc.setFontSize(8);
        doc.setFont('NeueHaasDisplay', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text('Reference image unavailable', pageWidth / 2, yPos, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        yPos += 10;
      }
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
      
      doc.setFont('NeueHaasDisplay', 'bold');
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
            doc.setFont('NeueHaasDisplay', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(item.label, imageX + imageSize / 2, imageY + imageSize + 6, { align: 'center' });
            
            doc.setFontSize(8);
            doc.setFont('NeueHaasDisplay', 'normal');
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
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('COMPLETE COST SUMMARY', margin, yPos);
  yPos += 2;
  
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, margin + 90, yPos);
  yPos += 12;
  
  // Component-wise Breakdown
  doc.setFontSize(10);
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('MATERIAL BREAKDOWN', margin, yPos);
  yPos += 8;
  
  doc.setFillColor(0, 0, 0);
  doc.setTextColor(255, 255, 255);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 7, 'F');
  
  doc.setFontSize(8);
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('COMPONENT', margin + 2, yPos);
  doc.text('AMOUNT', pageWidth - margin - 2, yPos, { align: 'right' });
  
  yPos += 7;
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('NeueHaasDisplay', 'normal');
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
      doc.text(formatCurrencyForPDF(item.amount), pageWidth - margin - 5, yPos, { align: 'right' });
      yPos += 5;
      doc.setLineWidth(0.1);
      doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);
      yPos += 2;
    }
  });
  
  // Material Subtotal
  yPos += 3;
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('Material Subtotal:', margin + 2, yPos);
  doc.text(formatCurrencyForPDF(costSummary.materialSubtotal), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 8;
  
  // Additional & Optional Items
  if (quotation.additionalComponents.length > 0 || quotation.optionalItems.length > 0) {
    doc.setFontSize(10);
    doc.text('ADDITIONAL ITEMS', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(8);
    doc.setFont('NeueHaasDisplay', 'normal');
    
    if (costSummary.totalAdditionalCost > 0) {
      doc.text('Additional Components', margin + 2, yPos);
      doc.text(formatCurrencyForPDF(costSummary.totalAdditionalCost), pageWidth - margin - 5, yPos, { align: 'right' });
      yPos += 5;
      doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);
      yPos += 2;
    }
    
    if (costSummary.totalOptionalCost > 0) {
      doc.text('Optional Items', margin + 2, yPos);
      doc.text(formatCurrencyForPDF(costSummary.totalOptionalCost), pageWidth - margin - 5, yPos, { align: 'right' });
      yPos += 5;
      doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);
      yPos += 2;
    }
    
    yPos += 5;
  }
  
  // Making Charges
  yPos += 2;
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.setFontSize(10);
  doc.text('FABRICATION CHARGES', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(8);
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.text('Making Charges', margin + 2, yPos);
  doc.text(formatCurrencyForPDF(costSummary.makingCharges), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 5;
  doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);
  yPos += 2;
  
  // Subtotal with Making
  yPos += 3;
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('Subtotal (with Fabrication):', margin + 2, yPos);
  doc.text(formatCurrencyForPDF(costSummary.subtotalWithMaking), pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 10;
  
  // Discount Section
  doc.setFillColor(240, 250, 240);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 12, 'FD');
  
  doc.setFontSize(9);
  if (costSummary.discount > 0) {
    doc.setTextColor(0, 150, 0);
    doc.text(`Discount (${quotation.globalDiscount}%)`, margin + 2, yPos);
    doc.text(`- ${formatCurrencyForPDF(costSummary.discount)}`, pageWidth - margin - 5, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    yPos += 7;
    
    doc.setFont('NeueHaasDisplay', 'normal');
    doc.text('Taxable Amount:', margin + 2, yPos);
    doc.text(formatCurrencyForPDF(costSummary.taxableAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  } else {
    doc.text('Taxable Amount:', margin + 2, yPos);
    doc.text(formatCurrencyForPDF(costSummary.taxableAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  }
  
  yPos += 10;
  
  // GST Section
  doc.setFillColor(245, 245, 250);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'FD');
  
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text(`GST (${quotation.gstPercentage}%)`, margin + 2, yPos);
  doc.text(formatCurrencyForPDF(costSummary.gstAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  
  yPos += 12;
  
  // Final Amount - Highlighted
  doc.setLineWidth(1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
  doc.setFillColor(0, 0, 0);
  doc.setTextColor(255, 255, 255);
  doc.rect(margin, yPos - 6, pageWidth - 2 * margin, 12, 'F');
  
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL PAYABLE', margin + 2, yPos);
  doc.text(formatCurrencyForPDF(costSummary.finalAmount), pageWidth - margin - 5, yPos, { align: 'right' });
  
  yPos += 15;
  doc.setTextColor(0, 0, 0);
  
  // Savings Message
  if (costSummary.totalSavings > 0) {
    doc.setTextColor(0, 150, 0);
    doc.setFontSize(10);
    doc.setFont('NeueHaasDisplay', 'bold');
    doc.text(
      `★ Total Savings: ${formatCurrencyForPDF(costSummary.totalSavings)} ★`,
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
  doc.setFont('NeueHaasDisplay', 'bold');
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
  doc.setFont('NeueHaasDisplay', 'normal');
  
  quotation.doors.forEach((door, index) => {
    const calc = doorCalculations.find(c => c.doorId === door.id);
    if (!calc) return;
    
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = addMinimalHeader();
    }
    
    doc.text(door.doorName, margin + 2, yPos);
    doc.text(door.quantity.toString(), margin + 70, yPos);
    doc.text(formatCurrencyForPDF(calc.totalSellingPrice), margin + 95, yPos);
    doc.text(formatCurrencyForPDF(calc.totalOrderValue), pageWidth - margin - 5, yPos, { align: 'right' });
    
    yPos += 5;
    doc.setLineWidth(0.1);
    doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);
    yPos += 2;
  });
  
  // ===== FINAL PAGE: TERMS & CONDITIONS =====
  
  doc.addPage();
  yPos = addMinimalHeader();
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('TERMS & CONDITIONS', margin, yPos);
  yPos += 2;
  
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, margin + 80, yPos);
  yPos += 10;
  
  doc.setFontSize(9);
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('1. Measurement Accuracy', margin, yPos);
  yPos += 5;
  
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.setFontSize(8);
  const measurementText = 'All measurements should be verified on-site before fabrication. QIRO is not responsible for errors in measurements provided by the customer.';
  const measurementLines = doc.splitTextToSize(measurementText, pageWidth - 2 * margin);
  doc.text(measurementLines, margin, yPos);
  yPos += measurementLines.length * 4 + 8;
  
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.setFontSize(9);
  doc.text('2. Quotation Validity', margin, yPos);
  yPos += 5;
  
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.setFontSize(8);
  doc.text('This quotation is valid for 30 days from the date of issue. Prices are subject to change thereafter.', margin, yPos);
  yPos += 10;
  
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.setFontSize(9);
  doc.text('4. Payment Terms', margin, yPos);
  yPos += 5;
  
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.setFontSize(8);
  const paymentText = '50% advance payment required before fabrication. Balance 50% due upon delivery and before installation.';
  doc.text(paymentText, margin, yPos);
  yPos += 10;
  
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.setFontSize(9);
  doc.text('5. Delivery Timeline', margin, yPos);
  yPos += 5;
  
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.setFontSize(8);
  const deliveryText = 'Standard delivery timeline is 7-10 working days from advance payment clearance. Subject to material availability and site readiness. Custom orders may require additional time.';
  const deliveryLines = doc.splitTextToSize(deliveryText, pageWidth - 2 * margin);
  doc.text(deliveryLines, margin, yPos);
  yPos += deliveryLines.length * 4 + 8;
  
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.setFontSize(9);
  doc.text('6. Installation', margin, yPos);
  yPos += 5;
  
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.setFontSize(8);
  doc.text('Installation charges are separate and will be quoted based on site requirements.', margin, yPos);
  yPos += 10;
  
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.setFontSize(9);
  doc.text('7. Warranty', margin, yPos);
  yPos += 5;
  
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.setFontSize(8);
  const warrantyText = '1-year warranty on manufacturing defects. Warranty does not cover damage from mishandling, improper installation, or natural wear and tear.';
  const warrantyLines = doc.splitTextToSize(warrantyText, pageWidth - 2 * margin);
  doc.text(warrantyLines, margin, yPos);
  yPos += warrantyLines.length * 4 + 8;
  
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.setFontSize(9);
  doc.text('8. Scope of Work', margin, yPos);
  yPos += 5;
  
  doc.setFont('NeueHaasDisplay', 'normal');
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
  
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.setFontSize(9);
  doc.text('CONTACT INFORMATION', margin, yPos);
  yPos += 6;
  
  doc.setFont('NeueHaasDisplay', 'normal');
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
  
  // ===== BANKING & PAYMENT DETAILS PAGE =====
  
  doc.addPage();
  yPos = addMinimalHeader();
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('PAYMENT & BANKING DETAILS', margin, yPos);
  yPos += 2;
  
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, margin + 95, yPos);
  yPos += 12;
  
  // Company Information
  const companyInfo = masterData.companyInfo;
  
  if (companyInfo) {
    // Company Details
    doc.setFillColor(245, 245, 250);
    doc.rect(margin, yPos - 3, pageWidth - 2 * margin, 60, 'F');
    
    doc.setFont('NeueHaasDisplay', 'bold');
    doc.setFontSize(11);
    doc.text(companyInfo.companyName, margin + 3, yPos);
    yPos += 7;
    
    doc.setFont('NeueHaasDisplay', 'normal');
    doc.setFontSize(8);
    const addressLines = doc.splitTextToSize(companyInfo.address, pageWidth - 2 * margin - 10);
    doc.text(addressLines, margin + 3, yPos);
    yPos += addressLines.length * 4 + 3;
    
    doc.text(`Phone: ${companyInfo.phone}`, margin + 3, yPos);
    yPos += 5;
    doc.text(`Email: ${companyInfo.email}`, margin + 3, yPos);
    yPos += 5;
    if (companyInfo.website) {
      doc.text(`Website: ${companyInfo.website}`, margin + 3, yPos);
      yPos += 5;
    }
    
    // Tax Details
    if (companyInfo.gstNumber || companyInfo.panNumber) {
      yPos += 2;
      doc.setFont('NeueHaasDisplay', 'bold');
      doc.text('Tax Details:', margin + 3, yPos);
      yPos += 5;
      doc.setFont('NeueHaasDisplay', 'normal');
      
      if (companyInfo.gstNumber) {
        doc.text(`GST Number: ${companyInfo.gstNumber}`, margin + 3, yPos);
        yPos += 5;
      }
      if (companyInfo.panNumber) {
        doc.text(`PAN Number: ${companyInfo.panNumber}`, margin + 3, yPos);
        yPos += 5;
      }
    }
    
    yPos += 10;
    
    // Banking Details
    if (companyInfo.bankDetails) {
      const bankDetails = companyInfo.bankDetails;
      
      doc.setFont('NeueHaasDisplay', 'bold');
      doc.setFontSize(11);
      doc.text('BANKING DETAILS', margin, yPos);
      yPos += 8;
      
      doc.setFillColor(240, 250, 245);
      const bankBoxHeight = 65 + (bankDetails.branchName ? 5 : 0) + (bankDetails.upiId ? 5 : 0);
      doc.rect(margin, yPos - 3, pageWidth - 2 * margin, bankBoxHeight, 'F');
      
      doc.setFont('NeueHaasDisplay', 'normal');
      doc.setFontSize(9);
      
      if (bankDetails.bankName) {
        doc.setFont('NeueHaasDisplay', 'bold');
        doc.text('Bank Name:', margin + 3, yPos);
        doc.setFont('NeueHaasDisplay', 'normal');
        doc.text(bankDetails.bankName, margin + 45, yPos);
        yPos += 6;
      }
      
      if (bankDetails.accountName) {
        doc.setFont('NeueHaasDisplay', 'bold');
        doc.text('Account Name:', margin + 3, yPos);
        doc.setFont('NeueHaasDisplay', 'normal');
        doc.text(bankDetails.accountName, margin + 45, yPos);
        yPos += 6;
      }
      
      if (bankDetails.accountNumber) {
        doc.setFont('NeueHaasDisplay', 'bold');
        doc.text('Account Number:', margin + 3, yPos);
        doc.setFont('NeueHaasDisplay', 'normal');
        doc.text(bankDetails.accountNumber, margin + 45, yPos);
        yPos += 6;
      }
      
      if (bankDetails.ifscCode) {
        doc.setFont('NeueHaasDisplay', 'bold');
        doc.text('IFSC Code:', margin + 3, yPos);
        doc.setFont('NeueHaasDisplay', 'normal');
        doc.text(bankDetails.ifscCode, margin + 45, yPos);
        yPos += 6;
      }
      
      if (bankDetails.branchName) {
        doc.setFont('NeueHaasDisplay', 'bold');
        doc.text('Branch:', margin + 3, yPos);
        doc.setFont('NeueHaasDisplay', 'normal');
        doc.text(bankDetails.branchName, margin + 45, yPos);
        yPos += 6;
      }
      
      if (bankDetails.upiId) {
        yPos += 2;
        doc.setFont('NeueHaasDisplay', 'bold');
        doc.text('UPI ID:', margin + 3, yPos);
        doc.setFont('NeueHaasDisplay', 'normal');
        doc.text(bankDetails.upiId, margin + 45, yPos);
        yPos += 6;
      }
      
      yPos += 5;
    }
    
    // Payment Instructions
    yPos += 10;
    doc.setFont('NeueHaasDisplay', 'bold');
    doc.setFontSize(11);
    doc.text('PAYMENT INSTRUCTIONS', margin, yPos);
    yPos += 8;
    
    doc.setFont('NeueHaasDisplay', 'normal');
    doc.setFontSize(9);
    doc.text('1. Please make payment to the above bank account', margin + 3, yPos);
    yPos += 6;
    doc.text('2. Send payment confirmation via email or WhatsApp', margin + 3, yPos);
    yPos += 6;
    doc.text('3. Include quotation ID as reference in transaction', margin + 3, yPos);
    yPos += 6;
    doc.text('4. Fabrication will begin after payment confirmation', margin + 3, yPos);
    yPos += 10;
    
    // Important Note
    doc.setFillColor(255, 245, 235);
    doc.rect(margin, yPos - 3, pageWidth - 2 * margin, 25, 'F');
    doc.setFont('NeueHaasDisplay', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(150, 75, 0);
    doc.text('⚠ IMPORTANT:', margin + 3, yPos);
    yPos += 6;
    doc.setFont('NeueHaasDisplay', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('Please ensure the quotation ID is mentioned in payment remarks for quick processing.', margin + 3, yPos);
    yPos += 5;
    doc.text('For any payment related queries, please contact us at the above phone number or email.', margin + 3, yPos);
  }
  
  // Footer
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.1);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.text(
    `Banking & Payment Details | ${formatDate(new Date().toISOString())}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  
  // Save PDF
  doc.save(`${quotation.id}.pdf`);
};

// ===== CUTTING SCHEMA PDF (FOR STAFF ONLY) =====
export const generateCuttingSchemaPDF = async (
  quotation: QuotationData,
  doorCalculations: DoorCalculation[],
  costSummary: CostSummary
): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Load custom font - Neue Haas Display
  const loadCustomFont = async () => {
    try {
      // Load Medium variant for normal text (better rendering)
      const response = await fetch('/font/NeueHaasDisplayMediu.ttf');
      const fontBuffer = await response.arrayBuffer();
      const fontBase64 = btoa(
        new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      doc.addFileToVFS('NeueHaasDisplay-Medium.ttf', fontBase64);
      doc.addFont('NeueHaasDisplay-Medium.ttf', 'NeueHaasDisplay', 'normal');
      
      // Load Bold variant
      const responseBold = await fetch('/font/NeueHaasDisplayBold.ttf');
      const fontBufferBold = await responseBold.arrayBuffer();
      const fontBase64Bold = btoa(
        new Uint8Array(fontBufferBold).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      doc.addFileToVFS('NeueHaasDisplay-Bold.ttf', fontBase64Bold);
      doc.addFont('NeueHaasDisplay-Bold.ttf', 'NeueHaasDisplay', 'bold');
      
      // Set as default font
      doc.setFont('NeueHaasDisplay', 'normal');
      console.log('Custom font loaded successfully');
    } catch (error) {
      console.error('Failed to load custom font:', error);
      // Fallback to helvetica
      doc.setFont('helvetica', 'normal');
    }
  };

  // Load custom font
  await loadCustomFont();

  // Helper function to load and add logo
  const addLogoToHeader = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg'));
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load logo'));
      img.src = '/logo_bg_white.jpeg';
    });
  };

  // Load logo once at the beginning
  let logoDataUrl: string;
  try {
    logoDataUrl = await addLogoToHeader();
  } catch (error) {
    console.error('Failed to load logo:', error);
    logoDataUrl = ''; // Fallback to no logo
  }

  // Helper function to add header
  const addHeader = (isFirstPage: boolean = false) => {
    // Top white bar
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    // Add logo if available
    if (logoDataUrl) {
      try {
        // Logo centered, 80mm wide, maintaining aspect ratio
        const logoWidth = 80;
        const logoHeight = 80; // Adjust based on your logo's aspect ratio
        const logoX = (pageWidth - logoWidth) / 2;
        const logoY = -20;
        doc.addImage(logoDataUrl, 'JPEG', logoX, logoY, logoWidth, logoHeight);
      } catch (error) {
        console.error('Error adding logo to PDF:', error);
        // Fallback to text
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(32);
        doc.setFont('NeueHaasDisplay', 'bold');
        doc.text('QIRO', pageWidth/2, 20, { align: 'center'});
      }
    } else {
      // Fallback to text if logo failed to load
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(32);
      doc.setFont('NeueHaasDisplay', 'bold');
      doc.text('QIRO', pageWidth/2, 20, { align: 'center'});
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.15);
    doc.line(margin, 32, pageWidth - margin, 32);
    
    return 45;
  };

  yPos = addHeader(true);

  // Title
  doc.setFontSize(10);
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('CUTTING SCHEMA - STAFF ONLY', margin, yPos);
  yPos += 8;

  // Customer and Project Info - Clean Layout matching quotation PDF
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.setFontSize(9);
  
  // Left column
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('Customer:', margin, yPos);
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.text(quotation.customerName, margin + 25, yPos);
  
  // Right column
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('Date:', pageWidth - margin - 60, yPos);
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.text(formatDate(quotation.date), pageWidth - margin - 25, yPos);
  yPos += 6;
  
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('Project:', margin, yPos);
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.text(quotation.projectName, margin + 25, yPos);
  
  doc.setFont('NeueHaasDisplay', 'bold');
  doc.text('ID:', pageWidth - margin - 60, yPos);
  doc.setFont('NeueHaasDisplay', 'normal');
  doc.text(quotation.id, pageWidth - margin - 25, yPos);
  yPos += 12;

  // Group doors by profile combination (frame + handle)
  interface ProfileGroup {
    key: string;
    frameProfile: string;
    handleProfile: string;
    doors: Array<{ door: DoorConfiguration; calc: DoorCalculation; index: number }>;
    totalQuantity: number;
  }

  const profileGroups: Map<string, ProfileGroup> = new Map();

  // Group all doors by their profile combination
  quotation.doors.forEach((door, index) => {
    const frameProfile = door.frameProfileCode || door.profileCode;
    const handleProfile = door.handleProfileCode || 'NONE';
    const key = `${frameProfile}|${handleProfile}`;

    if (!profileGroups.has(key)) {
      profileGroups.set(key, {
        key,
        frameProfile,
        handleProfile,
        doors: [],
        totalQuantity: 0,
      });
    }

    const group = profileGroups.get(key)!;
    group.doors.push({ door, calc: doorCalculations[index], index });
    group.totalQuantity += door.quantity;
  });

  // Generate cutting schema for each unique profile combination
  let groupNumber = 1;
  for (const group of profileGroups.values()) {
    // Check if new page needed
    if (yPos > pageHeight - 140) {
      doc.addPage();
      yPos = addHeader();
    }

    // Profile Group Header
    doc.setFont('NeueHaasDisplay', 'bold');
    doc.setFontSize(11);
    doc.text(`Profile Combination ${groupNumber}`, margin, yPos);
    yPos += 6;

    // Profile details
    doc.setFont('NeueHaasDisplay', 'normal');
    doc.setFontSize(9);
    doc.text(`Frame Profile: ${group.frameProfile}`, margin, yPos);
    doc.text(`Handle Profile: ${group.handleProfile}`, margin + 70, yPos);
    yPos += 5;

    // List all doors using this profile combination
    doc.setFont('NeueHaasDisplay', 'bold');
    doc.setFontSize(8);
    doc.text(`Doors using this profile (Total Qty: ${group.totalQuantity}):`, margin, yPos);
    yPos += 5;

    doc.setFont('NeueHaasDisplay', 'normal');
    doc.setFontSize(8);
    for (const { door, index } of group.doors) {
      doc.text(
        `• Door ${index + 1}: ${door.doorName} - ${door.width}x${door.height}mm (Qty: ${door.quantity})`,
        margin + 5,
        yPos
      );
      yPos += 4;
    }
    yPos += 4;

    // Cutting Schema Diagram (use first door as reference since all have same profile)
    const referenceDoor = group.doors[0].door;
    const referenceCalc = group.doors[0].calc;

    try {
      const schemaString = generateCuttingSchemaeSVG(referenceDoor, referenceCalc.cuttingScheme);
      
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
      
      yPos += schemaHeight + 8;
      
    } catch (error) {
      console.error('Cutting schema diagram error:', error);
      doc.setFontSize(8);
      doc.setFont('NeueHaasDisplay', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('Cutting schema diagram unavailable', pageWidth / 2, yPos, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPos += 10;
    }

    // Add separator line between profile groups
    if (groupNumber < profileGroups.size) {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
    }

    groupNumber++;
  }

  // Footer
  yPos = pageHeight - 15;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.text(
    `CONFIDENTIAL - For Staff Use Only | Generated on ${formatDate(new Date().toISOString())}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Save PDF
  doc.save(`${quotation.id}_CuttingSchema.pdf`);
};
