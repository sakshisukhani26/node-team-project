const mongoose = require('mongoose');

const FormFieldSchema = new mongoose.Schema({
  question: { type: String, required: false },
  type: { type: String, required: false },
  name: { type: String, required: false },
  id: { type: String, required: false },
  placeholder: { type: String, required: false },
  validation: { type: String, required: false },
  options: { type: [String], default: [] },
});

module.exports = FormFieldSchema;