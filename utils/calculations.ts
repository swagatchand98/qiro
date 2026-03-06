import {
  DoorConfiguration,
  DoorCalculation,
  CuttingScheme,
  CostSummary,
  QuotationData,
  AdditionalComponent,
  OptionalItem,
  MeasurementUnit,
  SlidingBundle,
  DividerMode,
  DividerSettings,
  DividerConfig,
  PricingSettings,
  MasterData,
} from '../types';
import { masterData as defaultMasterData } from '../data/masterData';

// Unit conversion
export const mmToInches = (mm: number): number => mm / 25.4;
export const inchesToMm = (inches: number): number => inches * 25.4;

export const convertToMm = (value: number, unit: MeasurementUnit): number => {
  return unit === 'inches' ? inchesToMm(value) : value;
};

export const sqMmToSqFt = (sqMm: number): number => sqMm / 92903.04;

// DIVIDER LOGIC: Calculate divider positions based on mode
export const calculateDividerPositions = (
  widthMm: number,
  heightMm: number,
  mode: DividerMode,
  settings: DividerSettings,
  manualConfig?: DividerConfig
): DividerConfig => {
  if (mode === 'manual' && manualConfig) {
    return manualConfig;
  }

  if (mode === 'fixed-offset') {
    // Use predefined offsets from settings
    // Filter positions that fit within the door dimensions
    const horizontal = settings.fixedOffsetHorizontal.filter(pos => pos > 0 && pos < heightMm);
    const vertical = settings.fixedOffsetVertical.filter(pos => pos > 0 && pos < widthMm);
    return { horizontal, vertical };
  }

  if (mode === 'equal-split') {
    // Divide the door into equal sections
    const horizontal: number[] = [];
    const vertical: number[] = [];

    // Calculate horizontal divider positions (splits height)
    if (settings.equalSplitHorizontalCount > 1) {
      const sectionHeight = heightMm / settings.equalSplitHorizontalCount;
      for (let i = 1; i < settings.equalSplitHorizontalCount; i++) {
        horizontal.push(Math.round(sectionHeight * i));
      }
    }

    // Calculate vertical divider positions (splits width)
    if (settings.equalSplitVerticalCount > 1) {
      const sectionWidth = widthMm / settings.equalSplitVerticalCount;
      for (let i = 1; i < settings.equalSplitVerticalCount; i++) {
        vertical.push(Math.round(sectionWidth * i));
      }
    }

    return { horizontal, vertical };
  }

  // Default: no dividers
  return { horizontal: [], vertical: [] };
};

// Format divider positions for display
export const formatDividerPositions = (config: DividerConfig): string => {
  const horizontal = config.horizontal.length > 0 
    ? `H: ${config.horizontal.join('mm, ')}mm` 
    : 'H: None';
  const vertical = config.vertical.length > 0 
    ? `V: ${config.vertical.join('mm, ')}mm` 
    : 'V: None';
  return `${horizontal} | ${vertical}`;
};

// AUTO-SELECT: Sliding bundle based on door specifications
export const autoSelectSlidingBundle = (
  widthMm: number,
  heightMm: number,
  glassThicknessMm: number = 5,
  doorCount: number = 1
): SlidingBundle | null => {
  // Calculate approximate door weight
  // Formula: (width_m * height_m) * glass_density_kg/sqm * thickness_factor
  const widthM = widthMm / 1000;
  const heightM = heightMm / 1000;
  const areaM2 = widthM * heightM;
  
  // Glass density: ~2.5 kg per mm per sqm
  // Add frame weight: ~3 kg/m perimeter
  const glassWeight = areaM2 * glassThicknessMm * 2.5;
  const perimeterM = 2 * (widthM + heightM);
  const frameWeight = perimeterM * 3;
  const totalWeightPerDoor = glassWeight + frameWeight;
  const totalWeight = totalWeightPerDoor * doorCount;
  
  // Find suitable bundles sorted by weight capacity
  const suitableBundles = defaultMasterData.slidingBundles
    .filter(bundle => bundle.maxDoorWeight >= totalWeight)
    .sort((a, b) => a.maxDoorWeight - b.maxDoorWeight);
  
  // Return the most appropriate bundle (smallest that fits)
  // Prefer soft-close for heavier doors
  if (totalWeight > 60 && suitableBundles.some(b => b.hasSoftClose)) {
    return suitableBundles.find(b => b.hasSoftClose) || suitableBundles[0] || null;
  }
  
  return suitableBundles[0] || null;
};

