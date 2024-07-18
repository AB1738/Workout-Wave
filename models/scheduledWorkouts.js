const mongoose = require('mongoose');

const scheduledWorkoutSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  start: {
    type: Date,
    required: true
  },
});

const ScheduledWorkout = mongoose.model('ScheduledWorkout', scheduledWorkoutSchema);

module.exports = ScheduledWorkout;
