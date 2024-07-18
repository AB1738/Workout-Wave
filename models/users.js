const mongoose=require('mongoose')
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
        },
    dateOfBirth:{
        type:Date,
        required:true,
        min: new Date('1900-01-01'), 
        max: new Date('2019-01-01')  
    },
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationTokenExpires: Date,
    passwordResetToken:String,
    passwordResetExpires: Date,
    email: {
        type:String,
        required:true,
        unique:true
    },
    // password: {
    //     type:String,
    //     required:true,
    //     unique:true
    // },
    workouts: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Workout' 
    }],
    scheduledWorkouts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ScheduledWorkout'
      }],
      goals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Goals'
      }],
      favoriteExercises: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FavoriteExercises'
      }]
      
})  

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });

module.exports=mongoose.model('User',userSchema);;