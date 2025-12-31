'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  QuotationData,
  DoorConfiguration,
  AdditionalComponent,
  OptionalItem,
  DoorCalculation,
  CostSummary,
} from '../types';
import { masterData as defaultMasterData } from '../data/masterData';
import {
  calculateDoorCosts,
  calculateCostSummary,
  calculateCuttingScheme,
  formatCurrency,
} from '../utils/calculations';
import { DoorDiagram } from '../utils/diagramGenerator';
import { generateQuotationPDF } from '../utils/pdfGenerator';
import { exportToExcel, exportToText, saveQuotationToLocalStorage } from '../utils/exportUtils';
import type { MasterData, FrameProfile, HandleProfile, GlassType, ConnectorType, Product, ProductType, DoorTypeCompatibility } from '../types';

export default function Home() {
  // Settings sidebar state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'frames' | 'handles' | 'glass' | 'connectors' | 'products' | 'defaults'>('frames');
  const [showReport, setShowReport] = useState(false);
  
  // Product management state
  const [productTypeFilter, setProductTypeFilter] = useState<ProductType | 'all'>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'staff'>('admin'); // For demo purposes
  
  // Editable master data
  const [masterData, setMasterData] = useState<MasterData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('qiro_master_data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Ensure products array exists for backward compatibility
          if (!parsed.products) {
            parsed.products = defaultMasterData.products || [];
          }
          return parsed;
        } catch (e) {
          return defaultMasterData;
        }
      }
    }
    return defaultMasterData;
  });

  // Save master data to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qiro_master_data', JSON.stringify(masterData));
    }
  }, [masterData]);

  const [quotation, setQuotation] = useState<QuotationData>({
    id: uuidv4(),
    customerName: '',
    mobileNumber: '',
    address: '',
    projectName: '',
    date: new Date().toISOString().split('T')[0],
    doors: [],
    additionalComponents: [],
    optionalItems: [],
    gstPercentage: masterData.defaultGST,
    glassWastagePercentage: masterData.defaultGlassWastage,
    globalDiscount: 0,
  });

  const [currentDoor, setCurrentDoor] = useState<DoorConfiguration>({
    id: uuidv4(),
    doorName: '',
    doorType: 'single',
    measurementUnit: 'mm',
    height: 0,
    width: 0,
    quantity: 1,
    handlePosition: 'right',
    handleOffset: 500,
    hingePosition: 'left',
    hingeCode: 'H-001',
    hingeQuantity: 2,
    carcassThickness: 18,
    frameProfileCode: masterData.frameProfiles[0].code,
    glassTypeCode: masterData.glassTypes[0].code,
    connectorCode: masterData.connectorTypes[0]?.code,
    connectorQuantity: 4,
    liftAvailable: true,
  });

  // Calculate door costs
  const doorCalculations = useMemo<DoorCalculation[]>(() => {
    return quotation.doors.map(door =>
      calculateDoorCosts(door, quotation.glassWastagePercentage)
    );
  }, [quotation.doors, quotation.glassWastagePercentage]);

  // Calculate cost summary
  const costSummary = useMemo<CostSummary>(() => {
    return calculateCostSummary(quotation, doorCalculations);
  }, [quotation, doorCalculations]);

  // Get filtered options based on selected frame profile
  const filteredOptions = useMemo(() => {
    const selectedFrame = masterData.frameProfiles.find(
      fp => fp.code === currentDoor.frameProfileCode
    );
    
    if (!selectedFrame) {
      return {
        handles: masterData.handleProfiles,
        glassTypes: masterData.glassTypes,
        connectors: masterData.connectorTypes,
      };
    }

    // Filter based on suggested items, fallback to all if no suggestions
    const handles = selectedFrame.suggestedHandles?.length
      ? masterData.handleProfiles.filter(h => selectedFrame.suggestedHandles?.includes(h.code))
      : masterData.handleProfiles;
    
    const glassTypes = selectedFrame.suggestedGlassTypes?.length
      ? masterData.glassTypes.filter(g => selectedFrame.suggestedGlassTypes?.includes(g.code))
      : masterData.glassTypes;
    
    const connectors = selectedFrame.suggestedConnectors?.length
      ? masterData.connectorTypes.filter(c => selectedFrame.suggestedConnectors?.includes(c.code))
      : masterData.connectorTypes;

    return { handles, glassTypes, connectors };
  }, [currentDoor.frameProfileCode, masterData]);

  // Auto-save to localStorage
  useEffect(() => {
    if (quotation.customerName && quotation.doors.length > 0) {
      saveQuotationToLocalStorage(quotation);
    }
  }, [quotation]);

  const handleAddDoor = () => {
    if (!currentDoor.doorName || !currentDoor.height || !currentDoor.width) {
      alert('Please fill in all required door fields');
      return;
    }

    setQuotation(prev => ({
      ...prev,
      doors: [...prev.doors, currentDoor],
    }));

    setCurrentDoor({
      id: uuidv4(),
      doorName: '',
      doorType: 'single',
      measurementUnit: 'mm',
      height: 0,
      width: 0,
      quantity: 1,
      handlePosition: 'right',
      handleOffset: 500,
      hingePosition: 'left',
      hingeCode: 'H-001',
      hingeQuantity: 2,
      carcassThickness: 18,
      frameProfileCode: masterData.frameProfiles[0].code,
      glassTypeCode: masterData.glassTypes[0].code,
      connectorCode: masterData.connectorTypes[0]?.code,
      connectorQuantity: 4,
      liftAvailable: true,
    });
  };

  const handleRemoveDoor = (doorId: string) => {
    setQuotation(prev => ({
      ...prev,
      doors: prev.doors.filter(d => d.id !== doorId),
    }));
  };

  const handleAddAdditionalComponent = () => {
    const newComponent: AdditionalComponent = {
      id: uuidv4(),
      description: '',
      quantity: 1,
      price: 0,
      discount: 0,
      total: 0,
    };
    setQuotation(prev => ({
      ...prev,
      additionalComponents: [...prev.additionalComponents, newComponent],
    }));
  };

  const handleAddOptionalItem = () => {
    const newItem: OptionalItem = {
      id: uuidv4(),
      description: '',
      quantity: 1,
      mrp: 0,
      discount: 0,
      total: 0,
    };
    setQuotation(prev => ({
      ...prev,
      optionalItems: [...prev.optionalItems, newItem],
    }));
  };

  const handleExportPDF = async () => {
    if (!quotation.customerName || quotation.doors.length === 0) {
      alert('Please add customer details and at least one door');
      return;
    }
    await generateQuotationPDF(quotation, doorCalculations, costSummary);
  };

  const handleExportExcel = () => {
    if (!quotation.customerName || quotation.doors.length === 0) {
      alert('Please add customer details and at least one door');
      return;
    }
    exportToExcel(quotation, doorCalculations, costSummary);
  };

  const handleExportText = () => {
    if (!quotation.customerName || quotation.doors.length === 0) {
      alert('Please add customer details and at least one door');
      return;
    }
    exportToText(quotation, doorCalculations, costSummary);
  };

  // Master data management functions
  const addFrameProfile = () => {
    const newProfile: FrameProfile = {
      code: `FP${String(masterData.frameProfiles.length + 1).padStart(3, '0')}`,
      name: 'New Frame Profile',
      width: 20,
      height: 40,
      pricePerMeter: 100,
    };
    setMasterData(prev => ({
      ...prev,
      frameProfiles: [...prev.frameProfiles, newProfile],
    }));
  };

  const updateFrameProfile = (index: number, updated: FrameProfile) => {
    setMasterData(prev => ({
      ...prev,
      frameProfiles: prev.frameProfiles.map((p, i) => i === index ? updated : p),
    }));
  };

  const deleteFrameProfile = (index: number) => {
    if (confirm('Are you sure you want to delete this frame profile?')) {
      setMasterData(prev => ({
        ...prev,
        frameProfiles: prev.frameProfiles.filter((_, i) => i !== index),
      }));
    }
  };

  const addHandleProfile = () => {
    const newProfile: HandleProfile = {
      code: `HP${String(masterData.handleProfiles.length + 1).padStart(3, '0')}`,
      name: 'New Handle Profile',
      pricePerMeter: 80,
    };
    setMasterData(prev => ({
      ...prev,
      handleProfiles: [...prev.handleProfiles, newProfile],
    }));
  };

  const updateHandleProfile = (index: number, updated: HandleProfile) => {
    setMasterData(prev => ({
      ...prev,
      handleProfiles: prev.handleProfiles.map((p, i) => i === index ? updated : p),
    }));
  };

  const deleteHandleProfile = (index: number) => {
    if (confirm('Are you sure you want to delete this handle profile?')) {
      setMasterData(prev => ({
        ...prev,
        handleProfiles: prev.handleProfiles.filter((_, i) => i !== index),
      }));
    }
  };

  const addGlassType = () => {
    const newGlass: GlassType = {
      code: `GL${String(masterData.glassTypes.length + 1).padStart(3, '0')}`,
      name: 'New Glass Type',
      pricePerSqFt: 50,
      thickness: 5,
    };
    setMasterData(prev => ({
      ...prev,
      glassTypes: [...prev.glassTypes, newGlass],
    }));
  };

  const updateGlassType = (index: number, updated: GlassType) => {
    setMasterData(prev => ({
      ...prev,
      glassTypes: prev.glassTypes.map((g, i) => i === index ? updated : g),
    }));
  };

  const deleteGlassType = (index: number) => {
    if (confirm('Are you sure you want to delete this glass type?')) {
      setMasterData(prev => ({
        ...prev,
        glassTypes: prev.glassTypes.filter((_, i) => i !== index),
      }));
    }
  };

  const addConnectorType = () => {
    const newConnector: ConnectorType = {
      code: `CN${String(masterData.connectorTypes.length + 1).padStart(3, '0')}`,
      name: 'New Connector Type',
      pricePerUnit: 15,
    };
    setMasterData(prev => ({
      ...prev,
      connectorTypes: [...prev.connectorTypes, newConnector],
    }));
  };

  const updateConnectorType = (index: number, updated: ConnectorType) => {
    setMasterData(prev => ({
      ...prev,
      connectorTypes: prev.connectorTypes.map((c, i) => i === index ? updated : c),
    }));
  };

  const deleteConnectorType = (index: number) => {
    if (confirm('Are you sure you want to delete this connector type?')) {
      setMasterData(prev => ({
        ...prev,
        connectorTypes: prev.connectorTypes.filter((_, i) => i !== index),
      }));
    }
  };

  // Product management functions
  const addProduct = (product: Product) => {
    setMasterData(prev => ({
      ...prev,
      products: [...(prev.products || []), product]
    }));
    setIsAddingProduct(false);
    setEditingProduct(null);
  };

  const updateProduct = (code: string, updates: Partial<Product>) => {
    setMasterData(prev => ({
      ...prev,
      products: (prev.products || []).map(p => p.code === code ? { ...p, ...updates } : p)
    }));
  };

  const deleteProduct = (code: string) => {
    if (confirm(`Delete product ${code}?`)) {
      setMasterData(prev => ({
        ...prev,
        products: (prev.products || []).filter(p => p.code !== code)
      }));
    }
  };

  const filteredProducts = useMemo(() => {
    const products = masterData.products || [];
    if (productTypeFilter === 'all') {
      return products;
    }
    return products.filter(p => p.productType === productTypeFilter);
  }, [masterData.products, productTypeFilter]);

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      setMasterData(defaultMasterData);
      localStorage.removeItem('qiro_master_data');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Settings Button - Fixed Position */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="fixed top-6 right-6 z-40 bg-black hover:bg-gray-800 text-white p-3 rounded-lg shadow-lg transition-all hover:shadow-xl"
        title="Settings"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Settings Sidebar */}
      {settingsOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-40"
            onClick={() => setSettingsOpen(false)}
          />
          
          {/* Sidebar Panel */}
          <div className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white border-l border-gray-200 z-50 overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-black">Settings & Master Data</h2>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="text-gray-400 hover:text-black text-2xl font-light w-8 h-8 flex items-center justify-center"
                >
                  ×
                </button>
              </div>

              {/* Tabs */}
              <div className="flex space-x-1 mb-6 overflow-x-auto border-b border-gray-200">
                {(['frames', 'handles', 'glass', 'connectors', 'products', 'defaults'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'frames' && 'Frame Profiles'}
                    {tab === 'handles' && 'Handle Profiles'}
                    {tab === 'glass' && 'Glass Types'}
                    {tab === 'connectors' && 'Connectors'}
                    {tab === 'products' && 'Products'}
                    {tab === 'defaults' && 'Defaults'}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="space-y-4">
                {/* Frame Profiles Tab */}
                {activeTab === 'frames' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Frame Profiles ({masterData.frameProfiles.length})</h3>
                      <button
                        onClick={addFrameProfile}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
                      >
                        + Add New
                      </button>
                    </div>
                    <div className="space-y-3">
                      {masterData.frameProfiles.map((profile, index) => (
                        <div key={profile.code} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                              <input
                                type="text"
                                value={profile.code}
                                onChange={e => updateFrameProfile(index, { ...profile, code: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                              <input
                                type="text"
                                value={profile.name}
                                onChange={e => updateFrameProfile(index, { ...profile, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Width (mm)</label>
                              <input
                                type="number"
                                value={profile.width}
                                onChange={e => updateFrameProfile(index, { ...profile, width: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Height (mm)</label>
                              <input
                                type="number"
                                value={profile.height}
                                onChange={e => updateFrameProfile(index, { ...profile, height: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Price per Meter (₹)</label>
                              <input
                                type="number"
                                value={profile.pricePerMeter}
                                onChange={e => updateFrameProfile(index, { ...profile, pricePerMeter: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Image</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      updateFrameProfile(index, { ...profile, imageUrl: reader.result as string });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="w-full text-xs file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-black file:text-white hover:file:bg-gray-800"
                              />
                              {profile.imageUrl && (
                                <div className="mt-2 relative">
                                  <img src={profile.imageUrl} alt={profile.name} className="w-16 h-16 object-cover rounded border" />
                                  <button
                                    onClick={() => updateFrameProfile(index, { ...profile, imageUrl: undefined })}
                                    className="absolute -top-1 -right-1 bg-black text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Suggested Items Configuration */}
                          <div className="mt-4 pt-4 border-t border-gray-300">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Suggested Items for this Frame</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Suggested Handles</label>
                                <select
                                  multiple
                                  size={4}
                                  value={profile.suggestedHandles || []}
                                  onChange={e => {
                                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                                    updateFrameProfile(index, { ...profile, suggestedHandles: selected });
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                                >
                                  {masterData.handleProfiles.map(h => (
                                    <option key={h.code} value={h.code}>{h.name}</option>
                                  ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Suggested Glass Types</label>
                                <select
                                  multiple
                                  size={4}
                                  value={profile.suggestedGlassTypes || []}
                                  onChange={e => {
                                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                                    updateFrameProfile(index, { ...profile, suggestedGlassTypes: selected });
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                                >
                                  {masterData.glassTypes.map(g => (
                                    <option key={g.code} value={g.code}>{g.name}</option>
                                  ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Suggested Connectors</label>
                                <select
                                  multiple
                                  size={4}
                                  value={profile.suggestedConnectors || []}
                                  onChange={e => {
                                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                                    updateFrameProfile(index, { ...profile, suggestedConnectors: selected });
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                                >
                                  {masterData.connectorTypes.map(c => (
                                    <option key={c.code} value={c.code}>{c.name}</option>
                                  ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <button
                              onClick={() => deleteFrameProfile(index)}
                              className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-semibold text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Handle Profiles Tab */}
                {activeTab === 'handles' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Handle Profiles ({masterData.handleProfiles.length})</h3>
                      <button
                        onClick={addHandleProfile}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
                      >
                        + Add New
                      </button>
                    </div>
                    <div className="space-y-3">
                      {masterData.handleProfiles.map((profile, index) => (
                        <div key={profile.code} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                              <input
                                type="text"
                                value={profile.code}
                                onChange={e => updateHandleProfile(index, { ...profile, code: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                              <input
                                type="text"
                                value={profile.name}
                                onChange={e => updateHandleProfile(index, { ...profile, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Price per Meter (₹)</label>
                              <input
                                type="number"
                                value={profile.pricePerMeter}
                                onChange={e => updateHandleProfile(index, { ...profile, pricePerMeter: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Image</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      updateHandleProfile(index, { ...profile, imageUrl: reader.result as string });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="w-full text-xs file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-black file:text-white hover:file:bg-gray-800"
                              />
                              {profile.imageUrl && (
                                <div className="mt-2 relative">
                                  <img src={profile.imageUrl} alt={profile.name} className="w-16 h-16 object-cover rounded border" />
                                  <button
                                    onClick={() => updateHandleProfile(index, { ...profile, imageUrl: undefined })}
                                    className="absolute -top-1 -right-1 bg-black text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-3">
                            <button
                              onClick={() => deleteHandleProfile(index)}
                              className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-semibold text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Glass Types Tab */}
                {activeTab === 'glass' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Glass Types ({masterData.glassTypes.length})</h3>
                      <button
                        onClick={addGlassType}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
                      >
                        + Add New
                      </button>
                    </div>
                    <div className="space-y-3">
                      {masterData.glassTypes.map((glass, index) => (
                        <div key={glass.code} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                              <input
                                type="text"
                                value={glass.code}
                                onChange={e => updateGlassType(index, { ...glass, code: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                              <input
                                type="text"
                                value={glass.name}
                                onChange={e => updateGlassType(index, { ...glass, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Price per Sq.Ft (₹)</label>
                              <input
                                type="number"
                                value={glass.pricePerSqFt}
                                onChange={e => updateGlassType(index, { ...glass, pricePerSqFt: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Thickness (mm)</label>
                              <input
                                type="number"
                                value={glass.thickness || 0}
                                onChange={e => updateGlassType(index, { ...glass, thickness: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Image</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      updateGlassType(index, { ...glass, imageUrl: reader.result as string });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="w-full text-xs file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-black file:text-white hover:file:bg-gray-800"
                              />
                              {glass.imageUrl && (
                                <div className="mt-2 relative">
                                  <img src={glass.imageUrl} alt={glass.name} className="w-16 h-16 object-cover rounded border" />
                                  <button
                                    onClick={() => updateGlassType(index, { ...glass, imageUrl: undefined })}
                                    className="absolute -top-1 -right-1 bg-black text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-3">
                            <button
                              onClick={() => deleteGlassType(index)}
                              className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-semibold text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connectors Tab */}
                {activeTab === 'connectors' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Connector Types ({masterData.connectorTypes.length})</h3>
                      <button
                        onClick={addConnectorType}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
                      >
                        + Add New
                      </button>
                    </div>
                    <div className="space-y-3">
                      {masterData.connectorTypes.map((connector, index) => (
                        <div key={connector.code} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                              <input
                                type="text"
                                value={connector.code}
                                onChange={e => updateConnectorType(index, { ...connector, code: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                              <input
                                type="text"
                                value={connector.name}
                                onChange={e => updateConnectorType(index, { ...connector, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Price per Unit (₹)</label>
                              <input
                                type="number"
                                value={connector.pricePerUnit}
                                onChange={e => updateConnectorType(index, { ...connector, pricePerUnit: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Image</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      updateConnectorType(index, { ...connector, imageUrl: reader.result as string });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="w-full text-xs file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-black file:text-white hover:file:bg-gray-800"
                              />
                              {connector.imageUrl && (
                                <div className="mt-2 relative">
                                  <img src={connector.imageUrl} alt={connector.name} className="w-16 h-16 object-cover rounded border" />
                                  <button
                                    onClick={() => updateConnectorType(index, { ...connector, imageUrl: undefined })}
                                    className="absolute -top-1 -right-1 bg-black text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-3">
                            <button
                              onClick={() => deleteConnectorType(index)}
                              className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-semibold text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products Tab */}
                {activeTab === 'products' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Products ({(masterData.products || []).length})</h3>
                      <button
                        onClick={() => {
                          setIsAddingProduct(true);
                          setEditingProduct({
                            code: '',
                            name: '',
                            productType: 'frame-profile',
                            compatibleDoorTypes: ['openable'],
                            costPrice: 0,
                            sellingPrice: 0,
                          });
                        }}
                        className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                      >
                        + Add Product
                      </button>
                    </div>

                    {/* Product Type Filter */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
                      <select
                        value={productTypeFilter}
                        onChange={e => setProductTypeFilter(e.target.value as ProductType | 'all')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="all">All Products ({(masterData.products || []).length})</option>
                        <option value="frame-profile">Frame Profiles ({(masterData.products || []).filter(p => p.productType === 'frame-profile').length})</option>
                        <option value="handle-profile">Handle Profiles ({(masterData.products || []).filter(p => p.productType === 'handle-profile').length})</option>
                        <option value="divider-profile">Divider Profiles ({(masterData.products || []).filter(p => p.productType === 'divider-profile').length})</option>
                        <option value="divider-connector">Divider Connectors ({(masterData.products || []).filter(p => p.productType === 'divider-connector').length})</option>
                        <option value="gasket">Gaskets ({(masterData.products || []).filter(p => p.productType === 'gasket').length})</option>
                        <option value="lock">Locks ({(masterData.products || []).filter(p => p.productType === 'lock').length})</option>
                        <option value="hinge">Hinges ({(masterData.products || []).filter(p => p.productType === 'hinge').length})</option>
                        <option value="sliding-system">Sliding Systems ({(masterData.products || []).filter(p => p.productType === 'sliding-system').length})</option>
                        <option value="connector">Connectors ({(masterData.products || []).filter(p => p.productType === 'connector').length})</option>
                      </select>
                    </div>

                    {/* Role Toggle (Demo) */}
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={userRole === 'admin'}
                          onChange={e => setUserRole(e.target.checked ? 'admin' : 'staff')}
                          className="rounded"
                        />
                        <span className="font-medium">Admin Mode {userRole === 'admin' ? '✓' : '(Staff View)'}</span>
                      </label>
                      <p className="text-xs text-gray-600 mt-1">Staff can only see Selling Price, Admin sees Cost Price too</p>
                    </div>

                    {/* Product List */}
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {filteredProducts.map((product, index) => (
                        <div key={product.code} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-mono text-sm font-semibold bg-black text-white px-2 py-0.5 rounded">
                                  {product.code}
                                </span>
                                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                                  {product.productType}
                                </span>
                              </div>
                              <h4 className="font-semibold text-gray-900">{product.name}</h4>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setEditingProduct(product);
                                  setIsAddingProduct(false);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteProduct(product.code)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            {userRole === 'admin' && (
                              <div>
                                <span className="font-medium">Cost Price:</span> {formatCurrency(product.costPrice)}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Selling Price:</span> {formatCurrency(product.sellingPrice)}
                            </div>
                            {product.finish && (
                              <div>
                                <span className="font-medium">Finish:</span> {product.finish}
                              </div>
                            )}
                            {product.width && (
                              <div>
                                <span className="font-medium">Width:</span> {product.width}mm
                              </div>
                            )}
                            {product.height && (
                              <div>
                                <span className="font-medium">Height:</span> {product.height}mm
                              </div>
                            )}
                            {product.thickness && (
                              <div>
                                <span className="font-medium">Thickness:</span> {product.thickness}mm
                              </div>
                            )}
                            {product.perMeterWeight && (
                              <div>
                                <span className="font-medium">Weight:</span> {product.perMeterWeight}kg/m
                              </div>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1">
                            {product.compatibleDoorTypes.map(type => (
                              <span key={type} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}

                      {filteredProducts.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No products found for this filter
                        </div>
                      )}
                    </div>

                    {/* Add/Edit Product Form */}
                    {(isAddingProduct || editingProduct) && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                          <h3 className="text-xl font-bold mb-4">
                            {isAddingProduct ? 'Add New Product' : `Edit Product: ${editingProduct?.code}`}
                          </h3>

                          <div className="space-y-4">
                            {/* Product Code */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Product Code *</label>
                              <input
                                type="text"
                                value={editingProduct?.code || ''}
                                onChange={e => setEditingProduct(prev => prev ? { ...prev, code: e.target.value } : null)}
                                disabled={!isAddingProduct}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                                placeholder="e.g., FP001, HP001"
                              />
                            </div>

                            {/* Product Name */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                              <input
                                type="text"
                                value={editingProduct?.name || ''}
                                onChange={e => setEditingProduct(prev => prev ? { ...prev, name: e.target.value } : null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                placeholder="e.g., Aluminum Frame 20x40"
                              />
                            </div>

                            {/* Product Type */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Product Type *</label>
                              <select
                                value={editingProduct?.productType || 'frame-profile'}
                                onChange={e => setEditingProduct(prev => prev ? { ...prev, productType: e.target.value as ProductType } : null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              >
                                <option value="frame-profile">Frame Profile</option>
                                <option value="handle-profile">Handle Profile</option>
                                <option value="divider-profile">Divider Profile</option>
                                <option value="divider-connector">Divider Connector</option>
                                <option value="gasket">Gasket</option>
                                <option value="lock">Lock</option>
                                <option value="hinge">Hinge</option>
                                <option value="sliding-system">Sliding System</option>
                                <option value="connector">Connector</option>
                              </select>
                            </div>

                            {/* Compatible Door Types */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Compatible Door Types *</label>
                              <select
                                multiple
                                size={4}
                                value={editingProduct?.compatibleDoorTypes || []}
                                onChange={e => {
                                  const selected = Array.from(e.target.selectedOptions, option => option.value as DoorTypeCompatibility);
                                  setEditingProduct(prev => prev ? { ...prev, compatibleDoorTypes: selected } : null);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              >
                                <option value="openable">Openable</option>
                                <option value="sliding">Sliding</option>
                                <option value="air-hinge">Air Hinge</option>
                                <option value="pin-hinge">Pin Hinge</option>
                              </select>
                              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                            </div>

                            {/* Pricing */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price * {userRole !== 'admin' && '(Admin Only)'}</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editingProduct?.costPrice || 0}
                                  onChange={e => setEditingProduct(prev => prev ? { ...prev, costPrice: parseFloat(e.target.value) || 0 } : null)}
                                  disabled={userRole !== 'admin'}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price *</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editingProduct?.sellingPrice || 0}
                                  onChange={e => setEditingProduct(prev => prev ? { ...prev, sellingPrice: parseFloat(e.target.value) || 0 } : null)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                            </div>

                            {/* Finish */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Finish</label>
                              <input
                                type="text"
                                value={editingProduct?.finish || ''}
                                onChange={e => setEditingProduct(prev => prev ? { ...prev, finish: e.target.value } : null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                placeholder="e.g., Anodized Silver, Brushed Nickel"
                              />
                            </div>

                            {/* Conditional Fields - Dimensions */}
                            {(editingProduct?.productType === 'frame-profile' || 
                              editingProduct?.productType === 'divider-profile') && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Width (mm)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={editingProduct?.width || ''}
                                    onChange={e => setEditingProduct(prev => prev ? { ...prev, width: parseFloat(e.target.value) || undefined } : null)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                {editingProduct?.productType === 'frame-profile' && (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (mm)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={editingProduct?.height || ''}
                                      onChange={e => setEditingProduct(prev => prev ? { ...prev, height: parseFloat(e.target.value) || undefined } : null)}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Thickness for Gaskets */}
                            {editingProduct?.productType === 'gasket' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Thickness (mm)</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editingProduct?.thickness || ''}
                                  onChange={e => setEditingProduct(prev => prev ? { ...prev, thickness: parseFloat(e.target.value) || undefined } : null)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                            )}

                            {/* Per Meter Weight */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Per Meter Weight (kg)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editingProduct?.perMeterWeight || ''}
                                onChange={e => setEditingProduct(prev => prev ? { ...prev, perMeterWeight: parseFloat(e.target.value) || undefined } : null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>

                            {/* Price Type Specific Fields */}
                            <div className="grid grid-cols-2 gap-4">
                              {(editingProduct?.productType === 'frame-profile' || 
                                editingProduct?.productType === 'handle-profile' ||
                                editingProduct?.productType === 'divider-profile' ||
                                editingProduct?.productType === 'gasket' ||
                                editingProduct?.productType === 'sliding-system') && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Meter</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editingProduct?.pricePerMeter || ''}
                                    onChange={e => setEditingProduct(prev => prev ? { ...prev, pricePerMeter: parseFloat(e.target.value) || undefined } : null)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              )}

                              {(editingProduct?.productType === 'lock' || 
                                editingProduct?.productType === 'hinge' ||
                                editingProduct?.productType === 'connector' ||
                                editingProduct?.productType === 'divider-connector') && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Unit</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editingProduct?.pricePerUnit || ''}
                                    onChange={e => setEditingProduct(prev => prev ? { ...prev, pricePerUnit: parseFloat(e.target.value) || undefined } : null)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              )}

                              {(editingProduct?.productType === 'connector' || 
                                editingProduct?.productType === 'divider-connector') && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Connector Price</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editingProduct?.connectorPrice || ''}
                                    onChange={e => setEditingProduct(prev => prev ? { ...prev, connectorPrice: parseFloat(e.target.value) || undefined } : null)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              )}

                              {editingProduct?.productType === 'handle-profile' && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Handle Price</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editingProduct?.handlePrice || ''}
                                    onChange={e => setEditingProduct(prev => prev ? { ...prev, handlePrice: parseFloat(e.target.value) || undefined } : null)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-3 pt-4">
                              <button
                                onClick={() => {
                                  if (editingProduct && editingProduct.code && editingProduct.name) {
                                    if (isAddingProduct) {
                                      addProduct(editingProduct);
                                    } else {
                                      updateProduct(editingProduct.code, editingProduct);
                                      setEditingProduct(null);
                                    }
                                  } else {
                                    alert('Please fill in all required fields (Code, Name, Product Type)');
                                  }
                                }}
                                className="flex-1 bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold"
                              >
                                {isAddingProduct ? 'Add Product' : 'Save Changes'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingProduct(null);
                                  setIsAddingProduct(false);
                                }}
                                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Defaults Tab */}
                {activeTab === 'defaults' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Default Settings</h3>
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Default GST %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={masterData.defaultGST}
                          onChange={e => setMasterData(prev => ({ ...prev, defaultGST: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Default Glass Wastage %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={masterData.defaultGlassWastage}
                          onChange={e => setMasterData(prev => ({ ...prev, defaultGlassWastage: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200 mt-6">
                        <h4 className="text-md font-semibold text-red-800 mb-2">⚠️ Danger Zone</h4>
                        <p className="text-sm text-gray-600 mb-3">Reset all settings and master data to factory defaults</p>
                        <button
                          onClick={resetToDefaults}
                          className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold"
                        >
                          Reset to Defaults
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <header className="bg-black border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img src="/logo_bg_black.jpeg" alt="QIRO" className="h-12 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-white">QIRO Glass Solutions</h1>
              <p className="text-xs text-gray-400">Quotation & Estimation System</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Quotation Setup Section */}
        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h2 className="text-lg font-bold text-black mb-6 flex items-center">
            <span className="bg-black text-white rounded w-7 h-7 flex items-center justify-center mr-3 text-xs font-bold">1</span>
            Customer Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Customer Name *
              </label>
              <input
                type="text"
                value={quotation.customerName}
                onChange={e => setQuotation(prev => ({ ...prev, customerName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Mobile Number *
              </label>
              <input
                type="tel"
                value={quotation.mobileNumber}
                onChange={e => setQuotation(prev => ({ ...prev, mobileNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                placeholder="+91-XXXXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Project Name *
              </label>
              <input
                type="text"
                value={quotation.projectName}
                onChange={e => setQuotation(prev => ({ ...prev, projectName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                placeholder="Enter project name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={quotation.date}
                onChange={e => setQuotation(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Address *
              </label>
              <textarea
                value={quotation.address}
                onChange={e => setQuotation(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                placeholder="Enter customer address"
              />
            </div>
          </div>
        </section>

        {/* Door Configuration Module */}
        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h2 className="text-lg font-bold text-black mb-6 flex items-center">
            <span className="bg-black text-white rounded w-7 h-7 flex items-center justify-center mr-3 text-xs font-bold">2</span>
            Add Door Configuration
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Door Input Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Door Name *
                  </label>
                  <input
                    type="text"
                    value={currentDoor.doorName}
                    onChange={e => setCurrentDoor(prev => ({ ...prev, doorName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="e.g., Main Door"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Door Type
                  </label>
                  <select
                    value={currentDoor.doorType}
                    onChange={e => setCurrentDoor(prev => ({ ...prev, doorType: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  >
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                    <option value="lift-up">Lift-up</option>
                    <option value="sliding">Sliding</option>
                    <option value="bi-fold">Bi-fold</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={currentDoor.width || ''}
                    onChange={e => setCurrentDoor(prev => ({ ...prev, width: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={currentDoor.height || ''}
                    onChange={e => setCurrentDoor(prev => ({ ...prev, height: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={currentDoor.measurementUnit}
                    onChange={e => setCurrentDoor(prev => ({ ...prev, measurementUnit: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  >
                    <option value="mm">mm</option>
                    <option value="inches">inches</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frame Profile *
                </label>
                <select
                  value={currentDoor.frameProfileCode}
                  onChange={e => {
                    const newFrameCode = e.target.value;
                    const newFrame = masterData.frameProfiles.find(fp => fp.code === newFrameCode);
                    
                    setCurrentDoor(prev => ({
                      ...prev,
                      frameProfileCode: newFrameCode,
                      // Reset to first suggested item or clear if not in suggestions
                      handleProfileCode: newFrame?.suggestedHandles?.length 
                        ? newFrame.suggestedHandles[0] 
                        : undefined,
                      glassTypeCode: newFrame?.suggestedGlassTypes?.length
                        ? newFrame.suggestedGlassTypes[0]
                        : masterData.glassTypes[0]?.code,
                      connectorCode: newFrame?.suggestedConnectors?.length
                        ? newFrame.suggestedConnectors[0]
                        : masterData.connectorTypes[0]?.code,
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                >
                  {masterData.frameProfiles.map(profile => (
                    <option key={profile.code} value={profile.code}>
                      {profile.name} - {formatCurrency(profile.pricePerMeter)}/m
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Glass Type * {filteredOptions.glassTypes.length < masterData.glassTypes.length && (
                    <span className="text-xs text-gray-500">(filtered by frame)</span>
                  )}
                </label>
                <select
                  value={currentDoor.glassTypeCode}
                  onChange={e => setCurrentDoor(prev => ({ ...prev, glassTypeCode: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                >
                  {filteredOptions.glassTypes.map(glass => (
                    <option key={glass.code} value={glass.code}>
                      {glass.name} - {formatCurrency(glass.pricePerSqFt)}/sqft
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Handle Profile (Optional) {filteredOptions.handles.length < masterData.handleProfiles.length && (
                    <span className="text-xs text-gray-500">(filtered by frame)</span>
                  )}
                </label>
                <select
                  value={currentDoor.handleProfileCode || ''}
                  onChange={e => setCurrentDoor(prev => ({ ...prev, handleProfileCode: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                >
                  <option value="">None</option>
                  {filteredOptions.handles.map(handle => (
                    <option key={handle.code} value={handle.code}>
                      {handle.name} - {formatCurrency(handle.pricePerMeter)}/m
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Handle Position
                  </label>
                  <select
                    value={currentDoor.handlePosition}
                    onChange={e => setCurrentDoor(prev => ({ ...prev, handlePosition: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  >
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="center">Center</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hinge Position
                  </label>
                  <select
                    value={currentDoor.hingePosition}
                    onChange={e => setCurrentDoor(prev => ({ ...prev, hingePosition: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  >
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={currentDoor.quantity}
                    onChange={e => setCurrentDoor(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hinges
                  </label>
                  <input
                    type="number"
                    min="2"
                    value={currentDoor.hingeQuantity}
                    onChange={e => setCurrentDoor(prev => ({ ...prev, hingeQuantity: parseInt(e.target.value) || 2 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Carcass (mm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentDoor.carcassThickness}
                    onChange={e => setCurrentDoor(prev => ({ ...prev, carcassThickness: parseInt(e.target.value) || 18 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  />
                </div>
              </div>

              {/* Door Image Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-black transition-colors">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Door Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setCurrentDoor(prev => ({ ...prev, referenceImage: reader.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800"
                />
                {currentDoor.referenceImage && (
                  <div className="mt-3 relative">
                    <img 
                      src={currentDoor.referenceImage} 
                      alt="Door preview" 
                      className="w-full h-32 object-cover rounded border border-gray-300"
                    />
                    <button
                      onClick={() => setCurrentDoor(prev => ({ ...prev, referenceImage: undefined }))}
                      className="absolute top-1 right-1 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-gray-800"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleAddDoor}
                className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded transition-colors"
              >
                + Add Door
              </button>

              {/* Calculated Preview Fields */}
              {currentDoor.width > 0 && currentDoor.height > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Frame Qty (m)
                    </label>
                    <input
                      type="text"
                      value={(calculateCuttingScheme(currentDoor).totalFrameLength / 1000).toFixed(2)}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Handle Qty (m)
                    </label>
                    <input
                      type="text"
                      value={(calculateCuttingScheme(currentDoor).totalHandleLength / 1000).toFixed(2)}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Glass (S.ft)
                    </label>
                    <input
                      type="text"
                      value={(() => {
                        const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                        return calc.glassAreaWithWastage.toFixed(2);
                      })()}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Glass Cost
                    </label>
                    <input
                      type="text"
                      value={formatCurrency(calculateDoorCosts(currentDoor, quotation.glassWastagePercentage).glassCost)}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Hardware Cost
                    </label>
                    <input
                      type="text"
                      value={formatCurrency(
                        calculateDoorCosts(currentDoor, quotation.glassWastagePercentage).frameCost +
                        calculateDoorCosts(currentDoor, quotation.glassWastagePercentage).handleCost +
                        calculateDoorCosts(currentDoor, quotation.glassWastagePercentage).connectorCost
                      )}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Final Cost
                    </label>
                    <input
                      type="text"
                      value={formatCurrency(calculateDoorCosts(currentDoor, quotation.glassWastagePercentage).totalCost * currentDoor.quantity)}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-700 font-semibold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Door Preview Diagram */}
            <div className="bg-gray-50 rounded-lg p-4 flex items-start justify-center">
              {currentDoor.width > 0 && currentDoor.height > 0 ? (
                <DoorDiagram door={currentDoor} width={350} height={500} />
              ) : (
                <div className="text-center text-gray-400">
                  <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>Enter door dimensions to see preview</p>
                </div>
              )}
            </div>
          </div>

          {/* Added Doors List */}
          {quotation.doors.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Added Doors ({quotation.doors.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quotation.doors.map((door, index) => {
                  const calc = doorCalculations[index];
                  return (
                    <div key={door.id} className="bg-white rounded-lg p-4 border border-gray-300 hover:border-black transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-black">{door.doorName}</h4>
                        <button
                          onClick={() => handleRemoveDoor(door.id)}
                          className="text-gray-400 hover:text-black font-semibold text-lg"
                        >
                          ✕
                        </button>
                      </div>
                      {door.referenceImage && (
                        <img 
                          src={door.referenceImage} 
                          alt={door.doorName}
                          className="w-full h-32 object-cover rounded border border-gray-200 mb-2"
                        />
                      )}
                      <p className="text-sm text-gray-600">
                        {door.doorType} | {door.width}×{door.height} {door.measurementUnit}
                      </p>
                      <p className="text-sm text-gray-600">Qty: {door.quantity}</p>
                      {calc && (
                        <p className="text-lg font-bold text-black mt-2">
                          {formatCurrency(calc.totalCost)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Connectors & Lift Configuration */}
        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h2 className="text-lg font-bold text-black mb-6 flex items-center">
            <span className="bg-black text-white rounded w-7 h-7 flex items-center justify-center mr-3 text-xs font-bold">3</span>
            Connectors & Lift Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Connectors * {filteredOptions.connectors.length < masterData.connectorTypes.length && (
                  <span className="text-xs text-gray-500">(filtered by frame)</span>
                )}
              </label>
              <select
                value={currentDoor.connectorCode || ''}
                onChange={e => setCurrentDoor(prev => ({ ...prev, connectorCode: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              >
                {filteredOptions.connectors.map(connector => (
                  <option key={connector.code} value={connector.code}>
                    {connector.name} - ₹{connector.pricePerUnit}/unit
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Connectors Qty (nos) *
              </label>
              <input
                type="number"
                min="0"
                value={currentDoor.connectorQuantity}
                onChange={e => setCurrentDoor(prev => ({ ...prev, connectorQuantity: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lift Available
              </label>
              <div className="flex items-center space-x-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={currentDoor.liftAvailable === true}
                    onChange={() => setCurrentDoor(prev => ({ ...prev, liftAvailable: true }))}
                    className="mr-2 w-4 h-4 text-black focus:ring-black"
                  />
                  <span className="text-sm">Yes</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={currentDoor.liftAvailable === false}
                    onChange={() => setCurrentDoor(prev => ({ ...prev, liftAvailable: false }))}
                    className="mr-2 w-4 h-4 text-black focus:ring-black"
                  />
                  <span className="text-sm">No</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Additional Components Section */}
        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h2 className="text-lg font-bold text-black mb-6 flex items-center">
            <span className="bg-black text-white rounded w-7 h-7 flex items-center justify-center mr-3 text-xs font-bold">4</span>
            Additional Components
          </h2>
          
          <div className="space-y-4">
            {quotation.additionalComponents.map((component, index) => (
              <div key={component.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={component.description}
                    onChange={e => {
                      const updated = [...quotation.additionalComponents];
                      updated[index].description = e.target.value;
                      setQuotation(prev => ({ ...prev, additionalComponents: updated }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="e.g., Transportation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={component.quantity}
                    onChange={e => {
                      const updated = [...quotation.additionalComponents];
                      updated[index].quantity = parseInt(e.target.value) || 1;
                      setQuotation(prev => ({ ...prev, additionalComponents: updated }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={component.price}
                    onChange={e => {
                      const updated = [...quotation.additionalComponents];
                      updated[index].price = parseFloat(e.target.value) || 0;
                      setQuotation(prev => ({ ...prev, additionalComponents: updated }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={component.discount}
                    onChange={e => {
                      const updated = [...quotation.additionalComponents];
                      updated[index].discount = parseFloat(e.target.value) || 0;
                      setQuotation(prev => ({ ...prev, additionalComponents: updated }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                    <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-semibold">
                      {formatCurrency(component.quantity * component.price * (1 - component.discount / 100))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const updated = quotation.additionalComponents.filter((_, i) => i !== index);
                      setQuotation(prev => ({ ...prev, additionalComponents: updated }));
                    }}
                    className="text-gray-400 hover:text-black font-semibold self-end pb-2 text-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            
            <button
              onClick={handleAddAdditionalComponent}
              className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded transition-colors flex items-center justify-center"
            >
              + Add Additional Component
            </button>
          </div>
        </section>

        {/* Optional Items Section */}
        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h2 className="text-lg font-bold text-black mb-6 flex items-center">
            <span className="bg-black text-white rounded w-7 h-7 flex items-center justify-center mr-3 text-xs font-bold">5</span>
            Optional Items
          </h2>
          
          <div className="space-y-4">
            {quotation.optionalItems.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => {
                      const updated = [...quotation.optionalItems];
                      updated[index].description = e.target.value;
                      setQuotation(prev => ({ ...prev, optionalItems: updated }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="e.g., Extra Profile"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => {
                      const updated = [...quotation.optionalItems];
                      updated[index].quantity = parseInt(e.target.value) || 1;
                      setQuotation(prev => ({ ...prev, optionalItems: updated }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MRP</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.mrp}
                    onChange={e => {
                      const updated = [...quotation.optionalItems];
                      updated[index].mrp = parseFloat(e.target.value) || 0;
                      setQuotation(prev => ({ ...prev, optionalItems: updated }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={item.discount}
                    onChange={e => {
                      const updated = [...quotation.optionalItems];
                      updated[index].discount = parseFloat(e.target.value) || 0;
                      setQuotation(prev => ({ ...prev, optionalItems: updated }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                    <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-semibold">
                      {formatCurrency(item.quantity * item.mrp * (1 - item.discount / 100))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const updated = quotation.optionalItems.filter((_, i) => i !== index);
                      setQuotation(prev => ({ ...prev, optionalItems: updated }));
                    }}
                    className="text-gray-400 hover:text-black font-semibold self-end pb-2 text-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            
            <button
              onClick={handleAddOptionalItem}
              className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded transition-colors flex items-center justify-center"
            >
              + Add Optional Item
            </button>
          </div>
        </section>

        {/* Configuration Settings */}
        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h2 className="text-lg font-bold text-black mb-6 flex items-center">
            <span className="bg-black text-white rounded w-7 h-7 flex items-center justify-center mr-3 text-xs font-bold">6</span>
            Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                GST %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={quotation.gstPercentage}
                onChange={e => setQuotation(prev => ({ ...prev, gstPercentage: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Glass Wastage %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={quotation.glassWastagePercentage}
                onChange={e => setQuotation(prev => ({ ...prev, glassWastagePercentage: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Global Discount %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={quotation.globalDiscount}
                onChange={e => setQuotation(prev => ({ ...prev, globalDiscount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              />
            </div>
          </div>
        </section>

        {/* Cutting Schemes Display */}
        {showReport && quotation.doors.length > 0 && (
          <section className="border border-gray-200 rounded-lg p-6 bg-white">
            <h2 className="text-lg font-bold text-black mb-6 flex items-center">
              <span className="bg-black text-white rounded w-7 h-7 flex items-center justify-center mr-3 text-xs font-bold">7</span>
              Cutting Schemes
            </h2>
            <div className="space-y-6">
              {quotation.doors.map((door, index) => {
                const calc = doorCalculations[index];
                if (!calc) return null;
                
                return (
                  <div key={door.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h3 className="font-semibold text-lg text-black mb-3">{door.doorName}</h3>
                    
                    {/* Frame Profile Info */}
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">
                        Frame Profile: {masterData.frameProfiles.find(f => f.code === door.frameProfileCode)?.name || 'N/A'}
                      </p>
                      <p className="text-sm font-semibold text-gray-800">Cutting Scheme Frame - {door.quantity}X</p>
                    </div>
                    
                    {/* Visual Cutting Scheme */}
                    <div className="mb-4">
                      <div className="flex items-center gap-1 mb-2">
                        {[...calc.cuttingScheme.frameVerticalPieces, ...calc.cuttingScheme.frameHorizontalPieces].map((length, idx) => {
                          const maxLength = Math.max(...calc.cuttingScheme.frameVerticalPieces, ...calc.cuttingScheme.frameHorizontalPieces);
                          const widthPercent = (length / maxLength) * 100;
                          
                          return (
                            <div
                              key={idx}
                              className="bg-gradient-to-r from-amber-700 to-amber-600 text-white text-center py-3 rounded flex items-center justify-center font-semibold text-sm border-2 border-amber-800"
                              style={{ width: `${Math.max(widthPercent, 15)}%` }}
                            >
                              {length}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500">Total Frame Length: {calc.cuttingScheme.totalFrameLength} mm</p>
                    </div>
                    
                    {/* Handle Profile Info */}
                    {door.handleProfileCode && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-1">
                          Handle Profile: {masterData.handleProfiles.find(h => h.code === door.handleProfileCode)?.name || 'N/A'}
                        </p>
                        <p className="text-sm font-semibold text-gray-800">Cutting Scheme Handle - {calc.cuttingScheme.handlePieces.length > 0 ? calc.cuttingScheme.totalHandleLength : 0}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Cost Summary */}
        {showReport && quotation.doors.length > 0 && (
          <section className="border border-gray-200 rounded-lg p-6 bg-white">
            <h2 className="text-lg font-bold text-black mb-6 flex items-center">
              <span className="bg-black text-white rounded w-7 h-7 flex items-center justify-center mr-3 text-xs font-bold">8</span>
              Cost Summary
            </h2>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-300">
              <div className="space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Hardware Cost:</span>
                  <span className="font-semibold">{formatCurrency(costSummary.totalHardwareCost)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Glass Cost:</span>
                  <span className="font-semibold">{formatCurrency(costSummary.totalGlassCost)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Additional Components:</span>
                  <span className="font-semibold">{formatCurrency(costSummary.totalAdditionalCost)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Optional Items:</span>
                  <span className="font-semibold">{formatCurrency(costSummary.totalOptionalCost)}</span>
                </div>
                <hr className="border-gray-300" />
                <div className="flex justify-between text-gray-800 font-semibold">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(costSummary.subtotal)}</span>
                </div>
                {costSummary.discount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Discount ({quotation.globalDiscount}%):</span>
                    <span>- {formatCurrency(costSummary.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-700">
                  <span>Taxable Amount:</span>
                  <span className="font-semibold">{formatCurrency(costSummary.taxableAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>GST ({quotation.gstPercentage}%):</span>
                  <span className="font-semibold">{formatCurrency(costSummary.gstAmount)}</span>
                </div>
                <hr className="border-gray-400" />
                <div className="flex justify-between text-xl font-bold text-black">
                  <span>FINAL AMOUNT:</span>
                  <span>{formatCurrency(costSummary.finalAmount)}</span>
                </div>
                {costSummary.totalSavings > 0 && (
                  <div className="text-center text-gray-700 font-semibold mt-2">
                    You save {formatCurrency(costSummary.totalSavings)}!
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Export Buttons */}
        {showReport && quotation.doors.length > 0 && (
          <section className="border border-gray-200 rounded-lg p-6 bg-white">
            <h2 className="text-lg font-bold text-black mb-6 flex items-center">
              <span className="bg-black text-white rounded w-7 h-7 flex items-center justify-center mr-3 text-xs font-bold">9</span>
              Export Options
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={handleExportPDF}
                className="bg-black hover:bg-gray-800 text-white font-semibold py-4 px-6 rounded transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={handleExportExcel}
                className="bg-white hover:bg-gray-50 text-black font-semibold py-4 px-6 rounded transition-colors border-2 border-black flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
              </button>
              <button
                onClick={handleExportText}
                className="bg-white hover:bg-gray-50 text-black font-semibold py-4 px-6 rounded transition-colors border-2 border-black flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Text
              </button>
            </div>
          </section>
        )}
        {/* Generate Report Button */}
        {quotation.doors.length > 0 && !showReport && (
          <section className="border border-gray-200 rounded-lg p-6 bg-white">
            <div className="flex flex-col items-center justify-center space-y-4">
              <h2 className="text-lg font-bold text-black">Ready to Generate Report?</h2>
              <p className="text-sm text-gray-600 text-center">Click the button below to generate cutting schemes, cost summary, and export options</p>
              <button
                onClick={() => setShowReport(true)}
                className="bg-black hover:bg-gray-800 text-white font-bold py-4 px-8 rounded-lg transition-colors flex items-center shadow-lg hover:shadow-xl"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate Report
              </button>
            </div>
          </section>
        )}

        {/* Regenerate Report Button - Shows when report is visible */}
        {showReport && quotation.doors.length > 0 && (
          <section className="border border-gray-200 rounded-lg p-6 bg-white">
            <div className="flex flex-col items-center justify-center space-y-4">
              <p className="text-sm text-gray-600 text-center">Made changes? Click below to hide and regenerate the report</p>
              <button
                onClick={() => setShowReport(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Hide Report
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-300">© 2025 QIRO Glass Solutions. All rights reserved.</p>
          <p className="text-gray-500 text-sm mt-2">Internal Business Use Only</p>
        </div>
      </footer>
    </div>
  );
}
