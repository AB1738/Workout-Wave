const heart = document.querySelectorAll('.heart');
const tooltiptext=document.querySelectorAll('.tooltiptext')
// const exerciseContainer=document.querySelectorAll('.exercise-container')
const exerciseName=document.querySelectorAll('.exercise-name')
const exerciseImg=document.querySelectorAll('.exercise-img')
const equipment=document.querySelectorAll('.equipment')
const primaryTarget=document.querySelectorAll('.primary-target')
const secondaryTarget=document.querySelectorAll('.secondary-target')
const instructions=document.querySelectorAll('.instruction')
const id=document.querySelectorAll('.id')
const bodyPart=document.querySelector('.body-part')
const tooltip=document.querySelectorAll('.tooltipclass')

// try {
//     const response = await fetch(`/dashboard/goals/${goalId}`, {
//         method: 'PATCH',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({})
//     });

//     if (response.ok) {
//         // Redirect to the same URL to refresh the data
//         window.location.reload();
//     } else {
//         console.error('Failed to update goal status');
//     }
// } catch (error) {
//     console.error('Error:', error);
// }
// });







heart.forEach((heartIcon,index)=>{
    heartIcon.addEventListener('click', async function(e) {
        // console.log(exerciseContainer[index])
        heartIcon.classList.toggle('red');
        if(heartIcon.classList.contains('red')){

            console.log(exerciseName[index].textContent)
            console.log(exerciseImg[index].src)
            console.log(equipment[index].textContent)  //get rid of the equipment needed: part
            console.log(primaryTarget[index].textContent)  //get rid of the primary target needed: part
            for (const child of secondaryTarget[index].children) {
                console.log(child.textContent);
              }
            for (const child of instructions[index].children) {
                console.log(child.textContent);
              }
            // for(let target of secondaryTarget[index]){
            //     console.log(target)

            // }
            // for(let i of instructions[index]){
            //     console.log(i)

            // }
            console.log(id[index].textContent)
            const secondaryMuscles = [];
            const instructionsArray = [];
            for (const child of secondaryTarget[index].children) {
              secondaryMuscles.push(child.textContent);
            }
            for (const child of instructions[index].children) {
              instructionsArray.push(child.textContent);
            }
            try{
                const response = await fetch(`/dashboard/favoriteExercises`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        bodyPart:bodyPart.textContent,
                        equipment:equipment[index].textContent.slice(18),
                        gifUrl:exerciseImg[index].src,
                        id:id[index].textContent,
                        name:exerciseName[index].textContent,
                        target:primaryTarget[index].textContent.slice(16),
                        secondaryMuscles: secondaryMuscles,
                        instructions:instructionsArray
                    })
                });
                if (response.ok) {
                    // Redirect to the same URL to refresh the data
                    console.log('request successfully sent')
                } else {
                    console.error('Failed to update goal status');
                }

            }catch(e){
                console.log(e)
            }








        }
        else{

            try{
                const response = await fetch(`/dashboard/favoriteExercises/${id[index].textContent}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      
                    })
                });
            }
            catch(e){
                console.log(e)
            }
    
        }
      });
      heartIcon.addEventListener('mouseover',(e)=>{
        if(heartIcon.classList.contains('red')){
            const tool=document.createElement('span')
            tool.className='tooltiptext'
            tool.textContent='unfavorite this exercise'
            tooltip[index].append(tool)
        }else{
            const tool=document.createElement('span')
            tool.className='tooltiptext'
            tool.textContent='favorite this exercise'
            tooltip[index].append(tool)
        }

      })

})
   
