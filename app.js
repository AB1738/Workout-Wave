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
const flash = require('connect-flash');
const sanitizeHtml = require('sanitize-html');
const mongoSanitize = require('express-mongo-sanitize');
const helmet =require('helmet')
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const moment = require('moment-timezone')
const workouts = require('./models/workouts')
const favoriteExercises = require('./models/favoriteExercises')
const Exercise = require('./models/exercises');
require('dotenv').config()  
const dbUrl=process.env.DB_URL
const PORT=3000
const toTitleCase = str => str.replace(/(^\w|\s\w)(\S*)/g, (_,m1,m2) => m1.toUpperCase()+m2.toLowerCase())
//'mongodb://127.0.0.1:27017/workoutWave'

const MongoStore = require('connect-mongo');
mongoose.connect(dbUrl)
    .then(()=>{
         console.log("Connection Open!!")
        })
        .catch(err=>{
            console.log('Oh no error')
            console.log(err)
        })


const store=new MongoStore({
  mongoUrl:dbUrl,
  secret:process.env.MONGO_STORE_SECRET,
  touchAfter:24*60*60
})

store.on('error',function(e){
  console.log('Session store error',e)
})

const sessionConfig={
    store,
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires:Date.now()+1000*60*60*24*7,
        maxAge:1000*60*60*24*7
    }
}


app.set('view engine', 'ejs') 
app.engine('ejs',ejsMate)
app.set('views',path.join(__dirname,'views'))
app.use(express.urlencoded({extended:true}))
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')))
app.use(session(sessionConfig))
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(mongoSanitize());

app.use(helmet());

const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net/",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
    "https://ka-f.fontawesome.com/" 
];

const styleSrcUrls = [
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://fonts.googleapis.com/",
    "https://fonts.gstatic.com/",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
    "https://ka-f.fontawesome.com/"  // Add this line

];

const fontSrcUrls = [
    "https://fonts.googleapis.com/",
    "https://fonts.gstatic.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://ka-f.fontawesome.com/" 
];

const connectSrcUrls = [

    "https://kit.fontawesome.com/",
    "https://ka-f.fontawesome.com/"  // Add this line if needed
];
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'",],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "*",
            ],
            connectSrc: ["'self'", ...connectSrcUrls],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);


passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success=req.flash('success')
    res.locals.error=req.flash('error')
    next()
  })


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

  function sanitizeObject(obj) {
    if (typeof obj === 'string') {
      return sanitizeHtml(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj !== null && typeof obj === 'object') {
      const sanitizedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitizedObj[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitizedObj;
    }
    return obj; // If not a string, array, or object, return as is
  }




app.get('/',(req,res,next)=>{    
    try{
    res.render('home',{user:req.user})
    }catch(e){
        next(e)
    }
})
app.get('/email',(req,res)=>{

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
        username: 'api', 
        key: process.env.MAILGUN_API_KEY || 'key-yourkeyhere',
        url:"https://api.mailgun.net/"
        });
    
    mg.messages.create('sandbox-123.mailgun.org', {
        from: "Workout Wave <mailgun@sandbox2685f3d26049452fa7459b9338a3a5c3.mailgun.org>",
        to: ["saintsring2017@yahoo.com"],
        subject: "Hello",
        text: "Testing some Mailgun awesomeness!",
        html: "<h1>Testing some Mailgun awesomeness!</h1>"
    })
    .then(msg => console.log(msg)) // logs response data
    .catch(err => console.log(err)); // logs any error
  res.send('test test test')
})

app.get('/exercise/:bodyPart',async(req,res,next)=>{
    try {
        const {bodyPart}=req.params
        const exercises =await fetchBodyPartExercises(bodyPart);
        req.session.exercises=exercises
        req.session.bodypart=bodyPart
        // console.log(exercises);
        // res.render('exercises',{exercises,bodyPart})
        res.redirect(`/exercises/${bodyPart}?page=1`)
      



    } catch (error) {
        next(error);
    }
  
})

app.get('/exercises/:bodyPart',async(req,res,next)=>{
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
        next(e)
    }
})




app.get('/register',async(req,res,next)=>{
    try{
    if(req.user){
        return res.redirect('/dashboard')
    }
    res.render('register',{user:req.user})
}catch(e){
    next(e)
}
})

