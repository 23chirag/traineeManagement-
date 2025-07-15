// server.js
const express = require('express');
const router = require('./Router.js'); // Adjust the path as necessary
const cors = require('cors');
const path = require('path');
const { dbConnection } = require('./dbConnect');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config({ path: './email.env' });

const app = express();

app.use(cors()); // If accessing from another port
app.use(express.json()); // To parse json
app.use(express.urlencoded({ extended: true })); // To parse form submissions
app.use(express.static(path.join(__dirname, 'public')));

// Ensure 'files' directory exists
const filesDir = path.join(__dirname, 'files');
if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir);
}
const attendanceStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'attendance/');
    },
    filename: function (req, file, cb) {
        // Use trainee_id from the form data
        let traineeId = req.body.trainee_id;
        if (!traineeId) traineeId = 'unknown';
        const ext = file.originalname.split('.').pop();
        cb(null, traineeId + '.' + ext);
    }
});
// Multer storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'files/');
    },
    filename: function (req, file, cb) {
        // Use proj_id from the form data (proj_id or project_id)
        let projId = req.body.proj_id || req.body.project_id;
        // Default to 'unknown' if not present
        if (!projId) projId = 'unknown';
        // Get the file extension
        const ext = file.originalname.split('.').pop();
        cb(null, projId + '.' + ext);
    }
});
const upload = multer({ storage });
const attendanceUpload = multer({
    storage: attendanceStorage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed'));
        }
        cb(null, true);
    }
});
// API routes
app.use('/',router);


// Start server
const port = 8000;
app.listen(port, async() => {
     await dbConnection(); 
    console.log(`Server is listening on port http://localhost:${port}`);
});

module.exports = { app, upload,attendanceUpload};