// AUTO-CALCULATE: Hinge count and positions based on door height
export const calculateHingeConfig = (
  heightMm: number,
  doorType: string
): { hingeCount: number; hingePositions: number[] } => {
  // Only openable, air-hinge, and pin-hinge doors need hinges (not sliding)
  if (doorType !== 'openable' && doorType !== 'air-hinge' && doorType !== 'pin-hinge') {
    return { hingeCount: 0, hingePositions: [] };
  }

  let hingeCount = 2; // Default: 2 hinges
  
  // Auto-calculate hinge count based on height
  if (heightMm > 2400) {
    hingeCount = 4; // Very tall doors
  } else if (heightMm > 1800) {
    hingeCount = 3; // Standard tall doors
  }

  // Calculate hinge positions (in mm from top)
  const hingePositions: number[] = [];
  
  if (hingeCount === 2) {
    // Top hinge at 150mm, bottom at 150mm from bottom
    hingePositions.push(150, heightMm - 150);
  } else if (hingeCount === 3) {
    // Top at 150mm, middle at center, bottom at 150mm from bottom
    hingePositions.push(150, heightMm / 2, heightMm - 150);
  } else if (hingeCount === 4) {
    // Evenly distributed
    const spacing = heightMm / 5;
    hingePositions.push(spacing, spacing * 2, spacing * 3, spacing * 4);
  }

  return {
    hingeCount,
    hingePositions: hingePositions.map(p => Math.round(p)),
  };
};

// AUTO-CALCULATE: Connectors required based on door type
export const calculateConnectorsRequired = (
  doorType: string,
  hasDividers: boolean = false,
  dividerConfig?: { horizontal: number[]; vertical: number[] }
): number => {
  let baseConnectors = 4; // 4 corners minimum
  
  if (doorType === 'sliding') {
    baseConnectors = 8; // Sliding doors need more connectors
  }

  // Add connectors for dividers
  if (hasDividers && dividerConfig) {
    const horizontalDividers = dividerConfig.horizontal?.length || 0;
    const verticalDividers = dividerConfig.vertical?.length || 0;
    
    // Each divider intersection needs connectors
    const intersections = (horizontalDividers + 1) * (verticalDividers + 1);
    baseConnectors += intersections * 2; // 2 connectors per intersection
  }

  return baseConnectors;
};

// AUTO-CALCULATE: Total profile length
// Frame = 2 vertical sides
// Total frame length = (height × 2)
export const calculateProfileLength = (
  widthMm: number,
  heightMm: number,
  doorType: string,
  frameThickness: number = 25
): number => {
  // 2 vertical sides only (no top, no bottom)
  const totalLength = heightMm * 2;
  return totalLength;
};

// AUTO-CALCULATE: Divider positions and length
export const calculateDividerLength = (
  widthMm: number,
  heightMm: number,
  dividerConfig?: { horizontal: number[]; vertical: number[] }
): number => {
  if (!dividerConfig) return 0;

  const horizontalLength = (dividerConfig.horizontal?.length || 0) * widthMm;
  const verticalLength = (dividerConfig.vertical?.length || 0) * heightMm;

  return horizontalLength + verticalLength;
};