app.post('/register', async (req, res) => {
    const { name, dateOfBirth, email, password } = req.body;
    const sanitizedName = sanitizeHtml(name)
    const sanitizedEmail = sanitizeHtml(email, {
        allowedTags: [],
        allowedAttributes: {},
      });


    try {
        // Create a new user instance
        const user = new User({ name:sanitizedName, dateOfBirth, email:sanitizedEmail });

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
app.get('/register/verification',ensureRegisteredButNotVerified,async(req,res,next)=>{
    try{
    const email=req.session.userEmail
    const user = await User.findOne({ email: email});
    const token=user.verificationToken
    req.session.userEmail=null
    res.render('verification',({user:req.user,email}))
    }catch(e){
        next(e)
    }
})



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
req.flash('success','Registration complete')
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

app.get('/forgot-password',async(req,res,next)=>{
    try{
    res.render('forgotPassword',({user:req.user}))
    }catch(e){
        next(e)
    }
})

app.post('/reset-password',async(req,res,next)=>{
    try{
        const {email}=req.body
        const user = await User.findOne({ email: email });
        if(user==null){
            req.flash('error','Email not found')
           return res.redirect('/forgot-password') 
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
        next(e)
    }

})

app.get('/reset-password/:token',async(req,res,next)=>{
    try{
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
}catch(e){
    next(e)
}
    
})

app.post('/reset-password/:token',async(req,res,next)=>{
    try{
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
     req.flash('success','Password has been reset') //make this a flash message
    res.redirect('/login')
}catch(e){
    next(e)
}
})

app.get('/password-reset',isAuthenticated,async(req,res,next)=>{
    try{
    const user=req.user
    res.render('loggedInPasswordReset',{user})
    }catch(e){
        next(e)
    }
})
app.post('/password-reset',isAuthenticated,async(req,res,next)=>{
    try{
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
}catch(e){
    next(e)
}
})







app.get('/login',(req,res,next)=>{
    try{
    if(req.user){
       return res.redirect('/dashboard')
    }
    else{
        res.render('login',{user:req.user})
    }}
    catch(e){
        next(e)
    }
})



app.post('/login', passport.authenticate('local',{ failureRedirect: '/login',failureFlash:true}), (req, res,next) => {
    try{
    req.flash('success', `Welcome back ${req.user.name}`)
    res.redirect('/dashboard')
    }catch(e){
        next(e)
    }
});

app.get('/logout',(req,res,next)=>{
    try{
    req.logout(function(err) {
        if (err) { return next(err); }
        req.flash('success', `Goodbye. See you soon!`)
        res.redirect('/');//redirects users to page they were on before they logged out
      });
    }catch(e){
        next(e)
    }
})



app.get('/profile',isAuthenticated,(req,res,next)=>{
    try{
    const {name,dateOfBirth,email}=req.user
    res.render('profile',{name,dateOfBirth,email,user:req.user,toTitleCase,moment})
    }catch(e){
        next(e)
    }
})

app.get('/dashboard',isAuthenticated,async(req,res,next)=>{
    try{
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
  
//   console.log('Start of week:', startOfWeekAdjusted);
  

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

const workoutsByDay = filteredWorkouts.reduce((acc, workout) => {
    const dayOfWeek = new Date(workout.date).getUTCDay(); // 0 (Sunday) to 6 (Saturday)
    if (!acc[dayOfWeek]) {
        acc[dayOfWeek] = 0;
    }
    acc[dayOfWeek]++;
    return acc;
}, {});

console.log('Workouts by day:', workoutsByDay);

// Create an array with data for each day of the week starting from Sunday
const data = Array(7).fill(0);

// Adjust so that Sunday is the first day in the array
for (let i = 0; i < 7; i++) {
    data[i] = workoutsByDay[i] || 0; // Use dayOfWeek directly as index
}

// console.log('Data for chart:', data);
  

//   console.log('Workouts by day:', workoutsByDay);

  // Prepare the data array for the chart (7 days of the week)
//   const data = Array(7).fill(0);
// for (let i = 0; i < 7; i++) {
//     data[i] = workoutsByDay[i] || 0;
// }

  
  console.log(data)

  console.log('Server Time:', new Date());
console.log('Server Time Zone:', Intl.DateTimeFormat().resolvedOptions().timeZone);

  
    let minsOfCardio=0
    for(workout of workouts){
        const exercise=await Exercise.find({name:workout.exercise})
        if(exercise[0].bodyPart=='cardio'){
            minsOfCardio+=workout.duration
        }
    }
  
    // console.log(data)

    res.render('dashboard',{user:req.user,toTitleCase,data,updatedBodyPartLabels,bodyPartData,minsOfCardio})
}catch(e){
    next(e)
}
})

app.get('/workout/:workoutName',isAuthenticated,async(req,res,next)=>{
    try{
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
        req.flash('error','Exercise does not exist') //make this a flash message
        return res.redirect('/dashboard')
    }
    }catch(e){
        next(e)
    }
})


app.get('/dashboard/workout',isAuthenticated,async(req,res,next)=>{
    try{
    const exercises=await Exercise.find()
    res.render('workout',{user:req.user,toTitleCase,exercises})
    }catch(e){
        next(e)
    }
})
app.post('/workout',isAuthenticated,async(req,res,next)=>{
    const {date,exercise,sets,reps,weight,duration,distance}=req.body
    const results=await Exercise.findOne({name:exercise})
    console.log(req.body)
    
    const localDate = moment(date, 'YYYY-MM-DD');

    // Convert the date to UTC
    const utcDate = localDate.utc().toISOString();
    // utcDate.setHours(0, 0, 0, 0);


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
                req.flash('success','Workout successfully logged')
            
               return res.redirect('/dashboard/workout')
    
            }
        }
        if(results.bodyPart!=='cardio'){
            const workout=new Workout({date:date,exercise:exercise,sets:sets,reps: reps.map(Number),weight:weight,duration:duration})
            const user=await User.findById(req.user.id)
            await workout.save()
        
            user.workouts.push(workout._id)
            await user.save()
            
            req.flash('success','Workout successfully logged')
           return res.redirect('/dashboard/workout')
            
        }
 
    }
    else{
        return res.status(404).send('Exercise not found');
    }
}catch(e){
    next(e);
}
 
})
app.get('/dashboard/workoutHistory',isAuthenticated,async(req,res,next)=>{
    try{
    const user=await User.findById(req.user.id).populate('workouts')
    res.render('workoutHistory',{user,toTitleCase,moment})
    }catch(e){
        next(e)
    }
})

