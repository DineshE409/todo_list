const express = require("express");
const authRoute = require("./route/authRoute.js");
const connectDB = require("./config/db.js");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();

connectDB(process.env.MONGO_URI);

app.use(express.json());
app.use(cors());

app.use("/api/auth", authRoute);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`server is running on ${PORT}`);
});
