import { MasterData, FrameProfile, HandleProfile, GlassType, ConnectorType } from '../types';

export const frameProfiles: FrameProfile[] = [
  {
    code: 'FP001',
    name: 'Aluminum Frame 20x40',
    width: 20,
    height: 40,
    pricePerMeter: 150,
    suggestedHandles: ['HP001', 'HP002', 'HP004'],
    suggestedGlassTypes: ['GL001', 'GL002', 'GL003'],
    suggestedConnectors: ['CN001', 'CN002'],
  },
  {
    code: 'FP002',
    name: 'Aluminum Frame 25x50',
    width: 25,
    height: 50,
    pricePerMeter: 200,
    suggestedHandles: ['HP002', 'HP003'],
    suggestedGlassTypes: ['GL001', 'GL004', 'GL005'],
    suggestedConnectors: ['CN001', 'CN003'],
  },
  {
    code: 'FP003',
    name: 'Aluminum Frame 30x60',
    width: 30,
    height: 60,
    pricePerMeter: 250,
    suggestedHandles: ['HP002', 'HP003'],
    suggestedGlassTypes: ['GL004', 'GL005', 'GL006'],
    suggestedConnectors: ['CN002', 'CN003', 'CN004'],
  },
  {
    code: 'FP004',
    name: 'UPVC Frame 22x45',
    width: 22,
    height: 45,
    pricePerMeter: 180,
    suggestedHandles: ['HP001', 'HP004'],
    suggestedGlassTypes: ['GL001', 'GL002', 'GL003'],
    suggestedConnectors: ['CN001', 'CN002'],
  },
  {
    code: 'FP005',
    name: 'UPVC Frame 28x55',
    width: 28,
    height: 55,
    pricePerMeter: 220,
    suggestedHandles: ['HP002', 'HP003'],
    suggestedGlassTypes: ['GL003', 'GL004', 'GL006'],
    suggestedConnectors: ['CN002', 'CN003'],
  },
];

export const handleProfiles: HandleProfile[] = [
  {
    code: 'HP001',
    name: 'Standard Handle Profile',
    pricePerMeter: 80,
  },
  {
    code: 'HP002',
    name: 'Premium Handle Profile',
    pricePerMeter: 120,
  },
  {
    code: 'HP003',
    name: 'Deluxe Handle Profile',
    pricePerMeter: 150,
  },
  {
    code: 'HP004',
    name: 'Economy Handle Profile',
    pricePerMeter: 60,
  },
];

export const glassTypes: GlassType[] = [
  {
    code: 'GL001',
    name: 'Clear Glass 5mm',
    pricePerSqFt: 45,
    thickness: 5,
  },
  {
    code: 'GL002',
    name: 'Tinted Glass 5mm',
    pricePerSqFt: 55,
    thickness: 5,
  },
  {
    code: 'GL003',
    name: 'Frosted Glass 5mm',
    pricePerSqFt: 60,
    thickness: 5,
  },
  {
    code: 'GL004',
    name: 'Clear Glass 8mm',
    pricePerSqFt: 65,
    thickness: 8,
  },
  {
    code: 'GL005',
    name: 'Toughened Glass 10mm',
    pricePerSqFt: 90,
    thickness: 10,
  },
  {
    code: 'GL006',
    name: 'Laminated Glass 6mm',
    pricePerSqFt: 85,
    thickness: 6,
  },
];

export const connectorTypes: ConnectorType[] = [
  {
    code: 'CN001',
    name: 'Corner Connector L-Type',
    pricePerUnit: 15,
  },
  {
    code: 'CN002',
    name: 'Corner Connector T-Type',
    pricePerUnit: 20,
  },
  {
    code: 'CN003',
    name: 'Corner Connector X-Type',
    pricePerUnit: 25,
  },
  {
    code: 'CN004',
    name: 'Frame Joiner',
    pricePerUnit: 12,
  },
];

export const masterData: MasterData = {
  frameProfiles,
  handleProfiles,
  glassTypes,
  connectorTypes,
  defaultGST: 18,
  defaultGlassWastage: 10,
};
