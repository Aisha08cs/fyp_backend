import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cron from 'node-cron';
import attentionRequestsRouter from './routes/attention-requests.route';
import authRouter from './routes/auth.route';
import fallEventsRouter from './routes/fall-events.route';
import inventoryRoutes from './routes/inventory.route';
import medicationRemindersRouter from './routes/medication-reminders.route';
import notificationsRouter from './routes/notifications.route';
import patientsRouter from './routes/patients.route';
import safezonesRouter from './routes/safezones.route';
import taskRemindersRouter from './routes/task-reminders.route';
import userRouter from './routes/user.route';
import { checkLowInventory } from './services/inventory-notifications.service';
import { checkOverdueMedications } from './services/medication-notifications.service';
import { checkSafezoneViolations } from './services/safezone-notifications.service';
import { checkOverdueTasks } from './services/task-notifications.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/everyday-ease';
mongoose.connect(MONGODB_URI).then(() => {
  console.log('Connected to MongoDB');
});

// Middleware
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images
app.use(cors());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ status: 'started' });
});

app.use('/auth', authRouter);
app.use('/users', userRouter);
app.use('/patients', patientsRouter);
app.use('/attention-requests', attentionRequestsRouter);
app.use('/fall-events', fallEventsRouter);
app.use('/medication-reminders', medicationRemindersRouter);
app.use('/task-reminders', taskRemindersRouter);
app.use('/notifications', notificationsRouter);
app.use('/inventory', inventoryRoutes);
app.use('/safezones', safezonesRouter);

// Start cron jobs
cron.schedule('*/1 * * * *', checkOverdueTasks);
cron.schedule('*/1 * * * *', checkOverdueMedications);
cron.schedule('*/1 * * * *', checkLowInventory);
cron.schedule('*/1 * * * *', checkSafezoneViolations);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export { app };
