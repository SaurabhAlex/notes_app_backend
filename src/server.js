//Initialization
const express = require('express');
const app = express();
const mongoose = require("mongoose");
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger');
const cors = require('cors');
const authRouter = require('./routes/auth');
const studentRouter = require('./routes/student');
const facultyRouter = require('./routes/faculty');
const userRoutes = require('./routes/user');
const roleRoutes = require('./routes/role');
const classRoutes = require('./routes/class');

// CORS configuration
app.use(cors());

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Additional headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpecs, { explorer: true }));

// MongoDB connection
const mongoDbPath = "mongodb+srv://saurabhalex:Alexdb1@notes.3qcrt.mongodb.net/?retryWrites=true&w=majority&appName=Notes";

mongoose.connect(mongoDbPath)
    .then(() => {
        console.log("Connected to MongoDB successfully");
    })
    .catch((error) => {
        console.log('Error connecting to MongoDB:', error);
        process.exit(1);
    });

// Basic route
app.get("/", (req, res) => {
    res.json({ message: "API works" });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/user', userRoutes);
app.use('/api/faculty', facultyRouter);
app.use('/api/student', studentRouter);
app.use('/api/role', roleRoutes);
app.use('/api/class', classRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false,
        error: 'Something went wrong! Please try again.' 
    });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server started at port: ${PORT}`);
    console.log(`Swagger documentation available at: http://localhost:${PORT}/api-docs`);
});

module.exports = app;


