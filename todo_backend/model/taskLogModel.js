const mongoose = require("mongoose");

const taskLogSchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Todo',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    date: {
        type: String, // Stored as "YYYY-MM-DD"
        required: true,
    },
    status: {
        type: String,
        enum: ['yes', 'no'],
        required: true,
    }
}, { timestamps: true });

// Ensure a user can only log one status per task per day
taskLogSchema.index({ taskId: 1, date: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('TaskLog', taskLogSchema);
