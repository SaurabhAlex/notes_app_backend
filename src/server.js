//Initialization
const express = require('express');
const app = express();
const mongoose = require("mongoose");
const Note = require('./models/note');
const bodyParser = require('body-parser');
const noteRouter = require('./routes/notes'); // Import the notes router


app.use(bodyParser.urlencoded({ extended: false }));
// if extended true -> nested body parse
// if extended false -> nested body dont parse

app.use(bodyParser.json());
const mongoDbPath = "mongodb+srv://saurabhalex:Alexdb1@notes.3qcrt.mongodb.net/?retryWrites=true&w=majority&appName=Notes";

mongoose.connect(mongoDbPath).then(
    () => console.log("connected to MongoDB")
).catch((error) => {
    console.log('Error connecting to MongoDB', error);
});

// home screen
app.get("/", function (req, res) {
    const response = {
        message: "API works"
    }
    res.json(response);
})

app.use('/', noteRouter);


//starting the server on a port

const PORT = process.env.PORT || 5001;

app.listen(PORT, function () {
    console.log("server started at port : " + PORT);
});