app.delete('/dashboard/workoutHistory/:workoutId',isAuthenticated,async(req,res,next)=>{
    try{
    const {workoutId}=req.params
    const user=await User.findById(req.user.id)
    const workout=await Workout.findByIdAndDelete(workoutId)
    const filteredWorkouts= user.workouts.filter((workout)=>workout.toString()!==workoutId.toString())
    user.workous=filteredWorkouts
    await user.save()
    req.flash('success','Workout successfully deleted')
    res.status(200).json({ status: 'success'});
    }catch(e){
        next(e)
    }
})

app.get('/dashboard/schedule',isAuthenticated,async(req,res,next)=>{
    try{
    const user=await User.findById(req.user.id).populate('scheduledWorkouts');
//     for(let workouts of user.scheduledWorkouts){
//         console.log(workouts.start)
//     }
//    console.log('BEFORE HTML RENDERING')
    res.render('schedule',{user,moment})
    }catch(e){
        next(e)
    }
})
app.post('/dashboard/schedule',isAuthenticated,async(req,res,next)=>{
    try{
    const sanitizedBody = sanitizeObject(req.body);
    const workout=new ScheduledWorkout({...sanitizedBody})
    const user=await User.findById(req.user.id)
    await workout.save()
    user.scheduledWorkouts.push(workout._id)
    await user.save()
    req.flash('success','Workout successfully scheduled')
    res.redirect('/dashboard/schedule')
    }catch(e){
        next(e)
    }
})

