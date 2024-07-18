const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  bodyPart: { type: String },
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

module.exports = Exercise;
