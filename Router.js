// router.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const filesDir = path.join(__dirname, 'files');
const attendanceDir = path.join(__dirname, 'attendance');
if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir);
}
if (!fs.existsSync(attendanceDir)) {
    fs.mkdirSync(attendanceDir);
}   


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, filesDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });
const attendanceStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, attendanceDir);
    },
    filename: function (req, file, cb) {
        let traineeId = req.body.trainee_id;
        if (!traineeId) traineeId = 'unknown';
        const ext = file.originalname.split('.').pop();
        cb(null, traineeId + '.' + ext);
    }
});
const attendanceUpload = multer({
    storage: attendanceStorage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed'));
        }
        cb(null, true);
    }
});
const { adminLogin,checkProjectFileStatus, insLogin, addInternshipProgram, addTraineeProgram, getAllInternshipPrograms, addInstructorToProgram, getInstructorsForProgram, addTrainee, addProject, getAllTrainees, getAllProjects, getDashboardData, getTraineePrograms, addTask, getTasks, updateTaskStatus, getProjectsForTraineeProgram, getUniqueTraineesForProgram, uploadFile, uploadAttendance, sendAttendanceByEmail } = require("./Controller");
const { sequelize } = require('./dbConnect');

const router = express.Router();
router.post('/instructor/addTraineeProgram',addTraineeProgram);
router.post('/instructor/login', insLogin);

// Add Internship Program
router.post('/instructor/addInternshipProgram', addInternshipProgram);

// Add Instructor to Program
router.post('/instructor/addInstructorToProgram', addInstructorToProgram);

// Add Trainee
router.post('/instructor/addTrainee', addTrainee);
// Add Project
router.post('/instructor/addProject', addProject);

router.post('/instructor/addTask', addTask);

// File upload endpoint for project report
router.post('/instructor/uploadReport', upload.fields([
  { name: 'reportFile', maxCount: 1 }
]), uploadFile );

// Add route to check if a file exists for a given project_id
router.get('/instructor/projectFileStatus', checkProjectFileStatus);

// Get all Internship Programs
router.get('/instructor/internshipPrograms', getAllInternshipPrograms);

// Get instructors for a program
router.get('/instructor/programInstructors', getInstructorsForProgram);

// Get internship programs for a specific instructor
router.get('/instructor/traineePrograms', getTraineePrograms);

// Get all Trainees
router.get('/instructor/allTrainees', getAllTrainees);
// Get all Projects
router.get('/instructor/allProjects', getAllProjects);

// Get all projects for a trainee program
router.get('/instructor/projectsForTraineeProgram', getProjectsForTraineeProgram);

// Get all unique trainees for a trainee program
router.get('/instructor/uniqueTraineesForProgram', getUniqueTraineesForProgram);

// Get dashboard data for interndash.html
router.get('/instructor/dashboardData', getDashboardData);

// Get tasks for a specific project
router.get('/instructor/tasks', getTasks);

// Update task status
router.put('/instructor/updateTaskStatus', updateTaskStatus);

// Admin login route
router.post('/admin/login', adminLogin);

router.post('/instructor/uploadAttendance', attendanceUpload.fields([
  { name: 'attendanceFile', maxCount: 1 }
]), uploadAttendance);

router.post('/instructor/sendAttendanceByEmail', sendAttendanceByEmail);

module.exports = router;
