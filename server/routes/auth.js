import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/UserAccount.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

// ✅ Login Route
router.post('/login', async (req, res) => {
  const { Username, Password } = req.body;

  try {
    //console.log("Login attempt:", req.body);

    // Check if user exists
    const user = await User.findOne({ Username });
    if (!user) {
      console.warn(`Login failed: Username "${Username}" not found`);
      return res.status(400).json({ message: 'User does not exist. Please check your username.' });
    }

    // Check if password matches (supports plain text for testing)
    let isMatch = false;
    if (user.Password.startsWith('$2a$') || user.Password.startsWith('$2b$')) {
      // Hashed password
      isMatch = await bcrypt.compare(Password, user.Password);
    } else {
      // Plain-text fallback (testing only)
      isMatch = Password === user.Password;
    }

    if (!isMatch) {
      console.warn(`Login failed: Incorrect password for Username "${Username}"`);
      return res.status(400).json({ message: 'Incorrect password. Please try again.' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Exclude password from user data
    const { Password: _, ...userData } = user.toObject();

    res.json({ token, user: userData });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-Password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let userObj = user.toObject();

    // Convert Buffer to Base64 if Photo exists
    if (userObj.Photo && userObj.Photo.data) {
      userObj.Photo = Buffer.from(userObj.Photo.data).toString('base64');
    }

    res.json({ user: userObj });
  } catch (err) {
    console.error("Get user info error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});



export default router;
