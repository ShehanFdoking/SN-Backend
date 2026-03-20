const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const { authenticate } = require('../middleware/authMiddleware');

const AI_EDIT_TRANSFORMATION = 'e_background_removal/c_pad,ar_1:1,w_1200,h_1200,b_white/f_auto/q_auto';

const extractPublicIdFromUrl = (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('/upload/')) {
    return null;
  }

  // Example: https://res.cloudinary.com/<cloud>/image/upload/v123456/snproducts/file.png
  const afterUpload = imageUrl.split('/upload/')[1] || '';
  const withoutVersion = afterUpload.replace(/^v\d+\//, '');
  const pathWithoutQuery = withoutVersion.split('?')[0];

  // Remove extension from the last segment to get public_id.
  const lastDot = pathWithoutQuery.lastIndexOf('.');
  if (lastDot === -1) {
    return pathWithoutQuery;
  }

  return pathWithoutQuery.slice(0, lastDot);
};

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'snproducts', // Cloudinary folder
    allowedFormats: ['jpeg', 'png', 'jpg', 'webp'],
  },
});

const upload = multer({ storage: storage });

router.post('/', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image provided' });
  }

  try {
    res.status(200).json({
      message: 'Image uploaded successfully',
      imageUrl: req.file.path,
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: 'Error uploading image', error: error.message });
  }
});

router.post('/ai-edit', authenticate, async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ message: 'imageUrl is required' });
  }

  const publicId = extractPublicIdFromUrl(imageUrl);
  if (!publicId) {
    return res.status(400).json({ message: 'Invalid Cloudinary image URL' });
  }

  try {
    const result = await cloudinary.uploader.explicit(publicId, {
      type: 'upload',
      resource_type: 'image',
      eager: [AI_EDIT_TRANSFORMATION],
      eager_async: false,
    });

    const editedUrl = result?.eager?.[0]?.secure_url || result?.eager?.[0]?.url;

    if (!editedUrl) {
      return res.status(500).json({ message: 'AI edit failed to generate output image' });
    }

    return res.status(200).json({
      message: 'AI edit completed',
      imageUrl: editedUrl,
      publicId,
    });
  } catch (error) {
    console.error('AI Edit Error:', error);
    return res.status(500).json({
      message: 'AI background edit failed. Verify Cloudinary background removal is enabled.',
      error: error.message,
    });
  }
});

module.exports = router;
