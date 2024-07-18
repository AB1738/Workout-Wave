const express=require('express')
const app=express()
const axios=require('axios')
const path=require('path')
const fs = require('fs');
const session = require('express-session')
const ejsMate=require('ejs-mate')
const mongoose=require('mongoose')
const User=require('./models/users')
const Workout=require('./models/workouts')
const ScheduledWorkout=require('./models/scheduledWorkouts')
const FavoriteExercises=require('./models/favoriteExercises')
const Goals=require('./models/goals')
const passport = require('passport');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
// const moment = require('moment')
const moment = require('moment-timezone')
const workouts = require('./models/workouts')
const favoriteExercises = require('./models/favoriteExercises')
const Exercise = require('./models/exercises');
require('dotenv').config()  
const PORT=3000
const toTitleCase = str => str.replace(/(^\w|\s\w)(\S*)/g, (_,m1,m2) => m1.toUpperCase()+m2.toLowerCase())
mongoose.connect('mongodb://127.0.0.1:27017/workoutWave')
    .then(()=>{
         console.log("Connection Open!!")
        })
        .catch(err=>{
            console.log('Oh no error')
            console.log(err)
        })



app.set('view engine', 'ejs') 
app.engine('ejs',ejsMate)
app.set('views',path.join(__dirname,'views'))
app.use(express.urlencoded({extended:true}))
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')))
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  }))
app.use(passport.initialize());
app.use(passport.session());



passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login');
  }
  const ensureRegisteredButNotVerified = (req, res, next) => {
    if (!req.session.isRegistered) {
        return res.redirect('/'); // Redirect to home if not registered
    }
    next(); // Proceed to the next middleware or route handler
};




const downloadImage = async (url, dest) => {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(dest);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        fs.unlink(dest, () => {}); // Clean up if error occurs
        throw error;
    }
};
  
  const fetchBodyPartExercises=async(bodyPart)=>  {
    try {
      const response = await axios.get(`https://exercisedb.p.rapidapi.com/exercises/bodyPart/${bodyPart}`, {
        params: { limit: '104' },
        headers: {
          'X-RapidAPI-Key': process.env.API_KEY,
          'X-RapidAPI-Host': process.env.API_HOST
        }
      });
      console.log('Response Headers:', response.headers);
    //   console.log('Response Data:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching exercises:', error);
      return null;
    }
  }

//   app.get('/test',async(req,res)=>{
//     const exercises=await Exercise.find()
//     let names=[]
//     for(e of exercises){
//         names
//     }
//     res.send(exercises)
//   })




app.get('/',(req,res)=>{
    res.render('home',{user:req.user,})
})

app.get('/exercise/:bodyPart',async(req,res)=>{
    try {
        const {bodyPart}=req.params
        const exercises =await fetchBodyPartExercises(bodyPart);
        req.session.exercises=exercises
        req.session.bodypart=bodyPart
        // console.log(exercises);
        // res.render('exercises',{exercises,bodyPart})
        res.redirect(`/exercises/${bodyPart}?page=1`)
      



    } catch (error) {
        console.error(error);
    }
  
})

app.get('/exercises/:bodyPart',async(req,res)=>{
    try{
        if(req.session.exercises&&req.session.bodypart==req.params.bodyPart){
            const exercises=req.session.exercises
            const bodyPart=req.session.bodypart
            const itemsPerPage = 26;
            // console.log(exercises)

            const page = parseInt(req.query.page) || 1;
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedExercises = exercises.slice(startIndex, endIndex);
            const favoriteExerciseArray=[]
            if(req.user){
            for(let exercise of paginatedExercises){
                const favoriteExercise=await FavoriteExercises.findOne({id:exercise.id})
                if(favoriteExercise!==null){
                    favoriteExerciseArray.push(favoriteExercise)
                }
            }
            console.log(favoriteExerciseArray)
        }
            
            // Calculate total number of pages
            const totalPages = Math.ceil(exercises.length / itemsPerPage);

            // delete req.session.exercises;
            // delete req.session.bodypart;
            
            // Render the EJS template with the paginated data
            res.render('exercises', { exercises: paginatedExercises, totalPages, currentPage: page,bodyPart,toTitleCase,user:req.user,favoriteExerciseArray});
        }
        else{
            res.redirect(`/`)
        }
   

      
    // res.render('exercises',{exercises,bodyPart})
    }catch(e){
        console.log(e)
    }
})


