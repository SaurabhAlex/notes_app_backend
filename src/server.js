//Initialization
const express = require('express');
const app = express();
const mongoose = require("mongoose");
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger');
const noteRouter = require('./routes/notes');
const authRouter = require('./routes/auth');

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
// if extended true -> nested body parse
// if extended false -> nested body dont parse

app.use(bodyParser.json());

// Swagger UI setup - putting it before routes to ensure it's always accessible
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpecs, { explorer: true }));

// MongoDB connection
const mongoDbPath = "mongodb://127.0.0.1:27017/notesdb";

mongoose.connect(mongoDbPath, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to MongoDB successfully");
    // Only start the server after successful MongoDB connection
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, function () {
        console.log("Server started at port: " + PORT);
        console.log("Swagger documentation available at: http://localhost:" + PORT + "/api-docs");
    });
}).catch((error) => {
    console.log('Error connecting to MongoDB:', error);
    process.exit(1); // Exit if MongoDB connection fails
});

// home screen
app.get("/", function (req, res) {
    const response = {
        message: "API works"
    }
    res.json(response);
})

// Routes
app.use('/auth', authRouter);
app.use('/', noteRouter);


