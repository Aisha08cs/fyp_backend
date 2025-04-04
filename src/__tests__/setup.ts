import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// Mock Mongoose model methods
const mockModelMethods = {
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  findById: jest.fn().mockReturnThis(),
  findByIdAndUpdate: jest.fn().mockReturnThis(),
  findByIdAndDelete: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  save: jest.fn(),
  toObject: jest.fn(),
};

// Mock User model
jest.mock('../models/User', () => ({
  User: {
    create: jest.fn(),
    ...mockModelMethods,
  },
}));

// Mock Patient model
jest.mock('../models/Patient', () => ({
  Patient: {
    create: jest.fn(),
    ...mockModelMethods,
  },
}));

// Mock Caregiver model
jest.mock('../models/Caregiver', () => ({
  Caregiver: {
    create: jest.fn(),
    ...mockModelMethods,
  },
}));

// Mock MedicationReminder model
jest.mock('../models/MedicationReminder', () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    findByIdAndUpdate: jest.fn().mockReturnThis(),
    findByIdAndDelete: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    save: jest.fn(),
    toObject: jest.fn(),
  },
}));

// Mock TaskReminder model
jest.mock('../models/TaskReminder', () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    findByIdAndUpdate: jest.fn().mockReturnThis(),
    findByIdAndDelete: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    save: jest.fn(),
    toObject: jest.fn(),
  },
}));

// Mock Inventory model
jest.mock('../models/Inventory', () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    findByIdAndUpdate: jest.fn().mockReturnThis(),
    findByIdAndDelete: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    save: jest.fn(),
    toObject: jest.fn(),
  },
}));

// Mock FallEvent model
jest.mock('../models/FallEvent', () => ({
  FallEvent: {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    findByIdAndUpdate: jest.fn().mockReturnThis(),
    findByIdAndDelete: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    save: jest.fn(),
    toObject: jest.fn(),
  },
}));

// Mock AttentionRequest model
jest.mock('../models/AttentionRequest', () => ({
  AttentionRequest: jest.fn().mockImplementation(() => ({
    save: jest.fn(),
    toObject: jest.fn(),
  })),
  __esModule: true,
}));
