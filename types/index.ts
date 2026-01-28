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
  pricePerMm?: number; // For profiles
  connectorPrice?: number; // For items that need connectors
  handlePrice?: number; // For items that come with handles
  pricePerUnit?: number; // For units like connectors, locks
  pricePerSqMm?: number; // For glass (price per square mm)
  thickness?: number; // For glass, gaskets (mm)
}

// Legacy interfaces for backward compatibility
export interface FrameProfile {
  code: string;
  name: string;
  width: number; // mm
  height: number; // mm
  pricePerMm: number;
  imageUrl?: string;
  suggestedHandles?: string[]; // Handle profile codes
  suggestedGlassTypes?: string[]; // Glass type codes
  suggestedConnectors?: string[]; // Connector codes
}

export interface HandleProfile {
  code: string;
  name: string;
  pricePerMm: number;
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
export type DoorType = 'openable' | 'sliding' | 'air-hinge' | 'pin-hinge';
export type HandlePosition = 'left' | 'right' | 'bottom' | 'none';
export type HingePosition = 'left' | 'right' | 'top' | 'none';
export type OpeningDirection = 'left' | 'right' | 'both' | 'none';

export interface DividerConfig {
  horizontal: number[]; // Y positions in mm
  vertical: number[];   // X positions in mm
}

export interface DoorConfiguration {
  id: string;
  doorName: string;
  
  // Door Type & Profile
  doorType: DoorType; // 'openable' | 'sliding' | 'air-hinge' | 'pin-hinge'
  profileCode: string; // Main profile/frame code
  
  // Dimensions
  measurementUnit: MeasurementUnit;
  width: number;  // mm
  height: number; // mm
  thickness?: number; // mm (optional)
  quantity: number;
  
  // Handle Configuration
  hasHandle: boolean; // Yes/No
  handleProfileCode?: string; // Handle type (if hasHandle)
  handlePosition: HandlePosition; // left/right/center/none
  handleOffset?: number; // mm from edge
  
  // Opening Direction (for applicable types)
  openingDirection: OpeningDirection; // 'left' | 'right' | 'both' | 'none'
  
  // Divider Configuration
  hasDividers: boolean;
  dividerMode?: DividerMode; // Fixed-offset, equal-split, or manual
  dividerConfig?: DividerConfig; // Horizontal & vertical positions
  dividerProfileCode?: string;
  dividerConnectorCode?: string;
  
  // Hardware (auto-calculated but can override)
  hingePosition?: HingePosition;
  hingeCode?: string;
  hingeQuantity?: number; // Auto-calculated for openable
  hingePositionMm?: number[]; // Array of hinge positions from top
  
  // Connectors (auto-calculated)
  connectorCode?: string;
  connectorQuantity?: number; // Auto-calculated based on corners
  
  // Additional Components
  gasketCode?: string;
  lockCode?: string;
  slidingSystemCode?: string; // For sliding type
  glassTypeCode?: string;
  
  // Legacy fields for backward compatibility
  carcassThickness?: number;
  liftAvailable?: boolean;
  referenceImage?: string;
  frameProfileCode?: string; // Maps to profileCode
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
  
  // Profile/Frame Calculations
  totalProfileLength: number; // meters
  frameCost: number;
  
  // Handle Calculations
  totalHandleLength?: number; // meters
  handleCost: number;
  
  // Glass Calculations
  glassArea: number; // sqft
  glassCost: number;
  
  // Connector Calculations
  connectorsRequired: number;
  connectorCost: number;
  
  // Hinge Calculations (for openable)
  hingeCount?: number;
  hingePositions?: number[]; // mm from top
  hingeCost: number;
  
  // Divider Calculations
  dividerLength?: number; // meters
  dividerConnectorsRequired?: number;
  dividerCost: number;
  
  // Additional Hardware
  gasketCost: number;
  lockCost: number;
  slidingSystemCost: number;
  
  // Cutting Scheme
  cuttingScheme: CuttingScheme;
  
  // Totals
  totalSellingPrice: number; // Per unit
  totalOrderValue: number;   // totalSellingPrice * quantity
  totalCost: number; // Legacy field
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

export type ClientRole = 'customer' | 'architect' | 'dealer';

export interface Client {
  id: string;
  clientName: string;
  firmName?: string;
  phone: string;
  city?: string;
  address?: string;
  email?: string;
  role: ClientRole; // customer | architect | dealer
  createdDate: string;
  lastUpdated: string;
}

export interface Job {
  id: string;
  jobReferenceId: string; // User-friendly job reference
  clientId: string;
  clientName: string; // Denormalized for quick access
  firmName?: string;
  salesperson?: string;
  quoteDate: string;
  deliveryDate?: string;
  status: 'draft' | 'quoted' | 'approved' | 'in-production' | 'completed' | 'cancelled';
  createdDate: string;
  lastUpdated: string;
}

export interface SlidingBundleComponent {
  name: string;
  description: string;
  quantity: number; // Quantity per door
}

export interface SlidingBundle {
  code: string; // e.g., SL-80-SC
  name: string; // e.g., "80kg Soft Close System"
  maxDoorWeight: number; // kg
  mountingType: 'top-hung' | 'bottom-rolling' | 'side-hung';
  hasSoftClose: boolean;
  components: SlidingBundleComponent[]; // Track, rollers, guides, etc.
  costPrice: number; // Hidden from staff
  sellingPrice: number; // Dealer price
  pricePerMm?: number; // For track-based pricing (price per mm)
  pricePerUnit?: number; // For unit-based pricing (price per door)
  imageUrl?: string;
  notes?: string;
  createdDate: string;
  lastUpdated: string;
}

export interface QuotationData {
  id: string;
  // Job Information
  jobId?: string;
  jobReferenceId?: string;
  
