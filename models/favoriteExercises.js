const mongoose = require('mongoose');

const favoriteExercisesSchema = new mongoose.Schema({
    bodyPart: String,
    equipment: String,
    gifUrl: String,
    id: String,
    name: String,
    target:String,
    secondaryMuscles: [String],
    instructions: [String]
    
    
  });

module.exports = mongoose.model('FavoriteExercises', favoriteExercisesSchema);

