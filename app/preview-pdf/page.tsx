'use client';

import React, { useState } from 'react';
import { DoorConfiguration, QuotationData, MasterData } from '../../types';
import { calculateDoorCosts, calculateCostSummary } from '../../utils/calculations';
import { generateQuotationPDF } from '../../utils/pdfGenerator';
import { masterData } from '../../data/masterData';

export default function PreviewPDFPage() {
  const [isGenerating, setIsGenerating] = useState(false);

  // Sample quotation data for preview
  const sampleQuotation: QuotationData = {
    id: 'QUO-2025-001',
    date: new Date().toISOString(),
    customerName: 'John Doe',
    mobileNumber: '+91 98765 43210',
    projectName: 'Luxury Apartment Renovation',
    address: '123, Park Avenue, Koramangala, Bangalore - 560034, Karnataka, India',
    additionalComponents: [],
    optionalItems: [],
    gstPercentage: 18,
    glassWastagePercentage: 10,
    globalDiscount: 0,
    doors: [
      {
        id: '1',
        doorName: 'Main Entrance',
        doorType: 'double',
        width: 2000,
        height: 2400,
        measurementUnit: 'mm',
        quantity: 1,
        frameProfileCode: 'ALU-20x40',
        glassTypeCode: 'CLR-5MM',
        handleProfileCode: 'HDL-001',
        handlePosition: 'right',
        handleOffset: 1200,
        hingeCode: 'HNG-001',
        hingePosition: 'left',
        hingeQuantity: 3,
        carcassThickness: 18,
        connectorCode: 'CON-001',
        connectorQuantity: 4,
        liftAvailable: false,
      },
      {
        id: '2',
        doorName: 'Kitchen Cabinet',
        doorType: 'lift-up',
        width: 800,
        height: 600,
        measurementUnit: 'mm',
        quantity: 2,
        frameProfileCode: 'ALU-20x40',
        glassTypeCode: 'FRS-5MM',
        handleProfileCode: 'HDL-002',
        handlePosition: 'none',
        handleOffset: 0,
        hingeCode: 'HNG-002',
        hingePosition: 'right',
        hingeQuantity: 2,
        carcassThickness: 18,
        connectorCode: 'CON-002',
        connectorQuantity: 2,
        liftAvailable: true,
      },
      {
        id: '3',
        doorName: 'Wardrobe',
        doorType: 'sliding',
        width: 1500,
        height: 2100,
        measurementUnit: 'mm',
        quantity: 1,
        frameProfileCode: 'ALU-25x50',
        glassTypeCode: 'MIR-5MM',
        handleProfileCode: 'HDL-003',
        handlePosition: 'left',
        handleOffset: 1050,
        hingeCode: 'HNG-001',
        hingePosition: 'left',
        hingeQuantity: 0,
        carcassThickness: 18,
        connectorCode: 'CON-001',
        connectorQuantity: 6,
        liftAvailable: false,
      },
      {
        id: '4',
        doorName: 'Balcony Door',
        doorType: 'bi-fold',
        width: 1800,
        height: 2200,
        measurementUnit: 'mm',
        quantity: 1,
        frameProfileCode: 'ALU-20x40',
        glassTypeCode: 'CLR-8MM',
        handleProfileCode: 'HDL-001',
        handlePosition: 'right',
        handleOffset: 1100,
        hingeCode: 'HNG-003',
        hingePosition: 'right',
        hingeQuantity: 4,
        carcassThickness: 18,
        connectorCode: 'CON-003',
        connectorQuantity: 8,
        liftAvailable: false,
      },
      {
        id: '5',
        doorName: 'Bathroom',
        doorType: 'single',
        width: 900,
        height: 2100,
        measurementUnit: 'mm',
        quantity: 2,
        frameProfileCode: 'ALU-20x40',
        glassTypeCode: 'FRS-5MM',
        handleProfileCode: 'HDL-002',
        handlePosition: 'left',
        handleOffset: 1050,
        hingeCode: 'HNG-001',
        hingePosition: 'right',
        hingeQuantity: 3,
        carcassThickness: 18,
        connectorCode: 'CON-001',
        connectorQuantity: 2,
        liftAvailable: false,
      },
    ],
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const doorCalculations = sampleQuotation.doors.map(door =>
        calculateDoorCosts(door, sampleQuotation.glassWastagePercentage)
      );
      const costSummary = calculateCostSummary(sampleQuotation, doorCalculations);
      
      await generateQuotationPDF(sampleQuotation, doorCalculations, costSummary);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PDF Preview & Test</h1>
          <p className="text-gray-600">
            Generate a sample PDF quotation with test data to preview the layout and styling.
          </p>
        </div>

        {/* Sample Data Preview */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sample Quotation Data</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Customer Details</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">ID:</span> {sampleQuotation.id}</p>
                <p><span className="font-medium">Name:</span> {sampleQuotation.customerName}</p>
                <p><span className="font-medium">Mobile:</span> {sampleQuotation.mobileNumber}</p>
                <p><span className="font-medium">Project:</span> {sampleQuotation.projectName}</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Address</h3>
              <p className="text-sm text-gray-600">{sampleQuotation.address}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Doors Configuration</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Door Name</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Type</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Size (mm)</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Qty</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Frame</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Glass</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sampleQuotation.doors.map((door) => (
                    <tr key={door.id}>
                      <td className="px-4 py-2">{door.doorName}</td>
                      <td className="px-4 py-2 capitalize">{door.doorType}</td>
                      <td className="px-4 py-2">{door.width} × {door.height}</td>
                      <td className="px-4 py-2">{door.quantity}</td>
                      <td className="px-4 py-2">{door.frameProfileCode}</td>
                      <td className="px-4 py-2">{door.glassTypeCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PDF Features */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">PDF Features Included</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">Page 1: Quotation</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Customer details</li>
                <li>Door configuration table</li>
                <li>Cost summary (subtotal, GST, total)</li>
                <li>Terms & conditions</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">Page 2+: Door Details</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Technical door diagrams (type-specific)</li>
                <li>Uploaded door images (if any)</li>
                <li>Specifications table</li>
                <li>Cutting schema</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">Materials Page</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Frame profile images</li>
                <li>Handle profile images</li>
                <li>Glass type images</li>
                <li>Connector images</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">Design</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Minimal black & white theme</li>
                <li>Professional layout</li>
                <li>Proper page breaks</li>
                <li>Type-specific door diagrams</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Door Type Diagram Preview */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Door Types Supported</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="p-4 border rounded-lg">
              <div className="text-3xl mb-2">🚪</div>
              <p className="font-medium">Single</p>
              <p className="text-xs text-gray-500">Standard hinged</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-3xl mb-2">🚪🚪</div>
              <p className="font-medium">Double</p>
              <p className="text-xs text-gray-500">Two panels</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-3xl mb-2">⬆️</div>
              <p className="font-medium">Lift-up</p>
              <p className="text-xs text-gray-500">Vertical opening</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-3xl mb-2">↔️</div>
              <p className="font-medium">Sliding</p>
              <p className="text-xs text-gray-500">Overlapping panels</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-3xl mb-2">🔀</div>
              <p className="font-medium">Bi-fold</p>
              <p className="text-xs text-gray-500">Folding panels</p>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Generate Test PDF</h3>
              <p className="text-sm text-gray-600 mt-1">
                Click the button to generate and download a sample PDF with all features
              </p>
            </div>
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isGenerating ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : (
                'Generate PDF'
              )}
            </button>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
          >
            ← Back to Main Application
          </a>
        </div>
      </div>
    </div>
  );
}
