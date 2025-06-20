const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Class name is required'],
        trim: true,
        minlength: [1, 'Class name must be at least 1 character long'],
        maxlength: [50, 'Class name cannot exceed 50 characters']
    },
    section: {
        type: String,
        required: [true, 'Section is required'],
        trim: true,
        uppercase: true,
        minlength: [1, 'Section must be at least 1 character long'],
        maxlength: [10, 'Section cannot exceed 10 characters']
    },
    academicYear: {
        type: String,
        required: [true, 'Academic year is required'],
        trim: true,
        validate: {
            validator: function(v) {
                return /^\d{4}-\d{4}$/.test(v);
            },
            message: props => `${props.value} is not a valid academic year! Use format: YYYY-YYYY`
        }
    },
    classTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        required: [true, 'Class teacher is required'],
        validate: {
            validator: async function(v) {
                if (!mongoose.Types.ObjectId.isValid(v)) return false;
                const Faculty = mongoose.model('Faculty');
                const faculty = await Faculty.findById(v);
                return faculty != null;
            },
            message: props => 'Invalid class teacher ID or teacher does not exist'
        }
    },
    capacity: {
        type: Number,
        required: [true, 'Class capacity is required'],
        min: [1, 'Capacity must be at least 1'],
        max: [200, 'Capacity cannot exceed 200']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [200, 'Description cannot exceed 200 characters']
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Created by user ID is required']
    }
}, {
    timestamps: true
});

// Drop all existing indexes
const dropIndexes = async () => {
    try {
        await mongoose.model('Class').collection.dropIndexes();
        console.log('Dropped all indexes from Class collection');
    } catch (error) {
        console.error('Error dropping indexes:', error);
    }
};

// Create compound index for uniqueness check
classSchema.index({ 
    name: 1, 
    section: 1, 
    academicYear: 1 
}, { 
    unique: true,
    name: 'unique_class_section_year',
    background: true,
    collation: { locale: 'en', strength: 2 } // Case-insensitive unique index
});

// Add text index for search functionality
classSchema.index({ 
    name: 'text', 
    description: 'text' 
}, {
    name: 'text_search_index',
    background: true
});

// Drop indexes when the model is compiled
mongoose.model('Class', classSchema).collection.dropIndexes().catch(console.error);

module.exports = mongoose.model('Class', classSchema); 