// Core Data Types

export type ProductType = 
  | 'frame-profile' 
  | 'handle-profile' 
  | 'divider-profile' 
  | 'divider-connector' 
  | 'gasket' 
  | 'lock' 
  | 'hinge' 
  | 'sliding-system' 
  | 'connector';

export type DoorTypeCompatibility = 'openable' | 'sliding' | 'air-hinge' | 'pin-hinge';

export interface Product {
  code: string;
  name: string;
  productType: ProductType;
  compatibleDoorTypes: DoorTypeCompatibility[];
  finish?: string;
  costPrice: number; // Hidden from staff
  sellingPrice: number; // Dealer price
  perMeterWeight?: number; // Optional
  imageUrl?: string;
  
  // Product-specific fields
  width?: number; // For profiles (mm)
  height?: number; // For profiles (mm)
  pricePerMeter?: number; // For profiles
  connectorPrice?: number; // For items that need connectors
  handlePrice?: number; // For items that come with handles
  pricePerUnit?: number; // For units like connectors, locks
  pricePerSqFt?: number; // For glass
  thickness?: number; // For glass, gaskets (mm)
}

// Legacy interfaces for backward compatibility
export interface FrameProfile {
  code: string;
  name: string;
  width: number; // mm
  height: number; // mm
  pricePerMeter: number;
  imageUrl?: string;
  suggestedHandles?: string[]; // Handle profile codes
  suggestedGlassTypes?: string[]; // Glass type codes
  suggestedConnectors?: string[]; // Connector codes
}

export interface HandleProfile {
  code: string;
  name: string;
  pricePerMeter: number;
  imageUrl?: string;
}

export interface GlassType {
  code: string;
  name: string;
  pricePerSqFt: number;
  thickness?: number; // mm
  imageUrl?: string;
}

export interface ConnectorType {
  code: string;
  name: string;
  pricePerUnit: number;
  imageUrl?: string;
}

export type MeasurementUnit = 'mm' | 'inches';
export type DoorType = 'single' | 'double' | 'lift-up' | 'sliding' | 'bi-fold';
export type HandlePosition = 'left' | 'right' | 'center' | 'none';
export type HingePosition = 'left' | 'right' | 'top' | 'bottom';

export interface DoorConfiguration {
  id: string;
  doorName: string;
  doorType: DoorType;
  measurementUnit: MeasurementUnit;
  height: number;
  width: number;
  quantity: number;
  handlePosition: HandlePosition;
  handleOffset: number;
  hingePosition: HingePosition;
  hingeCode: string;
  hingeQuantity: number;
  carcassThickness: number;
  frameProfileCode: string;
  handleProfileCode?: string;
  glassTypeCode: string;
  connectorCode?: string;
  connectorQuantity: number;
  liftAvailable: boolean;
  referenceImage?: string;
}

export interface CuttingScheme {
  frameVerticalPieces: number[];
  frameHorizontalPieces: number[];
  handlePieces: number[];
  totalFrameLength: number;
  totalHandleLength: number;
}

export interface DoorCalculation {
  doorId: string;
  frameCost: number;
  handleCost: number;
  glassCost: number;
  connectorCost: number;
  glassArea: number; // sqft
  glassAreaWithWastage: number; // sqft
  cuttingScheme: CuttingScheme;
  totalCost: number;
}

export interface AdditionalComponent {
  id: string;
  description: string;
  quantity: number;
  price: number;
  discount: number; // percentage
  total: number;
}

export interface OptionalItem {
  id: string;
  description: string;
  quantity: number;
  mrp: number;
  discount: number; // percentage
  total: number;
}

export interface QuotationData {
  id: string;
  customerName: string;
  mobileNumber: string;
  address: string;
  projectName: string;
  date: string;
  doors: DoorConfiguration[];
  additionalComponents: AdditionalComponent[];
  optionalItems: OptionalItem[];
  gstPercentage: number;
  glassWastagePercentage: number;
  globalDiscount: number; // percentage
}

export interface CostSummary {
  totalHardwareCost: number;
  totalGlassCost: number;
  totalAdditionalCost: number;
  totalOptionalCost: number;
  subtotal: number;
  discount: number;
  taxableAmount: number;
  gstAmount: number;
  finalAmount: number;
  totalSavings: number;
}

export interface MasterData {
  frameProfiles: FrameProfile[];
  handleProfiles: HandleProfile[];
  glassTypes: GlassType[];
  connectorTypes: ConnectorType[];
  products: Product[]; // New comprehensive product system
  defaultGST: number;
  defaultGlassWastage: number;
}
