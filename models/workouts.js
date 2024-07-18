const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
      },
      exercise: {
        type: String,
        required: true
      },
      sets: {
        type: Number,
        required: true
      },
      reps: {
        type: [Number],
        required: true
      },
      weight: {
        type: Number
      },
      duration: {
        type: Number 
      },
      distance:{
        type:Number  //distance traveled for running type exercises 
      },

});

module.exports= mongoose.model('Workout', workoutSchema);


