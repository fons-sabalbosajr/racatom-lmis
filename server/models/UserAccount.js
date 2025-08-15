import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  SystemID: String,
  FullName: String,
  Position: String,
  Email: String,
  Username: String,
  Password: String, // hashed password
  Designation: String,
  Photo: Buffer // store binary photo
});

export default mongoose.model('User', userSchema, 'user_accounts');
