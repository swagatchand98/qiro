import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  QuotationData,
  DoorCalculation,
  CostSummary,
} from '../types';
import { masterData } from '../data/masterData';
import { formatCurrency, formatDate } from './calculations';

// Export to Excel
export const exportToExcel = (
  quotation: QuotationData,
  doorCalculations: DoorCalculation[],
  costSummary: CostSummary
): void => {
  const workbook = XLSX.utils.book_new();
  
  // Sheet 1: Quotation Summary
  const summaryData = [
    ['QIRO GLASS SOLUTIONS - QUOTATION'],
    [''],
    ['Customer Details'],
    ['Name', quotation.customerName],
    ['Mobile', quotation.mobileNumber],
    ['Address', quotation.address],
    ['Project', quotation.projectName],
    ['Date', formatDate(quotation.date)],
    ['Quotation ID', quotation.id],
    [''],
    ['Door Configuration Summary'],
    ['Door Name', 'Type', 'Width', 'Height', 'Unit', 'Quantity', 'Cost'],
  ];
  
  quotation.doors.forEach(door => {
    const calc = doorCalculations.find(c => c.doorId === door.id);
    summaryData.push([
      door.doorName,
      door.doorType,
      door.width.toString(),
      door.height.toString(),
      door.measurementUnit,
      door.quantity.toString(),
      calc ? formatCurrency(calc.totalCost) : 'N/A',
    ]);
  });
  
  summaryData.push(
    [''],
    ['Cost Summary'],
    ['Hardware Cost', formatCurrency(costSummary.totalHardwareCost)],
    ['Glass Cost', formatCurrency(costSummary.totalGlassCost)],
    ['Additional Components', formatCurrency(costSummary.totalAdditionalCost)],
    ['Optional Items', formatCurrency(costSummary.totalOptionalCost)],
    ['Subtotal', formatCurrency(costSummary.subtotal)],
    ['Discount', formatCurrency(costSummary.discount)],
    ['Taxable Amount', formatCurrency(costSummary.taxableAmount)],
    ['GST (' + quotation.gstPercentage + '%)', formatCurrency(costSummary.gstAmount)],
    ['FINAL AMOUNT', formatCurrency(costSummary.finalAmount)],
  );
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Quotation Summary');
  
  // Sheet 2: Door Details
  const doorDetailsData = [
    ['Door Technical Details'],
    [''],
    ['Door Name', 'Type', 'Dimensions', 'Frame Profile', 'Handle Profile', 'Glass Type', 'Glass Area', 'Hinge', 'Quantity'],
  ];
  
  quotation.doors.forEach(door => {
    const calc = doorCalculations.find(c => c.doorId === door.id);
    const frameProfile = masterData.frameProfiles.find(f => f.code === door.frameProfileCode);
    const handleProfile = masterData.handleProfiles.find(h => h.code === door.handleProfileCode);
    const glassType = masterData.glassTypes.find(g => g.code === door.glassTypeCode);
    
    doorDetailsData.push([
      door.doorName,
      door.doorType,
      `${door.width}x${door.height} ${door.measurementUnit}`,
      frameProfile?.name || 'N/A',
      handleProfile?.name || 'None',
      glassType?.name || 'N/A',
      calc ? `${calc.glassArea} sq.ft` : 'N/A',
      `${door.hingePosition} - ${door.hingeCode}`,
      door.quantity.toString(),
    ]);
  });
  
  const doorDetailsSheet = XLSX.utils.aoa_to_sheet(doorDetailsData);
  XLSX.utils.book_append_sheet(workbook, doorDetailsSheet, 'Door Details');
  
  // Sheet 3: Cutting Schemes
  const cuttingData = [
    ['Cutting Schemes'],
    [''],
  ];
  
  quotation.doors.forEach(door => {
    const calc = doorCalculations.find(c => c.doorId === door.id);
    if (!calc) return;
    
    cuttingData.push(
      ['Door: ' + door.doorName],
      ['Frame Vertical Pieces (mm)', calc.cuttingScheme.frameVerticalPieces.join(', ')],
      ['Frame Horizontal Pieces (mm)', calc.cuttingScheme.frameHorizontalPieces.join(', ')],
      ['Handle Pieces (mm)', calc.cuttingScheme.handlePieces.join(', ') || 'None'],
      ['Total Frame Length (mm)', calc.cuttingScheme.totalFrameLength.toString()],
      ['Total Handle Length (mm)', calc.cuttingScheme.totalHandleLength.toString()],
      [''],
    );
  });
  
  const cuttingSheet = XLSX.utils.aoa_to_sheet(cuttingData);
  XLSX.utils.book_append_sheet(workbook, cuttingSheet, 'Cutting Schemes');
  
  // Sheet 4: Cost Breakdown
  const costData = [
    ['Detailed Cost Breakdown'],
    [''],
    ['Door Name', 'Frame Cost', 'Handle Cost', 'Glass Cost', 'Connector Cost', 'Total Cost'],
  ];
  
  quotation.doors.forEach(door => {
    const calc = doorCalculations.find(c => c.doorId === door.id);
    if (!calc) return;
    
    costData.push([
      door.doorName,
      formatCurrency(calc.frameCost),
      formatCurrency(calc.handleCost),
      formatCurrency(calc.glassCost),
      formatCurrency(calc.connectorCost),
      formatCurrency(calc.totalCost),
    ]);
  });
  
  const costSheet = XLSX.utils.aoa_to_sheet(costData);
  XLSX.utils.book_append_sheet(workbook, costSheet, 'Cost Breakdown');
  
  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Quotation_${quotation.id}_${quotation.customerName.replace(/\s+/g, '_')}.xlsx`);
};

// Export to Text
export const exportToText = (
  quotation: QuotationData,
  doorCalculations: DoorCalculation[],
  costSummary: CostSummary
): void => {
  let text = '';
  
  // Header
  text += '═══════════════════════════════════════════════════════════\n';
  text += '           QIRO GLASS SOLUTIONS - QUOTATION               \n';
  text += '═══════════════════════════════════════════════════════════\n\n';
  
  // Customer Details
  text += 'CUSTOMER DETAILS\n';
  text += '─────────────────────────────────────────────────────────\n';
  text += `Name:         ${quotation.customerName}\n`;
  text += `Mobile:       ${quotation.mobileNumber}\n`;
  text += `Address:      ${quotation.address}\n`;
  text += `Project:      ${quotation.projectName}\n`;
  text += `Date:         ${formatDate(quotation.date)}\n`;
  text += `Quotation ID: ${quotation.id}\n\n`;
  
  // Door Configuration
  text += 'DOOR CONFIGURATION SUMMARY\n';
  text += '─────────────────────────────────────────────────────────\n';
  quotation.doors.forEach((door, index) => {
    const calc = doorCalculations.find(c => c.doorId === door.id);
    text += `\n${index + 1}. ${door.doorName}\n`;
    text += `   Type:     ${door.doorType}\n`;
    text += `   Size:     ${door.width} x ${door.height} ${door.measurementUnit}\n`;
    text += `   Quantity: ${door.quantity}\n`;
    text += `   Cost:     ${calc ? formatCurrency(calc.totalCost) : 'N/A'}\n`;
  });
  
  text += '\n';
  
  // Cost Summary
  text += 'COST SUMMARY\n';
  text += '─────────────────────────────────────────────────────────\n';
  text += `Hardware Cost:           ${formatCurrency(costSummary.totalHardwareCost)}\n`;
  text += `Glass Cost:              ${formatCurrency(costSummary.totalGlassCost)}\n`;
  text += `Additional Components:   ${formatCurrency(costSummary.totalAdditionalCost)}\n`;
  text += `Optional Items:          ${formatCurrency(costSummary.totalOptionalCost)}\n`;
  text += `                         ──────────────────\n`;
  text += `Subtotal:                ${formatCurrency(costSummary.subtotal)}\n`;
  
  if (costSummary.discount > 0) {
    text += `Discount (${quotation.globalDiscount}%):        - ${formatCurrency(costSummary.discount)}\n`;
  }
  
  text += `Taxable Amount:          ${formatCurrency(costSummary.taxableAmount)}\n`;
  text += `GST (${quotation.gstPercentage}%):               ${formatCurrency(costSummary.gstAmount)}\n`;
  text += `                         ══════════════════\n`;
  text += `FINAL AMOUNT:            ${formatCurrency(costSummary.finalAmount)}\n`;
  
  if (costSummary.totalSavings > 0) {
    text += `\n✨ Total Savings:         ${formatCurrency(costSummary.totalSavings)}\n`;
  }
  
  text += '\n';
  
  // Cutting Schemes
  text += 'CUTTING SCHEMES\n';
  text += '─────────────────────────────────────────────────────────\n';
  quotation.doors.forEach((door, index) => {
    const calc = doorCalculations.find(c => c.doorId === door.id);
    if (!calc) return;
    
    text += `\n${index + 1}. ${door.doorName}\n`;
    text += `   Frame Vertical:   [${calc.cuttingScheme.frameVerticalPieces.join(', ')}] mm\n`;
    text += `   Frame Horizontal: [${calc.cuttingScheme.frameHorizontalPieces.join(', ')}] mm\n`;
    if (calc.cuttingScheme.handlePieces.length > 0) {
      text += `   Handle Pieces:    [${calc.cuttingScheme.handlePieces.join(', ')}] mm\n`;
    }
    text += `   Total Frame:      ${calc.cuttingScheme.totalFrameLength} mm\n`;
    if (calc.cuttingScheme.totalHandleLength > 0) {
      text += `   Total Handle:     ${calc.cuttingScheme.totalHandleLength} mm\n`;
    }
  });
  
  text += '\n';
  
  // Footer
  text += '═══════════════════════════════════════════════════════════\n';
  text += '  This is a system-generated quotation\n';
  text += '  For queries: info@qiro.com | +91-XXXXXXXXXX\n';
  text += '═══════════════════════════════════════════════════════════\n';
  
  // Create and download text file
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `Quotation_${quotation.id}_${quotation.customerName.replace(/\s+/g, '_')}.txt`);
};

// Save quotation to localStorage
export const saveQuotationToLocalStorage = (quotation: QuotationData): void => {
  try {
    const savedQuotations = localStorage.getItem('qiro_quotations');
    const quotations: QuotationData[] = savedQuotations ? JSON.parse(savedQuotations) : [];
    
    // Check if quotation already exists
    const existingIndex = quotations.findIndex(q => q.id === quotation.id);
    
    if (existingIndex >= 0) {
      quotations[existingIndex] = quotation;
    } else {
      quotations.push(quotation);
    }
    
    localStorage.setItem('qiro_quotations', JSON.stringify(quotations));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// Load quotations from localStorage
export const loadQuotationsFromLocalStorage = (): QuotationData[] => {
  try {
    const savedQuotations = localStorage.getItem('qiro_quotations');
    return savedQuotations ? JSON.parse(savedQuotations) : [];
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return [];
  }
};

// Delete quotation from localStorage
export const deleteQuotationFromLocalStorage = (quotationId: string): void => {
  try {
    const savedQuotations = localStorage.getItem('qiro_quotations');
    const quotations: QuotationData[] = savedQuotations ? JSON.parse(savedQuotations) : [];
    
    const filteredQuotations = quotations.filter(q => q.id !== quotationId);
    localStorage.setItem('qiro_quotations', JSON.stringify(filteredQuotations));
  } catch (error) {
    console.error('Error deleting from localStorage:', error);
  }
};
