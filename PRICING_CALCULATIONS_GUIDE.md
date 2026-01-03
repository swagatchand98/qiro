# QIRO Quotation System - Pricing & Calculations Guide

## Table of Contents
1. [Overview](#overview)
2. [Unit Conversions](#unit-conversions)
3. [Door Calculations](#door-calculations)
4. [Component-wise Pricing](#component-wise-pricing)
5. [Making Charges](#making-charges)
6. [Final Cost Summary](#final-cost-summary)
7. [Pricing Models](#pricing-models)
8. [Auto-calculations](#auto-calculations)

---

## Overview

The QIRO quotation system uses a comprehensive calculation engine that automatically computes:
- Material costs (frame profiles, glass, handles, connectors, etc.)
- Hardware costs (hinges, locks, gaskets, sliding systems)
- Making charges (fixed or percentage-based)
- Discounts and taxes (GST)
- Final quotation amount

All calculations are performed in `utils/calculations.ts` and use data from `data/masterData.ts`.

---

## Unit Conversions

### Measurement Units
The system supports both **millimeters (mm)** and **inches** for door dimensions.

**Conversion Formulas:**
```typescript
// Inches to Millimeters
mm = inches × 25.4

// Millimeters to Inches
inches = mm ÷ 25.4

// Square Millimeters to Square Feet
sqft = sqmm ÷ 92903.04
```

**Example:**
- Door width: 36 inches = 914.4 mm
- Glass area: 838,080 mm² = 9.02 sqft

---

## Door Calculations

### 1. Frame Profile Cost

**Formula:**
```
Frame Cost = Profile Length (meters) × Price Per Meter × Quantity
```

**Profile Length Calculation:**
```typescript
// Basic perimeter
perimeter = 2 × (width + height)

// Additional length based on door type
if (doorType === 'sliding') {
  additionalLength = width × 0.5  // 50% extra for tracks
} else if (doorType === 'air-hinge' || 'pin-hinge') {
  additionalLength = width × 0.3  // 30% extra for reinforcement
}

totalProfileLength = (perimeter + additionalLength) ÷ 1000  // Convert to meters
```

**Example:**
- Door: 1000mm × 2000mm openable
- Perimeter: 2 × (1000 + 2000) = 6000mm
- Additional: 0 (openable door)
- Total: 6000mm = 6 meters
- If profile price = ₹150/meter
- **Frame Cost = 6 × 150 × 1 = ₹900**

---

### 2. Handle Cost

**Formula:**
```
Handle Cost = Handle Length (meters) × Price Per Meter × Quantity
```

**Handle Length Calculation:**
```typescript
// Handle runs vertically along door height
handleLength = (height - 100mm) ÷ 1000  // 100mm clearance, convert to meters
```

**Example:**
- Door height: 2000mm
- Handle length: (2000 - 100) ÷ 1000 = 1.9 meters
- If handle price = ₹120/meter
- **Handle Cost = 1.9 × 120 × 1 = ₹228**

---

### 3. Glass Cost

**Formula:**
```
Glass Cost = Glass Area (sqft) × Price Per Sqft × Quantity
```

**Glass Area Calculation:**
```typescript
// Frame thickness (from selected profile)
frameThickness = 25mm  // Example

// Net glass dimensions
glassHeight = doorHeight - (2 × frameThickness)
glassWidth = doorWidth - (2 × frameThickness)

// Calculate area
glassAreaMm² = glassHeight × glassWidth
glassAreaSqft = glassAreaMm² ÷ 92903.04

// Apply wastage
glassAreaWithWastage = glassAreaSqft × (1 + wastagePercentage ÷ 100)
```

**Example:**
- Door: 1000mm × 2000mm
- Frame thickness: 25mm
- Glass: (1000 - 50) × (2000 - 50) = 950mm × 1950mm = 1,852,500 mm²
- Area: 1,852,500 ÷ 92903.04 = **19.94 sqft**
- With 10% wastage: 19.94 × 1.1 = **21.93 sqft**
- If glass price = ₹85/sqft
- **Glass Cost = 21.93 × 85 × 1 = ₹1,864.05**

---

### 4. Connector Cost

**Formula:**
```
Connector Cost = Connectors Required × Price Per Unit × Quantity
```

**Connectors Required:**
```typescript
// Base connectors (4 corners)
baseConnectors = 4

// For sliding doors
if (doorType === 'sliding') {
  baseConnectors = 8
}

// Additional for dividers
if (hasDividers) {
  horizontalDividers = dividerConfig.horizontal.length
  verticalDividers = dividerConfig.vertical.length
  intersections = (horizontalDividers + 1) × (verticalDividers + 1)
  additionalConnectors = intersections × 2
  
  totalConnectors = baseConnectors + additionalConnectors
}
```

**Example:**
- Openable door: 4 connectors
- If connector price = ₹15/unit
- **Connector Cost = 4 × 15 × 1 = ₹60**

---

### 5. Hinge Cost (Openable/Pin-Hinge Doors Only)

**Formula:**
```
Hinge Cost = Hinge Quantity × Price Per Unit × Quantity
```

**Auto-calculation of Hinge Quantity:**
```typescript
// Based on door height
if (height > 2400mm) {
  hingeQuantity = 4  // Very tall doors
} else if (height > 1800mm) {
  hingeQuantity = 3  // Standard tall doors
} else {
  hingeQuantity = 2  // Standard doors
}
```

**Hinge Position Calculation:**
```typescript
// For 2 hinges
positions = [150mm from top, 150mm from bottom]

// For 3 hinges
positions = [150mm from top, center, 150mm from bottom]

// For 4 hinges
positions = [evenly distributed with spacing = height ÷ 5]
```

**Example:**
- Door height: 2000mm → 3 hinges
- If hinge price = ₹50/unit
- **Hinge Cost = 3 × 50 × 1 = ₹150**

---

### 6. Divider Cost (If Dividers Present)

**Formula:**
```
Divider Cost = Divider Length (meters) × Price Per Meter × Quantity
              + Divider Connectors × Price Per Unit × Quantity
```

**Divider Length Calculation:**
```typescript
// Horizontal dividers (run across width)
horizontalLength = horizontalDividers.count × doorWidth

// Vertical dividers (run across height)
verticalLength = verticalDividers.count × doorHeight

totalDividerLength = (horizontalLength + verticalLength) ÷ 1000  // meters
```

**Divider Connector Calculation:**
```typescript
dividerConnectors = (horizontalCount + verticalCount) × 4
// 4 connectors per divider (2 at each end)
```

**Example:**
- Door: 1000mm × 2000mm
- 1 horizontal divider, 1 vertical divider
- Horizontal: 1 × 1000mm = 1000mm
- Vertical: 1 × 2000mm = 2000mm
- Total: 3000mm = 3 meters
- Divider connectors: (1 + 1) × 4 = 8
- If divider profile = ₹80/meter, connector = ₹10/unit
- **Divider Cost = (3 × 80) + (8 × 10) = ₹240 + ₹80 = ₹320**

---

### 7. Additional Hardware Costs

#### Gasket Cost
```
Gasket Cost = Total Profile Length (meters) × Price Per Meter × Quantity
```
- Gasket runs along entire frame perimeter

#### Lock Cost
```
Lock Cost = Price Per Unit × Quantity
```
- 1 lock per door

#### Sliding System Cost
```
// For sliding bundles
if (bundle.pricePerDoor exists) {
  Cost = pricePerDoor × quantity
} else if (bundle.pricePerMeter exists) {
  Cost = (doorWidth ÷ 1000) × pricePerMeter × quantity
} else {
  Cost = sellingPrice × quantity  // Fixed price
}
```

**Example:**
- Gasket: 6 meters × ₹30/meter = ₹180
- Lock: 1 × ₹250 = ₹250
- Sliding system: ₹1,500 (bundle price)

---

## Component-wise Pricing

### Door Total Breakdown

**Per Door Total:**
```
Door Selling Price = Frame Cost + Handle Cost + Glass Cost 
                   + Connector Cost + Hinge Cost + Divider Cost
                   + Gasket Cost + Lock Cost + Sliding System Cost
```

**Complete Example:**
```
Frame:          ₹900.00
Handle:         ₹228.00
Glass:          ₹1,864.05
Connectors:     ₹60.00
Hinges:         ₹150.00
Dividers:       ₹0.00
Gasket:         ₹180.00
Lock:           ₹250.00
Sliding:        ₹0.00
─────────────────────────
Per Door:       ₹3,632.05
Quantity:       × 2
─────────────────────────
Total:          ₹7,264.10
```

---

## Making Charges

Making charges cover fabrication, labor, and installation services.

### Pricing Model 1: Fixed Making Charge

**Formula:**
```
Making Charges = Fixed Amount (₹)
```

**Example:**
- Fixed making charge: ₹5,000
- **Making Charges = ₹5,000** (regardless of order value)

---

### Pricing Model 2: Percentage-based Making Charge

**Formula:**
```
Making Charges = Material Subtotal × (Percentage ÷ 100)
```

**Example:**
- Material subtotal: ₹7,264.10
- Making charge percentage: 15%
- **Making Charges = ₹7,264.10 × 0.15 = ₹1,089.62**

---

## Final Cost Summary

### Calculation Flow

```
Step 1: Material Subtotal
  = Sum of all door costs + additional components + optional items

Step 2: Add Making Charges
  = Material Subtotal + Making Charges

Step 3: Apply Global Discount
  Discount Amount = Subtotal with Making × (Discount % ÷ 100)
  Taxable Amount = Subtotal with Making - Discount

Step 4: Calculate GST
  GST Amount = Taxable Amount × (GST % ÷ 100)

Step 5: Final Amount
  = Taxable Amount + GST Amount
```

### Complete Example

```
Material Breakdown:
──────────────────────────────────────
Doors (2 units):              ₹7,264.10
Additional Components:        ₹1,500.00
Optional Items:               ₹800.00
──────────────────────────────────────
Material Subtotal:            ₹9,564.10

Making Charges (15%):         ₹1,434.62
──────────────────────────────────────
Subtotal with Making:        ₹10,998.72

Global Discount (10%):       -₹1,099.87
──────────────────────────────────────
Taxable Amount:               ₹9,898.85

GST (18%):                    ₹1,781.79
──────────────────────────────────────
FINAL AMOUNT:                ₹11,680.64
══════════════════════════════════════
```

---

## Pricing Models

### Model 1: Standard Pricing (Percentage Making Charge)

**Use Case:** Most common for custom fabrication

**Settings:**
```typescript
makingChargeType: 'percentage'
makingChargeValue: 15  // 15% of material cost
defaultDiscount: 10    // 10% discount
gst: 18                // 18% GST
```

**Flow:**
1. Calculate material costs
2. Add 15% making charge
3. Apply 10% discount
4. Add 18% GST

**Example Order:**
- Materials: ₹10,000
- Making: ₹1,500 (15%)
- Subtotal: ₹11,500
- Discount: -₹1,150 (10%)
- Taxable: ₹10,350
- GST: ₹1,863 (18%)
- **Final: ₹12,213**

---

### Model 2: Fixed Making Charge

**Use Case:** Standard products with consistent labor

**Settings:**
```typescript
makingChargeType: 'fixed'
makingChargeValue: 5000  // ₹5,000 fixed
defaultDiscount: 5       // 5% discount
gst: 18                  // 18% GST
```

**Flow:**
1. Calculate material costs
2. Add ₹5,000 fixed making charge
3. Apply 5% discount
4. Add 18% GST

**Example Order:**
- Materials: ₹10,000
- Making: ₹5,000 (fixed)
- Subtotal: ₹15,000
- Discount: -₹750 (5%)
- Taxable: ₹14,250
- GST: ₹2,565 (18%)
- **Final: ₹16,815**

---

### Model 3: No Making Charge (Material Only)

**Use Case:** Material supply without installation

**Settings:**
```typescript
makingChargeType: 'fixed'
makingChargeValue: 0     // No making charge
defaultDiscount: 0       // No discount
gst: 18                  // 18% GST
```

**Flow:**
1. Calculate material costs only
2. No making charge
3. No discount
4. Add 18% GST

**Example Order:**
- Materials: ₹10,000
- Making: ₹0
- Subtotal: ₹10,000
- Discount: ₹0
- Taxable: ₹10,000
- GST: ₹1,800 (18%)
- **Final: ₹11,800**

---

## Auto-calculations

### 1. Sliding System Auto-selection

**Algorithm:**
```typescript
// Calculate door weight
glassWeight = (width_m × height_m) × thickness_mm × 2.5 kg/mm/m²
frameWeight = perimeter_m × 3 kg/m
totalWeight = (glassWeight + frameWeight) × doorCount

// Find suitable bundles
suitableBundles = bundles.filter(b => b.maxDoorWeight >= totalWeight)
                         .sort((a, b) => a.maxDoorWeight - b.maxDoorWeight)

// Select smallest bundle that fits
// Prefer soft-close for heavy doors (>60kg)
if (totalWeight > 60kg && soft-close available) {
  selectedBundle = first soft-close bundle
} else {
  selectedBundle = smallest suitable bundle
}
```

**Example:**
- Door: 1000mm × 2000mm, 8mm glass
- Glass weight: (1 × 2) × 8 × 2.5 = 40 kg
- Frame weight: 6 × 3 = 18 kg
- Total: 58 kg
- System recommends: "Standard Bundle" (up to 80kg, ₹2,500)

---

### 2. Divider Calculation Modes

#### Mode 1: Fixed Offset
Pre-defined positions from master settings
```typescript
// Example settings
fixedOffsetHorizontal: [600, 1200]  // mm from top
fixedOffsetVertical: [400, 800]     // mm from left
```

#### Mode 2: Equal Split
Divides door into equal sections
```typescript
// Example: Split door into 3 horizontal sections
height = 2000mm
sections = 3
spacing = 2000 ÷ 3 = 666.67mm
positions = [667, 1333]  // Divider positions
```

#### Mode 3: Manual
User specifies exact positions
```typescript
// Example
horizontal: [500, 1500]  // mm from top
vertical: [300, 700]     // mm from left
```

---

### 3. Hinge Position Auto-calculation

**2 Hinges (Standard):**
```
Position 1: 150mm from top
Position 2: 150mm from bottom
```

**3 Hinges (Tall Doors):**
```
Position 1: 150mm from top
Position 2: center (height ÷ 2)
Position 3: 150mm from bottom
```

**4 Hinges (Very Tall Doors):**
```
spacing = height ÷ 5
Position 1: spacing × 1
Position 2: spacing × 2
Position 3: spacing × 3
Position 4: spacing × 4
```

**Example (2000mm door with 3 hinges):**
```
Hinge 1: 150mm from top
Hinge 2: 1000mm (center)
Hinge 3: 1850mm (150mm from bottom)
```

---

### 4. Cutting Scheme Generation

**Frame Pieces:**
```typescript
// Vertical pieces (2): Full height
vertical1 = doorHeight
vertical2 = doorHeight

// Horizontal pieces (2): Width minus frame overlap
horizontal1 = doorWidth - (2 × frameThickness)
horizontal2 = doorWidth - (2 × frameThickness)

// Additional allowance (1): 30% of width
allowance = doorWidth × 0.3
```

**Example (1000mm × 2000mm door, 25mm frame):**
```
Vertical pieces:   2000mm, 2000mm
Horizontal pieces: 950mm, 950mm
Allowance piece:   300mm

Total frame: 7200mm = 7.2 meters
```

---

## Configuration Settings

### Master Data Settings (Defaults Tab)

```typescript
{
  // Making charge configuration
  makingChargeType: 'percentage' | 'fixed',
  makingChargeValue: 15,  // % or fixed ₹ amount
  
  // Default rates
  defaultDiscount: 10,     // % discount
  defaultGST: 18,         // % GST
  defaultGlassWastage: 10, // % wastage
  
  // Divider settings
  dividerSettings: {
    mode: 'equal-split',
    equalSplitHorizontalCount: 2,
    equalSplitVerticalCount: 2,
    fixedOffsetHorizontal: [600, 1200],
    fixedOffsetVertical: [400, 800]
  }
}
```

---

## Summary

The QIRO pricing system provides:

✅ **Automated calculations** - No manual computation needed
✅ **Flexible pricing models** - Fixed or percentage-based making charges
✅ **Component-wise breakdown** - Transparent cost visibility
✅ **Auto-selection features** - Smart hardware recommendations
✅ **Multiple door types** - Openable, sliding, pin-hinge, air-hinge
✅ **Divider support** - Three calculation modes
✅ **Wastage handling** - Accurate glass area calculation
✅ **Tax compliance** - GST calculation built-in

For questions or custom pricing requirements, modify the settings in the Settings panel (password: admin123).

---

**Document Version:** 1.0  
**Last Updated:** January 3, 2026  
**System:** QIRO Glass Solutions - Quotation & Estimation System