// Calculate cutting scheme for a door
// Frame: 2 vertical pieces only (height × 2), no horizontal pieces
// Handle: same as door height
export const calculateCuttingScheme = (door: DoorConfiguration, masterData?: MasterData): CuttingScheme => {
  const heightMm = convertToMm(door.height, door.measurementUnit);
  
  // Vertical pieces: 2 pieces of full height (only frame pieces)
  const verticalLength = Math.round(heightMm);
  
  // No horizontal frame pieces (no top, no bottom)
  const frameVerticalPieces = [verticalLength, verticalLength];
  const frameHorizontalPieces: number[] = [];
  
  const totalFrameLength = frameVerticalPieces.reduce((sum, l) => sum + l, 0);
  
  // Calculate handle pieces if handle is present
  let handlePieces: number[] = [];
  let totalHandleLength = 0;
  
  if (door.handleProfileCode && door.handlePosition !== 'none') {
    // Handle length = full door height
    const handleLength = Math.round(heightMm);
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
// Frame is only 2 vertical sides, so:
// Glass height = full door height (no top/bottom frame)
// Glass width = door width - 2 frame thicknesses (left + right vertical frames)
export const calculateGlassArea = (
  door: DoorConfiguration,
  masterData?: MasterData
): number => {
  const md = masterData || defaultMasterData;
  const heightMm = convertToMm(door.height, door.measurementUnit);
  const widthMm = convertToMm(door.width, door.measurementUnit);
  const frameProfile = md.frameProfiles.find(f => f.code === door.frameProfileCode);
  const frameThickness = frameProfile?.width || 25;
  // Glass height: full height (no top/bottom frame)
  const glassHeightMm = heightMm;
  // Glass width: subtract left + right vertical frames
  const glassWidthMm = widthMm - (2 * frameThickness);
  const glassAreaMm2 = glassHeightMm * glassWidthMm;
  const glassAreaSqFt = glassAreaMm2 / 92903.04;
  return parseFloat(glassAreaSqFt.toFixed(2));
};

// Calculate costs for a single door with comprehensive auto-calculations
export const calculateDoorCosts = (
  door: DoorConfiguration,
  masterData?: MasterData
): DoorCalculation => {
  const md = masterData || defaultMasterData;
  const heightMm = convertToMm(door.height, door.measurementUnit);
  const widthMm = convertToMm(door.width, door.measurementUnit);
  
  // Get profile from new system or legacy
  const profileCode = door.profileCode || door.frameProfileCode || '';
  const frameProfile = md.frameProfiles.find(f => f.code === profileCode);
  const frameThickness = frameProfile?.width || 25;
  
  // AUTO-CALCULATE: Total profile length
  const totalProfileLengthMm = calculateProfileLength(widthMm, heightMm, door.doorType, frameThickness);
  
  // Calculate frame cost (pricePerMm * length in mm)
  const framePricePerMm = frameProfile?.pricePerMm || 0;
  const frameCost = totalProfileLengthMm * framePricePerMm * door.quantity;
  
  // AUTO-CALCULATE: Handle length and cost
  // Handle length = full door height
  let totalHandleLengthMm: number | undefined;
  let handleCost = 0;
  if (door.hasHandle && door.handleProfileCode) {
    totalHandleLengthMm = heightMm; // Handle = full door height
    const handleProfile = md.handleProfiles.find(h => h.code === door.handleProfileCode);
    const handlePricePerMm = handleProfile?.pricePerMm || 0;
    handleCost = totalHandleLengthMm * handlePricePerMm * door.quantity;
  }
  
  // AUTO-CALCULATE: Glass area and cost
  const glassArea = calculateGlassArea(
    { ...door, frameProfileCode: profileCode, height: door.height, width: door.width, measurementUnit: door.measurementUnit } as any,
    md
  );
  const glassType = md.glassTypes.find(g => g.code === door.glassTypeCode);
  const glassCost = glassArea * (glassType?.pricePerSqFt || 0) * door.quantity;
  
  // AUTO-CALCULATE: Connectors required
  // If user explicitly set quantity to 0, respect that (no connectors)
  // If user set a quantity > 0, use that
  // If connectorQuantity is null/undefined (not set), auto-calculate
  let connectorsRequired: number;
  if (door.connectorQuantity != null) {
    // User explicitly set a value (including 0) — respect it
    connectorsRequired = door.connectorQuantity;
  } else {
    // Not set — auto-calculate
    connectorsRequired = calculateConnectorsRequired(
      door.doorType,
      door.hasDividers,
      door.dividerConfig
    );
  }
  // Look up connector price — match by code from connectorTypes, then products
  const connectorCode = (door.connectorCode || '').trim();
  let connectorPricePerUnit = 0;
  let resolvedConnectorCode = connectorCode;
  if (connectorCode) {
    // Primary: look in connectorTypes by exact code match
    let connector = md.connectorTypes.find(c => c.code === connectorCode);
    
    // If not found, the door may have a stale code from defaults — use first available connector
    if (!connector && md.connectorTypes.length > 0) {
      connector = md.connectorTypes[0];
      resolvedConnectorCode = connector.code;
    }
    
    if (connector) {
      connectorPricePerUnit = connector.pricePerUnit || 0;
    } else {
      // Last resort: look in products array
      const connectorProduct = md.products?.find(p => p.code === connectorCode && p.productType === 'connector');
      connectorPricePerUnit = connectorProduct?.pricePerUnit || connectorProduct?.sellingPrice || 0;
    }
  } else if (md.connectorTypes.length > 0) {
    // No connector code set at all — use first available
    const firstConnector = md.connectorTypes[0];
    connectorPricePerUnit = firstConnector.pricePerUnit || 0;
    resolvedConnectorCode = firstConnector.code;
  }
  const connectorCost = connectorsRequired * connectorPricePerUnit * door.quantity;
  
  // AUTO-CALCULATE: Hinge count and positions (for openable/pin-hinge)
  const hingeConfig = calculateHingeConfig(heightMm, door.doorType);
  const hingeCount = door.hingeQuantity || hingeConfig.hingeCount;
  const hingePositions = door.hingePositionMm || hingeConfig.hingePositions;
  
  // Calculate hinge cost
  let hingeCost = 0;
  if (hingeCount > 0 && door.hingeCode) {
    // Find hinge in products or use default price
    const hingeProduct = md.products?.find(p => p.code === door.hingeCode && p.productType === 'hinge');
    const hingePricePerUnit = hingeProduct?.pricePerUnit || hingeProduct?.sellingPrice || 50;
    hingeCost = hingeCount * hingePricePerUnit * door.quantity;
  }
  
  // AUTO-CALCULATE: Divider length and cost
  let dividerLength: number | undefined;
  let dividerConnectorsRequired: number | undefined;
  let dividerCost = 0;
  
  if (door.hasDividers && door.dividerConfig) {
    const dividerLengthMm = calculateDividerLength(widthMm, heightMm, door.dividerConfig);
    dividerLength = dividerLengthMm; // mm for display
    
    const dividerProfile = md.products?.find(p => p.code === door.dividerProfileCode && p.productType === 'divider-profile');
    // Only use pricePerMm — sellingPrice is a total price, NOT per-mm
    const dividerPricePerMm = dividerProfile?.pricePerMm || 0;
    dividerCost = dividerLengthMm * dividerPricePerMm * door.quantity;
    
    // Divider connectors
    const horizontalCount = door.dividerConfig.horizontal?.length || 0;
    const verticalCount = door.dividerConfig.vertical?.length || 0;
    dividerConnectorsRequired = (horizontalCount + verticalCount) * 4; // 4 connectors per divider
    
    const dividerConnector = md.products?.find(p => p.code === door.dividerConnectorCode && p.productType === 'divider-connector');
    const dividerConnectorPrice = dividerConnector?.pricePerUnit || dividerConnector?.sellingPrice || 0;
    dividerCost += dividerConnectorsRequired * dividerConnectorPrice * door.quantity;
  }
  
  // AUTO-CALCULATE: Gasket cost
  let gasketCost = 0;
  if (door.gasketCode) {
    const allProducts = md.products || [];
    // Try exact match first
    let gasketProduct = allProducts.find(p => p.code === door.gasketCode && p.productType === 'gasket');
    // If not found by code+type, try by code only (in case productType wasn't set)
    if (!gasketProduct) {
      gasketProduct = allProducts.find(p => p.code === door.gasketCode);
    }
    // Use pricePerMm if available; if only sellingPrice exists, treat it as per-unit cost (not per-mm)
    const gasketPricePerMm = gasketProduct?.pricePerMm || 0;
    const gasketLengthMm = totalProfileLengthMm; // Gasket runs along entire perimeter
    if (gasketPricePerMm > 0) {
      gasketCost = gasketLengthMm * gasketPricePerMm * door.quantity;
    } else if (gasketProduct?.sellingPrice) {
      // sellingPrice is per-unit, not per-mm — charge per door
      gasketCost = gasketProduct.sellingPrice * door.quantity;
    }
  }
  
  // AUTO-CALCULATE: Lock cost
  let lockCost = 0;
  if (door.lockCode) {
    const allProducts = md.products || [];
    let lockProduct = allProducts.find(p => p.code === door.lockCode && p.productType === 'lock');
    if (!lockProduct) {
      lockProduct = allProducts.find(p => p.code === door.lockCode);
    }
    const lockPricePerUnit = lockProduct?.pricePerUnit || lockProduct?.sellingPrice || 0;
    lockCost = lockPricePerUnit * door.quantity; // 1 lock per door
  }
  
  // AUTO-CALCULATE: Sliding system cost (for sliding doors)
  let slidingSystemCost = 0;
  if (door.doorType === 'sliding' && door.slidingSystemCode) {
    // First check in sliding bundles
    const slidingBundle = md.slidingBundles?.find(b => b.code === door.slidingSystemCode);
    if (slidingBundle) {
      // For bundles, use pricePerDoor if available, otherwise use sellingPrice as fixed price per door
      if (slidingBundle.pricePerUnit) {
        slidingSystemCost = slidingBundle.pricePerUnit * door.quantity;
      } else if (slidingBundle.pricePerMm) {
        slidingSystemCost = widthMm * slidingBundle.pricePerMm * door.quantity;
      } else {
        // Use sellingPrice as fixed price per door
        slidingSystemCost = slidingBundle.sellingPrice * door.quantity;
      }
    } else {
      // Fallback to old products for backward compatibility
      const slidingSystem = md.products?.find(p => p.code === door.slidingSystemCode && p.productType === 'sliding-system');
      const slidingPricePerMm = slidingSystem?.pricePerMm || slidingSystem?.sellingPrice || 0;
      slidingSystemCost = widthMm * slidingPricePerMm * door.quantity;
    }
  }
  
  // Calculate cutting scheme (for reference)
  const cuttingScheme = calculateCuttingScheme({ ...door, frameProfileCode: profileCode } as any, md);
  
  // AUTO-CALCULATE: Total selling price per unit
  const totalSellingPrice = 
    frameCost / door.quantity +
    handleCost / door.quantity +
    glassCost / door.quantity +
    connectorCost / door.quantity +
    hingeCost / door.quantity +
    dividerCost / door.quantity +
    gasketCost / door.quantity +
    lockCost / door.quantity +
    slidingSystemCost / door.quantity;
  
  // AUTO-CALCULATE: Total order value
  const totalOrderValue = totalSellingPrice * door.quantity;
  
  return {
    doorId: door.id,
    
    // Profile/Frame (in mm)
    totalProfileLength: parseFloat(totalProfileLengthMm.toFixed(2)),
    frameCost: parseFloat(frameCost.toFixed(2)),
    
    // Handle (in mm)
    totalHandleLength: totalHandleLengthMm ? parseFloat(totalHandleLengthMm.toFixed(2)) : undefined,
    handleCost: parseFloat(handleCost.toFixed(2)),
    
    // Glass
    glassArea, // in sq. ft
    glassCost: parseFloat(glassCost.toFixed(2)),
    
    // Connectors
    connectorsRequired,
    connectorCost: parseFloat(connectorCost.toFixed(2)),
    
    // Hinges
    hingeCount,
    hingePositions,
    hingeCost: parseFloat(hingeCost.toFixed(2)),
    
    // Dividers
    dividerLength,
    dividerConnectorsRequired,
    dividerCost: parseFloat(dividerCost.toFixed(2)),
    
    // Additional Hardware
    gasketCost: parseFloat(gasketCost.toFixed(2)),
    lockCost: parseFloat(lockCost.toFixed(2)),
    slidingSystemCost: parseFloat(slidingSystemCost.toFixed(2)),
    
    // Cutting Scheme
    cuttingScheme,
    
    // Totals
    totalSellingPrice: parseFloat(totalSellingPrice.toFixed(2)),
    totalOrderValue: parseFloat(totalOrderValue.toFixed(2)),
    totalCost: parseFloat(totalOrderValue.toFixed(2)), // Legacy field
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
  doorCalculations: DoorCalculation[],
  pricingSettings?: { makingChargeType: 'fixed' | 'percentage'; makingChargeValue: number; defaultDiscount: number; taxRates: { gst: number; cgst?: number; sgst?: number } }
): CostSummary => {
  const pricing = pricingSettings || defaultMasterData.pricingSettings;
  
  // Component-wise breakdown from door calculations
  const totalProfileCost = doorCalculations.reduce((sum, calc) => sum + calc.frameCost, 0);
  const totalHandleCost = doorCalculations.reduce((sum, calc) => sum + calc.handleCost, 0);
  const totalGlassCost = doorCalculations.reduce((sum, calc) => sum + calc.glassCost, 0);
  const totalConnectorCost = doorCalculations.reduce((sum, calc) => sum + calc.connectorCost, 0);
  const totalHingeCost = doorCalculations.reduce((sum, calc) => sum + calc.hingeCost, 0);
  const totalLockCost = doorCalculations.reduce((sum, calc) => sum + calc.lockCost, 0);
  const totalGasketCost = doorCalculations.reduce((sum, calc) => sum + calc.gasketCost, 0);
  const totalSlidingSystemCost = doorCalculations.reduce((sum, calc) => sum + calc.slidingSystemCost, 0);
  const totalDividerCost = doorCalculations.reduce((sum, calc) => sum + calc.dividerCost, 0);
  
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
  
  // Material subtotal (all materials before making charges)
  const materialSubtotal = 
    totalProfileCost +
    totalHandleCost +
    totalGlassCost +
    totalConnectorCost +
    totalHingeCost +
    totalLockCost +
    totalGasketCost +
    totalSlidingSystemCost +
    totalDividerCost +
    totalAdditionalCost +
    totalOptionalCost;
  
  // Making charges calculation
  let makingCharges = 0;
  if (pricing.makingChargeType === 'fixed') {
    makingCharges = pricing.makingChargeValue; // Fixed amount in ₹
  } else if (pricing.makingChargeType === 'percentage') {
    makingCharges = (materialSubtotal * pricing.makingChargeValue) / 100; // Percentage of material cost
  }
  
  // Subtotal with making charges
  const subtotalWithMaking = materialSubtotal + makingCharges;
  
  // Global discount
  const discount = (subtotalWithMaking * quotation.globalDiscount) / 100;
  
  // Taxable amount (after discount)
  const taxableAmount = subtotalWithMaking - discount;
  
  // GST calculation
  const gstAmount = (taxableAmount * quotation.gstPercentage) / 100;
  
  // Final amount
  const finalAmount = taxableAmount + gstAmount;
  
  // Legacy field: total hardware cost (for backward compatibility)
  const totalHardwareCost = totalProfileCost + totalHandleCost + totalConnectorCost + totalHingeCost + totalLockCost + totalGasketCost + totalSlidingSystemCost + totalDividerCost;
  
  return {
    // Component-wise breakdown
    totalProfileCost: parseFloat(totalProfileCost.toFixed(2)),
    totalHandleCost: parseFloat(totalHandleCost.toFixed(2)),
    totalGlassCost: parseFloat(totalGlassCost.toFixed(2)),
    totalConnectorCost: parseFloat(totalConnectorCost.toFixed(2)),
    totalHingeCost: parseFloat(totalHingeCost.toFixed(2)),
    totalLockCost: parseFloat(totalLockCost.toFixed(2)),
    totalGasketCost: parseFloat(totalGasketCost.toFixed(2)),
    totalSlidingSystemCost: parseFloat(totalSlidingSystemCost.toFixed(2)),
    totalDividerCost: parseFloat(totalDividerCost.toFixed(2)),
    totalAdditionalCost: parseFloat(totalAdditionalCost.toFixed(2)),
    totalOptionalCost: parseFloat(totalOptionalCost.toFixed(2)),
    
    // Calculation stages
    materialSubtotal: parseFloat(materialSubtotal.toFixed(2)),
    makingCharges: parseFloat(makingCharges.toFixed(2)),
    subtotalWithMaking: parseFloat(subtotalWithMaking.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    taxableAmount: parseFloat(taxableAmount.toFixed(2)),
    gstAmount: parseFloat(gstAmount.toFixed(2)),
    finalAmount: parseFloat(finalAmount.toFixed(2)),
    
    // Legacy fields for backward compatibility
    totalHardwareCost: parseFloat(totalHardwareCost.toFixed(2)),
    subtotal: parseFloat(materialSubtotal.toFixed(2)),
    totalSavings: parseFloat(discount.toFixed(2)),
  };
};

// Format currency
export const formatCurrency = (amount: number): string => {
  // Ensure amount is a valid number
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }
  
  // Use consistent formatting to avoid hydration errors
  const formatted = amount.toFixed(2);
  const [integerPart, decimalPart] = formatted.split('.');
  
  // Add Indian-style comma separators
  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  const formattedInteger = otherNumbers !== '' 
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;
  
  return `₹${formattedInteger}.${decimalPart}`;
};

// Format currency for PDF (without rupee symbol, using Rs.)
export const formatCurrencyForPDF = (amount: number): string => {
  // Ensure amount is a valid number
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }
  
  // Use consistent formatting
  const formatted = amount.toFixed(2);
  const [integerPart, decimalPart] = formatted.split('.');
  
  // Add Indian-style comma separators
  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  const formattedInteger = otherNumbers !== '' 
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;
  
  return `Rs. ${formattedInteger}.${decimalPart}`;
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
