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
  Client,
  Job,
  SlidingBundle,
} from '../types';
import { masterData as defaultMasterData } from '../data/masterData';
import {
  calculateDoorCosts,
  calculateCostSummary,
  calculateCuttingScheme,
  formatCurrency,
  autoSelectSlidingBundle,
  calculateDividerPositions,
  formatDividerPositions,
  convertToMm,
} from '../utils/calculations';
import { DoorDiagram, generatePremiumElevationSVG } from '../utils/diagramGenerator';
import { generateQuotationPDF, generateCuttingSchemaPDF, generateQuotationId } from '../utils/pdfGenerator';
import { exportToExcel, exportToText, saveQuotationToLocalStorage } from '../utils/exportUtils';
import { saveMasterDataToFirestore, loadMasterDataFromFirestore, checkFirestoreConfigExists } from '../lib/firestore';
import { isConfigured as isFirebaseConfigured } from '../lib/firebase';
import type { MasterData, FrameProfile, HandleProfile, GlassType, ConnectorType, Product, ProductType, DoorTypeCompatibility, DividerMode, MakingChargeType, PricingSettings } from '../types';

// Helper function to calculate hinge positions
function calculateHingePositions(heightMm: number, hingeQuantity: number): number[] {
  if (!heightMm || !hingeQuantity || hingeQuantity < 2) return [];
  
  // For very small heights, use proportional positioning
  if (heightMm < 500) {
    const margin = heightMm * 0.15; // 15% margin from top and bottom
    if (hingeQuantity === 2) {
      return [margin, heightMm - margin];
    } else {
      const positions: number[] = [];
      const availableHeight = heightMm - (2 * margin);
      const spacing = availableHeight / (hingeQuantity - 1);
      for (let i = 0; i < hingeQuantity; i++) {
        positions.push(margin + (spacing * i));
      }
      return positions;
    }
  }
  
  // For normal heights, use fixed 200mm margins
  const topMargin = 200; // 200mm from top
  const bottomMargin = 200; // 200mm from bottom
  const availableHeight = heightMm - topMargin - bottomMargin;
  
  if (hingeQuantity === 2) {
    return [topMargin, heightMm - bottomMargin];
  } else {
    const positions: number[] = [];
    const spacing = availableHeight / (hingeQuantity - 1);
    for (let i = 0; i < hingeQuantity; i++) {
      positions.push(topMargin + (spacing * i));
    }
    return positions;
  }
}

