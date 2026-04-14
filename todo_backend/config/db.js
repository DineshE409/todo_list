const mongoose = require("mongoose");

const connectDB = async (uri) => {
    try {
        if (typeof uri !== "string" || uri.trim() === "") {
            throw new Error("MONGO_URI is missing. Check your .env file and load dotenv before calling connectDB().");
        }

        await mongoose.connect(uri);
        console.log("MongoDB connected");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

module.exports = connectDB;
