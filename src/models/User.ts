import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  userType: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthday: string;
  email: string;
  password: string;
  profileImage?: string;
}

const UserSchema = new Schema<IUser>(
  {
    userType: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    gender: { type: String, required: true },
    birthday: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profileImage: { type: String },
  },
  {
    collection: 'UserInfo',
  },
);

UserSchema.index({ email: 1 });

export const User = mongoose.model<IUser>('UserInfo', UserSchema);
