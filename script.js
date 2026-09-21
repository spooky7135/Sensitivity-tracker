const dpiInput = document.getElementById("dpi");

const sensitivityInput =
    document.getElementById("sensitivity");

const calculateButton =
    document.getElementById("calculate-button");

const edpiResult =
    document.getElementById("edpi-result");


 calculateButton.addEventListener("click", function()
 {

    const dpi = Number(dpiInput.value);
    const sensitivity = Number(sensitivityInput.value); // .value gets whatever is inside the input


    if(dpi <=0 || sensitivity <= 0)
    {
        edpiResult.textContent =  "Please enter valid values";
        return;
    }

    const edpi = dpi * sensitivity;

    edpiResult.textContent = edpi;




 });
    
