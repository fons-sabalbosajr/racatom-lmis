import express from 'express';
import requireAuth from '../middleware/requireAuth.js';
import User from '../models/User.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-Password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        FullName: user.FullName,
        Position: user.Position,
        Email: user.Email,
        Photo: user.Photo ? user.Photo.toString('base64') : null
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