  // Client Information
  clientId?: string;
  clientName: string;
  firmName?: string;
  phone: string;
  city?: string;
  address: string;
  customerGstNumber?: string; // Optional GST number
  clientRole?: ClientRole; // customer | architect | dealer
  
  // Job Details
  salesperson?: string;
  quoteDate: string; // Renamed from 'date'
  deliveryDate?: string;
  
  // Legacy field for backward compatibility
  customerName: string; // Maps to clientName
  mobileNumber: string; // Maps to phone
  date: string; // Maps to quoteDate
  projectName: string; // Can be used as job reference
  
  // Doors/Shutters (multiple shutters per job)
  doors: DoorConfiguration[];
  additionalComponents: AdditionalComponent[];
  optionalItems: OptionalItem[];
  gstPercentage: number;
  globalDiscount: number; // percentage
}

export interface CostSummary {
  // Component-wise breakdown
  totalProfileCost: number; // Frame profiles (per meter)
  totalHandleCost: number; // Handles (per meter)
  totalGlassCost: number; // Glass (per sq ft)
  totalConnectorCost: number; // Connectors (per unit)
  totalHingeCost: number; // Hinges (per unit)
  totalLockCost: number; // Locks (per unit)
  totalGasketCost: number; // Gaskets (per meter)
  totalSlidingSystemCost: number; // Sliding kits
  totalDividerCost: number; // Divider profiles & connectors
  totalAdditionalCost: number; // Additional components
  totalOptionalCost: number; // Optional items
  
  // Calculation stages
  materialSubtotal: number; // Sum of all materials
  makingCharges: number; // Making/fabrication charges
  subtotalWithMaking: number; // Material + Making
  discount: number; // Discount amount
  taxableAmount: number; // After discount
  gstAmount: number; // GST on taxable amount
  finalAmount: number; // Final invoice amount
  
  // Legacy fields for backward compatibility
  totalHardwareCost: number; // Sum of profiles, handles, connectors, etc.
  subtotal: number; // Same as materialSubtotal
  totalSavings: number; // Discount amount
}

export type DividerMode = 'fixed-offset' | 'equal-split' | 'manual';

export interface DividerSettings {
  defaultMode: DividerMode;
  fixedOffsetHorizontal: number[]; // Positions in mm from top, e.g., [900, 1800]
  fixedOffsetVertical: number[]; // Positions in mm from left
  equalSplitHorizontalCount: number; // Number of horizontal divisions
  equalSplitVerticalCount: number; // Number of vertical divisions
}

export type MakingChargeType = 'fixed' | 'percentage';

export interface PricingSettings {
  makingChargeType: MakingChargeType; // 'fixed' (₹) or 'percentage' (%)
  makingChargeValue: number; // Amount in ₹ or percentage value
  defaultDiscount: number; // Default discount percentage
  architectDiscount: number; // Architect discount percentage
  dealerDiscount: number; // Dealer discount percentage
  taxRates: {
    gst: number; // GST percentage (e.g., 18)
    cgst?: number; // Central GST (optional, for split GST)
    sgst?: number; // State GST (optional, for split GST)
  };
}

export interface ValidationLimits {
  minWidth: number; // mm
  maxWidth: number; // mm
  minHeight: number; // mm
  maxHeight: number; // mm
}

export interface HingeRule {
  minHeight: number; // mm
  maxHeight: number; // mm (Infinity for unlimited)
  hingeQuantity: number;
}

export interface HingeCalculationSettings {
  rules: HingeRule[]; // Sorted by minHeight
}

export interface MasterData {
  frameProfiles: FrameProfile[];
  handleProfiles: HandleProfile[];
  glassTypes: GlassType[];
  connectorTypes: ConnectorType[];
  products: Product[]; // New comprehensive product system
  clients: Client[]; // Customer database
  jobs: Job[]; // Job tracking
  slidingBundles: SlidingBundle[]; // Sliding system bundles
  dividerSettings: DividerSettings; // Divider configuration
  pricingSettings: PricingSettings; // Pricing & charges configuration
  validationLimits: ValidationLimits; // Door dimension validation limits
  hingeCalculationSettings: HingeCalculationSettings; // Automatic hinge quantity calculation
  defaultGST: number;
  companyInfo?: CompanyInfo; // Company details for invoices
}

export interface CompanyInfo {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  gstNumber?: string;
  panNumber?: string;
  bankDetails?: BankDetails;
}

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  branchName?: string;
  upiId?: string;
}
