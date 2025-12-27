import {
  DoorConfiguration,
  DoorCalculation,
  CuttingScheme,
  CostSummary,
  QuotationData,
  AdditionalComponent,
  OptionalItem,
  MeasurementUnit,
} from '../types';
import { masterData } from '../data/masterData';

// Unit conversion
export const mmToInches = (mm: number): number => mm / 25.4;
export const inchesToMm = (inches: number): number => inches * 25.4;

export const convertToMm = (value: number, unit: MeasurementUnit): number => {
  return unit === 'inches' ? inchesToMm(value) : value;
};

export const sqMmToSqFt = (sqMm: number): number => sqMm / 92903.04;

// Calculate cutting scheme for a door
export const calculateCuttingScheme = (door: DoorConfiguration): CuttingScheme => {
  const heightMm = convertToMm(door.height, door.measurementUnit);
  const widthMm = convertToMm(door.width, door.measurementUnit);
  
  const frameProfile = masterData.frameProfiles.find(f => f.code === door.frameProfileCode);
  const frameThickness = frameProfile?.width || 25;
  
  // Calculate frame pieces
  // Vertical pieces: 2 pieces of full height
  const verticalLength = Math.round(heightMm);
  
  // Horizontal pieces: 2 pieces of width minus frame thickness on both sides
  const horizontalLength = Math.round(widthMm - (2 * frameThickness));
  
  // For single door: 2 vertical + 2 horizontal pieces
  const frameVerticalPieces = [verticalLength, verticalLength];
  const frameHorizontalPieces = [horizontalLength, horizontalLength];
  
  // Additional allowance pieces (for reinforcement or extra support)
  const allowancePiece = Math.round(widthMm * 0.3); // 30% of width for extra support
  frameHorizontalPieces.push(allowancePiece);
  
  const totalFrameLength = 
    frameVerticalPieces.reduce((sum, l) => sum + l, 0) +
    frameHorizontalPieces.reduce((sum, l) => sum + l, 0);
  
  // Calculate handle pieces if handle is present
  let handlePieces: number[] = [];
  let totalHandleLength = 0;
  
  if (door.handleProfileCode && door.handlePosition !== 'none') {
    // Handle runs vertically along the door height
    const handleLength = Math.round(heightMm - 100); // 100mm less for clearance
    handlePieces = [handleLength];
    totalHandleLength = handleLength;
  }
  
  return {
    frameVerticalPieces,
    frameHorizontalPieces,
    handlePieces,
    totalFrameLength,
    totalHandleLength,
  };
};

// Calculate glass area in square feet
export const calculateGlassArea = (
  door: DoorConfiguration,
  wastagePercentage: number
): { glassArea: number; glassAreaWithWastage: number } => {
  const heightMm = convertToMm(door.height, door.measurementUnit);
  const widthMm = convertToMm(door.width, door.measurementUnit);
  
  const frameProfile = masterData.frameProfiles.find(f => f.code === door.frameProfileCode);
  const frameThickness = frameProfile?.width || 25;
  
  // Glass area = door area minus frame area
  const glassHeightMm = heightMm - (2 * frameThickness);
  const glassWidthMm = widthMm - (2 * frameThickness);
  
  const glassAreaMm2 = glassHeightMm * glassWidthMm;
  const glassArea = sqMmToSqFt(glassAreaMm2);
  
  // Apply wastage percentage
  const glassAreaWithWastage = glassArea * (1 + wastagePercentage / 100);
  
  return {
    glassArea: parseFloat(glassArea.toFixed(2)),
    glassAreaWithWastage: parseFloat(glassAreaWithWastage.toFixed(2)),
  };
};

