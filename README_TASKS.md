# Task Management Implementation

## Overview
The task management system has been updated to load tasks from the database based on project_id instead of using hardcoded data.

## Changes Made

### Backend Changes (Controller.js)
1. **Updated `getTasks` function**: Now properly handles tasks without status and adds default 'assigned' status
2. **Updated `addTask` function**: Now includes default 'assigned' status when creating new tasks
3. **Added `updateTaskStatus` function**: New endpoint to update task status and end date in the database
4. **Updated module.exports**: Added the new updateTaskStatus function

### Backend Changes (Router.js)
1. **Added new route**: `PUT /instructor/updateTaskStatus` for updating task status

### Frontend Changes (project_dashboard.html)
1. **Removed hardcoded tasks**: Replaced static task table with dynamic content
2. **Added `loadTasksFromDatabase()` function**: Loads tasks from the database when page loads
3. **Updated `updateTaskStatus()` function**: Now calls backend API to persist status changes
4. **Updated `updateTaskReassign()` function**: Now calls backend API to persist reassignment changes
5. **Updated form submission**: Reloads tasks after adding new task
6. **Fixed column indices**: Updated to work with the correct table structure

## Database Setup

### Required Database Changes
Run the following SQL script to add the status column to the tasks table:

```sql
-- Add status column to tasks table if it doesn't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'assigned';

-- Update existing tasks to have 'assigned' status if they don't have one
UPDATE tasks SET status = 'assigned' WHERE status IS NULL;
```

### Database Schema
The tasks table should have the following structure:
- `id` (Primary Key)
- `taskTitle` (VARCHAR)
- `startDate` (DATE)
- `endDate` (DATE)
- `project_id` (Foreign Key)
- `status` (VARCHAR(20)) - NEW COLUMN

## API Endpoints

### GET /instructor/tasks
- **Query Parameters**: `project_id` (required)
- **Response**: Array of tasks for the specified project
- **Example**: `GET /instructor/tasks?project_id=1`

### POST /instructor/addTask
- **Body**: `{ title, startDate, endDate, project_id }`
- **Response**: Success/error message
- **Note**: Automatically sets status to 'assigned'

### PUT /instructor/updateTaskStatus
- **Body**: `{ task_id, status, new_end_date? }`
- **Response**: Success/error message
- **Note**: `new_end_date` is optional and only used when status is 'reassigned'

## Usage Flow

1. **Login**: User logs in and navigates to the dashboard
2. **Select Project**: User clicks "View" on a project in the dashboard
3. **Load Tasks**: The project dashboard automatically loads tasks from the database
4. **Add Tasks**: User can add new tasks which are saved to the database
5. **Update Status**: User can update task status which persists to the database
6. **Reassign Tasks**: User can reassign tasks with new end dates

## Status Values
- `assigned` - Task is assigned but not started
- `completed` - Task is fully completed
- `partial` - Task is partially completed
- `reassigned` - Task has been reassigned with new end date
- `not-completed` - Task was not completed

## Error Handling
- Database connection errors are handled gracefully
- Missing project_id shows appropriate error message
- Failed API calls show user-friendly error messages
- Loading states are displayed during API calls 