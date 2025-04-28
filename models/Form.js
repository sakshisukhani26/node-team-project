const mongoose = require('mongoose');
const FormFieldSchema = require('./FormField');

const FormSchema = new mongoose.Schema({
  formTitle: { type: String, required: true },
  fieldCount: { type: Number, required: true },
  formData: [FormFieldSchema],
});

module.exports = mongoose.model('Form', FormSchema);
 