export default function Home() {
  // Settings sidebar state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'frames' | 'handles' | 'glass' | 'connectors' | 'clients' | 'jobs' | 'sliding-bundles' | 'company-info' | 'defaults' | 'validation' | 'hinges'>('frames');
  const [showReport, setShowReport] = useState(false);
  
  // Password protection state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Dimension validation error states
  const [widthError, setWidthError] = useState('');
  const [heightError, setHeightError] = useState('');
  
  const SETTINGS_PASSWORD = 'admin123'; // Hardcoded password
  
  // Client and Job management state
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isAddingJob, setIsAddingJob] = useState(false);
  
  // Sliding bundle management state
  const [editingSlidingBundle, setEditingSlidingBundle] = useState<SlidingBundle | null>(null);
  const [isAddingSlidingBundle, setIsAddingSlidingBundle] = useState(false);
  
  // Firestore sync state
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Editable master data - initialize with defaults to avoid hydration mismatch
  const [masterData, setMasterData] = useState<MasterData>(defaultMasterData);

  // Password check function - opens settings on success
  const handlePasswordSubmit = () => {
    if (passwordInput === SETTINGS_PASSWORD) {
      setShowPasswordModal(false);
      setSettingsOpen(true);
      setPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setPasswordInput('');
    }
  };

  // Handle opening settings - always require password
  const handleOpenSettings = () => {
    setShowPasswordModal(true);
  };

  // Handle closing settings - reset authentication
  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  // Auto-load from Firestore on mount
  useEffect(() => {
    const autoLoadFromFirestore = async () => {
      if (!isFirebaseConfigured) {
        // Fallback to localStorage if Firebase not configured
        const saved = localStorage.getItem('qiro_master_data');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setMasterData(parsed);
          } catch (error) {
            console.error('Failed to parse localStorage data:', error);
          }
        }
        return;
      }

      try {
        setSyncStatus('syncing');
        const result = await loadMasterDataFromFirestore();
        
        if (result.success && result.data) {
          setMasterData(result.data);
          localStorage.setItem('qiro_master_data', JSON.stringify(result.data));
          setSyncStatus('synced');
          setLastSyncTime(new Date());
        } else {
          // If no cloud data, try localStorage
          const saved = localStorage.getItem('qiro_master_data');
          if (saved) {
            const parsed = JSON.parse(saved);
            setMasterData(parsed);
          }
          setSyncStatus('idle');
        }
      } catch (error) {
        console.error('Auto-load from Firestore failed:', error);
        setSyncStatus('error');
        // Fallback to localStorage
        const saved = localStorage.getItem('qiro_master_data');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setMasterData(parsed);
          } catch (e) {
            console.error('Failed to parse localStorage data:', e);
          }
        }
      }
    };

    autoLoadFromFirestore();
  }, []);

  // Load from localStorage after mount (client-side only) - LEGACY BACKUP
  useEffect(() => {
    const saved = localStorage.getItem('qiro_master_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure arrays exist for backward compatibility
        if (!parsed.products) {
          parsed.products = defaultMasterData.products || [];
        }
        if (!parsed.clients) {
          parsed.clients = [];
        }
        if (!parsed.jobs) {
          parsed.jobs = [];
        }
        if (!parsed.slidingBundles) {
          parsed.slidingBundles = defaultMasterData.slidingBundles || [];
        }
        if (!parsed.dividerSettings) {
          parsed.dividerSettings = defaultMasterData.dividerSettings;
        }
        if (!parsed.pricingSettings) {
          parsed.pricingSettings = defaultMasterData.pricingSettings;
        }
        setMasterData(parsed);
      } catch (e) {
        console.error('Failed to load master data from localStorage:', e);
      }
    }
  }, []);

  // Save master data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('qiro_master_data', JSON.stringify(masterData));
  }, [masterData]);

  const [quotation, setQuotation] = useState<QuotationData>({
    id: uuidv4(),
    // Legacy fields
    customerName: '',
    mobileNumber: '',
    address: '',
    projectName: '',
    date: new Date().toISOString().split('T')[0],
    // New client/job fields
    clientName: '',
    firmName: '',
    phone: '',
    city: '',
    salesperson: '',
    quoteDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    // Data
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
    
    // Door Type & Profile
    doorType: 'openable', // New: openable | sliding | air-hinge | pin-hinge
    profileCode: masterData.frameProfiles[0]?.code || '',
    
    // Dimensions
    measurementUnit: 'mm',
    width: 0,
    height: 0,
    thickness: undefined,
    quantity: 1,
    
    // Handle Configuration
    hasHandle: true,
    handleProfileCode: masterData.handleProfiles[0]?.code,
    handlePosition: 'right',
    handleOffset: 500,
    
    // Opening Direction
    openingDirection: 'right',
    
    // Divider Configuration
    hasDividers: false,
    dividerConfig: undefined,
    dividerProfileCode: undefined,
    dividerConnectorCode: undefined,
    
    // Hardware (auto-calculated)
    hingePosition: 'left',
    hingeCode: undefined,
    hingeQuantity: 2,
    hingePositionMm: undefined,
    
    // Connectors (auto-calculated)
    connectorCode: masterData.connectorTypes[0]?.code,
    connectorQuantity: undefined,
    
    // Additional Components
    gasketCode: undefined,
    lockCode: undefined,
    slidingSystemCode: undefined,
    glassTypeCode: masterData.glassTypes[0]?.code,
    
    // Legacy fields for backward compatibility
    frameProfileCode: masterData.frameProfiles[0]?.code || '',
    carcassThickness: 18,
    liftAvailable: true,
  });

  // Helper function to calculate hinge quantity based on height
  const calculateHingeQuantityByHeight = (heightMm: number): number => {
    const rules = masterData.hingeCalculationSettings?.rules || [];
    
    // Find the matching rule
    for (const rule of rules) {
      if (heightMm >= rule.minHeight && heightMm < rule.maxHeight) {
        return rule.hingeQuantity;
      }
    }
    
    // Default fallback
    return 2;
  };

  // Helper function to ensure door has hinge positions calculated
  const ensureHingePositions = (door: DoorConfiguration): DoorConfiguration => {
    // Always recalculate to ensure fresh positions
    const heightMm = convertToMm(door.height, door.measurementUnit);
    const hingeQty = door.hingeQuantity || 2;
    
    if (heightMm > 0 && hingeQty >= 2) {
      const positions = calculateHingePositions(heightMm, hingeQty);
      console.log('Calculated hinge positions:', positions, 'for height:', heightMm, 'qty:', hingeQty);
      return {
        ...door,
        hingePositionMm: positions
      };
    }
    
    console.log('No hinge positions calculated - heightMm:', heightMm, 'hingeQty:', hingeQty);
    return door;
  };

  // Calculate door costs
  const doorCalculations = useMemo<DoorCalculation[]>(() => {
    return quotation.doors.map(door =>
      calculateDoorCosts(door, quotation.glassWastagePercentage)
    );
  }, [quotation.doors, quotation.glassWastagePercentage]);

  // Calculate cost summary
  const costSummary = useMemo<CostSummary>(() => {
    return calculateCostSummary(quotation, doorCalculations, masterData.pricingSettings);
  }, [quotation, doorCalculations, masterData.pricingSettings]);

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

  // Auto-calculate hinge quantity and positions when height changes
  useEffect(() => {
    const heightMm = convertToMm(currentDoor.height, currentDoor.measurementUnit);
    // Auto-set hinge position based on handle position
    let autoHingePosition = currentDoor.hingePosition;
    if (currentDoor.handlePosition === 'left') autoHingePosition = 'right';
    else if (currentDoor.handlePosition === 'right') autoHingePosition = 'left';
    else if (currentDoor.handlePosition === 'bottom') autoHingePosition = 'top';

    if (heightMm > 0 && (currentDoor.doorType === 'openable' || currentDoor.doorType === 'pin-hinge')) {
      // Auto-calculate hinge quantity based on height
      const calculatedHingeQty = calculateHingeQuantityByHeight(heightMm);
      // Calculate positions
      const positions = calculateHingePositions(heightMm, calculatedHingeQty);
      if (
        currentDoor.hingeQuantity !== calculatedHingeQty ||
        JSON.stringify(positions) !== JSON.stringify(currentDoor.hingePositionMm) ||
        currentDoor.hingePosition !== autoHingePosition
      ) {
        setCurrentDoor(prev => ({
          ...prev,
          hingeQuantity: calculatedHingeQty,
          hingePositionMm: positions,
          hingePosition: autoHingePosition
        }));
      }
    }
  }, [currentDoor.height, currentDoor.measurementUnit, currentDoor.doorType, currentDoor.handlePosition, masterData.hingeCalculationSettings]);

  const handleAddDoor = () => {
    if (!currentDoor.doorName || !currentDoor.height || !currentDoor.width) {
      alert('Please fill in all required door fields');
      return;
    }

    // Validate dimensions against limits
    const minWidth = masterData.validationLimits?.minWidth || 100;
    const maxWidth = masterData.validationLimits?.maxWidth || 10000;
    const minHeight = masterData.validationLimits?.minHeight || 100;
    const maxHeight = masterData.validationLimits?.maxHeight || 10000;

    if (currentDoor.width < minWidth || currentDoor.width > maxWidth) {
      setWidthError(`Width must be between ${minWidth}mm and ${maxWidth}mm`);
      return;
    }

    if (currentDoor.height < minHeight || currentDoor.height > maxHeight) {
      setHeightError(`Height must be between ${minHeight}mm and ${maxHeight}mm`);
      return;
    }

    // Clear any errors
    setWidthError('');
    setHeightError('');

    setQuotation(prev => ({
      ...prev,
      doors: [...prev.doors, currentDoor],
    }));

    setCurrentDoor({
      id: uuidv4(),
      doorName: '',
      doorType: 'openable',
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
      profileCode: masterData.frameProfiles[0].code,
      hasHandle: true,
      openingDirection: 'right',
      hasDividers: false,
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

  const handleExportCuttingSchema = async () => {
    if (!quotation.customerName || quotation.doors.length === 0) {
      alert('Please add customer details and at least one door');
      return;
    }
    await generateCuttingSchemaPDF(quotation, doorCalculations, costSummary);
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
      pricePerMm: 0.10,
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
      pricePerMm: 0.08,
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
      pricePerSqFt: 5.0,
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

  // Client management functions
  const addClient = (client: Client) => {
    setMasterData(prev => ({
      ...prev,
      clients: [...(prev.clients || []), client]
    }));
    setIsAddingClient(false);
    setEditingClient(null);
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setMasterData(prev => ({
      ...prev,
      clients: (prev.clients || []).map(c => c.id === id ? { ...c, ...updates, lastUpdated: new Date().toISOString() } : c)
    }));
  };

  const deleteClient = (id: string) => {
    if (confirm('Delete this client? This will not delete associated jobs.')) {
      setMasterData(prev => ({
        ...prev,
        clients: (prev.clients || []).filter(c => c.id !== id)
      }));
    }
  };

  const selectClientForQuotation = (clientId: string) => {
    const client = masterData.clients?.find(c => c.id === clientId);
    if (client) {
      // Apply appropriate discount based on client role
      let discount = masterData.pricingSettings.defaultDiscount;
      if (client.role === 'architect') {
        discount = masterData.pricingSettings.architectDiscount;
      } else if (client.role === 'dealer') {
        discount = masterData.pricingSettings.dealerDiscount;
      }
      
      setQuotation(prev => ({
        ...prev,
        clientId: client.id,
        clientName: client.clientName,
        firmName: client.firmName || '',
        phone: client.phone,
        city: client.city || '',
        address: client.address || '',
        clientRole: client.role,
        globalDiscount: discount,
        // Update legacy fields
        customerName: client.clientName,
        mobileNumber: client.phone,
      }));
      setSelectedClientId(clientId);
    }
  };

  // Job management functions
  const addJob = (job: Job) => {
    setMasterData(prev => ({
      ...prev,
      jobs: [...(prev.jobs || []), job]
    }));
    setIsAddingJob(false);
    setEditingJob(null);
  };

  const updateJob = (id: string, updates: Partial<Job>) => {
    setMasterData(prev => ({
      ...prev,
      jobs: (prev.jobs || []).map(j => j.id === id ? { ...j, ...updates, lastUpdated: new Date().toISOString() } : j)
    }));
  };

  const deleteJob = (id: string) => {
    if (confirm('Delete this job?')) {
      setMasterData(prev => ({
        ...prev,
        jobs: (prev.jobs || []).filter(j => j.id !== id)
      }));
    }
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      setMasterData(defaultMasterData);
      localStorage.removeItem('qiro_master_data');
    }
  };

  // Save configuration to Firestore
  const handleSaveToFirestore = async () => {
    if (!isFirebaseConfigured) {
      alert('Firebase is not configured. Please set up your .env.local file.');
      return;
    }

    try {
      setSyncStatus('syncing');
      const result = await saveMasterDataToFirestore(masterData);
      
      if (result.success) {
        localStorage.setItem('qiro_master_data', JSON.stringify(masterData));
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      } else {
        setSyncStatus('error');
        alert(`Failed to save: ${result.error}`);
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Save failed:', error);
      setSyncStatus('error');
      alert('Failed to save configuration to cloud');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Settings Button - Fixed Position */}
      <button
        onClick={handleOpenSettings}
        className="fixed top-6 right-6 z-40 bg-black hover:bg-gray-800 text-white p-3 rounded-lg shadow-lg transition-all hover:shadow-xl"
        title="Settings"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-4">Enter Password</h3>
            <p className="text-gray-600 mb-4">Please enter the password to access Settings & Master Data</p>
            
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError('');
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handlePasswordSubmit();
                }
              }}
              placeholder="Enter password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-black"
              autoFocus
            />
            
            {passwordError && (
              <p className="text-red-600 text-sm mb-4">{passwordError}</p>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-semibold"
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                  setPasswordError('');
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Sidebar */}
      {settingsOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-40"
            onClick={handleCloseSettings}
          />
          
          {/* Sidebar Panel */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-5/6 md:w-3/4 lg:w-2/3 xl:w-1/2 bg-white border-l border-gray-200 z-50 overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Header with Save Button and Sync Status */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b-2 border-gray-200 gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-black">Settings & Master Data</h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage your system configuration</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  {/* Sync Status Indicator */}
                  <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs sm:text-sm">
                    {syncStatus === 'syncing' && (
                      <>
                        <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm text-gray-700">Syncing...</span>
                      </>
                    )}
                    {syncStatus === 'synced' && (
                      <>
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-700">
                          {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Synced'}
                        </span>
                      </>
                    )}
                    {syncStatus === 'error' && (
                      <>
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-red-600">Sync Error</span>
                      </>
                    )}
                    {syncStatus === 'idle' && (
                      <>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                        <span className="text-sm text-gray-500">Not synced</span>
                      </>
                    )}
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSaveToFirestore}
                    disabled={syncStatus === 'syncing' || !isFirebaseConfigured}
                    className="flex items-center gap-1 sm:gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-semibold transition-all shadow-md hover:shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    {syncStatus === 'syncing' ? 'Saving...' : 'Save Changes'}
                  </button>

                  {/* Close Button */}
                  <button
                    onClick={handleCloseSettings}
                    className="text-gray-400 hover:text-black text-2xl font-light w-8 h-8 flex items-center justify-center"
                  >×
                  </button>
                </div>
              </div>

              {/* Firebase Configuration Warning */}
              {!isFirebaseConfigured && (
                <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-yellow-800">Firebase Not Configured</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Cloud sync is disabled. Create a <code className="bg-yellow-100 px-1 rounded">.env.local</code> file with your Firebase credentials to enable auto-sync. See <code className="bg-yellow-100 px-1 rounded">SETUP_CHECKLIST.md</code> for details.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex space-x-1 mb-6 overflow-x-auto border-b border-gray-200 -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-thin scrollbar-thumb-gray-300">
                {(['frames', 'handles', 'glass', 'connectors', 'clients', 'jobs', 'sliding-bundles', 'company-info', 'defaults', 'validation', 'hinges'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'frames' && 'Frame Profiles'}
                    {tab === 'handles' && 'Handle Profiles'}
                    {tab === 'glass' && 'Glass Types'}
                    {tab === 'connectors' && 'Connectors'}
                    {tab === 'clients' && 'Clients'}
                    {tab === 'jobs' && 'Jobs'}
                    {tab === 'sliding-bundles' && 'Sliding Bundles'}
                    {tab === 'company-info' && 'Company Info'}
                    {tab === 'defaults' && 'Defaults'}
                    {tab === 'validation' && 'Validation'}
                    {tab === 'hinges' && 'Hinge Rules'}
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
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
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
                              <label className="block text-xs font-medium text-gray-700 mb-1">Price per mm (₹)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={profile.pricePerMm ?? ''}
                                onChange={e => updateFrameProfile(index, { ...profile, pricePerMm: parseFloat(e.target.value) || 0 })}
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
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
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
                              <label className="block text-xs font-medium text-gray-700 mb-1">Price per mm (₹)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={profile.pricePerMm ?? ''}
                                onChange={e => updateHandleProfile(index, { ...profile, pricePerMm: parseFloat(e.target.value) || 0 })}
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
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
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
                              <label className="block text-xs font-medium text-gray-700 mb-1">Price per Sq.ft (₹)</label>
                              <input
                                type="number"
                                step="0.000001"
                                value={glass.pricePerSqFt ?? ''}
                                onChange={e => updateGlassType(index, { ...glass, pricePerSqFt: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Thickness (mm)</label>
                              <input
                                type="number"
                                value={glass.thickness ?? ''}
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
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
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

                {/* Clients Tab */}
                {activeTab === 'clients' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Clients ({(masterData.clients || []).length})</h3>
                      <button
                        onClick={() => {
                          setIsAddingClient(true);
                          const now = new Date().toISOString();
                          setEditingClient({
                            id: uuidv4(),
                            clientName: '',
                            phone: '',
                            role: 'customer',
                            createdDate: now,
                            lastUpdated: now,
                          });
                        }}
                        className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                      >
                        + Add Client
                      </button>
                    </div>

                    {/* Clients List */}
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {(masterData.clients || []).map((client) => (
                        <div key={client.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900">{client.clientName}</h4>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  client.role === 'architect' ? 'bg-purple-100 text-purple-700' :
                                  client.role === 'dealer' ? 'bg-green-100 text-green-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {client.role === 'architect' ? 'Architect' : client.role === 'dealer' ? 'Dealer' : 'Customer'}
                                </span>
                              </div>
                              {client.firmName && (
                                <p className="text-sm text-gray-600">{client.firmName}</p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setEditingClient(client);
                                  setIsAddingClient(false);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteClient(client.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Phone:</span> {client.phone}
                            </div>
                            {client.city && (
                              <div>
                                <span className="font-medium">City:</span> {client.city}
                              </div>
                            )}
                            {client.email && (
                              <div className="col-span-2">
                                <span className="font-medium">Email:</span> {client.email}
                              </div>
                            )}
                            {client.address && (
                              <div className="col-span-2">
                                <span className="font-medium">Address:</span> {client.address}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {(masterData.clients || []).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No clients added yet
                        </div>
                      )}
                    </div>

                    {/* Add/Edit Client Form */}
                    {(isAddingClient || editingClient) && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                          <h3 className="text-xl font-bold mb-4">
                            {isAddingClient ? 'Add New Client' : `Edit Client: ${editingClient?.clientName}`}
                          </h3>

                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                                <input
                                  type="text"
                                  value={editingClient?.clientName || ''}
                                  onChange={e => setEditingClient(prev => prev ? { ...prev, clientName: e.target.value } : null)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  placeholder="Enter client name"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name</label>
                                <input
                                  type="text"
                                  value={editingClient?.firmName || ''}
                                  onChange={e => setEditingClient(prev => prev ? { ...prev, firmName: e.target.value } : null)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  placeholder="Company name"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                                <input
                                  type="tel"
                                  value={editingClient?.phone || ''}
                                  onChange={e => setEditingClient(prev => prev ? { ...prev, phone: e.target.value } : null)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  placeholder="+91-XXXXXXXXXX"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <input
                                  type="text"
                                  value={editingClient?.city || ''}
                                  onChange={e => setEditingClient(prev => prev ? { ...prev, city: e.target.value } : null)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  placeholder="Enter city"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Client Role *</label>
                              <select
                                value={editingClient?.role || 'customer'}
                                onChange={e => setEditingClient(prev => prev ? { ...prev, role: e.target.value as 'customer' | 'architect' | 'dealer' } : null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              >
                                <option value="customer">Customer (Default Discount)</option>
                                <option value="architect">Architect (Architect Discount)</option>
                                <option value="dealer">Dealer (Dealer Discount)</option>
                              </select>
                              <p className="text-xs text-gray-500 mt-1">
                                {editingClient?.role === 'architect' && `Architect discount: ${masterData.pricingSettings.architectDiscount}%`}
                                {editingClient?.role === 'dealer' && `Dealer discount: ${masterData.pricingSettings.dealerDiscount}%`}
                                {editingClient?.role === 'customer' && `Default discount: ${masterData.pricingSettings.defaultDiscount}%`}
                              </p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                              <input
                                type="email"
                                value={editingClient?.email || ''}
                                onChange={e => setEditingClient(prev => prev ? { ...prev, email: e.target.value } : null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                placeholder="email@example.com"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                              <textarea
                                value={editingClient?.address || ''}
                                onChange={e => setEditingClient(prev => prev ? { ...prev, address: e.target.value } : null)}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                placeholder="Full address"
                              />
                            </div>

                            <div className="flex space-x-3 pt-4">
                              <button
                                onClick={() => {
                                  if (editingClient && editingClient.clientName && editingClient.phone) {
                                    if (isAddingClient) {
                                      addClient(editingClient);
                                    } else {
                                      updateClient(editingClient.id, editingClient);
                                      setEditingClient(null);
                                    }
                                  } else {
                                    alert('Please fill in Client Name and Phone');
                                  }
                                }}
                                className="flex-1 bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold"
                              >
                                {isAddingClient ? 'Add Client' : 'Save Changes'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingClient(null);
                                  setIsAddingClient(false);
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

                {/* Jobs Tab */}
                {activeTab === 'jobs' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Jobs ({(masterData.jobs || []).length})</h3>
                      <button
                        onClick={() => {
                          setIsAddingJob(true);
                          const now = new Date().toISOString();
                          setEditingJob({
                            id: uuidv4(),
                            jobReferenceId: '',
                            clientId: '',
                            clientName: '',
                            quoteDate: new Date().toISOString().split('T')[0],
                            status: 'draft',
                            createdDate: now,
                            lastUpdated: now,
                          });
                        }}
                        className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                      >
                        + Add Job
                      </button>
                    </div>

                    {/* Jobs List */}
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {(masterData.jobs || []).map((job) => (
                        <div key={job.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-mono text-sm font-semibold bg-black text-white px-2 py-0.5 rounded">
                                  {job.jobReferenceId}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  job.status === 'in-production' ? 'bg-blue-100 text-blue-800' :
                                  job.status === 'approved' ? 'bg-purple-100 text-purple-800' :
                                  job.status === 'quoted' ? 'bg-yellow-100 text-yellow-800' :
                                  job.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {job.status}
                                </span>
                              </div>
                              <h4 className="font-semibold text-gray-900">{job.clientName}</h4>
                              {job.firmName && <p className="text-sm text-gray-600">{job.firmName}</p>}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setEditingJob(job);
                                  setIsAddingJob(false);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteJob(job.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Quote Date:</span> {job.quoteDate}
                            </div>
                            {job.deliveryDate && (
                              <div>
                                <span className="font-medium">Delivery:</span> {job.deliveryDate}
                              </div>
                            )}
                            {job.salesperson && (
                              <div>
                                <span className="font-medium">Salesperson:</span> {job.salesperson}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {(masterData.jobs || []).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No jobs created yet
                        </div>
                      )}
                    </div>

                    {/* Add/Edit Job Form */}
                    {(isAddingJob || editingJob) && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                          <h3 className="text-xl font-bold mb-4">
                            {isAddingJob ? 'Add New Job' : `Edit Job: ${editingJob?.jobReferenceId}`}
                          </h3>

                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Job Reference ID *</label>
                                <input
                                  type="text"
                                  value={editingJob?.jobReferenceId || ''}
                                  onChange={e => setEditingJob(prev => prev ? { ...prev, jobReferenceId: e.target.value } : null)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  placeholder="e.g., JOB-2025-001"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                                <select
                                  value={editingJob?.status || 'draft'}
                                  onChange={e => setEditingJob(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                >
                                  <option value="draft">Draft</option>
                                  <option value="quoted">Quoted</option>
                                  <option value="approved">Approved</option>
                                  <option value="in-production">In Production</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Select Client *</label>
                              <select
                                value={editingJob?.clientId || ''}
                                onChange={e => {
                                  const client = masterData.clients?.find(c => c.id === e.target.value);
                                  setEditingJob(prev => prev ? { 
                                    ...prev, 
                                    clientId: e.target.value,
                                    clientName: client?.clientName || '',
                                    firmName: client?.firmName
                                  } : null);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              >
                                <option value="">-- Select Client --</option>
                                {(masterData.clients || []).map(client => (
                                  <option key={client.id} value={client.id}>
                                    {client.clientName} {client.firmName ? `(${client.firmName})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Salesperson</label>
                              <input
                                type="text"
                                value={editingJob?.salesperson || ''}
                                onChange={e => setEditingJob(prev => prev ? { ...prev, salesperson: e.target.value } : null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                placeholder="Sales rep name"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quote Date *</label>
                                <input
                                  type="date"
                                  value={editingJob?.quoteDate || ''}
                                  onChange={e => setEditingJob(prev => prev ? { ...prev, quoteDate: e.target.value } : null)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
                                <input
                                  type="date"
                                  value={editingJob?.deliveryDate || ''}
                                  onChange={e => setEditingJob(prev => prev ? { ...prev, deliveryDate: e.target.value } : null)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                            </div>

                            <div className="flex space-x-3 pt-4">
                              <button
                                onClick={() => {
                                  if (editingJob && editingJob.jobReferenceId && editingJob.clientId) {
                                    if (isAddingJob) {
                                      addJob(editingJob);
                                    } else {
                                      updateJob(editingJob.id, editingJob);
                                      setEditingJob(null);
                                    }
                                  } else {
                                    alert('Please fill in Job Reference ID and select a Client');
                                  }
                                }}
                                className="flex-1 bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold"
                              >
                                {isAddingJob ? 'Add Job' : 'Save Changes'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingJob(null);
                                  setIsAddingJob(false);
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

                {/* Sliding Bundles Tab */}
                {activeTab === 'sliding-bundles' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Sliding System Bundles ({masterData.slidingBundles?.length || 0})</h3>
                      <button
                        onClick={() => {
                          const newBundle: SlidingBundle = {
                            code: `SL-${Date.now().toString().slice(-4)}`,
                            name: 'New Sliding Bundle',
                            maxDoorWeight: 50,
                            mountingType: 'top-hung',
                            hasSoftClose: false,
                            components: [
                              { name: 'Track', description: 'Sliding track', quantity: 1 },
                              { name: 'Rollers', description: 'Roller wheels', quantity: 2 },
                            ],
                            costPrice: 1000,
                            sellingPrice: 1500,
                            pricePerMm: 0.75,
                            pricePerUnit: 1500,
                            createdDate: new Date().toISOString(),
                            lastUpdated: new Date().toISOString(),
                          };
                          setMasterData(prev => ({
                            ...prev,
                            slidingBundles: [...(prev.slidingBundles || []), newBundle]
                          }));
                        }}
                        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
                      >
                        + Add Bundle
                      </button>
                    </div>
                    
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {(masterData.slidingBundles || []).map((bundle, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Bundle Code</label>
                              <input
                                type="text"
                                value={bundle.code}
                                onChange={e => {
                                  const updated = [...(masterData.slidingBundles || [])];
                                  updated[index] = { ...updated[index], code: e.target.value, lastUpdated: new Date().toISOString() };
                                  setMasterData(prev => ({ ...prev, slidingBundles: updated }));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Bundle Name</label>
                              <input
                                type="text"
                                value={bundle.name}
                                onChange={e => {
                                  const updated = [...(masterData.slidingBundles || [])];
                                  updated[index] = { ...updated[index], name: e.target.value, lastUpdated: new Date().toISOString() };
                                  setMasterData(prev => ({ ...prev, slidingBundles: updated }));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Max Door Weight (kg)</label>
                              <input
                                type="number"
                                min="0"
                                value={bundle.maxDoorWeight}
                                onChange={e => {
                                  const updated = [...(masterData.slidingBundles || [])];
                                  updated[index] = { ...updated[index], maxDoorWeight: parseFloat(e.target.value) || 0, lastUpdated: new Date().toISOString() };
                                  setMasterData(prev => ({ ...prev, slidingBundles: updated }));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Mounting Type</label>
                              <select
                                value={bundle.mountingType}
                                onChange={e => {
                                  const updated = [...(masterData.slidingBundles || [])];
                                  updated[index] = { ...updated[index], mountingType: e.target.value as any, lastUpdated: new Date().toISOString() };
                                  setMasterData(prev => ({ ...prev, slidingBundles: updated }));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              >
                                <option value="top-hung">Top Hung</option>
                                <option value="bottom-rolling">Bottom Rolling</option>
                                <option value="side-hung">Side Hung</option>
                              </select>
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={bundle.hasSoftClose}
                                onChange={e => {
                                  const updated = [...(masterData.slidingBundles || [])];
                                  updated[index] = { ...updated[index], hasSoftClose: e.target.checked, lastUpdated: new Date().toISOString() };
                                  setMasterData(prev => ({ ...prev, slidingBundles: updated }));
                                }}
                                className="mr-2"
                              />
                              <label className="text-xs font-medium text-gray-700">Has Soft Close</label>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Cost Price
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={bundle.costPrice}
                                onChange={e => {
                                  const updated = [...(masterData.slidingBundles || [])];
                                  updated[index] = { ...updated[index], costPrice: parseFloat(e.target.value) || 0, lastUpdated: new Date().toISOString() };
                                  setMasterData(prev => ({ ...prev, slidingBundles: updated }));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Selling Price (per door)</label>
                              <input
                                type="number"
                                min="0"
                                value={bundle.sellingPrice}
                                onChange={e => {
                                  const updated = [...(masterData.slidingBundles || [])];
                                  updated[index] = { ...updated[index], sellingPrice: parseFloat(e.target.value) || 0, lastUpdated: new Date().toISOString() };
                                  setMasterData(prev => ({ ...prev, slidingBundles: updated }));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Price Per mm (track)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={bundle.pricePerMm ?? ''}
                                onChange={e => {
                                  const updated = [...(masterData.slidingBundles || [])];
                                  updated[index] = { ...updated[index], pricePerMm: parseFloat(e.target.value) || undefined, lastUpdated: new Date().toISOString() };
                                  setMasterData(prev => ({ ...prev, slidingBundles: updated }));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                placeholder="Optional"
                              />
                            </div>
                          </div>
                          
                          <div className="mt-3 bg-white p-3 rounded border border-gray-300">
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-xs font-semibold text-gray-700">Components Included:</label>
                              <button
                                onClick={() => {
                                  const updated = [...(masterData.slidingBundles || [])];
                                  updated[index] = {
                                    ...updated[index],
                                    components: [
                                      ...updated[index].components,
                                      { name: 'New Component', description: '', quantity: 1 }
                                    ],
                                    lastUpdated: new Date().toISOString()
                                  };
                                  setMasterData(prev => ({ ...prev, slidingBundles: updated }));
                                }}
                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                              >
                                + Component
                              </button>
                            </div>
                            <div className="space-y-2">
                              {bundle.components.map((component, compIndex) => (
                                <div key={compIndex} className="grid grid-cols-12 gap-2 text-xs">
                                  <input
                                    type="text"
                                    value={component.name}
                                    onChange={e => {
                                      const updated = [...(masterData.slidingBundles || [])];
                                      const newComponents = [...updated[index].components];
                                      newComponents[compIndex] = { ...newComponents[compIndex], name: e.target.value };
                                      updated[index] = { ...updated[index], components: newComponents, lastUpdated: new Date().toISOString() };
                                      setMasterData(prev => ({ ...prev, slidingBundles: updated }));
                                    }}
                                    className="col-span-4 px-2 py-1 border border-gray-300 rounded"
                                    placeholder="Component name"
                                  />
                                  <input
                                    type="text"
                                    value={component.description}
                                    onChange={e => {
                                      const updated = [...(masterData.slidingBundles || [])];
                                      const newComponents = [...updated[index].components];
                                      newComponents[compIndex] = { ...newComponents[compIndex], description: e.target.value };
                                      updated[index] = { ...updated[index], components: newComponents, lastUpdated: new Date().toISOString() };
                                      setMasterData(prev => ({ ...prev, slidingBundles: updated }));
                                    }}
                                    className="col-span-5 px-2 py-1 border border-gray-300 rounded"
                                    placeholder="Description"
                                  />
                                  <input
                                    type="number"
                                    min="1"
                                    value={component.quantity}
                                    onChange={e => {
                                      const updated = [...(masterData.slidingBundles || [])];
                                      const newComponents = [...updated[index].components];
                                      newComponents[compIndex] = { ...newComponents[compIndex], quantity: parseInt(e.target.value) || 1 };
                                      updated[index] = { ...updated[index], components: newComponents, lastUpdated: new Date().toISOString() };
                                      setMasterData(prev => ({ ...prev, slidingBundles: updated }));
                                    }}
                                    className="col-span-2 px-2 py-1 border border-gray-300 rounded"
                                  />
                                  <button
                                    onClick={() => {
                                      const updated = [...(masterData.slidingBundles || [])];
                                      updated[index] = {
                                        ...updated[index],
                                        components: updated[index].components.filter((_, i) => i !== compIndex),
                                        lastUpdated: new Date().toISOString()
                                      };
                                      setMasterData(prev => ({ ...prev, slidingBundles: updated }));
                                    }}
                                    className="col-span-1 text-red-600 hover:text-red-800"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              if (confirm(`Delete bundle ${bundle.code}?`)) {
                                setMasterData(prev => ({
                                  ...prev,
                                  slidingBundles: (prev.slidingBundles || []).filter((_, i) => i !== index)
                                }));
                              }
                            }}
                            className="mt-3 text-red-600 text-xs hover:text-red-800"
                          >
                            Delete Bundle
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Auto-Selection Logic</h4>
                      <p className="text-xs text-gray-700">
                        When a sliding door is configured, the system automatically calculates the door weight based on dimensions and glass thickness, 
                        then selects the most appropriate bundle from this list. The system chooses the smallest bundle that can handle the calculated weight.
                        For heavier doors (&gt;60kg), soft-close bundles are preferred if available.
                      </p>
                    </div>
                  </div>
                )}

                {/* Company Info Tab */}
                {activeTab === 'company-info' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Company Information</h3>
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-700 mb-3">Basic Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                            <input
                              type="text"
                              value={masterData.companyInfo?.companyName || ''}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                companyInfo: { ...prev.companyInfo!, companyName: e.target.value }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                            <input
                              type="text"
                              value={masterData.companyInfo?.phone || ''}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                companyInfo: { ...prev.companyInfo!, phone: e.target.value }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                              type="email"
                              value={masterData.companyInfo?.email || ''}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                companyInfo: { ...prev.companyInfo!, email: e.target.value }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                            <input
                              type="text"
                              value={masterData.companyInfo?.website || ''}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                companyInfo: { ...prev.companyInfo!, website: e.target.value }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                            <textarea
                              value={masterData.companyInfo?.address || ''}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                companyInfo: { ...prev.companyInfo!, address: e.target.value }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-3">Tax Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                            <input
                              type="text"
                              value={masterData.companyInfo?.gstNumber || ''}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                companyInfo: { ...prev.companyInfo!, gstNumber: e.target.value }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              placeholder="e.g., 29ABCDE1234F1Z5"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number</label>
                            <input
                              type="text"
                              value={masterData.companyInfo?.panNumber || ''}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                companyInfo: { ...prev.companyInfo!, panNumber: e.target.value }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              placeholder="e.g., ABCDE1234F"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-800 mb-3">Banking Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                            <input
                              type="text"
                              value={masterData.companyInfo?.bankDetails?.bankName || ''}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                companyInfo: {
                                  ...prev.companyInfo!,
                                  bankDetails: { ...prev.companyInfo!.bankDetails!, bankName: e.target.value }
                                }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                            <input
                              type="text"
                              value={masterData.companyInfo?.bankDetails?.accountName || ''}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                companyInfo: {
                                  ...prev.companyInfo!,
                                  bankDetails: { ...prev.companyInfo!.bankDetails!, accountName: e.target.value }
                                }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                            <input
                              type="text"
                              value={masterData.companyInfo?.bankDetails?.accountNumber || ''}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                companyInfo: {
                                  ...prev.companyInfo!,
                                  bankDetails: { ...prev.companyInfo!.bankDetails!, accountNumber: e.target.value }
                                }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                            <input
                              type="text"
                              value={masterData.companyInfo?.bankDetails?.ifscCode || ''}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                companyInfo: {
                                  ...prev.companyInfo!,
                                  bankDetails: { ...prev.companyInfo!.bankDetails!, ifscCode: e.target.value }
                                }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name</label>
                            <input
                              type="text"
                              value={masterData.companyInfo?.bankDetails?.branchName || ''}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                companyInfo: {
                                  ...prev.companyInfo!,
                                  bankDetails: { ...prev.companyInfo!.bankDetails!, branchName: e.target.value }
                                }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">UPI ID</label>
                            <input
                              type="text"
                              value={masterData.companyInfo?.bankDetails?.upiId || ''}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                companyInfo: {
                                  ...prev.companyInfo!,
                                  bankDetails: { ...prev.companyInfo!.bankDetails!, upiId: e.target.value }
                                }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              placeholder="e.g., company@upi"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
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
                      
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mt-6">
                        <h4 className="text-md font-semibold text-purple-800 mb-3">📐 Divider Settings</h4>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Default Divider Mode</label>
                            <select
                              value={masterData.dividerSettings.defaultMode}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                dividerSettings: {
                                  ...prev.dividerSettings,
                                  defaultMode: e.target.value as DividerMode
                                }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            >
                              <option value="fixed-offset">Fixed Offset Mode</option>
                              <option value="equal-split">Equal Split Mode</option>
                              <option value="manual">Manual Input Mode</option>
                            </select>
                          </div>

                          {masterData.dividerSettings.defaultMode === 'fixed-offset' && (
                            <div className="bg-white p-3 rounded border border-gray-300 space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Horizontal Positions (mm from top, comma-separated)
                                </label>
                                <input
                                  type="text"
                                  value={masterData.dividerSettings.fixedOffsetHorizontal.join(', ')}
                                  onChange={e => {
                                    const positions = e.target.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                                    setMasterData(prev => ({
                                      ...prev,
                                      dividerSettings: {
                                        ...prev.dividerSettings,
                                        fixedOffsetHorizontal: positions
                                      }
                                    }));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded"
                                  placeholder="e.g., 900, 1800"
                                />
                                <p className="text-xs text-gray-500 mt-1">Example: 900, 1800 (creates dividers at 900mm and 1800mm from top)</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Vertical Positions (mm from left, comma-separated)
                                </label>
                                <input
                                  type="text"
                                  value={masterData.dividerSettings.fixedOffsetVertical.join(', ')}
                                  onChange={e => {
                                    const positions = e.target.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                                    setMasterData(prev => ({
                                      ...prev,
                                      dividerSettings: {
                                        ...prev.dividerSettings,
                                        fixedOffsetVertical: positions
                                      }
                                    }));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded"
                                  placeholder="e.g., 900"
                                />
                                <p className="text-xs text-gray-500 mt-1">Example: 900 (creates a divider at 900mm from left)</p>
                              </div>
                            </div>
                          )}

                          {masterData.dividerSettings.defaultMode === 'equal-split' && (
                            <div className="bg-white p-3 rounded border border-gray-300 space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Horizontal Sections (divides height)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={masterData.dividerSettings.equalSplitHorizontalCount}
                                  onChange={e => setMasterData(prev => ({
                                    ...prev,
                                    dividerSettings: {
                                      ...prev.dividerSettings,
                                      equalSplitHorizontalCount: parseInt(e.target.value) || 1
                                    }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Sections: {masterData.dividerSettings.equalSplitHorizontalCount}, 
                                  Dividers: {masterData.dividerSettings.equalSplitHorizontalCount - 1}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Vertical Sections (divides width)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={masterData.dividerSettings.equalSplitVerticalCount}
                                  onChange={e => setMasterData(prev => ({
                                    ...prev,
                                    dividerSettings: {
                                      ...prev.dividerSettings,
                                      equalSplitVerticalCount: parseInt(e.target.value) || 1
                                    }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Sections: {masterData.dividerSettings.equalSplitVerticalCount}, 
                                  Dividers: {masterData.dividerSettings.equalSplitVerticalCount - 1}
                                </p>
                              </div>
                            </div>
                          )}

                          {masterData.dividerSettings.defaultMode === 'manual' && (
                            <div className="bg-white p-3 rounded border border-gray-300">
                              <p className="text-sm text-gray-600">
                                In Manual Input Mode, users will be prompted to enter custom divider positions for each door individually.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-6">
                        <h4 className="text-md font-semibold text-blue-800 mb-3">💰 Pricing & Charges</h4>
                        
                        <div className="space-y-4">
                          <div className="bg-white p-3 rounded border border-gray-300">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Making Charge Type</label>
                            <select
                              value={masterData.pricingSettings.makingChargeType}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                pricingSettings: {
                                  ...prev.pricingSettings,
                                  makingChargeType: e.target.value as 'fixed' | 'percentage'
                                }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
                            >
                              <option value="fixed">Fixed Amount (₹)</option>
                              <option value="percentage">Percentage (%)</option>
                            </select>
                            
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {masterData.pricingSettings.makingChargeType === 'fixed' ? 'Making Charge Amount (₹)' : 'Making Charge Percentage (%)'}
                            </label>
                            <input
                              type="number"
                              min="0"
                              step={masterData.pricingSettings.makingChargeType === 'fixed' ? '1' : '0.1'}
                              value={masterData.pricingSettings.makingChargeValue}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                pricingSettings: {
                                  ...prev.pricingSettings,
                                  makingChargeValue: parseFloat(e.target.value) || 0
                                }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {masterData.pricingSettings.makingChargeType === 'fixed' 
                                ? 'Fixed amount added to final bill' 
                                : `${masterData.pricingSettings.makingChargeValue}% of material subtotal`}
                            </p>
                          </div>
                          
                          <div className="bg-white p-3 rounded border border-gray-300">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Default Discount (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={masterData.pricingSettings.defaultDiscount ?? ""}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                pricingSettings: {
                                  ...prev.pricingSettings,
                                  defaultDiscount: parseFloat(e.target.value) || 0
                                }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                            <p className="text-xs text-gray-500 mt-1">Default discount applied to new quotations</p>
                          </div>
                          
                          <div className="bg-white p-3 rounded border border-gray-300">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Architect Discount (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={masterData.pricingSettings.architectDiscount ?? ''}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                pricingSettings: {
                                  ...prev.pricingSettings,
                                  architectDiscount: parseFloat(e.target.value) || 0
                                }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                            <p className="text-xs text-gray-500 mt-1">Special discount percentage for architects</p>
                          </div>
                          
                          <div className="bg-white p-3 rounded border border-gray-300">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Dealer Discount (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={masterData.pricingSettings.dealerDiscount ?? ''}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                pricingSettings: {
                                  ...prev.pricingSettings,
                                  dealerDiscount: parseFloat(e.target.value) || 0
                                }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                            <p className="text-xs text-gray-500 mt-1">Special discount percentage for dealers</p>
                          </div>
                          
                          <div className="bg-white p-3 rounded border border-gray-300">
                            <label className="block text-sm font-medium text-gray-700 mb-2">GST Rate (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={masterData.pricingSettings.taxRates.gst}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                pricingSettings: {
                                  ...prev.pricingSettings,
                                  taxRates: {
                                    ...prev.pricingSettings.taxRates,
                                    gst: parseFloat(e.target.value) || 0
                                  }
                                }
                              }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
                            />
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">CGST (%) - Optional</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={masterData.pricingSettings.taxRates.cgst ?? ''}
                                  onChange={e => setMasterData(prev => ({
                                    ...prev,
                                    pricingSettings: {
                                      ...prev.pricingSettings,
                                      taxRates: {
                                        ...prev.pricingSettings.taxRates,
                                        cgst: parseFloat(e.target.value) || undefined
                                      }
                                    }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">SGST (%) - Optional</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={masterData.pricingSettings.taxRates.sgst ?? ''}
                                  onChange={e => setMasterData(prev => ({
                                    ...prev,
                                    pricingSettings: {
                                      ...prev.pricingSettings,
                                      taxRates: {
                                        ...prev.pricingSettings.taxRates,
                                        sgst: parseFloat(e.target.value) || undefined
                                      }
                                    }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded"
                                />
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Split GST into CGST and SGST for intra-state transactions</p>
                          </div>
                        </div>
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

                {/* Validation Tab */}
                {activeTab === 'validation' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Door Dimension Validation Limits</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Set minimum and maximum allowed dimensions for door width and height. These limits will be enforced when adding doors.
                    </p>
                    
                    <div className="space-y-6">
                      {/* Width Limits */}
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-700 mb-4">Width Limits (mm)</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Minimum Width (mm)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={masterData.validationLimits?.minWidth || 100}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                validationLimits: {
                                  ...prev.validationLimits,
                                  minWidth: parseInt(e.target.value) || 100,
                                  maxWidth: prev.validationLimits?.maxWidth || 10000,
                                  minHeight: prev.validationLimits?.minHeight || 100,
                                  maxHeight: prev.validationLimits?.maxHeight || 10000,
                                }
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Maximum Width (mm)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={masterData.validationLimits?.maxWidth || 10000}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                validationLimits: {
                                  ...prev.validationLimits,
                                  minWidth: prev.validationLimits?.minWidth || 100,
                                  maxWidth: parseInt(e.target.value) || 10000,
                                  minHeight: prev.validationLimits?.minHeight || 100,
                                  maxHeight: prev.validationLimits?.maxHeight || 10000,
                                }
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Height Limits */}
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-700 mb-4">Height Limits (mm)</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Minimum Height (mm)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={masterData.validationLimits?.minHeight || 100}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                validationLimits: {
                                  ...prev.validationLimits,
                                  minWidth: prev.validationLimits?.minWidth || 100,
                                  maxWidth: prev.validationLimits?.maxWidth || 10000,
                                  minHeight: parseInt(e.target.value) || 100,
                                  maxHeight: prev.validationLimits?.maxHeight || 10000,
                                }
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Maximum Height (mm)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={masterData.validationLimits?.maxHeight || 10000}
                              onChange={e => setMasterData(prev => ({
                                ...prev,
                                validationLimits: {
                                  ...prev.validationLimits,
                                  minWidth: prev.validationLimits?.minWidth || 100,
                                  maxWidth: prev.validationLimits?.maxWidth || 10000,
                                  minHeight: prev.validationLimits?.minHeight || 100,
                                  maxHeight: parseInt(e.target.value) || 10000,
                                }
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-gray-700 mb-2">Current Validation Rules</h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Width must be between {masterData.validationLimits?.minWidth || 100}mm and {masterData.validationLimits?.maxWidth || 10000}mm</li>
                          <li>• Height must be between {masterData.validationLimits?.minHeight || 100}mm and {masterData.validationLimits?.maxHeight || 10000}mm</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hinge Rules Tab */}
                {activeTab === 'hinges' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Automatic Hinge Quantity Calculator</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Define rules to automatically calculate hinge quantity based on door height. The system will automatically select the appropriate number of hinges when you enter the door height.
                    </p>
                    
                    <div className="space-y-4">
                      {(masterData.hingeCalculationSettings?.rules || []).map((rule, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-700">Rule {index + 1}</h4>
                            <button
                              onClick={() => {
                                if (confirm('Delete this rule?')) {
                                  setMasterData(prev => ({
                                    ...prev,
                                    hingeCalculationSettings: {
                                      ...prev.hingeCalculationSettings,
                                      rules: prev.hingeCalculationSettings?.rules.filter((_, i) => i !== index) || []
                                    }
                                  }));
                                }
                              }}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Min Height (mm)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={rule.minHeight}
                                onChange={e => {
                                  const newRules = [...(masterData.hingeCalculationSettings?.rules || [])];
                                  newRules[index] = { ...rule, minHeight: parseInt(e.target.value) || 0 };
                                  setMasterData(prev => ({
                                    ...prev,
                                    hingeCalculationSettings: { rules: newRules }
                                  }));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Height (mm)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={rule.maxHeight === Infinity ? '' : rule.maxHeight}
                                onChange={e => {
                                  const val = e.target.value;
                                  const newRules = [...(masterData.hingeCalculationSettings?.rules || [])];
                                  newRules[index] = { ...rule, maxHeight: val === '' ? Infinity : parseInt(val) || 0 };
                                  setMasterData(prev => ({
                                    ...prev,
                                    hingeCalculationSettings: { rules: newRules }
                                  }));
                                }}
                                placeholder="Unlimited"
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Hinge Quantity
                              </label>
                              <input
                                type="number"
                                min="2"
                                value={rule.hingeQuantity}
                                onChange={e => {
                                  const newRules = [...(masterData.hingeCalculationSettings?.rules || [])];
                                  newRules[index] = { ...rule, hingeQuantity: parseInt(e.target.value) || 2 };
                                  setMasterData(prev => ({
                                    ...prev,
                                    hingeCalculationSettings: { rules: newRules }
                                  }));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mt-2">
                            {rule.minHeight}mm - {rule.maxHeight === Infinity ? 'Unlimited' : `${rule.maxHeight}mm`} → {rule.hingeQuantity} hinges
                          </p>
                        </div>
                      ))}
                      
                      <button
                        onClick={() => {
                          const currentRules = masterData.hingeCalculationSettings?.rules || [];
                          const lastRule = currentRules[currentRules.length - 1];
                          const newMinHeight = lastRule ? (lastRule.maxHeight === Infinity ? 0 : lastRule.maxHeight) : 0;
                          
                          setMasterData(prev => ({
                            ...prev,
                            hingeCalculationSettings: {
                              rules: [
                                ...currentRules,
                                { minHeight: newMinHeight, maxHeight: newMinHeight + 1000, hingeQuantity: 2 }
                              ]
                            }
                          }));
                        }}
                        className="w-full bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold"
                      >
                        + Add New Rule
                      </button>

                      {/* Summary */}
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-gray-700 mb-2">Current Hinge Rules Summary</h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {(masterData.hingeCalculationSettings?.rules || []).map((rule, index) => (
                            <li key={index}>
                              • {rule.minHeight}mm - {rule.maxHeight === Infinity ? 'Unlimited' : `${rule.maxHeight}mm`}: <strong>{rule.hingeQuantity} hinges</strong>
                            </li>
                          ))}
                        </ul>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <img src="/logo_bg_black.jpeg" alt="QIRO" className="h-10 sm:h-12 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-white">QIRO Glass Solutions</h1>
              <p className="text-xs text-gray-400">Quotation & Estimation System</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        {/* Quotation Setup Section */}
        <section className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-white">
          <h2 className="text-lg font-bold text-black mb-6 flex items-center">
            <span className="bg-black text-white rounded w-7 h-7 flex items-center justify-center mr-3 text-xs font-bold">1</span>
            Client & Job Details
          </h2>

          {/* Client Selector */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Existing Client (Optional)
            </label>
            <div className="flex space-x-2">
              <select
                value={selectedClientId}
                onChange={e => selectClientForQuotation(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              >
                <option value="">-- New Client / Enter Manually --</option>
                {(masterData.clients || []).map(client => (
                  <option key={client.id} value={client.id}>
                    {client.clientName} {client.firmName ? `(${client.firmName})` : ''} - {client.phone}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setActiveTab('clients');
                  handleOpenSettings();
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium"
              >
                Manage Clients
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Client Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Client Name *
              </label>
              <input
                type="text"
                value={quotation.clientName}
                onChange={e => {
                  const newName = e.target.value;
                  const newId = newName ? generateQuotationId(newName, quotation.quoteDate) : uuidv4();
                  setQuotation(prev => ({ 
                    ...prev, 
                    clientName: newName,
                    customerName: newName, // Keep legacy field in sync
                    id: newId
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                placeholder="Enter client name"
              />
            </div>

            {/* Firm Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Firm Name
              </label>
              <input
                type="text"
                value={quotation.firmName || ''}
                onChange={e => setQuotation(prev => ({ ...prev, firmName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                placeholder="Company / Firm name"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Phone *
              </label>
              <input
                type="tel"
                value={quotation.phone}
                onChange={e => setQuotation(prev => ({ 
                  ...prev, 
                  phone: e.target.value,
                  mobileNumber: e.target.value // Keep legacy field in sync
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                placeholder="+91-XXXXXXXXXX"
              />
            </div>

            {/* Client Role */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Client Role *
              </label>
              <select
                value={quotation.clientRole || 'customer'}
                onChange={e => {
                  const newRole = e.target.value as 'customer' | 'architect' | 'dealer';
                  let discount = masterData.pricingSettings.defaultDiscount;
                  if (newRole === 'architect') {
                    discount = masterData.pricingSettings.architectDiscount;
                  } else if (newRole === 'dealer') {
                    discount = masterData.pricingSettings.dealerDiscount;
                  }
                  setQuotation(prev => ({ 
                    ...prev, 
                    clientRole: newRole,
                    globalDiscount: discount
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              >
                <option value="customer">Customer </option>
                <option value="architect">Architect </option>
                <option value="dealer">Dealer </option>
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                City
              </label>
              <input
                type="text"
                value={quotation.city || ''}
                onChange={e => setQuotation(prev => ({ ...prev, city: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                placeholder="Enter city"
              />
            </div>

            {/* Salesperson */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Salesperson
              </label>
              <input
                type="text"
                value={quotation.salesperson || ''}
                onChange={e => setQuotation(prev => ({ ...prev, salesperson: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                placeholder="Sales rep name"
              />
            </div>

            {/* Job Reference ID */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Job Reference ID
              </label>
              <input
                type="text"
                value={quotation.jobReferenceId || quotation.projectName}
                onChange={e => setQuotation(prev => ({ 
                  ...prev, 
                  jobReferenceId: e.target.value,
                  projectName: e.target.value // Keep legacy field in sync
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                placeholder="e.g., JOB-2025-001"
              />
            </div>

            {/* Quote Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Quote Date
              </label>
              <input
                type="date"
                value={quotation.quoteDate}
                onChange={e => {
                  const newDate = e.target.value;
                  const newId = quotation.clientName ? generateQuotationId(quotation.clientName, newDate) : uuidv4();
                  setQuotation(prev => ({ 
                    ...prev, 
                    quoteDate: newDate,
                    date: newDate, // Keep legacy field in sync
                    id: newId
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              />
            </div>

            {/* Delivery Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Delivery Date (Optional)
              </label>
              <input
                type="date"
                value={quotation.deliveryDate || ''}
                onChange={e => setQuotation(prev => ({ ...prev, deliveryDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              />
            </div>

            {/* Customer GST Number */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                GST Number (Optional)
              </label>
              <input
                type="text"
                value={quotation.customerGstNumber || ''}
                onChange={e => setQuotation(prev => ({ ...prev, customerGstNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                placeholder="e.g., 29ABCDE1234F1Z5"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Address *
              </label>
              <textarea
                value={quotation.address}
                onChange={e => setQuotation(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                placeholder="Enter client address"
              />
            </div>
          </div>
        </section>

        {/* Door Configuration Module */}
        <section className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-white">
          <h2 className="text-lg font-bold text-black mb-6 flex items-center">
            <span className="bg-black text-white rounded w-7 h-7 flex items-center justify-center mr-3 text-xs font-bold">2</span>
            Add Door/Shutter Configuration
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Add multiple doors/shutters to this job. Each shutter can have different specifications.
          </p>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                <span className="bg-gray-700 text-white rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs">1</span>
                Basic Information
              </h3>
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
                    Door Type *
                  </label>
                  <select
                    value={currentDoor.doorType}
                    onChange={e => setCurrentDoor(prev => ({ ...prev, doorType: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  >
                    <option value="openable">Openable</option>
                    <option value="sliding">Sliding</option>
                    <option value="air-hinge">Air Hinge</option>
                    <option value="pin-hinge">Pin Hinge</option>
                  </select>
                </div>
              </div>
              </div>
            </div>

            {/* Dimensions */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                <span className="bg-blue-700 text-white rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs">2</span>
                Dimensions
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width * (mm)
                  </label>
                  <input
                    type="number"
                    min={masterData.validationLimits?.minWidth || 100}
                    max={masterData.validationLimits?.maxWidth || 10000}
                    step="1"
                    value={currentDoor.width || ''}
                    onChange={e => {
                      const value = parseFloat(e.target.value) || 0;
                      const minWidth = masterData.validationLimits?.minWidth || 100;
                      const maxWidth = masterData.validationLimits?.maxWidth || 10000;
                      
                      setCurrentDoor(prev => ({ ...prev, width: value }));
                      
                      if (value > 0 && (value < minWidth || value > maxWidth)) {
                        setWidthError(`Width must be between ${minWidth}mm and ${maxWidth}mm`);
                      } else {
                        setWidthError('');
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 ${
                      widthError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black focus:border-black'
                    }`}
                    placeholder="400"
                  />
                  {widthError ? (
                    <p className="text-xs text-red-600 mt-1 font-medium">{widthError}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      {masterData.validationLimits?.minWidth || 100}mm - {masterData.validationLimits?.maxWidth || 10000}mm
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height * (mm)
                  </label>
                  <input
                    type="number"
                    min={masterData.validationLimits?.minHeight || 100}
                    max={masterData.validationLimits?.maxHeight || 10000}
                    step="1"
                    value={currentDoor.height || ''}
                    onChange={e => {
                      const value = parseFloat(e.target.value) || 0;
                      const minHeight = masterData.validationLimits?.minHeight || 100;
                      const maxHeight = masterData.validationLimits?.maxHeight || 10000;
                      
                      setCurrentDoor(prev => ({ ...prev, height: value }));
                      
                      if (value > 0 && (value < minHeight || value > maxHeight)) {
                        setHeightError(`Height must be between ${minHeight}mm and ${maxHeight}mm`);
                      } else {
                        setHeightError('');
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 ${
                      heightError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black focus:border-black'
                    }`}
                    placeholder="800"
                  />
                  {heightError ? (
                    <p className="text-xs text-red-600 mt-1 font-medium">{heightError}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      {masterData.validationLimits?.minHeight || 100}mm - {masterData.validationLimits?.maxHeight || 10000}mm
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={currentDoor.quantity}
                    onChange={e => setCurrentDoor(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  />
                </div>
              </div>
              {(currentDoor.doorType === 'openable' || currentDoor.doorType === 'air-hinge' || currentDoor.doorType === 'pin-hinge') && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opening Direction
                  </label>
                  <select
                    value={currentDoor.openingDirection}
                    onChange={e => setCurrentDoor(prev => ({ ...prev, openingDirection: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  >
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              )}
            </div>

            {/* Frame Profile & Materials */}
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                <span className="bg-amber-700 text-white rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs">3</span>
                Frame Profile & Materials
              </h3>
              <div className="space-y-4">
                <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profile Code *
                  </label>
                  <select
                    value={currentDoor.profileCode || currentDoor.frameProfileCode}
                    onChange={e => {
                      const newProfileCode = e.target.value;
                      const newProfile = masterData.frameProfiles.find(fp => fp.code === newProfileCode);
                      
                      setCurrentDoor(prev => ({
                        ...prev,
                        profileCode: newProfileCode,
                        frameProfileCode: newProfileCode,
                        handleProfileCode: newProfile?.suggestedHandles?.[0] || prev.handleProfileCode,
                        glassTypeCode: newProfile?.suggestedGlassTypes?.[0] || prev.glassTypeCode,
                        connectorCode: newProfile?.suggestedConnectors?.[0] || prev.connectorCode,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  >
                    {masterData.frameProfiles.map((profile, index) => (
                      <option key={index} value={profile.code}>
                        {profile.code} - {profile.name} ({profile.width}x{profile.height}mm) - ₹{profile.pricePerMm}/mm
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Glass Type {filteredOptions.glassTypes.length < masterData.glassTypes.length && (
                      <span className="text-xs text-gray-500">(filtered by frame)</span>
                    )}
                  </label>
                  <select
                    value={currentDoor.glassTypeCode || ''}
                    onChange={e => setCurrentDoor(prev => ({ ...prev, glassTypeCode: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  >
                    <option value="">None (No Glass)</option>
                    {filteredOptions.glassTypes.map(glass => (
                      <option key={glass.code} value={glass.code}>
                        {glass.name} - ₹{glass.pricePerSqFt}/sq.ft
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Handle Configuration */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                <span className="bg-yellow-700 text-white rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs">4</span>
                Handle Configuration
              </h3>
              <div className="space-y-4">
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
                        {handle.name} - ₹{handle.pricePerMm}/mm
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
                      <option value="bottom">Bottom</option>
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
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hinges
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={currentDoor.hingeQuantity || 2}
                      onChange={e => setCurrentDoor(prev => ({ ...prev, hingeQuantity: Math.max(2, parseInt(e.target.value) || 2) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                      placeholder="2"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Hardware */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                <span className="bg-purple-700 text-white rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs">5</span>
                Additional Hardware (Optional)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Gasket */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gasket</label>
                  <select
                    value={currentDoor.gasketCode || ''}
                    onChange={e => setCurrentDoor(prev => ({ ...prev, gasketCode: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-sm"
                  >
                    <option value="">-- None --</option>
                    {(masterData.products || []).filter(p => p.productType === 'gasket').map(product => (
                      <option key={product.code} value={product.code}>
                        {product.code} - {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lock */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lock</label>
                  <select
                    value={currentDoor.lockCode || ''}
                    onChange={e => setCurrentDoor(prev => ({ ...prev, lockCode: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-sm"
                  >
                    <option value="">-- None --</option>
                    {(masterData.products || []).filter(p => p.productType === 'lock').map(product => (
                      <option key={product.code} value={product.code}>
                        {product.code} - {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hinge - Only for openable/pin-hinge */}
                {(currentDoor.doorType === 'openable' || currentDoor.doorType === 'pin-hinge') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hinge Type</label>
                    <select
                      value={currentDoor.hingeCode || ''}
                      onChange={e => setCurrentDoor(prev => ({ ...prev, hingeCode: e.target.value || undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-sm"
                    >
                      <option value="">-- Select --</option>
                      {(masterData.products || []).filter(p => p.productType === 'hinge').map(product => (
                        <option key={product.code} value={product.code}>
                          {product.code} - {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sliding System - Only for sliding */}
                {currentDoor.doorType === 'sliding' && (
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Sliding System Bundle</label>
                      {currentDoor.width > 0 && currentDoor.height > 0 && (
                        <button
                          onClick={() => {
                            const glassType = masterData.glassTypes.find(g => g.code === currentDoor.glassTypeCode);
                            const glassThickness = glassType?.thickness || 5;
                            const recommended = autoSelectSlidingBundle(
                              currentDoor.width,
                              currentDoor.height,
                              glassThickness,
                              currentDoor.quantity
                            );
                            if (recommended) {
                              setCurrentDoor(prev => ({ ...prev, slidingSystemCode: recommended.code }));
                              alert(`Auto-selected: ${recommended.name}\nMax Weight: ${recommended.maxDoorWeight}kg\n${recommended.hasSoftClose ? 'With Soft Close' : 'Standard'}`);
                            } else {
                              alert('No suitable sliding bundle found for this door size. Please add a bundle with higher weight capacity in Settings.');
                            }
                          }}
                          className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                        >
                          🔄 Auto-Select
                        </button>
                      )}
                    </div>
                    <select
                      value={currentDoor.slidingSystemCode || ''}
                      onChange={e => setCurrentDoor(prev => ({ ...prev, slidingSystemCode: e.target.value || undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-sm"
                    >
                      <option value="">-- Select Bundle --</option>
                      {(masterData.slidingBundles || []).map(bundle => (
                        <option key={bundle.code} value={bundle.code}>
                          {bundle.code} - {bundle.name} (Max: {bundle.maxDoorWeight}kg) - {formatCurrency(bundle.sellingPrice)}
                        </option>
                      ))}
                    </select>
                    {currentDoor.slidingSystemCode && (() => {
                      const selectedBundle = (masterData.slidingBundles || []).find(b => b.code === currentDoor.slidingSystemCode);
                      return selectedBundle ? (
                        <div className="mt-2 text-xs bg-white p-3 rounded border border-gray-200">
                          <div className="font-semibold text-gray-700 mb-1">Bundle Includes:</div>
                          <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                            {selectedBundle.components.map((comp, idx) => (
                              <li key={idx}>{comp.name} ({comp.quantity}x) - {comp.description}</li>
                            ))}
                          </ul>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                              {selectedBundle.mountingType}
                            </span>
                            {selectedBundle.hasSoftClose && (
                              <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium">
                                Soft Close
                              </span>
                            )}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
            </div>

            {/* Divider Requirements */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="hasDividers"
                  checked={currentDoor.hasDividers}
                  onChange={e => setCurrentDoor(prev => ({ ...prev, hasDividers: e.target.checked }))}
                  className="mr-2 rounded"
                />
                <label htmlFor="hasDividers" className="text-sm font-semibold text-gray-700 flex items-center">
                  <span className="bg-green-700 text-white rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs">6</span>
                  Divider Requirements (if any)
                </label>
              </div>
              
              {currentDoor.hasDividers && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Divider Profile</label>
                      <select
                        value={currentDoor.dividerProfileCode || ''}
                        onChange={e => setCurrentDoor(prev => ({ ...prev, dividerProfileCode: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-sm"
                      >
                        <option value="">-- Select --</option>
                        {(masterData.products || []).filter(p => p.productType === 'divider-profile').map(product => (
                          <option key={product.code} value={product.code}>
                            {product.code} - {product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Divider Connector</label>
                      <select
                        value={currentDoor.dividerConnectorCode || ''}
                        onChange={e => setCurrentDoor(prev => ({ ...prev, dividerConnectorCode: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-sm"
                      >
                        <option value="">-- Select --</option>
                        {(masterData.products || []).filter(p => p.productType === 'divider-connector').map(product => (
                          <option key={product.code} value={product.code}>
                            {product.code} - {product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded border border-gray-300">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Divider Mode</label>
                      <button
                        onClick={() => {
                          const mode = currentDoor.dividerMode || masterData.dividerSettings.defaultMode;
                          const widthMm = convertToMm(currentDoor.width, currentDoor.measurementUnit);
                          const heightMm = convertToMm(currentDoor.height, currentDoor.measurementUnit);
                          const config = calculateDividerPositions(
                            widthMm,
                            heightMm,
                            mode,
                            masterData.dividerSettings,
                            mode === 'manual' ? currentDoor.dividerConfig : undefined
                          );
                          setCurrentDoor(prev => ({ ...prev, dividerConfig: config }));
                        }}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                      >
                        🔄 Apply Mode
                      </button>
                    </div>
                    <select
                      value={currentDoor.dividerMode || masterData.dividerSettings.defaultMode}
                      onChange={e => setCurrentDoor(prev => ({ ...prev, dividerMode: e.target.value as DividerMode }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-sm mb-3"
                    >
                      <option value="fixed-offset">Fixed Offset (Predefined Positions)</option>
                      <option value="equal-split">Equal Split (Divide into Sections)</option>
                      <option value="manual">Manual Input (Custom Positions)</option>
                    </select>
                    
                    {(currentDoor.dividerMode || masterData.dividerSettings.defaultMode) === 'manual' && (
                      <button
                        onClick={() => {
                          const horizontal = prompt('Enter horizontal divider positions (comma-separated mm from top):');
                          const vertical = prompt('Enter vertical divider positions (comma-separated mm from left):');
                          if (horizontal !== null || vertical !== null) {
                            setCurrentDoor(prev => ({
                              ...prev,
                              dividerConfig: {
                                horizontal: horizontal ? horizontal.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v)) : prev.dividerConfig?.horizontal || [],
                                vertical: vertical ? vertical.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v)) : prev.dividerConfig?.vertical || [],
                              }
                            }));
                          }
                        }}
                        className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 font-medium"
                      >
                        ✏️ Set Custom Positions
                      </button>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">📐 Calculated Divider Positions:</p>
                    <div className="font-mono text-xs bg-white p-3 rounded border border-blue-100">
                      {currentDoor.dividerConfig ? formatDividerPositions(currentDoor.dividerConfig) : 'Click "Apply Mode" to calculate positions'}
                    </div>
                    {currentDoor.dividerConfig && (
                      <div className="mt-2 text-xs text-gray-600">
                        <p>Door: {convertToMm(currentDoor.width, currentDoor.measurementUnit)}mm × {convertToMm(currentDoor.height, currentDoor.measurementUnit)}mm</p>
                        <p>Mode: {(currentDoor.dividerMode || masterData.dividerSettings.defaultMode).replace('-', ' ').toUpperCase()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Door Image Upload */}
            <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="bg-pink-700 text-white rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs">7</span>
                Door Image (Optional)
              </h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-pink-400 transition-colors bg-white">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-pink-400 transition-colors bg-white">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Door Image
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
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-pink-600 file:text-white hover:file:bg-pink-700"
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
                      className="absolute top-1 right-1 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-gray-800 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Add Door Button */}
            <button
              onClick={handleAddDoor}
              className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg transition-colors flex items-center justify-center text-base sm:text-lg shadow-lg"
            >
              <span className="mr-2 text-lg sm:text-xl">+</span> Add Door to Quotation
            </button>

              {/* Comprehensive Auto-Calculated Preview */}
              {currentDoor.width > 0 && currentDoor.height > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-5 rounded-lg border-2 border-green-300">
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                    <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">✓</span>
                    AUTO-CALCULATED VALUES
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {/* Profile Length */}
                    <div className="bg-white p-3 rounded shadow-sm">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Total Profile Length</label>
                      <div className="text-lg font-bold text-gray-900">
                        {(() => {
                          const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                          return calc.totalProfileLength.toFixed(2);
                        })()}m
                      </div>
                    </div>

                    {/* Connectors Required */}
                    <div className="bg-white p-3 rounded shadow-sm">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Connectors Required</label>
                      <div className="text-lg font-bold text-gray-900">
                        {(() => {
                          const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                          return calc.connectorsRequired;
                        })()} units
                      </div>
                    </div>

                    {/* Hinge Count - Only for openable/pin-hinge */}
                    {(currentDoor.doorType === 'openable' || currentDoor.doorType === 'pin-hinge') && (
                      <div className="bg-white p-3 rounded shadow-sm">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Hinge Count</label>
                        <div className="text-lg font-bold text-gray-900">
                          {(() => {
                            const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                            return calc.hingeCount || 0;
                          })()} units
                        </div>
                      </div>
                    )}

                    {/* Hinge Positions - Only for openable/pin-hinge */}
                    {(currentDoor.doorType === 'openable' || currentDoor.doorType === 'pin-hinge') && (
                      <div className="bg-white p-3 rounded shadow-sm col-span-3">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Hinge Positions (mm from top)</label>
                        <div className="text-sm font-bold text-gray-900">
                          {(() => {
                            const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                            return (calc.hingePositions || []).join('mm, ') + 'mm';
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Handle Length */}
                    {currentDoor.hasHandle && currentDoor.handleProfileCode && (
                      <div className="bg-white p-3 rounded shadow-sm">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Handle Length</label>
                        <div className="text-lg font-bold text-gray-900">
                          {(() => {
                            const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                            return (calc.totalHandleLength || 0).toFixed(2);
                          })()}m
                        </div>
                      </div>
                    )}

                    {/* Divider Length */}
                    {currentDoor.hasDividers && currentDoor.dividerConfig && (
                      <>
                        <div className="bg-white p-3 rounded shadow-sm">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Divider Length</label>
                          <div className="text-lg font-bold text-gray-900">
                            {(() => {
                              const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                              return (calc.dividerLength || 0).toFixed(2);
                            })()}m
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Divider Connectors</label>
                          <div className="text-lg font-bold text-gray-900">
                            {(() => {
                              const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                              return calc.dividerConnectorsRequired || 0;
                            })()} units
                          </div>
                        </div>
                      </>
                    )}

                    {/* Glass Area */}
                    <div className="bg-white p-3 rounded shadow-sm">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Glass Area (with wastage)</label>
                      <div className="text-lg font-bold text-gray-900">
                        {(() => {
                          const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                          return calc.glassAreaWithWastage.toFixed(2);
                        })()} sqft
                      </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="bg-blue-100 p-3 rounded shadow-sm col-span-3 border border-blue-300">
                      <label className="block text-xs font-semibold text-blue-800 mb-2">COST BREAKDOWN (Per Unit)</label>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">Frame:</span>
                          <span className="font-bold text-gray-900 ml-1">
                            {formatCurrency((() => {
                              const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                              return calc.frameCost / currentDoor.quantity;
                            })())}
                          </span>
                        </div>
                        {currentDoor.hasHandle && (
                          <div>
                            <span className="text-gray-600">Handle:</span>
                            <span className="font-bold text-gray-900 ml-1">
                              {formatCurrency((() => {
                                const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                                return calc.handleCost / currentDoor.quantity;
                              })())}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">Glass:</span>
                          <span className="font-bold text-gray-900 ml-1">
                            {formatCurrency((() => {
                              const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                              return calc.glassCost / currentDoor.quantity;
                            })())}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Connectors:</span>
                          <span className="font-bold text-gray-900 ml-1">
                            {formatCurrency((() => {
                              const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                              return calc.connectorCost / currentDoor.quantity;
                            })())}
                          </span>
                        </div>
                        {(currentDoor.doorType === 'openable' || currentDoor.doorType === 'pin-hinge') && currentDoor.hingeCode && (
                          <div>
                            <span className="text-gray-600">Hinges:</span>
                            <span className="font-bold text-gray-900 ml-1">
                              {formatCurrency((() => {
                                const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                                return calc.hingeCost / currentDoor.quantity;
                              })())}
                            </span>
                          </div>
                        )}
                        {currentDoor.hasDividers && (
                          <div>
                            <span className="text-gray-600">Dividers:</span>
                            <span className="font-bold text-gray-900 ml-1">
                              {formatCurrency((() => {
                                const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                                return calc.dividerCost / currentDoor.quantity;
                              })())}
                            </span>
                          </div>
                        )}
                        {currentDoor.gasketCode && (
                          <div>
                            <span className="text-gray-600">Gasket:</span>
                            <span className="font-bold text-gray-900 ml-1">
                              {formatCurrency((() => {
                                const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                                return calc.gasketCost / currentDoor.quantity;
                              })())}
                            </span>
                          </div>
                        )}
                        {currentDoor.lockCode && (
                          <div>
                            <span className="text-gray-600">Lock:</span>
                            <span className="font-bold text-gray-900 ml-1">
                              {formatCurrency((() => {
                                const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                                return calc.lockCost / currentDoor.quantity;
                              })())}
                            </span>
                          </div>
                        )}
                        {currentDoor.doorType === 'sliding' && currentDoor.slidingSystemCode && (
                          <div>
                            <span className="text-gray-600">Sliding System:</span>
                            <span className="font-bold text-gray-900 ml-1">
                              {formatCurrency((() => {
                                const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                                return calc.slidingSystemCost / currentDoor.quantity;
                              })())}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total Selling Price Per Unit */}
                    <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-4 rounded shadow-md col-span-2 border-2 border-amber-400">
                      <label className="block text-sm font-bold text-amber-900 mb-1">Total Selling Price (Per Unit)</label>
                      <div className="text-2xl font-black text-amber-900">
                        {formatCurrency((() => {
                          const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                          return calc.totalSellingPrice;
                        })())}
                      </div>
                    </div>

                    {/* Total Order Value */}
                    <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded shadow-md border-2 border-green-500">
                      <label className="block text-sm font-bold text-green-900 mb-1">Total Order Value (×{currentDoor.quantity})</label>
                      <div className="text-2xl font-black text-green-900">
                        {formatCurrency((() => {
                          const calc = calculateDoorCosts(currentDoor, quotation.glassWastagePercentage);
                          return calc.totalOrderValue;
                        })())}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Door Preview Diagrams */}
            <div className="bg-gray-50 rounded-lg p-4">
              {currentDoor.width > 0 && currentDoor.height > 0 ? (
                <div className="flex flex-col items-center">
                  {/* Premium Elevation Diagram - CAD Style */}
                  <div className="mb-2" dangerouslySetInnerHTML={{ __html: generatePremiumElevationSVG(ensureHingePositions(currentDoor)) }} />
                  <p className="text-sm font-medium text-gray-700">Technical Elevation View</p>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-12">
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
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">Added Doors ({quotation.doors.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
          </div>
        </section>

        {/* Connectors & Lift Configuration */}
        <section className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-white">
          <h2 className="text-lg font-bold text-black mb-6 flex items-center">
            <span className="bg-black text-white rounded w-7 h-7 flex items-center justify-center mr-3 text-xs font-bold">3</span>
            Connectors & Lift Configuration
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
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
                value={currentDoor.connectorQuantity || ''}
                onChange={e => setCurrentDoor(prev => ({ ...prev, connectorQuantity: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              />
            </div>
          </div>
        </section>

        {/* Additional Components Section */}
        <section className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-white">
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
        <section className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-white">
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
        <section className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-white">
          <h2 className="text-lg font-bold text-black mb-6 flex items-center">
            <span className="bg-black text-white rounded w-7 h-7 flex items-center justify-center mr-3 text-xs font-bold">6</span>
            Configuration
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                Discount %
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
          <section className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-white">
            <h2 className="text-lg font-bold text-black mb-6 flex items-center">
              <span className="bg-black text-white rounded w-7 h-7 flex items-center justify-center mr-3 text-xs font-bold">7</span>
              Cutting Schemes
            </h2>
            <div className="space-y-6">
              {(() => {
                // Group doors by frame profile code
                const frameProfileGroups = quotation.doors.reduce((groups, door, index) => {
                  const key = door.frameProfileCode;
                  if (key) {
                    if (!groups[key]) {
                      groups[key] = [];
                    }
                    groups[key].push({ door, index });
                  }
                  return groups;
                }, {} as Record<string, Array<{ door: DoorConfiguration; index: number }>>);

                // Group doors by handle profile code
                const handleProfileGroups = quotation.doors.reduce((groups, door, index) => {
                  if (door.handleProfileCode) {
                    const key = door.handleProfileCode;
                    if (!groups[key]) {
                      groups[key] = [];
                    }
                    groups[key].push({ door, index });
                  }
                  return groups;
                }, {} as Record<string, Array<{ door: DoorConfiguration; index: number }>>);

                return (
                  <>
                    {/* Frame Profile Cutting Schemes */}
                    {Object.entries(frameProfileGroups).map(([profileCode, doors]) => {
                      const firstDoor = doors[0];
                      const calc = doorCalculations[firstDoor.index];
                      if (!calc) return null;

                      const profile = masterData.frameProfiles.find(f => f.code === profileCode);
                      const totalQuantity = doors.reduce((sum, { door }) => sum + door.quantity, 0);
                      const doorNames = doors.map(({ door }) => door.doorName).join(', ');

                      return (
                        <div key={`frame-${profileCode}`} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <h3 className="font-semibold text-lg text-black mb-3">Frame Profile: {profile?.name || 'N/A'}</h3>
                          
                          {/* Doors using this profile */}
                          <div className="mb-3">
                            <p className="text-sm text-gray-600 mb-1">
                              Used in: {doorNames}
                            </p>
                            <p className="text-sm font-semibold text-gray-800">Cutting Scheme Frame - {totalQuantity}X (Total Quantity)</p>
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
                            <p className="text-xs text-gray-500">Total Frame Length per unit: {calc.cuttingScheme.totalFrameLength} mm</p>
                            <p className="text-xs text-gray-500 font-semibold">Total Frame Length for all units: {calc.cuttingScheme.totalFrameLength * totalQuantity} mm</p>
                          </div>
                        </div>
                      );
                    })}

                    {/* Handle Profile Cutting Schemes */}
                    {Object.entries(handleProfileGroups).map(([profileCode, doors]) => {
                      const firstDoor = doors[0];
                      const calc = doorCalculations[firstDoor.index];
                      if (!calc || calc.cuttingScheme.handlePieces.length === 0) return null;

                      const profile = masterData.handleProfiles.find(h => h.code === profileCode);
                      const totalQuantity = doors.reduce((sum, { door }) => sum + door.quantity, 0);
                      const doorNames = doors.map(({ door }) => door.doorName).join(', ');

                      return (
                        <div key={`handle-${profileCode}`} className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                          <h3 className="font-semibold text-lg text-black mb-3">Handle Profile: {profile?.name || 'N/A'}</h3>
                          
                          {/* Doors using this profile */}
                          <div className="mb-3">
                            <p className="text-sm text-gray-600 mb-1">
                              Used in: {doorNames}
                            </p>
                            <p className="text-sm font-semibold text-gray-800">Cutting Scheme Handle - {totalQuantity}X (Total Quantity)</p>
                          </div>
                          
                          {/* Visual Cutting Scheme */}
                          <div className="mb-4">
                            <div className="flex items-center gap-1 mb-2">
                              {calc.cuttingScheme.handlePieces.map((length, idx) => (
                                <div
                                  key={idx}
                                  className="bg-gradient-to-r from-blue-700 to-blue-600 text-white text-center py-3 rounded flex items-center justify-center font-semibold text-sm border-2 border-blue-800"
                                  style={{ width: '100%' }}
                                >
                                  {length}
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500">Total Handle Length per unit: {calc.cuttingScheme.totalHandleLength} mm</p>
                            <p className="text-xs text-gray-500 font-semibold">Total Handle Length for all units: {calc.cuttingScheme.totalHandleLength * totalQuantity} mm</p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </section>
        )}

        {/* Cost Summary */}
        {showReport && quotation.doors.length > 0 && (
          <section className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-white">
            <h2 className="text-lg font-bold text-black mb-6 flex items-center">
              <span className="bg-black text-white rounded w-7 h-7 flex items-center justify-center mr-3 text-xs font-bold">8</span>
              Cost Summary
            </h2>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-300">
              <div className="space-y-4">
                {/* Component-wise breakdown */}
                <div className="bg-white rounded p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm">Material Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    {costSummary.totalProfileCost > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Profile/Frame (per meter):</span>
                        <span className="font-medium">{formatCurrency(costSummary.totalProfileCost)}</span>
                      </div>
                    )}
                    {costSummary.totalHandleCost > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Handles (per meter):</span>
                        <span className="font-medium">{formatCurrency(costSummary.totalHandleCost)}</span>
                      </div>
                    )}
                    {costSummary.totalGlassCost > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Glass (per sq ft):</span>
                        <span className="font-medium">{formatCurrency(costSummary.totalGlassCost)}</span>
                      </div>
                    )}
                    {costSummary.totalConnectorCost > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Connectors (per unit):</span>
                        <span className="font-medium">{formatCurrency(costSummary.totalConnectorCost)}</span>
                      </div>
                    )}
                    {costSummary.totalHingeCost > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Hinges (per unit):</span>
                        <span className="font-medium">{formatCurrency(costSummary.totalHingeCost)}</span>
                      </div>
                    )}
                    {costSummary.totalLockCost > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Locks (per unit):</span>
                        <span className="font-medium">{formatCurrency(costSummary.totalLockCost)}</span>
                      </div>
                    )}
                    {costSummary.totalGasketCost > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Gaskets (per meter):</span>
                        <span className="font-medium">{formatCurrency(costSummary.totalGasketCost)}</span>
                      </div>
                    )}
                    {costSummary.totalSlidingSystemCost > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Sliding System:</span>
                        <span className="font-medium">{formatCurrency(costSummary.totalSlidingSystemCost)}</span>
                      </div>
                    )}
                    {costSummary.totalDividerCost > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Dividers & Connectors:</span>
                        <span className="font-medium">{formatCurrency(costSummary.totalDividerCost)}</span>
                      </div>
                    )}
                    {costSummary.totalAdditionalCost > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Additional Components:</span>
                        <span className="font-medium">{formatCurrency(costSummary.totalAdditionalCost)}</span>
                      </div>
                    )}
                    {costSummary.totalOptionalCost > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Optional Items:</span>
                        <span className="font-medium">{formatCurrency(costSummary.totalOptionalCost)}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Calculation stages */}
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-800 font-semibold">
                    <span>Material Subtotal:</span>
                    <span>{formatCurrency(costSummary.materialSubtotal)}</span>
                  </div>
                  {costSummary.makingCharges > 0 && (
                    <div className="flex justify-between text-blue-700 font-medium">
                      <span>Making Charges ({masterData.pricingSettings.makingChargeType === 'fixed' ? '₹' : `${masterData.pricingSettings.makingChargeValue}%`}):</span>
                      <span>+ {formatCurrency(costSummary.makingCharges)}</span>
                    </div>
                  )}
                  <hr className="border-gray-300" />
                  <div className="flex justify-between text-gray-800 font-semibold">
                    <span>Subtotal (with Making):</span>
                    <span>{formatCurrency(costSummary.subtotalWithMaking)}</span>
                  </div>
                  {costSummary.discount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
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
                  {masterData.pricingSettings.taxRates.cgst && masterData.pricingSettings.taxRates.sgst && (
                    <div className="text-xs text-gray-500 ml-4">
                      <div className="flex justify-between">
                        <span>• CGST ({masterData.pricingSettings.taxRates.cgst}%):</span>
                        <span>{formatCurrency(costSummary.gstAmount / 2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• SGST ({masterData.pricingSettings.taxRates.sgst}%):</span>
                        <span>{formatCurrency(costSummary.gstAmount / 2)}</span>
                      </div>
                    </div>
                  )}
                  <hr className="border-gray-400" />
                  <div className="flex justify-between text-xl font-bold text-black">
                    <span>FINAL AMOUNT:</span>
                    <span>{formatCurrency(costSummary.finalAmount)}</span>
                  </div>
                  {costSummary.totalSavings > 0 && (
                    <div className="text-center text-green-700 font-semibold mt-2 bg-green-50 p-2 rounded">
                      🎉 You save {formatCurrency(costSummary.totalSavings)}!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Export Buttons */}
        {showReport && quotation.doors.length > 0 && (
          <section className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-white">
            <h2 className="text-lg font-bold text-black mb-6 flex items-center">
              <span className="bg-black text-white rounded w-7 h-7 flex items-center justify-center mr-3 text-xs font-bold">9</span>
              Export Options
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <button
                onClick={handleExportPDF}
                className="bg-black hover:bg-gray-800 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded transition-colors flex items-center justify-center text-sm sm:text-base"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={handleExportCuttingSchema}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Cutting Schema (Staff)
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
          <section className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-white">
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
          <section className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-white">
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
