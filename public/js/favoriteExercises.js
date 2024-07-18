const trash=document.querySelectorAll('.trash')
const id=document.querySelectorAll('.id')

trash.forEach((trashIcon,index)=>{
    trashIcon.addEventListener('click',async(e)=>{
        try{
            const response = await fetch(`/dashboard/favoriteExercises/${id[index].textContent}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  
                })
            });
            if (response.ok) {
                // Redirect to the same URL to refresh the data
                window.location.reload();
            } else {
                console.error('Failed to update goal status');
            }
        }
        catch(e){
            console.log(e)
        }
    })
    trashIcon.addEventListener('mouseover',()=>{
        const tooltip=document.createElement('span')
        tooltip.className='tooltiptext'
        tooltip.textContent='Delete from favorites'
        trash[index].append(tooltip)
    })
})

