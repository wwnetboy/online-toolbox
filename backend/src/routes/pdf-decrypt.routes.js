/**
 * PDF Decrypt Routes
 * @route /api/pdf/decrypt
 */
const express = require('express');
const multer = require('multer');
const pdfDecryptController = require('../controllers/pdf-decrypt.controller');

const router = express.Router();

const upload = multer({ dest: 'uploads/temp/' });

router.post('/', upload.single('file'), pdfDecryptController.decryptPdf);

module.exports = router;
