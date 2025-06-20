const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
    facultyId: {
        type: String,
        unique: true,
        trim: true,
        sparse: true
    },
    employeeId: {
        type: String,
        unique: true,
        trim: true,
        sparse: true
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        minlength: [2, 'First name must be at least 2 characters long'],
        maxlength: [50, 'First name cannot exceed 50 characters'],
        match: [/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        minlength: [2, 'Last name must be at least 2 characters long'],
        maxlength: [50, 'Last name cannot exceed 50 characters'],
        match: [/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [
            /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            'Please enter a valid email address'
        ]
    },
    mobileNumber: {
        type: String,
        required: [true, 'Mobile number is required'],
        unique: true,
        trim: true,
        validate: {
            validator: function(v) {
                // Allows formats: +91-1234567890, +91 1234567890, 1234567890
                return /^(\+\d{1,3}[-\s]?)?\d{10}$/.test(v);
            },
            message: props => `${props.value} is not a valid mobile number! Use format: +91-1234567890 or 1234567890`
        }
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: {
            values: ['Male', 'Female', 'Other'],
            message: 'Gender must be either Male, Female, or Other'
        }
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true,
        validate: {
            validator: function(v) {
                return v.length >= 2 && /^[a-zA-Z\s&-]+$/.test(v);
            },
            message: 'Department name must be at least 2 characters long and can contain letters, spaces, &, and hyphens'
        }
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: [true, 'Role is required']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Generate unique IDs before saving
facultySchema.pre('save', async function(next) {
    try {
        // Skip if IDs are already set
        if (this.employeeId && this.facultyId) {
            return next();
        }

        const currentYear = new Date().getFullYear().toString().slice(-2);
        const departmentCode = this.department.slice(0, 3).toUpperCase();
        
        // Get the count of existing faculty members
        const count = await mongoose.model('Faculty', facultySchema).countDocuments();
        const sequence = (count + 1).toString().padStart(4, '0');
        
        // Generate IDs if not set
        if (!this.employeeId) {
            this.employeeId = `FAC-${currentYear}-${departmentCode}-${sequence}`;
        }
        if (!this.facultyId) {
            this.facultyId = `F${currentYear}${departmentCode}${sequence}`;
        }
        
        next();
    } catch (error) {
        next(error);
    }
});

// Validate that role exists and is active before saving
facultySchema.pre('save', async function(next) {
    try {
        if (this.isModified('role')) {
            const Role = mongoose.model('Role');
            const role = await Role.findOne({ _id: this.role, isActive: true });
            if (!role) {
                throw new Error('Selected role does not exist or is inactive');
            }
        }
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Faculty', facultySchema); 