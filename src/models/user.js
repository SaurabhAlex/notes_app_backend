const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    mobileNumber: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid mobile number']
    },
    role: {
        type: String,
        enum: ['admin', 'faculty', 'student'],
        required: true,
        default: 'faculty'
    },
    isFirstLogin: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    const user = this;
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }
    next();
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User; 