app.get('/register',async(req,res)=>{
    if(req.user){
        return res.redirect('/dashboard')
    }
    res.render('register',{user:req.user})
})

app.post('/register', async (req, res) => {
    const { name, dateOfBirth, email, password } = req.body;

    try {
        // Create a new user instance
        const user = new User({ name, dateOfBirth, email });

        // Register the user with passport-local-mongoose
        const newUser = await User.register(user, password);

        // Generate a verification token
        const token = crypto.randomBytes(20).toString('hex');

        // Set token expiration time (e.g., 1 hour from now)
        const tokenExpiration = Date.now() + 36000000; // 1 hour in milliseconds

        // Save the token and set isVerified to false
        newUser.verificationToken = token;
        newUser.verificationTokenExpires = tokenExpiration;
        newUser.isVerified = false;
        await newUser.save();

        // Send verification email
        const transporter = nodemailer.createTransport({
            host: 'smtp-mail.outlook.com',
            port:587,
            auth: {
                user: process.env.EMAIL, // Your email address
                pass: process.env.EMAIL_PASSWORD, // Your email password
            },
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: newUser.email,
            subject: 'Account Verification',
            text: `Please verify your account by clicking the following link: http://${req.headers.host}/verify/${token}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending verification email:', error);
                res.status(500).send('Error sending verification email');
            } else {
                console.log('Verification email sent:', info.response);
                req.session.isRegistered = true;
                req.session.userEmail = newUser.email;
                res.redirect('/register/verification');
            }
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Error registering user');
    }
});
app.get('/register/verification',ensureRegisteredButNotVerified,async(req,res)=>{
    const email=req.session.userEmail
    const user = await User.findOne({ email: email});
    const token=user.verificationToken
    req.session.userEmail=null
    res.render('verification',({user:req.user,email}))
})

// app.get('/test',(req,res)=>{
//     const email='testing@123.com'
//     res.render('verification',({user:req.user,email}))
// })

// Verification route
app.get('/verify/:token', async (req, res) => {
    try {
        // Find the user by verification token
        const user = await User.findOne({ verificationToken: req.params.token });

        if (!user) {
            return res.status(400).send('Invalid or expired token');
        }
        if (Date.now() > user.verificationTokenExpires) {
            return res.status(400).send('Token has expired. Please request a new verification email.');
        }

        // Mark user as verified and clear verification token
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        req.session.isRegistered = null;
        req.session.userEmail = null;
        await user.save();
//registration completed flash message
        res.redirect('/login')
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(500).send('Error verifying account');
    }
});

app.get('/verification-email/:email',async (req,res)=>{

    const user = await User.findOne({ email: req.params.email });

    if(user==null){
        return res.send('email not found')
    }

    const token = crypto.randomBytes(20).toString('hex');

    // Set token expiration time (e.g., 1 hour from now)
    const tokenExpiration = Date.now() + 30000; // 1 hour in milliseconds

    // Save the token and set isVerified to false
    user.verificationToken = token;
    user.verificationTokenExpires = tokenExpiration;
    user.isVerified = false;
    await user.save();
    const transporter = nodemailer.createTransport({
        host: 'smtp-mail.outlook.com',
        port:587,
        auth: {
            user: process.env.EMAIL, // Your email address
            pass: process.env.EMAIL_PASSWORD, // Your email password
        },
    });

    const mailOptions = {
        from: process.env.EMAIL,
        to: user.email,
        subject: 'Account Verification',
        text: `Please verify your account by clicking the following link: http://${req.headers.host}/verify/${token}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sending verification email:', error);
            res.status(500).send('Error sending verification email');
        } else {
            console.log('Verification email sent:', info.response);
            req.session.isRegistered = true;
            req.session.userEmail = user.email;
            res.redirect('/register/verification');
        }
    });

})

app.get('/forgot-password',async(req,res)=>{
    res.render('forgotPassword',({user:req.user}))
})

