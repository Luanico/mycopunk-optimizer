import {canvas, ctx, colorGrid, Grid, hexagons, hexRadius, GridToShape, AllShapes, rotateShapeAroundCenter} from "./functions.js"
import { buildGrid, redrawGrid, SKey, loadShapes, place_shapes} from "./functions.js";


export const debugging = true

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
    place_shapes(names.map(name => AllShapes.get(name)), colors, names, true).then(() =>{
        redrawGrid()
        console.log("Done!")
    })
})


const coordsDiv = document.createElement('div');
coordsDiv.style.position = 'absolute';
coordsDiv.style.background = 'white';
coordsDiv.style.padding = '4px';
coordsDiv.style.border = '1px solid black';
coordsDiv.style.display = 'none';
document.body.appendChild(coordsDiv);

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
            coordsDiv.textContent = GridToShape.get(key);
            coordsDiv.style.left = e.pageX + 10 + 'px';
            coordsDiv.style.top = e.pageY + 10 + 'px';
            coordsDiv.style.display = 'block';
        } else {
            coordsDiv.style.display = 'none';
        }
    } else {
        coordsDiv.style.display = 'none';
    }
});


/* --------------------------------------------
                   Debugging
---------------------------------------------*/
if (debugging){
    // Display element for coordinates
    const coordsDiv = document.createElement('div');
    coordsDiv.style.position = 'absolute';
    coordsDiv.style.background = 'white';
    coordsDiv.style.padding = '4px';
    coordsDiv.style.border = '1px solid black';
    coordsDiv.style.display = 'none';
    document.body.appendChild(coordsDiv);

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
            coordsDiv.textContent = `(${found.row}, ${found.col})`;
            coordsDiv.style.left = e.pageX + 10 + 'px';
            coordsDiv.style.top = e.pageY + 10 + 'px';
            coordsDiv.style.display = 'block';
        } else {
            coordsDiv.style.display = 'none';
        }
    });
}