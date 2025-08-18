import {canvas, ctx, colorGrid, Grid, hexagons, hexRadius, GridToShape, AllShapes, rotateShapeAroundCenter, load_shape} from "./functions.js"
import { buildGrid, redrawGrid, SKey, loadShapes, place_shapes} from "./functions.js";


export let debugging = false

/* --------------------------------------------
                  MAIN PART
---------------------------------------------*/


// when page loads:
window.addEventListener('DOMContentLoaded', () => {
    loadShapes()
});


buildGrid();


const button = document.getElementById("testButton")
button.addEventListener('click', () => {
    buildGrid()
    const checkedBoxes = document.querySelectorAll('#shapeList input[type="checkbox"]:checked');
    let names = Array.from(checkedBoxes).map(cb => cb.value)
    console.log(names)
    const colors = names.map((_, i) => {
        const hue = (i / names.length) * 360;
        return `hsl(${hue}, 100%, 50%)`;
      });
    console.log(names.map(name => AllShapes.get(name)))
    place_shapes(names.map(name => AllShapes.get(name)), colors, names, debugging).then(() =>{
        redrawGrid()
        console.log("Done!")
    })
})


const nameDiv = document.createElement('div');
nameDiv.style.position = 'absolute';
nameDiv.style.background = 'white';
nameDiv.style.padding = '4px';
nameDiv.style.border = '1px solid black';
nameDiv.style.display = 'none';
document.body.appendChild(nameDiv);

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let found = null;

    // Check if mouse is inside a hex
    hexagons.forEach(hex => {
        const dx = mouseX - hex.x;
        const dy = mouseY - hex.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Quick circle radius check (less precise but fast)
        if (dist <= hexRadius) {
            found = hex;
        }
    });

    if (found) {
        let key = SKey(found.row, found.col)
        if (GridToShape.get(key) != ""){
            nameDiv.textContent = GridToShape.get(key);
            nameDiv.style.left = e.pageX + 10 + 'px';
            nameDiv.style.top = e.pageY + 10 + 'px';
            nameDiv.style.display = 'block';
        } else {
            nameDiv.style.display = 'none';
        }
    } else {
        nameDiv.style.display = 'none';
    }
});


document.getElementById("uploadShapes").addEventListener("click", () => {
    console.log("test")
    document.getElementById("folderInput").click();
});

document.getElementById("customSelectionButton").addEventListener("click", () => {
    document.getElementById('customSelectionDialog').showModal();
})

// Handle folder selection
document.getElementById("folderInput").addEventListener("change", async (event) => {
    const files = event.target.files;
    AllShapes.clear()
    for (const file of files) {
        const relativePath = file.webkitRelativePath;
        const name = relativePath.split("/").at(-1);

        // Read file content
        const content = await file.text();


        const lines = content.split(/\r?\n/).filter(line => line.length > 0)
        let shape = lines.map(s => {
            let pos = s.split(',')
            return([parseInt(pos[0]), parseInt(pos[1])])
        })

        if (AllShapes.has(name)) {
            console.error(`Shape "${name}" already loaded!`);
        } else {
            AllShapes.set(name, shape);
        }
    }

    console.log("All loaded shapes:", AllShapes);
});


/* --------------------------------------------
                   Debugging
---------------------------------------------*/

document.addEventListener("keydown", (event) => {
    if (event.shiftKey && event.key === "D") {
        if (debugging){
            console.log("Debug mode deactivated");
            debugging = false
            document.getElementById("debugText").style.visibility = "hidden";
            debug__removeCoord()
        }
        else{
            console.log("Debug mode activated");
            debugging = true
            document.getElementById("debugText").style.visibility = "visible";
            debug__addCoord()
        }
    }
    
});

let mouseMoveHandler;
let coordsDiv;

function debug__addCoord(){
    // Display element for coordinates
    coordsDiv = document.createElement('div');
    coordsDiv.style.position = 'absolute';
    coordsDiv.style.background = 'white';
    coordsDiv.style.padding = '4px';
    coordsDiv.style.border = '1px solid black';
    coordsDiv.style.display = 'none';
    document.body.appendChild(coordsDiv);

    
    mouseMoveHandler = e => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let found = null;

        hexagons.forEach(hex => {
            const dx = mouseX - hex.x;
            const dy = mouseY - hex.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= hexRadius) found = hex;
        });

        if (found) {
            coordsDiv.textContent = `(${found.row}, ${found.col})`;
            coordsDiv.style.left = e.pageX + 10 + 'px';
            coordsDiv.style.top = e.pageY + 10 + 'px';
            coordsDiv.style.display = 'block';
        } else {
            coordsDiv.style.display = 'none';
        }
    };

    canvas.addEventListener('mousemove', mouseMoveHandler);
}

function debug__removeCoord() {
    if (mouseMoveHandler) {
        canvas.removeEventListener('mousemove', mouseMoveHandler);
        mouseMoveHandler = null;
    }
    if (coordsDiv) {
        coordsDiv.remove();
        coordsDiv = null;
    }
}