app.patch('/dashboard/update-schedule-event/:id', async (req, res) => {
    try{
        const {id}=req.params
        const {start}=req.body
        const workout= await ScheduledWorkout.findByIdAndUpdate(id,{start:start})
    //     console.log(workout)
        
    //     console.log('patch request successfully sent')
    //     console.log(id)
    //   console.log(start)
      req.flash('success','Scheduled workout moved to new date')
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
    // console.log(id)
    // console.log('-----------------------------------------')
    // console.log(req.user)

    // const workout= await ScheduledWorkout.findByIdAndDelete(id)
    // for(let w of user.scheduledWorkouts){
    //     console.log(w.toString().slice(0, 24))
    // }
   const filteredWorkouts= user.scheduledWorkouts.filter((workout)=>workout.toString()!==id.toString())
    // console.log('-----------------------------------------')
    user.scheduledWorkouts=filteredWorkouts
    const workout= await ScheduledWorkout.findByIdAndDelete(id)
    await user.save()
    // console.log(user.scheduledWorkouts )
    // console.log(workout)
    
    // console.log('delete request successfully sent')
    req.flash('success','Scheduled workout deleted')
    res.status(200).json({ status: 'success'});
   }
   catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ status: 'error', message: 'An error occurred while deleting the event' });
      }
   

  });

  app.get('/dashboard/goals',isAuthenticated,async(req,res,next)=>{
    try{
    const user=await User.findById(req.user.id).populate('goals');
    res.render('goals',{user,toTitleCase})
    }catch(e){
        next(e)
    }
  })
  app.post('/dashboard/goals',isAuthenticated,async (req,res,next)=>{
    try{
    const user=await User.findById(req.user.id)
    let{completed}=req.body
    const{title,description,target_date,completed_date}=req.body
    if(completed===undefined){
        completed='false'
    }
    else if(completed==='on'){
        completed='true'
    }
    const sanitizedTitle = sanitizeHtml(title)
    console.log(title)
    console.log(sanitizedTitle)
    const sanitizedDescription = sanitizeHtml(description)
    console.log(description)
    console.log('SANITIZED BELOW')
    console.log(sanitizedDescription)
    const goals=new Goals({sanitizedTitle,sanitizedDescription,completed})
    user.goals.push(goals)
    await goals.save()
    await user.save()
    // console.log(user)
    // console.log('------------------------')
    // console.log(goals)
    req.flash('success','Goal successfully saved')
    res.redirect('/dashboard/goals')
    }catch(e){
        next(e)
    }
  })

  app.patch('/dashboard/goals/:goalsId',isAuthenticated,async(req,res,next)=>{
    try{
    const {goalsId}=req.params
    const goal= await Goals.findById(goalsId)
    goal.completed=!goal.completed
    req.flash('success','Goal status changed ')
    await goal.save()
    res.status(200).json({ status: 'success'});
    }catch(e){
        next(e)
    }

  })
  app.delete('/dashboard/goals/:goalsId',isAuthenticated,async(req,res,next)=>{
    try{
    const {goalsId}=req.params
    const user=await User.findById(req.user.id)
    const filteredGoals= user.goals.filter((goals)=>goals.toString()!==goalsId.toString())
    const goal= await Goals.findByIdAndDelete(goalsId)
    user.goals=filteredGoals
    req.flash('success','Goal successfully deleted')
    await user.save()

    res.status(200).json({ status: 'success'});
    }catch(e){
        next(e)
    }


  })

  app.get('/dashboard/favoriteExercises',isAuthenticated,async(req,res,next)=>{
    try{
    const user=await User.findById(req.user.id).populate('favoriteExercises');
    const favoriteExercises=user.favoriteExercises
    res.render('favoriteExercises',{user:req.user,favoriteExercises,toTitleCase})
    }catch(e){
        next(e)
    }
  
  })
 

  app.post('/dashboard/favoriteExercises',isAuthenticated,async(req,res,next)=>{
    try{
    console.log('post request sent')
    const user=await User.findById(req.user.id)
    const favoriteExercise=new FavoriteExercises({...req.body})
    user.favoriteExercises.push(favoriteExercise)
    await favoriteExercise.save()
    await user.save()
    res.status(200).json({ status: 'success'});
    }catch(e){
        next(e)
    }
  })

  app.delete('/dashboard/favoriteExercises/:exerciseID',isAuthenticated,async(req,res,next)=>{
    try{
    const {exerciseID}=req.params
    const favoriteExercise=await FavoriteExercises.findOneAndDelete({id:exerciseID})
    const user=await User.findById(req.user.id)
    const filteredFavoriteExercises= user.favoriteExercises.filter((favExercise)=>favExercise.toString()!==favoriteExercise._id.toString())
    user.favoriteExercises=filteredFavoriteExercises
    await user.save()
    res.status(200).json({ status: 'success'});
    }catch(e){
        next(e)
    }
  })

  app.get('/features',(req,res,next)=>{
    try{
    res.render('features',{user:req.user})
    }catch(e){
        next(e)
    }
  })

  app.get('/contact',(req,res,next)=>{
    try{
    const web3Key=process.env.WEB3_API_KEY
    res.render('contact',{user:req.user,web3Key})
    }catch(e){
        next(e)
    }
  })
  app.post('/https://api.web3forms.com/submit',(req,res,next)=>{
    try{
    res.redirect('/success')
    }catch(e){
        next(e)
    }
  })

  app.get('/success',(req,res,next)=>{
    try{
    res.render('contact-success',{user:req.user})
    }catch(e){
        next(e)
    }
  })


  app.patch('/update-name',isAuthenticated,async (req,res,next)=>{
    try{
    const {name}=req.body
    const sanitizedName = sanitizeHtml(name)
    const user=await User.findById(req.user.id)
    user.name=sanitizedName
    await user.save()
    req.flash('success','Name successfully updated')
    res.status(200).json({ status: 'success'});
    }catch(e){
        next(e)
    }
  })

  app.patch('/update-dob',isAuthenticated,async(req,res,next)=>{
    try{
    const {dob}=req.body
    const user=await User.findById(req.user.id)
    user.dateOfBirth=dob
    await user.save()
    req.flash('success','Date Of Birth successfully updated')
    res.status(200).json({ status: 'success'});
    }catch(e){
        next(e)
    }
  })





app.use((req, res, next) => {
    res.status(404).render('404', { user: req.user });
});

// General error handling middleware
app.use((err, req, res, next) => {
     console.error(err.stack); // Log the error stack
    const status = err.status || 500;
    const message = status === 500 ? 'Internal Server Error' : err.message;
    res.status(status).render('error', { user: req.user,message });
});




app.listen(PORT,()=>{
    console.log(`listening on port ${PORT}`)
})

