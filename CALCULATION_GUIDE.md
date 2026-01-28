# 📊 Quotation Calculation Guide

> A simple guide to understand how QIRO calculates prices for glass doors and shutters

---

## 🎯 Overview

This system helps you create accurate quotations for glass doors by automatically calculating:
- Material requirements (frames, glass, handles, etc.)
- Hardware quantities (connectors, hinges, locks, etc.)
- Total costs and final pricing

---

## 📏 How Measurements Work

### 1. **Door Dimensions**
You can enter dimensions in two ways:
- **Millimeters (mm)** - Most common in construction
- **Inches** - For imperial measurements

The system automatically converts everything to millimeters for calculations.

**Example:**
- Door: 1200mm × 2100mm (Width × Height)
- Or: 47.24 inches × 82.68 inches

---

## 💰 Pricing Calculation Flow

### **Step 1: Material Costs**

#### **A. Frame Profile Cost**
- Frame runs around the entire door perimeter
- System calculates total length needed
- Extra material added based on door type (sliding needs more)

**Formula:**
```
Total Frame Length = (Width + Height) × 2 + Extra for door type
Frame Cost = Total Length (mm) × Price per mm × Quantity of doors
```

**Example:**
- Door: 1200mm × 2100mm
- Basic perimeter: (1200 + 2100) × 2 = 6,600mm = 6.6 meters
- For sliding door, add 50% extra: 6.6m + 3.3m = 9.9 meters
- If frame costs ₹10 per mm: 9,900mm × ₹10 = ₹99,000

---

#### **B. Glass Cost**
- Glass area = Door area minus frame space
- Glass is purchased from suppliers (no cutting wastage added)
- Priced per square foot

**Formula:**
```
Glass Width = Door Width - (2 × Frame Thickness)
Glass Height = Door Height - (2 × Frame Thickness)
Glass Area (sq.ft) = (Glass Width × Glass Height) ÷ 92,903.04
Glass Cost = Glass Area × Price per sq.ft × Quantity of doors
```

**Example:**
- Door: 1200mm × 2100mm
- Frame thickness: 25mm
- Glass dimensions: (1200-50) × (2100-50) = 1150mm × 2050mm
- Area: 2,357,500 sq.mm = 25.37 sq.ft
- If glass costs ₹80 per sq.ft: 25.37 × ₹80 = ₹2,029.60

---

#### **C. Connectors**
- Connectors join frame pieces at corners and intersections
- System automatically calculates based on door type

**Auto-Calculation Rules:**
- Fixed/Openable doors: **4 connectors** (one per corner)
- Sliding doors: **8 connectors** (need more support)
- With dividers: Extra connectors for each intersection

**Example:**
- Sliding door without dividers: 8 connectors
- If connector costs ₹50 each: 8 × ₹50 = ₹400

---

#### **D. Handle Cost (Optional)**
- Handle runs vertically along the door height
- 100mm less than full height for clearance

**Formula:**
```
Handle Length = Door Height - 100mm
Handle Cost = Handle Length (mm) × Price per mm × Quantity of doors
```

**Example:**
- Door height: 2100mm
- Handle length: 2100 - 100 = 2000mm = 2 meters
- If handle costs ₹8 per mm: 2000mm × ₹8 = ₹16,000

---

#### **E. Hinges (For Openable Doors)**
- System automatically determines hinge count based on door height
- Hinges are evenly distributed for stability

**Auto-Calculation Rules:**
| Door Height | Number of Hinges |
|------------|------------------|
| Up to 1800mm | 2 hinges |
| 1801mm to 2400mm | 3 hinges |
| Above 2400mm | 4 hinges |

**Example:**
- Door: 2100mm tall → 3 hinges needed
- If hinge costs ₹150 each: 3 × ₹150 = ₹450

---

#### **F. Dividers (Optional)**
- Dividers split the glass into sections
- Can be horizontal or vertical
- System calculates total length and connectors needed

**Three Modes:**
1. **Fixed Offset** - Dividers at pre-set positions
2. **Equal Split** - Divides door into equal sections
3. **Manual** - Custom positions you specify

**Example:**
- Door: 1200mm × 2100mm
- Add 1 horizontal divider (runs across width): 1200mm
- Add 1 vertical divider (runs along height): 2100mm
- Total divider length: 3300mm = 3.3 meters
- If divider costs ₹6 per mm: 3300mm × ₹6 = ₹19,800

---

#### **G. Additional Hardware**
These are optional add-ons:

- **Gasket** - Rubber seal around frame, priced per mm of perimeter
- **Lock** - Fixed price per unit
- **Sliding System Bundle** - Complete track system for sliding doors, priced per bundle

**Example:**
- Gasket for full perimeter (6.6m): 6600mm × ₹2 = ₹13,200
- Lock: ₹500 (fixed price)
- Sliding bundle: ₹8,000 (includes tracks, rollers, soft-close)

