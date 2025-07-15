// Controller.js
const { sequelize } = require("./dbConnect");
const { QueryTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const uploadFile = async (req, res) => {
    const projId = req.body.proj_id || req.body.project_id;
    const fileObj = req.files && req.files['reportFile'] && req.files['reportFile'][0];
    if (!fileObj) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    if (!projId) {
        return res.status(400).json({ error: 'No proj_id (project_id) provided' });
    }
    try {
        // Check if a file for this project already exists
        const [existing] = await sequelize.query(
            'SELECT * FROM files WHERE proj_id = ?',
            { replacements: [projId] }
        );
        if (existing && existing.length > 0) {
            return res.status(400).json({ error: 'File already uploaded for this project' });
        }
        const fileName = path.basename(fileObj.path); // Only the filename, not the full path
        await sequelize.query(
            'INSERT INTO files (proj_id, file_path) VALUES (?, ?)',
            { replacements: [projId, fileName] }
        );
        res.json({ success: true, filename: fileObj.filename, path: fileName, proj_id: projId });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save file record', details: err.message });
    }
}
const insLogin = async (req, res) => {
    const { instructorId, password } = req.body;
    if (!instructorId || !password) {
        return res.status(400).json({ error: "Instructor ID and password are required" });
    }
    try {
        const instructors = await sequelize.query(
            'SELECT * FROM INSTRUCTORS WHERE instructor_id = ? AND mobileNo = ? LIMIT 1',
            {
                replacements: [instructorId,password],
                type: QueryTypes.SELECT
            }
        );      
    console.log("Queried instructors:", instructors);   
        if (instructors.length === 0) {
            return res.status(401).json({ error: "Invalid Instructor ID or password" });
        }
        // Fetch the first internship_id assigned to this instructor
        const [transaction] = await sequelize.query(
            'SELECT internship_id FROM internship_transaction WHERE instructor_id = ? LIMIT 1',
            {
                replacements: [instructorId],
                type: QueryTypes.SELECT
            }
        );
        const internship_id = transaction ? transaction.internship_id : null;
        // Return instructor data along with internship_id
        res.json({
            success: true, 
            message: "Login successful",
            instructor: { ...instructors[0], internship_id }
        }); 
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};   
// Add Internship Program
const addInternshipProgram = async (req, res) => {
    const { title, description, startDate, endDate } = req.body;
    if (!title || !description || !startDate || !endDate) {
        return res.status(400).json({ error: "All fields are required" });
    }
    try {
        await sequelize.query(
            "INSERT INTO INTERNSHIP_PROGRAM_MASTER (title, description, from_date, to_date) VALUES (?, ?, ?, ?)",
            { replacements: [title, description, startDate, endDate], type: QueryTypes.INSERT }
        );
        res.json({ success: true, message: "Internship program added successfully" });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// Get all Internship Programs
const getAllInternshipPrograms = async (req, res) => {
    try {
        const programs = await sequelize.query(
            "SELECT * FROM INTERNSHIP_PROGRAM_MASTER ORDER BY from_date DESC",
            { type: QueryTypes.SELECT }
        );
        res.json(programs);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// Add Instructor to Program (internship_transaction)
const addInstructorToProgram = async (req, res) => {
    const { instructor_id, internship_id } = req.body;
    if (!instructor_id || !internship_id) {
        return res.status(400).json({ error: "Both instructor_id and internship_id are required" });
    }
    try {
        await sequelize.query(
            "INSERT INTO internship_transaction (instructor_id, internship_id) VALUES (?, ?)",
            { replacements: [instructor_id, internship_id], type: QueryTypes.INSERT }
        );
        res.json({ success: true, message: "Instructor added to program successfully" });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// Get instructors for a program
const getInstructorsForProgram = async (req, res) => {
    const { internship_id } = req.query;
    if (!internship_id) {
        return res.status(400).json({ error: "internship_id is required" });
    }
    try {
        const instructors = await sequelize.query(
            `SELECT DISTINCT i.name, i.email, i.mobileNo, i.department
             FROM internship_transaction t
             JOIN instructors i ON t.instructor_id = i.instructor_id
             WHERE t.internship_id = ?`,
            { replacements: [internship_id], type: QueryTypes.SELECT }
        );
        res.json(instructors);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// Get internship programs for a specific instructor
const getMyPrograms = async (req, res) => {
    const { instructor_id } = req.query;
    if (!instructor_id) {
        return res.status(400).json({ error: "instructor_id is required" });
    }
    try {
        const programs = await sequelize.query(
            `SELECT ipm.* FROM INTERNSHIP_PROGRAM_MASTER ipm
             JOIN internship_transaction it ON ipm.id = it.internship_id
             WHERE it.instructor_id = ?
             ORDER BY ipm.from_date DESC`,
            { replacements: [instructor_id], type: QueryTypes.SELECT }
        );
        res.json(programs);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// Add Trainee Program (to trainee_master and update existing internship_transaction)
const addTraineeProgram = async (req, res) => {
    const { title, startDate, endDate, internship_id, instructor_id } = req.body;
    if (!title || !startDate || !endDate || !internship_id || !instructor_id) {
        return res.status(400).json({ error: "All fields are required" });
    }
    try {
        // Insert into trainee_master
        const [result, meta] = await sequelize.query(
            "INSERT INTO trainee_master (title, startDate, endDate) VALUES (?, ?, ?)",
            { replacements: [title, startDate, endDate], type: QueryTypes.INSERT }
        );
        const id = meta && meta.insertId ? meta.insertId : (Array.isArray(result) ? result[0] : result);
        console.log('Inserted trainee_program_id:', id);
        // Check for an existing row with trainee_prog_id IS NULL
        const [existingNullRow] = await sequelize.query(
            "SELECT * FROM internship_transaction WHERE internship_id = ? AND instructor_id = ? AND trainee_prog_id IS NULL",
            { replacements: [internship_id, instructor_id], type: QueryTypes.SELECT }
        );
        if (existingNullRow) {
            // Update the existing row to set trainee_prog_id
            await sequelize.query(
                "UPDATE internship_transaction SET trainee_prog_id = ? WHERE id = ?",
                { replacements: [id, existingNullRow.id], type: QueryTypes.UPDATE }
            );
        } else {
            // Insert a new row for this trainee program
            await sequelize.query(
                "INSERT INTO internship_transaction (internship_id, instructor_id, trainee_prog_id) VALUES (?, ?, ?)",
                { replacements: [internship_id, instructor_id, id], type: QueryTypes.INSERT }
            );
        }
        res.json({ success: true, message: "Trainee program added and mapped successfully" });
    } catch (err) {
        console.error("Database error in addTraineeProgram:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// Get all trainee programs for an instructor and internship
const getTraineePrograms = async (req, res) => {
    const { internship_id, instructor_id } = req.query;
    if (!internship_id || !instructor_id) {
        return res.status(400).json({ error: "internship_id and instructor_id are required" });
    }
    try {
        // Get all trainee programs that are mapped to this instructor and internship, including trainee_id
        const programs = await sequelize.query(
            `SELECT tm.*, it.trainee_id FROM trainee_master tm
             JOIN internship_transaction it ON tm.id = it.trainee_prog_id
             WHERE it.internship_id = ? AND it.instructor_id = ? AND it.trainee_prog_id IS NOT NULL`,
            { replacements: [internship_id, instructor_id], type: QueryTypes.SELECT }
        );
        res.json(programs);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// Update addTrainee to accept college, branch, year, and photo (file upload)
const addTrainee = async (req, res) => {
    try {
        const { name, email, mobile, college, branch, year, internship_id, instructor_id, trainee_program_id } = req.body;
        let photoPath = '';
        if (req.files && req.files['photo'] && req.files['photo'][0]) {
            const photoFile = req.files['photo'][0];
            photoPath = `photos/${photoFile.filename}`;
        }
        if (!name || !email || !mobile || !internship_id || !instructor_id || !trainee_program_id || !college || !branch || !year) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        // Insert into trainees table (add columns if needed)
        const [result, meta] = await sequelize.query(
            'INSERT INTO trainees (name, email, mobileNo, college, branch, year, photo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            { replacements: [name, email, mobile, college, branch, year, photoPath], type: QueryTypes.INSERT }
        );
        // Get the new trainee's id
        const traineeId = meta && meta.insertId ? meta.insertId : (Array.isArray(result) ? result[0] : result);
        // Map trainee to trainee_program_id in internship_transaction
        await sequelize.query(
            'INSERT INTO internship_transaction (internship_id, instructor_id, trainee_prog_id, trainee_id) VALUES (?, ?, ?, ?)',
            { replacements: [internship_id, instructor_id, trainee_program_id, traineeId], type: QueryTypes.INSERT }
        );
        res.json({ success: true, message: 'Trainee added successfully' });
    } catch (err) {
        console.error('Database error in addTrainee:', err);
        res.status(500).json({ error: 'Internal server error: ' + err.message });
    }
};

// Update addProject to use trainee_prog_id
const addProject = async (req, res) => {
    const { title, description, start_date, end_date, tr_id } = req.body;
    if (!title || !description || !start_date || !end_date || !tr_id) {
        return res.status(400).json({ error: "All fields are required" });
    }
    try {
        // Insert project with tr_id referencing trainee_master(id)
        const [result, meta] = await sequelize.query(
            "INSERT INTO projects (title, description, startDate, endDate, tr_id) VALUES (?, ?, ?, ?, ?)",
            { replacements: [title, description, start_date, end_date, tr_id], type: QueryTypes.INSERT }
        );
        res.json({ success: true, message: "Project added and mapped successfully" });
    } catch (err) {
        console.error("Database error in addProject:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// Get all Trainees
const getAllTrainees = async (req, res) => {
    try {
        const trainees = await sequelize.query(
            "SELECT * FROM trainees ORDER BY id DESC",
            { type: QueryTypes.SELECT }
        );
        res.json(trainees);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// Get all Projects
const getAllProjects = async (req, res) => {
    try {
        const projects = await sequelize.query(
            "SELECT * FROM projects ORDER BY id DESC",
            { type: QueryTypes.SELECT }
        );
        res.json(projects);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// Update getDashboardData to use trainee_prog_id
const getDashboardData = async (req, res) => {
    const { internship_id, instructor_id, trainee_program_id } = req.query;
    if (!internship_id || !instructor_id || !trainee_program_id) {
        return res.status(400).json({ error: "internship_id, instructor_id, and trainee_program_id are required" });
    }
    try {
        // Only update trainee_prog_id if not already set (optional, can be removed)
        // Fetch the correct row for this trainee program
        const [transaction] = await sequelize.query(
            `SELECT * FROM internship_transaction WHERE internship_id = ? AND instructor_id = ? AND trainee_prog_id = ?`,
            { replacements: [internship_id, instructor_id, trainee_program_id], type: QueryTypes.SELECT }
        );
        if (!transaction) {
            return res.json({ trainee: null, project: null });
        }
        let trainee = null, project = null;
        if (transaction.trainee_id) {
            const [t] = await sequelize.query(
                "SELECT * FROM trainees WHERE id = ?",
                { replacements: [transaction.trainee_id], type: QueryTypes.SELECT }
            );
            trainee = t || null;
        }
        if (transaction.project_id) {
            const [p] = await sequelize.query(
                "SELECT * FROM projects WHERE id = ?",
                { replacements: [transaction.project_id], type: QueryTypes.SELECT }
            );
            project = p || null;
        }
        res.json({ trainee, project });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// Get trainee programs for a specific internship and instructor
const getMyTraineePrograms = async (req, res) => {
    const { internship_id, instructor_id } = req.query;
    if (!internship_id || !instructor_id) {
        return res.status(400).json({ error: "internship_id and instructor_id are required" });
    }
    try {
        const programs = await sequelize.query(
            `SELECT tm.* FROM internship_transaction it
             JOIN trainee_master tm ON it.trainee_prog_id = tm.id
             WHERE it.internship_id = ? AND it.instructor_id = ? AND it.trainee_prog_id IS NOT NULL`,
            { replacements: [internship_id, instructor_id], type: QueryTypes.SELECT }
        );
        res.json(programs);
    } catch (err) {
        console.error("Database error in getMyTraineePrograms:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// Update addTask to use 'description' instead of 'taskDescription'
const addTask = async (req, res) => {
    const { project_id, taskTitle, description, startDate, endDate } = req.body;
    if (!project_id || !taskTitle || !startDate || !endDate) {
        return res.status(400).json({ error: 'All fields except description are required' });
    }
    try {
        await sequelize.query(
            'INSERT INTO tasks (project_id, taskTitle, description, startDate, endDate) VALUES (?, ?, ?, ?, ?)',
            { replacements: [project_id, taskTitle, description || '', startDate, endDate], type: QueryTypes.INSERT }
        );
        res.json({ success: true, message: 'Task added successfully' });
    } catch (err) {
        console.error('Database error in addTask:', err);
        res.status(500).json({ error: 'Internal server error: ' + err.message });
    }
};

// Get all tasks for a project
const getTasks = async (req, res) => {
    const { project_id } = req.query;
    if (!project_id) {
        return res.status(400).json({ error: "project_id is required" });
    }
    try {
        const tasks = await sequelize.query(
            "SELECT * FROM tasks WHERE project_id = ? ORDER BY id ASC",
            { replacements: [project_id], type: QueryTypes.SELECT }
        );
        
        // Add default status if not present
        const tasksWithStatus = tasks.map(task => ({
            ...task,
            status: task.status || 'assigned'
        }));
        
        res.json(tasksWithStatus);
    } catch (err) {
        console.error("Database error in getTasks:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// Update task status
const updateTaskStatus = async (req, res) => {
    const { task_id, status, new_end_date } = req.body;
    if (!task_id || !status) {
        return res.status(400).json({ error: "task_id and status are required" });
    }
    try {
        let query = "UPDATE tasks SET status = ? WHERE id = ?";
        let replacements = [status, task_id];
        
        // If new_end_date is provided, update end date regardless of status
        if (new_end_date) {
            query = "UPDATE tasks SET status = ?, endDate = ? WHERE id = ?";
            replacements = [status, new_end_date, task_id];
        }
        
        await sequelize.query(query, { replacements, type: QueryTypes.UPDATE });
        res.json({ success: true, message: "Task updated successfully" });
    } catch (err) {
        console.error("Database error in updateTaskStatus:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// Admin login validation
const adminLogin = async (req, res) => {
    const { adminId, password } = req.body;
    if (!adminId || !password) {
        return res.status(400).json({ error: "Admin ID and password are required" });
    }
    try {
        const admins = await sequelize.query(
            'SELECT * FROM admin WHERE adminId = ? AND password = ? LIMIT 1',
            {
                replacements: [adminId, password],
                type: QueryTypes.SELECT
            }
        );
        if (admins.length === 0) {
            return res.status(401).json({ error: "Invalid Admin ID or password" });
        }
        res.json({
            success: true,
            message: "Login successful",
            admin: admins[0]
        });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Get all projects for a trainee program
const getProjectsForTraineeProgram = async (req, res) => {
    const { trainee_program_id } = req.query;
    if (!trainee_program_id) {
        return res.status(400).json({ error: "trainee_program_id is required" });
    }
    try {
        const projects = await sequelize.query(
            `SELECT * FROM projects WHERE tr_id = ? ORDER BY id DESC`,
            { replacements: [trainee_program_id], type: QueryTypes.SELECT }
        );
        res.json(projects);
    } catch (err) {
        console.error("Database error in getProjectsForTraineeProgram:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// Get all unique trainees for a trainee program
const getUniqueTraineesForProgram = async (req, res) => {
    const { trainee_program_id } = req.query;
    if (!trainee_program_id) {
        return res.status(400).json({ error: "trainee_program_id is required" });
    }
    try {
        const trainees = await sequelize.query(
            `SELECT t.*, MIN(it.id) as internship_transaction_id FROM internship_transaction it
             JOIN trainees t ON it.trainee_id = t.id
             WHERE it.trainee_prog_id = ?
             GROUP BY t.id`,
            { replacements: [trainee_program_id], type: QueryTypes.SELECT }
        );
        res.json(trainees);
    } catch (err) {
        console.error("Database error in getUniqueTraineesForProgram:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// Endpoint to check if a file exists for a given project_id
const checkProjectFileStatus = async (req, res) => {
    // Accept both project_id and proj_id for compatibility
    const project_id = req.query.project_id || req.query.proj_id;
    if (!project_id) {
        return res.status(400).json({ error: 'project_id (or proj_id) is required' });
    }
    try {
        const [files] = await sequelize.query(
            'SELECT * FROM files WHERE proj_id = ?',
            { replacements: [project_id] }
        );
        res.json({ exists: files && files.length > 0 });
    } catch (err) {
        res.status(500).json({ error: 'Database error', details: err.message });
    }
};

// Attendance upload handler
const uploadAttendance = async (req, res) => {
    const traineeProgId = req.body.trainee_prog_id;
    const fileObj = req.files && req.files['attendanceFile'] && req.files['attendanceFile'][0];
    if (!fileObj) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    if (!traineeProgId) {
        return res.status(400).json({ error: 'No trainee_prog_id provided' });
    }
    try {
        // Check if attendance already exists for this trainee_prog_id
        const [existing] = await sequelize.query(
            'SELECT * FROM attendance WHERE trainee_id = ?',
            { replacements: [traineeProgId] }
        );
        if (existing && existing.length > 0) {
            return res.status(400).json({ error: 'Attendance already uploaded for this trainee program' });
        }
        // Ensure attendance directory exists
        const attendanceDir = path.join(__dirname, 'attendance');
        if (!fs.existsSync(attendanceDir)) {
            fs.mkdirSync(attendanceDir);
        }
        // Move file to attendance directory
        const fileName = Date.now() + '-' + fileObj.originalname;
        const destPath = path.join(attendanceDir, fileName);
        fs.renameSync(fileObj.path, destPath);
        // Store in DB
        await sequelize.query(
            'INSERT INTO attendance (trainee_id, file_path) VALUES (?, ?)',
            { replacements: [traineeProgId, fileName] }
        );
        res.json({ success: true, filename: fileName });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save attendance', details: err.message });
    }
};

// Endpoint to send attendance PDF by email
const sendAttendanceByEmail = async (req, res) => {
    const { trainee_prog_id } = req.body;
    if (!trainee_prog_id) {
        return res.status(400).json({ error: 'trainee_prog_id is required' });
    }
    try {
        // Find attendance file for this trainee_prog_id
        const [rows] = await sequelize.query(
            'SELECT file_path FROM attendance WHERE trainee_id = ?',
            { replacements: [trainee_prog_id] }
        );
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'No attendance PDF found for this trainee program' });
        }
        const fileName = rows[0].file_path;
        const attendanceDir = path.join(__dirname, 'attendance');
        const filePath = path.join(attendanceDir, fileName);
        // Get instructor email by joining internship_transaction and instructors
        const [instructorRows] = await sequelize.query(
            `SELECT i.email FROM internship_transaction t
             JOIN instructors i ON t.instructor_id = i.instructor_id
             WHERE t.trainee_prog_id = ? LIMIT 1`,
            { replacements: [trainee_prog_id] }
        );
        if (!instructorRows || instructorRows.length === 0) {
            return res.status(404).json({ error: 'Instructor email not found for this trainee program' });
        }
        const instructor_email = instructorRows[0].email;
        const recipient_email = 'mupratham434@gmail.com';
        // Send email with nodemailer
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });
        let mailOptions = {
            from: instructor_email,
            to: recipient_email,
            subject: `Attendance PDF for Trainee Program ID: ${trainee_prog_id}`,
            text: `Please find the attendance PDF attached for Trainee Program ID: ${trainee_prog_id}.`,
            attachments: [
                {
                    filename: fileName,
                    path: filePath
                }
            ]
        };
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Attendance PDF sent successfully' });
    } catch (err) {
        console.error('Error sending attendance PDF:', err);
        res.status(500).json({ error: 'Failed to send attendance PDF', details: err.message });
    }
};

// Get project details by id
const getProjectDetails = async (req, res) => {
    const { project_id } = req.query;
    if (!project_id) {
        return res.status(400).json({ error: 'project_id is required' });
    }
    try {
        const [project] = await sequelize.query(
            'SELECT * FROM projects WHERE id = ?',
            { replacements: [project_id], type: QueryTypes.SELECT }
        );
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project);
    } catch (err) {
        console.error('Database error in getProjectDetails:', err);
        res.status(500).json({ error: 'Internal server error: ' + err.message });
    }
};

// Get trainee details by id
const getTraineeDetails = async (req, res) => {
    const { trainee_id } = req.query;
    if (!trainee_id) {
        return res.status(400).json({ error: 'trainee_id is required' });
    }
    try {
        const [trainee] = await sequelize.query(
            'SELECT * FROM trainees WHERE id = ?',
            { replacements: [trainee_id], type: QueryTypes.SELECT }
        );
        if (!trainee) {
            return res.status(404).json({ error: 'Trainee not found' });
        }
        res.json(trainee);
    } catch (err) {
        console.error('Database error in getTraineeDetails:', err);
        res.status(500).json({ error: 'Internal server error: ' + err.message });
    }
};

// Get trainee details by project id
const getTraineeByProjectId = async (req, res) => {
    const { project_id } = req.query;
    if (!project_id) {
        return res.status(400).json({ error: 'project_id is required' });
    }
    try {
        // 1. Get tr_id from projects
        const [project] = await sequelize.query(
            'SELECT tr_id FROM projects WHERE id = ?',
            { replacements: [project_id], type: QueryTypes.SELECT }
        );
        if (!project || !project.tr_id) {
            return res.status(404).json({ error: 'Project or trainee program not found' });
        }
        // 2. Get trainee_id from internship_transaction using tr_id
        const [transaction] = await sequelize.query(
            'SELECT trainee_id FROM internship_transaction WHERE trainee_prog_id = ?',
            { replacements: [project.tr_id], type: QueryTypes.SELECT }
        );
        if (!transaction || !transaction.trainee_id) {
            return res.status(404).json({ error: 'Trainee not mapped to this project' });
        }
        // 3. Get trainee details from trainees table
        const [trainee] = await sequelize.query(
            'SELECT * FROM trainees WHERE id = ?',
            { replacements: [transaction.trainee_id], type: QueryTypes.SELECT }
        );
        if (!trainee) {
            return res.status(404).json({ error: 'Trainee not found' });
        }
        res.json(trainee);
    } catch (err) {
        console.error('Database error in getTraineeByProjectId:', err);
        res.status(500).json({ error: 'Internal server error: ' + err.message });
    }
};

module.exports = { uploadFile,insLogin,addInternshipProgram, getAllInternshipPrograms, addInstructorToProgram, getInstructorsForProgram, getMyPrograms, addTrainee, addProject, getAllTrainees, getAllProjects, getDashboardData, addTraineeProgram, getTraineePrograms, getMyTraineePrograms, adminLogin, addTask, getTasks, updateTaskStatus, getProjectsForTraineeProgram, getUniqueTraineesForProgram, checkProjectFileStatus, uploadAttendance, sendAttendanceByEmail, getProjectDetails, getTraineeDetails, getTraineeByProjectId };