app.post('/reset-password',async(req,res)=>{
    try{
        const {email}=req.body
        const user = await User.findOne({ email: email });
        if(user==null){
           return res.send('email not found')  //make this a flash message
        }

    if(user.isVerified==false){
        return res.redirect(`/verification-email/:${email}`)
        // res.send('user account is not verified. Ask for a verification link') //figure this out
    }
    
    else{
    const token = crypto.randomBytes(20).toString('hex');

    // Set token expiration time (e.g., 1 hour from now)
    const passwordResetExpiration = Date.now() + 30000; // 1 hour in milliseconds

    // Save the token and set isVerified to false
    user.passwordResetToken = token;
    user.passwordResetExpires = passwordResetExpiration; 
    await user.save();
    const transporter = nodemailer.createTransport({
        host: 'smtp-mail.outlook.com',
        port:587,
        auth: {
            user: process.env.EMAIL, // Your email address
            pass: process.env.EMAIL_PASSWORD, // Your email password
        },
    });

    const mailOptions = {
        from: process.env.EMAIL,
        to: user.email,
        subject: 'Password Reset',
        text: `Reset your password by clicking the following link: http://${req.headers.host}/reset-password/${token}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sending verification email:', error);
            res.status(500).send('Error sending verification email');
        } else {
            console.log('Verification email sent:', info.response);
            req.session.isRegistered = true;
            req.session.userEmail = user.email;
            //change this
            res.redirect('/register/verification');
        }
    });
    }
    
        // res.send(user)
    }catch(e){
        console.log(e)
    }

})

app.get('/reset-password/:token',async(req,res,next)=>{
const user = await User.findOne({ 
            passwordResetToken: req.params.token, 
            passwordResetExpires: { $gt: Date.now() } 
        }); 
        if (!user) {
            return res.status(400).send('Password reset token is invalid or has expired');
        }

          else if(user){
    return res.render('changePassword',{user,token:req.params.token})
    }
    else{
        next()
    }
    
})

app.post('/reset-password/:token',async(req,res)=>{
    const {password}=req.body
    const user = await User.findOne({ 
        passwordResetToken: req.params.token, 
        passwordResetExpires: { $gt: Date.now() } 
    });    
    if(user==null){
        res.send('user not found')
    }
     await user.setPassword(password);
     user.passwordResetToken = undefined;
     user.passwordResetExpires = undefined;
     await user.save();
     console.log('password has been reset') //make this a flash message
    console.log(password)
    res.redirect('/login')
})

app.get('/password-reset',isAuthenticated,async(req,res)=>{
    const user=req.user
    res.render('loggedInPasswordReset',{user})
})
app.post('/password-reset',isAuthenticated,async(req,res)=>{
    const {email,password}=req.body
    const user=await User.findOne({email:email})
    if(user==null){
        res.send('user not found')
    }
    await user.setPassword(password);
    await user.save();
    console.log('password has been reset')
   console.log(password)
   res.redirect('/login')
})







app.get('/login',(req,res)=>{
    if(req.user){
       return res.redirect('/dashboard')
    }
    else{
        res.render('login',{user:req.user})
    }
})



app.post('/login', passport.authenticate('local',{ failureRedirect: '/login'}), (req, res) => {
  // Successful authentication, redirect or respond as needed
//   res.send(`Login successful! Welcome back ${req.user.name}`);
    res.redirect('/dashboard')
});

app.get('/logout',(req,res)=>{
    req.logout(function(err) {
        if (err) { return next(err); }
        // req.flash('success', `Goodbye. See you soon!`)
        res.redirect('/');//redirects users to page they were on before they logged out
      });
})



app.get('/profile',isAuthenticated,(req,res)=>{
    const {name,dateOfBirth,email}=req.user
    res.render('profile',{name,dateOfBirth,email,user:req.user,toTitleCase,moment})
})

app.get('/dashboard',isAuthenticated,async(req,res)=>{
    const currentUser=await User.findById(req.user.id).populate('workouts')
    const workouts=currentUser.workouts
    let arr=[]
    let bodyPartArray=[]


    for(workout of workouts){
       const results= await Exercise.find({name:workout.exercise})
       bodyPartArray.push(results[0].bodyPart)
 }

 const countOccurrences = (array) => {
    return array.reduce((acc, curr) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
    }, {});
};

const bodyPartCounts = countOccurrences(bodyPartArray);

const bodyPartLabels = Object.keys(bodyPartCounts);
const bodyPartData = Object.values(bodyPartCounts);
const updatedBodyPartLabels = bodyPartLabels.map(label => 
    label === 'waist' ? 'abs' : label
);

    // console.log(bodyPartArray)
    // const workouts=currentUser.workouts
    const userId = req.user.id;
  // Calculate the start of the current week
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const timezoneOffset = startOfWeek.getTimezoneOffset() * 60000; // Timezone offset in milliseconds
  const startOfWeekAdjusted = new Date(startOfWeek.getTime() - timezoneOffset);
  
  console.log('Start of week:', startOfWeekAdjusted);
  

//   console.log('Start of the week:', startOfWeek);
//   for(let workouts of currentUser.workouts){
//     console.log(workouts.date)
//     if(workouts.date<startOfWeek){
//         console.log('workout was logged prior to start of week')
//     }
//     else if(workouts.date===startOfWeek){
//         console.log('workout was logged on start of week')
//     }
//     else{
//         console.log('workout was logged after start of week')
//     }

//   }
// console.log('----------------------------')
  // Fetch the user and populate workouts
  const user = await User.findById(userId).populate('workouts');

// Filter workouts to only include those within the current week
const filteredWorkouts = user.workouts.filter(workout => {
    const workoutDate = new Date(workout.date);
    return workoutDate >= startOfWeekAdjusted && workoutDate < new Date(startOfWeekAdjusted.getTime() + 7 * 24 * 60 * 60 * 1000);
});

console.log('Filtered workouts:', filteredWorkouts);

// Aggregate workouts by day of the week
const workoutsByDay = filteredWorkouts.reduce((acc, workout) => {
    const dayOfWeek = new Date(workout.date).getDay(); // 0 (Sunday) to 6 (Saturday)
    if (!acc[dayOfWeek]) {
        acc[dayOfWeek] = 0;
    }
    acc[dayOfWeek]++;
    return acc;
}, {});

console.log('Workouts by day:', workoutsByDay);

const data = Array(7).fill(0);

// Adjust so that Sunday is the first day in the array
for (let i = 0; i < 7; i++) {
    const index = (i + 6) % 7;
    data[i] = workoutsByDay[index] || 0;
}

console.log('Data for chart:', data);
  

//   console.log('Workouts by day:', workoutsByDay);

  // Prepare the data array for the chart (7 days of the week)
//   const data = Array(7).fill(0);
// for (let i = 0; i < 7; i++) {
//     data[i] = workoutsByDay[i] || 0;
// }

  
//   console.log(data)

  
    let minsOfCardio=0
    for(workout of workouts){
        const exercise=await Exercise.find({name:workout.exercise})
        if(exercise[0].bodyPart=='cardio'){
            minsOfCardio+=workout.duration
        }
    }
  
    // console.log(data)

    res.render('dashboard',{user:req.user,toTitleCase,data,updatedBodyPartLabels,bodyPartData,minsOfCardio})
})

app.get('/workout/:workoutName',isAuthenticated,async(req,res)=>{
    // const{workoutName}=req.params
    const workoutName = decodeURIComponent(req.params.workoutName);
    const exercise=await Exercise.find({name:workoutName})
    const user=await User.findById(req.user.id).populate('workouts')
    const workouts=user.workouts
    let filteredCardioWorkouts=[]
    let filteredWorkouts=[]
    if(!exercise.length<1){
        if(exercise[0].bodyPart==='cardio'){
            filteredCardioWorkouts= workouts.filter((workout)=>workout.exercise==exercise[0].name)
               console.log(filteredCardioWorkouts)
               console.log('filtered workouts',filteredWorkouts)
               return res.render('workoutData',{user:req.user,filteredCardioWorkouts,filteredWorkouts,toTitleCase})
        }
        else{
            filteredWorkouts= workouts.filter((workout)=>workout.exercise==exercise[0].name)
            console.log(filteredWorkouts)
            console.log('filtered cardio workouts',filteredCardioWorkouts)
            return res.render('workoutData',{user:req.user,filteredCardioWorkouts,filteredWorkouts,toTitleCase,moment})
        }

  

    }
    else{
        console.log('exercise does not exist') //make this a flash message
        return res.redirect('/dashboard')
    }
})


app.get('/dashboard/workout',isAuthenticated,async(req,res)=>{
    const exercises=await Exercise.find()
    res.render('workout',{user:req.user,toTitleCase,exercises})
})
app.post('/workout',isAuthenticated,async(req,res)=>{
    const {date,exercise,sets,reps,weight,duration,distance}=req.body
    const results=await Exercise.findOne({name:exercise})
    console.log(req.body)


try{
    if(results){


        if(results.bodyPart=='cardio'){
            if(duration==null){
                return res.status(400).send('Duration is required for cardio exercises');

            }
            else{
                const workout=new Workout({date:date,exercise:exercise,sets:sets,reps: reps.map(Number),weight:weight,duration:duration,distance:distance})
                const user=await User.findById(req.user.id)
                await workout.save()
            
                user.workouts.push(workout._id)
                await user.save()
                
            
               return res.redirect('/dashboard/workout')
    
            }
        }
        if(results.bodyPart!=='cardio'){
            const workout=new Workout({date:date,exercise:exercise,sets:sets,reps: reps.map(Number),weight:weight,duration:duration})
            const user=await User.findById(req.user.id)
            await workout.save()
        
            user.workouts.push(workout._id)
            await user.save()
            
        
           return res.redirect('/dashboard/workout')
            
        }
 
    }
    else{
        return res.status(404).send('Exercise not found');
    }
}catch(e){
    console.error(e);
    return res.status(500).send('Server error');
}
 
})
app.get('/dashboard/workoutHistory',isAuthenticated,async(req,res)=>{
    const user=await User.findById(req.user.id).populate('workouts')
    // console.log(user)
    res.render('workoutHistory',{user,toTitleCase,moment})
})

app.delete('/dashboard/workoutHistory/:workoutId',isAuthenticated,async(req,res)=>{
    const {workoutId}=req.params
    const user=await User.findById(req.user.id)
    const workout=await Workout.findByIdAndDelete(workoutId)
    const filteredWorkouts= user.workouts.filter((workout)=>workout.toString()!==workoutId.toString())
    user.workous=filteredWorkouts
    await user.save()
    res.status(200).json({ status: 'success'});
})

app.get('/dashboard/schedule',isAuthenticated,async(req,res)=>{
    const user=await User.findById(req.user.id).populate('scheduledWorkouts');
//     for(let workouts of user.scheduledWorkouts){
//         console.log(workouts.start)
//     }
//    console.log('BEFORE HTML RENDERING')
    res.render('schedule',{user,moment})
})
app.post('/dashboard/schedule',isAuthenticated,async(req,res)=>{
    const workout=new ScheduledWorkout({...req.body})
    const user=await User.findById(req.user.id)
    await workout.save()
    user.scheduledWorkouts.push(workout._id)
    await user.save()
    // console.log(workout)
    // console.log(user)
    res.redirect('/dashboard/schedule')
})

app.patch('/dashboard/update-schedule-event/:id', async (req, res) => {
    try{
        const {id}=req.params
        const {start}=req.body
        const workout= await ScheduledWorkout.findByIdAndUpdate(id,{start:start})
        console.log(workout)
        
        console.log('patch request successfully sent')
        console.log(id)
      console.log(start)
      res.status(200).json({ status: 'success'});
    } catch (error) {
      console.error('Error updating schedule:', error);
      res.status(500).json({ status: 'error', message: 'An error occurred while updating the schedule' });
        }

  });
app.delete('/dashboard/update-schedule-event/:id', async (req, res) => {
   try{
    const {id}=req.params
    const user=await User.findById(req.user.id)
    console.log(id)
    console.log('-----------------------------------------')
    // console.log(req.user)

    // const workout= await ScheduledWorkout.findByIdAndDelete(id)
    for(let w of user.scheduledWorkouts){
        console.log(w.toString().slice(0, 24))
    }
   const filteredWorkouts= user.scheduledWorkouts.filter((workout)=>workout.toString()!==id.toString())
    console.log('-----------------------------------------')
    user.scheduledWorkouts=filteredWorkouts
    const workout= await ScheduledWorkout.findByIdAndDelete(id)
    await user.save()
    console.log(user.scheduledWorkouts )
    // console.log(workout)
    
    console.log('delete request successfully sent')
    res.status(200).json({ status: 'success'});
   }
   catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ status: 'error', message: 'An error occurred while deleting the event' });
      }
   

  });

  app.get('/dashboard/goals',isAuthenticated,async(req,res)=>{
    const user=await User.findById(req.user.id).populate('goals');
    res.render('goals',{user,toTitleCase})
  })
  app.post('/dashboard/goals',isAuthenticated,async (req,res)=>{
    const user=await User.findById(req.user.id)
    let{completed}=req.body
    const{title,description,target_date,completed_date}=req.body
    if(completed===undefined){
        completed='false'
    }
    else if(completed==='on'){
        completed='true'
    }
    const goals=new Goals({title,description,completed})
    user.goals.push(goals)
    await goals.save()
    await user.save()
    console.log(user)
    console.log('------------------------')
    console.log(goals)
    res.redirect('/dashboard/goals')
  })

  app.patch('/dashboard/goals/:goalsId',isAuthenticated,async(req,res)=>{
    const {goalsId}=req.params
    const goal= await Goals.findById(goalsId)
    goal.completed=!goal.completed
    await goal.save()
    res.status(200).json({ status: 'success'});


  })
  app.delete('/dashboard/goals/:goalsId',isAuthenticated,async(req,res)=>{
    const {goalsId}=req.params
    const user=await User.findById(req.user.id)
    const filteredGoals= user.goals.filter((goals)=>goals.toString()!==goalsId.toString())
    const goal= await Goals.findByIdAndDelete(goalsId)
    user.goals=filteredGoals
    await user.save()

    res.status(200).json({ status: 'success'});



  })

  app.get('/dashboard/favoriteExercises',isAuthenticated,async(req,res)=>{
    const user=await User.findById(req.user.id).populate('favoriteExercises');
    const favoriteExercises=user.favoriteExercises
    res.render('favoriteExercises',{user:req.user,favoriteExercises,toTitleCase})
  
  })
 

  app.post('/dashboard/favoriteExercises',isAuthenticated,async(req,res)=>{
    console.log('post request sent')
    const user=await User.findById(req.user.id)
    const favoriteExercise=new FavoriteExercises({...req.body})
    user.favoriteExercises.push(favoriteExercise)
    await favoriteExercise.save()
    await user.save()
    res.status(200).json({ status: 'success'});
  })

  app.delete('/dashboard/favoriteExercises/:exerciseID',isAuthenticated,async(req,res)=>{
    const {exerciseID}=req.params
    const favoriteExercise=await FavoriteExercises.findOneAndDelete({id:exerciseID})
    const user=await User.findById(req.user.id)
    const filteredFavoriteExercises= user.favoriteExercises.filter((favExercise)=>favExercise.toString()!==favoriteExercise._id.toString())
    user.favoriteExercises=filteredFavoriteExercises
    await user.save()
    res.status(200).json({ status: 'success'});
  })

  app.get('/features',(req,res)=>{
    res.render('features',{user:req.user})
  })

  app.get('/contact',(req,res)=>{
    const web3Key=process.env.WEB3_API_KEY
    res.render('contact',{user:req.user,web3Key})
  })
  app.post('/https://api.web3forms.com/submit',(req,res)=>{
    
    res.redirect('/success')
  })

  app.get('/success',(req,res)=>{
    res.render('contact-success',{user:req.user})
  })

  app.get('/test',(req,res)=>{
    res.render('test')
  })

  app.patch('/update-name',isAuthenticated,async (req,res)=>{
    const {name}=req.body
    const user=await User.findById(req.user.id)
    user.name=name
    await user.save()
    res.status(200).json({ status: 'success'});
  })

//   app.patch('/update-email',async(req,res)=>{
//     console.log('route hit')
//     res.send('route hit')
//   })
  app.patch('/update-dob',isAuthenticated,async(req,res)=>{
    const {dob}=req.body
    const user=await User.findById(req.user.id)
    user.dateOfBirth=dob
    await user.save()
    res.status(200).json({ status: 'success'});
  })



app.listen(PORT,()=>{
    console.log(`listening on port ${PORT}`)
})



/*
{
"bodyPart": "chest",
"equipment": "body weight",
"gifUrl": "https://v2.exercisedb.io/image/Bi8xVYeWIyqo56",
"id": "3294",
"name": "archer push up",
"target": "pectorals",
"secondaryMuscles": [
"triceps",
"shoulders",
"core"
],
"instructions": [
"Start in a push-up position with your hands slightly wider than shoulder-width apart.",
"Extend one arm straight out to the side, parallel to the ground.",
"Lower your body by bending your elbows, keeping your back straight and core engaged.",
"Push back up to the starting position.",
"Repeat on the other side, extending the opposite arm out to the side.",
"Continue alternating sides for the desired number of repetitions."
]
},
*/