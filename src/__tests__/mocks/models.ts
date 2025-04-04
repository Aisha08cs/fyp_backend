export const mockUser = {
  _id: 'mock-user-id',
  userType: 'patient',
  firstName: 'Test',
  lastName: 'User',
  gender: 'male',
  birthday: '1990-01-01',
  email: 'test@example.com',
  password: 'hashed-password',
  save: jest.fn().mockResolvedValue({
    _id: 'mock-user-id',
    userType: 'patient',
    firstName: 'Test',
    lastName: 'User',
    gender: 'male',
    birthday: '1990-01-01',
    email: 'test@example.com',
    password: 'hashed-password',
  }),
  toObject: () => ({
    _id: 'mock-user-id',
    userType: 'patient',
    firstName: 'Test',
    lastName: 'User',
    gender: 'male',
    birthday: '1990-01-01',
    email: 'test@example.com',
    password: 'hashed-password',
  }),
};

export const mockPatient = {
  _id: 'mock-patient-id',
  user: 'mock-user-id',
  uniqueCode: 1234,
  caregiverEmail: 'caregiver@example.com',
  locationSharing: {
    enabled: false,
    lastLocation: undefined,
  },
  toObject: () => ({
    _id: 'mock-patient-id',
    user: 'mock-user-id',
    uniqueCode: 1234,
    caregiverEmail: 'caregiver@example.com',
    locationSharing: {
      enabled: false,
      lastLocation: undefined,
    },
  }),
};

export const mockCaregiver = {
  _id: 'mock-caregiver-id',
  user: 'mock-user-id',
  patientEmail: 'patient@example.com',
  toObject: () => ({
    _id: 'mock-caregiver-id',
    user: 'mock-user-id',
    patientEmail: 'patient@example.com',
  }),
};

export const mockMedicationReminder = {
  _id: 'mock-reminder-id',
  patientId: 'mock-patient-id',
  medicationName: 'Test Medication',
  dosage: '1 tablet',
  frequency: 'daily',
  time: '09:00',
  toObject: () => ({
    _id: 'mock-reminder-id',
    patientId: 'mock-patient-id',
    medicationName: 'Test Medication',
    dosage: '1 tablet',
    frequency: 'daily',
    time: '09:00',
  }),
};

export const mockTaskReminder = {
  _id: 'mock-task-id',
  patientId: 'mock-patient-id',
  title: 'Test Task',
  taskName: 'Test Task',
  description: 'Test Description',
  dueDate: new Date(),
  completed: false,
  toObject: () => ({
    _id: 'mock-task-id',
    patientId: 'mock-patient-id',
    title: 'Test Task',
    taskName: 'Test Task',
    description: 'Test Description',
    dueDate: new Date(),
    completed: false,
  }),
};

export const mockInventoryItem = {
  _id: 'mock-item-id',
  patientId: 'mock-patient-id',
  name: 'Test Item',
  quantity: 5,
  unit: 'pieces',
  toObject: () => ({
    _id: 'mock-item-id',
    patientId: 'mock-patient-id',
    name: 'Test Item',
    quantity: 5,
    unit: 'pieces',
  }),
};

export const mockFallEvent = {
  _id: 'mock-fall-id',
  patientId: 'mock-patient-id',
  timestamp: new Date(),
  location: {
    latitude: 52.520008,
    longitude: 13.404954,
  },
  status: 'pending',
  confirmedAt: undefined,
  resolvedAt: undefined,
  resolvedBy: undefined,
  caregiverNotified: false,
  caregiverNotifiedAt: undefined,
  dismissed: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue({
    _id: 'mock-fall-id',
    patientId: 'mock-patient-id',
    timestamp: new Date(),
    location: {
      latitude: 52.520008,
      longitude: 13.404954,
    },
    status: 'pending',
    confirmedAt: undefined,
    resolvedAt: undefined,
    resolvedBy: undefined,
    caregiverNotified: false,
    caregiverNotifiedAt: undefined,
    dismissed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  toObject: () => ({
    _id: 'mock-fall-id',
    patientId: 'mock-patient-id',
    timestamp: new Date().toISOString(),
    location: {
      latitude: 52.520008,
      longitude: 13.404954,
    },
    status: 'pending',
    confirmedAt: undefined,
    resolvedAt: undefined,
    resolvedBy: undefined,
    caregiverNotified: false,
    caregiverNotifiedAt: undefined,
    dismissed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
};

export const mockAttentionRequest = {
  _id: 'mock-request-id',
  patientId: 'mock-patient-id',
  timestamp: new Date(),
  location: {
    latitude: 52.520008,
    longitude: 13.404954,
  },
  type: 'help',
  status: 'pending',
  resolvedAt: undefined,
  resolvedBy: undefined,
  caregiverNotified: false,
  caregiverNotifiedAt: undefined,
  dismissed: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  toObject: () => ({
    _id: 'mock-request-id',
    patientId: 'mock-patient-id',
    timestamp: new Date(),
    location: {
      latitude: 52.520008,
      longitude: 13.404954,
    },
    type: 'help',
    status: 'pending',
    resolvedAt: undefined,
    resolvedBy: undefined,
    caregiverNotified: false,
    caregiverNotifiedAt: undefined,
    dismissed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
};

export const mockSafezoneBreach = {
  _id: 'mock-breach-id',
  patientId: 'mock-patient-id',
  timestamp: new Date(),
  location: {
    latitude: 52.520008,
    longitude: 13.404954,
  },
  dismissed: false,
  dismissedAt: null,
  dismissedBy: null,
  save: jest.fn().mockResolvedValue({
    _id: 'mock-breach-id',
    patientId: 'mock-patient-id',
    timestamp: new Date(),
    location: {
      latitude: 52.520008,
      longitude: 13.404954,
    },
    dismissed: true,
    dismissedAt: new Date(),
    dismissedBy: 'mock-user-id',
  }),
  toObject: () => ({
    _id: 'mock-breach-id',
    patientId: 'mock-patient-id',
    timestamp: new Date(),
    location: {
      latitude: 52.520008,
      longitude: 13.404954,
    },
    dismissed: false,
    dismissedAt: null,
    dismissedBy: null,
  }),
};
