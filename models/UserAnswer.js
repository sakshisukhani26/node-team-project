const mongoose = require('mongoose');

const UserFormDataSchema = new mongoose.Schema({
  formId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Form" },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  formTitle: { type: String, required: true },
  answers: { type: Map, of: mongoose.Schema.Types.Mixed, required: true },
});

module.exports = mongoose.model('UserAnswer', UserFormDataSchema);
 