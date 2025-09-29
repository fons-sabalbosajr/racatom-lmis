import User from "../models/UserAccount.js";
import LoanClient from '../models/LoanClient.js';
import LoanCycle from '../models/LoanCycle.js';

// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-verificationToken -resetPasswordToken -resetPasswordExpires");

    const usersWithPhoto = users.map(user => {
      const obj = user.toObject();

      // Convert Photo to base64 if exists
      if (obj.Photo && obj.Photo.length) obj.Photo = obj.Photo.toString("base64");
      else obj.Photo = null;

      // Mark plain-text passwords as not verified
      if (!obj.Password || !obj.Password.startsWith("$2b$")) {
        obj.isVerified = false;
      }

      return obj;
    });

    res.status(200).json(usersWithPhoto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

export const getNextAccountId = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const regex = new RegExp(`^RCT-${currentYear}DB-`, 'i');

    const lastLoanCycle = await LoanCycle.findOne({ AccountId: { $regex: regex } })
      .sort({ AccountId: -1 })
      .limit(1);

    let nextIdNumber = 1;
    if (lastLoanCycle && lastLoanCycle.AccountId) {
      const lastId = lastLoanCycle.AccountId;
      const match = lastId.match(/(\d+)$/);
      if (match && match[1]) {
        nextIdNumber = parseInt(match[1], 10) + 1;
      }
    }

    const nextAccountId = `RCT-${currentYear}DB-${String(nextIdNumber).padStart(4, '0')}`;

    res.status(200).json({ success: true, accountId: nextAccountId });
  } catch (err) {
    console.error('Error in getNextAccountId:', err);
    res.status(500).json({ success: false, message: 'Failed to generate new Account ID' });
  }
};