// Calculate costs for a single door
export const calculateDoorCosts = (
  door: DoorConfiguration,
  wastagePercentage: number
): DoorCalculation => {
  const cuttingScheme = calculateCuttingScheme(door);
  const { glassArea, glassAreaWithWastage } = calculateGlassArea(door, wastagePercentage);
  
  // Frame cost
  const frameProfile = masterData.frameProfiles.find(f => f.code === door.frameProfileCode);
  const framePricePerMm = (frameProfile?.pricePerMeter || 0) / 1000;
  const frameCost = cuttingScheme.totalFrameLength * framePricePerMm * door.quantity;
  
  // Handle cost
  let handleCost = 0;
  if (door.handleProfileCode) {
    const handleProfile = masterData.handleProfiles.find(h => h.code === door.handleProfileCode);
    const handlePricePerMm = (handleProfile?.pricePerMeter || 0) / 1000;
    handleCost = cuttingScheme.totalHandleLength * handlePricePerMm * door.quantity;
  }
  
  // Glass cost
  const glassType = masterData.glassTypes.find(g => g.code === door.glassTypeCode);
  const glassCost = glassAreaWithWastage * (glassType?.pricePerSqFt || 0) * door.quantity;
  
  // Connector cost (4 connectors per door minimum)
  const connectorsPerDoor = 4;
  const connector = masterData.connectorTypes[0]; // Default connector
  const connectorCost = connectorsPerDoor * connector.pricePerUnit * door.quantity;
  
  const totalCost = frameCost + handleCost + glassCost + connectorCost;
  
  return {
    doorId: door.id,
    frameCost: parseFloat(frameCost.toFixed(2)),
    handleCost: parseFloat(handleCost.toFixed(2)),
    glassCost: parseFloat(glassCost.toFixed(2)),
    connectorCost: parseFloat(connectorCost.toFixed(2)),
    glassArea,
    glassAreaWithWastage,
    cuttingScheme,
    totalCost: parseFloat(totalCost.toFixed(2)),
  };
};

// Calculate total for additional component
export const calculateAdditionalComponentTotal = (
  component: AdditionalComponent
): number => {
  const subtotal = component.quantity * component.price;
  const discount = (subtotal * component.discount) / 100;
  return parseFloat((subtotal - discount).toFixed(2));
};

// Calculate total for optional item
export const calculateOptionalItemTotal = (item: OptionalItem): number => {
  const subtotal = item.quantity * item.mrp;
  const discount = (subtotal * item.discount) / 100;
  return parseFloat((subtotal - discount).toFixed(2));
};

// Calculate overall cost summary
export const calculateCostSummary = (
  quotation: QuotationData,
  doorCalculations: DoorCalculation[]
): CostSummary => {
  // Total hardware cost (frame + handle + connectors)
  const totalHardwareCost = doorCalculations.reduce(
    (sum, calc) => sum + calc.frameCost + calc.handleCost + calc.connectorCost,
    0
  );
  
  // Total glass cost
  const totalGlassCost = doorCalculations.reduce(
    (sum, calc) => sum + calc.glassCost,
    0
  );
  
  // Total additional components cost
  const totalAdditionalCost = quotation.additionalComponents.reduce(
    (sum, component) => sum + calculateAdditionalComponentTotal(component),
    0
  );
  
  // Total optional items cost
  const totalOptionalCost = quotation.optionalItems.reduce(
    (sum, item) => sum + calculateOptionalItemTotal(item),
    0
  );
  
  // Subtotal before discount
  const subtotal = totalHardwareCost + totalGlassCost + totalAdditionalCost + totalOptionalCost;
  
  // Global discount
  const discount = (subtotal * quotation.globalDiscount) / 100;
  
  // Taxable amount
  const taxableAmount = subtotal - discount;
  
  // GST calculation
  const gstAmount = (taxableAmount * quotation.gstPercentage) / 100;
  
  // Final amount
  const finalAmount = taxableAmount + gstAmount;
  
  // Calculate total savings (discount)
  const totalSavings = discount;
  
  return {
    totalHardwareCost: parseFloat(totalHardwareCost.toFixed(2)),
    totalGlassCost: parseFloat(totalGlassCost.toFixed(2)),
    totalAdditionalCost: parseFloat(totalAdditionalCost.toFixed(2)),
    totalOptionalCost: parseFloat(totalOptionalCost.toFixed(2)),
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    taxableAmount: parseFloat(taxableAmount.toFixed(2)),
    gstAmount: parseFloat(gstAmount.toFixed(2)),
    finalAmount: parseFloat(finalAmount.toFixed(2)),
    totalSavings: parseFloat(totalSavings.toFixed(2)),
  };
};

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};
