# Solid Fuel Sweep Certificate - Layout Guide

## Overview
This certificate is designed for solid fuel chimney sweeping and safety inspection. It follows a clean, non-overlapping layout that flows from top to bottom.

## Certificate Structure

### Header Section (Y: 20-65)
- **Main Title**: "SOLID FUEL SWEEP CERTIFICATE"
  - Centered, bold, 26px font
  - Full width (700px)

---

### Section A: Customer Details (Y: 85-355)

**Section Header**: "A. Customer Details" (Y: 85-120)

**Fields**:
1. **Customer Name** & **Telephone** (Y: 130-195)
   - Side by side
   - 340px width each
   
2. **Address** & **Postcode** (Y: 210-275)
   - Address: 520px wide
   - Postcode: 160px wide
   
3. **Email** (Y: 290-355)
   - Full width (700px)

---

### Section B: Appliance Details (Y: 375-645)

**Section Header**: "B. Appliance Details" (Y: 375-410)

**Fields**:
1. **Appliance Location** & **Appliance Type** (Y: 420-485)
   - Side by side
   - 340px width each
   
2. **Manufacturer** & **Model** (Y: 500-565)
   - Side by side
   - 340px width each
   
3. **Fuel Type** (Y: 580-645)
   - Full width (700px)

---

### Section C: Sweeping Information (Y: 665-990)

**Section Header**: "C. Sweeping Information" (Y: 665-700)

**Fields**:
1. **Fuels Used** (Y: 710-775)
   - Full width text input
   - Hint text lists options: Wood / Coal / Biomass / S Fuel / Oil / Gas
   
2. **Sweeping Method** & **Deposits Removed** (Y: 790-855)
   - Sweeping Method: Dropdown (340px)
     - Options: Brush & Rods, Line Weight, Rotary Power, Viper Star, Not Swept, Pre-Install
   - Deposits Removed: Text input (340px)
     - Hint text lists options
   
3. **Additional Details** (Y: 870-990)
   - Full width text area (120px height)
   - For birds nesting material, debris, etc.

---

### Section D: Visual/Condition Checks (Y: 1010-1360)

**Section Header**: "D. Visual/Condition Checks" (Y: 1010-1045)

**All fields are dropdowns with Pass / Advise / Fail options**:

1. **Terminal Condition** & **Chimney Pot/Cowl Condition** (Y: 1055-1120)
   
2. **Obstructions Found** & **Smoke Evacuation Test** (Y: 1135-1200)
   
3. **Ventilation Adequate** & **CO Alarm Installed** (Y: 1215-1280)
   
4. **Fire Safety Concerns** & **General Appliance Condition** (Y: 1295-1360)

All arranged in two-column layout (340px each)

---

### Section E: CO Alarm Comments (Y: 1380-1545)

**Section Header**: "E. CO Alarm Comments" (Y: 1380-1415)

**Fields**:
1. **CO Alarm Comments** (Y: 1425-1545)
   - Full width text area (120px height)
   - Hint text lists preset options:
     - Customer advised
     - Fit as per manual / building regs
     - Alarm out of date – renew
     - Rental property law 2015
     - Button test only
     - Alarm must be fitted before use

---

### Section F: Re-Sweep Recommendation (Y: 1565-1675)

**Section Header**: "F. Re-Sweep Recommendation" (Y: 1565-1600)

**Fields**:
1. **Recommended Re-Sweep Interval** (Y: 1610-1675)
   - Dropdown (340px)
   - Options: 3 months, 6 months, 12 months, 24 months

---

### Section G: Engineer & Customer Sign-Off (Y: 1695-1965)

**Section Header**: "G. Engineer & Customer Sign-Off" (Y: 1695-1730)

**Fields**:
1. **Engineer Name** & **Business Name** (Y: 1740-1805)
   - Side by side
   - 340px width each
   
2. **Date** & **Certificate Number** (Y: 1820-1885)
   - Date: Date picker (340px)
   - Certificate Number: Text input for auto-generated number (340px)
   
3. **Customer Name (for signature)** & **Note** (Y: 1900-1965)
   - Customer name field (340px)
   - Note about digital signature functionality

---

## Layout Specifications

### Spacing
- **Vertical gap between sections**: 20px
- **Vertical gap between fields**: 15px (handled by position Y coordinates)
- **Horizontal gap between side-by-side fields**: 20px
- **Field height**: 65px (includes label + input)
- **Text area height**: 120px
- **Section header height**: 35px

### Widths
- **Full width**: 700px
- **Half width (side by side)**: 340px each
- **Address field**: 520px
- **Postcode field**: 160px

### Positioning
- **Left margin**: 50px
- **Right side fields start at**: 410px (50 + 340 + 20)

### Colors & Styling
- **Section headers**: 18px, bold, left-aligned
- **Main title**: 26px, bold, center-aligned
- **Input fields**: Standard input styling with labels
- **Dropdowns**: Pass/Advise/Fail for condition checks

---

## Auto-Fill Fields

The following fields can be auto-populated from contact/appliance data:
- Customer Name
- Address
- Postcode
- Telephone
- Email
- Appliance Location
- Appliance Type
- Manufacturer
- Model
- Fuel Type

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Basic form layout
- ✅ All required fields
- ✅ Dropdown options for standardized answers
- ✅ Text areas for detailed comments

### Phase 2 (Planned)
- Multi-select buttons for "Fuels Used" instead of text input
- Multi-select checkboxes for "Deposits Removed"
- Modal for CO Alarm Comments with preset options
- Auto-generate certificate number
- Digital signature capture integration

### Phase 3 (Future)
- Photo upload for before/after chimney shots
- Sketch tool for chimney diagram
- Barcode/QR code generation
- SMS/Email certificate delivery

---

## Notes for Developers

1. **No Overlapping**: All Y coordinates are carefully spaced to prevent overlap
2. **Consistent Spacing**: 80px vertical space between sections
3. **Two-Column Layout**: Side-by-side fields use 340px + 20px gap + 340px
4. **Full Width Fields**: Use 700px for full-width inputs
5. **Text Areas**: Use 120px height for adequate space
6. **Auto-Fill Ready**: All customer/appliance fields support auto-population

---

**Certificate Height**: ~1965px (fits on 2-3 printed pages at A4 size)
**Certificate Width**: 800px (standard certificate canvas width)