import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  SystemID: String,
  FullName: String,
  Position: String,
  Email: String,
  Username: String,
  Password: String, // hashed password
  Designation: String,
  Photo: Buffer, // store binary photo
  // Per-user UI theme preferences (persisted so user's theme loads when they sign in)
  siderBg: { type: String, default: '#001529' },
  headerBg: { type: String, default: '#ffffff' },

  // Presence tracking: last activity timestamp
  lastSeen: { type: Date },

  isVerified: { type: Boolean, default: false },
  verificationToken: String,

  // Needed for password reset
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  // Access control for non-developers
  permissions: {
    type: Object,
    default: {
      menus: {
        dashboard: true,
        loans: true,
        reports: true,
        settings: true,
        settingsDatabase: false,
        settingsEmployees: false,
        settingsCollectors: true,
        settingsAnnouncements: true,
        settingsAccounting: true,
        developerSettings: false,
      },
      actions: {
        // global defaults; can be refined per module if needed
        canView: true,
        canEdit: false,
        canDelete: false,
        // examples for specific modules (override these where needed)
        loans: { canView: true, canEdit: false, canDelete: false },
        collections: { canView: true, canEdit: false, canDelete: false },
        reports: { canView: true, canEdit: false, canDelete: false },
        users: { canView: false, canEdit: false, canDelete: false },
      },
    },
  },
});

export default mongoose.model("User", userSchema, "user_accounts");
