const Todo = require("../model/todoModel");
const User = require("../model/userModel");
const TaskLog = require("../model/taskLogModel");
const bcrypt = require("bcryptjs");

const todos = async (req, res) => {
    try {
        const { title, description, userId } = req.body;
        if (!title || !description || !userId) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }
        const newTodo = await Todo.create({
            title,
            description,
            userId
        });
        res.status(200).json({
            message: "Todo created successfully",
            data: newTodo
        });

        // const todos = await Todo.find().sort({ 
        //     _id: -1 
        // });
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: err.message })
    }

};

const gettodos = async (req, res) => {
    try {
        const { userId, date } = req.query;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }
        const todos = await Todo.find({ userId }).lean().sort({
            order: 1
        });
        
        let logs = [];
        if (date) {
            logs = await TaskLog.find({ userId, date: date }).lean();
        }
        
        const todosWithLogs = todos.map(todo => {
            const logEntry = logs.find(log => log.taskId.toString() === todo._id.toString());
            return {
                ...todo,
                todayStatus: logEntry ? logEntry.status : null
            };
        });

        res.status(200).json({
            message: "todo fetched",
            data: todosWithLogs,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updatetodos = async (req, res) => {
    try {
        const { title, description, userId } = req.body;
        const id = req.params.id;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const updatedtodo = await Todo.findOneAndUpdate(
            { _id: id, userId: userId },
            { title, description },
            { returnDocument: 'after' }
        );
        if (!updatedtodo) {
            return res.status(404).json({ message: "value not found" });
        }
        res.status(200).json({ message: "updated successfully", data: updatedtodo });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const removetodos = async (req, res) => {
    try {
        const id = req.params.id;
        const { userId } = req.query; // Send it via query params for DELETE

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const removetodo = await Todo.findOneAndDelete({ _id: id, userId: userId });

        if (!removetodo) {
            return res.status(404).json({ message: "value not found" });
        }
        res.status(200).json({ message: "deleted successfully", data: removetodo });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }
        // we omit sending the full password hash back
        res.status(200).json({ message: "Login successful", data: { id: user._id, username: user.username } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const register = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const user = await User.create({ username, password: hashedPassword });
        res.status(201).json({ message: "User registered successfully", data: { id: user._id, username: user.username } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const reorderTodos = async (req, res) => {
    try {
        const { userId, items } = req.body;
        // items is anticipated to be an array of objects: { _id: "taskid", order: 1 }
        
        if (!userId || !Array.isArray(items)) {
            return res.status(400).json({ message: "Invalid payload format" });
        }

        const bulkOps = items.map((item) => ({
            updateOne: {
                filter: { _id: item._id, userId: userId },
                update: { order: item.order }
            }
        }));

        await Todo.bulkWrite(bulkOps);

        res.status(200).json({ message: "Reordered successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const logTask = async (req, res) => {
    try {
        const { userId, taskId, date, status } = req.body;
        if (!userId || !taskId || !date || !status) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const log = await TaskLog.findOneAndUpdate(
            { userId, taskId, date },
            { status },
            { new: true, upsert: true }
        );

        res.status(200).json({ message: "Task status logged", data: log });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const logTaskBulk = async (req, res) => {
    try {
        const { userId, date, logs } = req.body;
        
        if (!userId || !date || !Array.isArray(logs)) {
            return res.status(400).json({ message: "Invalid payload format" });
        }

        const bulkOps = logs.map(log => ({
            updateOne: {
                filter: { userId, taskId: log.taskId, date },
                update: { status: log.status },
                upsert: true
            }
        }));

        if (bulkOps.length > 0) {
            await TaskLog.bulkWrite(bulkOps);
        }

        res.status(200).json({ message: "Bulk logs saved successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMetrics = async (req, res) => {
    try {
        const { userId, month, year } = req.query;
        if (!userId) return res.status(400).json({ message: "User ID is required" });

        const now = new Date();
        let targetMonthIdx, targetYear;
        
        if (month && year) {
            targetMonthIdx = parseInt(month) - 1; // 0-indexed representation
            targetYear = parseInt(year);
        } else {
            // Default to strictly previous calendar month if no query provided
            targetMonthIdx = now.getMonth() - 1;
            targetYear = now.getFullYear();
            if (targetMonthIdx < 0) {
                targetMonthIdx = 11; // December
                targetYear -= 1;
            }
        }

        const pad = n => n < 10 ? '0'+n : n;
        const paddedMonth = pad(targetMonthIdx + 1);
        
        // Start of month is always the 1st
        const startDateStr = `${targetYear}-${paddedMonth}-01`;
        
        // Retrieve the exact last calendar day natively (28, 29, 30, or 31)
        const lastDayInt = new Date(targetYear, targetMonthIdx + 1, 0).getDate();
        const endDateStr = `${targetYear}-${paddedMonth}-${lastDayInt}`;
        
        const firstDay = new Date(targetYear, targetMonthIdx, 1);

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const outputTargetMonthStr = `${monthNames[firstDay.getMonth()]} ${firstDay.getFullYear()}`;

        const logs = await TaskLog.find({
            userId,
            date: { $gte: startDateStr, $lte: endDateStr }
        }).lean();

        let totalYes = 0;
        let totalNo = 0;
        
        const sortedLogs = logs.sort((a,b) => a.date.localeCompare(b.date));
        const taskStreaks = {};
        let bestStreak = 0;

        sortedLogs.forEach(log => {
            if (log.status === 'yes') {
                totalYes++;
                taskStreaks[log.taskId] = (taskStreaks[log.taskId] || 0) + 1;
                if (taskStreaks[log.taskId] > bestStreak) bestStreak = taskStreaks[log.taskId];
            } else {
                totalNo++;
                taskStreaks[log.taskId] = 0; // reset streak if missed
            }
        });

        const totalEntries = totalYes + totalNo;
        const completionPercentage = totalEntries === 0 ? 0 : Math.round((totalYes / totalEntries) * 100);

        res.status(200).json({
            message: "Metrics generated successfully",
            data: {
                totalYes,
                totalNo,
                completionPercentage,
                bestStreak,
                targetMonth: outputTargetMonthStr
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { todos, gettodos, updatetodos, removetodos, login, register, reorderTodos, logTask, logTaskBulk, getMetrics }