---

### **Step 2: Making Charges**
These are your labor and installation charges. Two options:

#### **Option A: Fixed Amount**
- Add a flat fee per quotation
- Example: ₹10,000 per job

#### **Option B: Percentage of Material Cost**
- Calculate as % of total material cost
- Example: 15% of ₹1,50,000 = ₹22,500

---

### **Step 3: Discount**
- Applied to material + making charges
- Reduces the price before tax

**Example:**
- Subtotal: ₹1,72,500
- Discount 10%: ₹17,250
- Amount after discount: ₹1,55,250

---

### **Step 4: GST (Tax)**
- Applied AFTER discount
- Standard rate: 18% (can be changed)

**Example:**
- Taxable amount: ₹1,55,250
- GST @18%: ₹27,945
- Final amount: ₹1,83,195

---

## 📋 Complete Example Calculation

### **Door Specifications:**
- Name: Main Entrance Door
- Size: 1200mm × 2100mm
- Type: Sliding door
- Quantity: 2 doors
- Frame: Aluminum profile @₹10/mm
- Glass: 10mm clear @₹80/sq.ft
- Handle: Steel profile @₹8/mm
- Connectors: Corner connectors @₹50 each
- Sliding bundle: ₹8,000 per door

### **Cost Breakdown:**

| Component | Calculation | Cost per Door | Total (×2) |
|-----------|-------------|---------------|------------|
| **Frame** | 9,900mm × ₹10/mm | ₹99,000 | ₹1,98,000 |
| **Glass** | 25.37 sq.ft × ₹80/sq.ft | ₹2,030 | ₹4,060 |
| **Handle** | 2,000mm × ₹8/mm | ₹16,000 | ₹32,000 |
| **Connectors** | 8 × ₹50 | ₹400 | ₹800 |
| **Sliding Bundle** | ₹8,000 fixed | ₹8,000 | ₹16,000 |
| **Material Subtotal** | | | **₹2,50,860** |
| **Making Charges** | 15% of materials | | **₹37,629** |
| **Subtotal** | | | **₹2,88,489** |
| **Discount** | 10% off | | **-₹28,849** |
| **Taxable Amount** | | | **₹2,59,640** |
| **GST** | 18% | | **₹46,735** |
| **FINAL AMOUNT** | | | **₹3,06,375** |

---

## 🔧 Additional Components & Optional Items

### **Additional Components**
These are extra items you add to the quotation:
- Example: Installation hardware, mounting brackets, etc.
- Can add item-specific discount

**Calculation:**
```
Component Total = Quantity × Price - (Discount %)
```

### **Optional Items**
Products the customer might want but hasn't confirmed:
- Shown separately in quotation
- Can add item-specific discount
- Same calculation as additional components

---

## 📊 Cutting Scheme (Material Planning)

The system automatically generates a cutting list showing:
- **Vertical Pieces** - Two pieces, full door height each
- **Horizontal Pieces** - Two pieces, width minus frame overlap
- **Allowance Piece** - Extra 30% of width for support/wastage

This helps with:
- Ordering raw materials
- Planning cuts
- Minimizing material wastage

**Example for 1200mm × 2100mm door:**
- Vertical: 2 pieces × 2100mm = 4200mm
- Horizontal: 2 pieces × 1150mm = 2300mm
- Allowance: 1 piece × 360mm = 360mm
- **Total needed: 6,860mm**

---

## 🎨 Smart Features

### **1. Auto-Select Sliding Bundle**
- Calculates door weight based on glass thickness and size
- Automatically suggests appropriate bundle
- Ensures safe weight capacity

### **2. Hinge Auto-Placement**
- Determines optimal number of hinges
- Positions them evenly for best support
- Top and bottom hinges always 150mm from edges

### **3. Connector Auto-Count**
- Calculates based on door type
- Adds extra for dividers
- Ensures structural integrity

### **4. Divider Positioning**
- Three modes for flexibility
- Shows exact measurements
- Calculates all intersections

---

## 💡 Tips for Accurate Quotations

1. **Always verify door measurements** - Double-check width and height
2. **Select correct door type** - Affects material calculations significantly
3. **Review auto-calculated values** - System suggestions are usually optimal
4. **Check glass pricing** - Glass is purchased from suppliers, ensure current rates
5. **Consider making charges** - Adjust based on job complexity
6. **Apply discounts carefully** - Affects final price significantly
7. **Verify GST rate** - Standard is 18%, but may vary by region

---

## 📱 Need Help?

If you notice any calculation errors or have questions:
- Check all input values are correct
- Verify master data (frame prices, glass prices, etc.) is up to date
- Review the auto-calculated values in the preview section
- Contact your system administrator for pricing updates

---

**Last Updated:** January 2026  
**Version:** 1.0
