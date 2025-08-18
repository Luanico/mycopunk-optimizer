import { buildGrid, redrawGrid, SKey, parseKey, downloadCustomShape } from "./functions.js";
import {colorGrid, Grid, hexagons, hexRadius, gray} from "./functions.js";

const debugging = true

const canvas = document.getElementById('hexCanvas');
const ctx = canvas.getContext('2d');

buildGrid();

canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    console.log("Clicked at:", mouseX, mouseY);
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
        if (Grid.get(key)){
            colorGrid.set(key, gray)
            Grid.set(key, false)
        }
        else{
            colorGrid.set(key, "hsl(0, 100.00%, 50.00%)")
            Grid.set(key, true)
        }
        redrawGrid()
    }
});


function normalizeShape(shape) {
    let minCol = Infinity;
    let minRow = Infinity;

    for (const [col, row] of shape) {
        if (col < minCol) minCol = col;
        if (row < minRow) minRow = row;
    }

    return shape.map(([col, row]) => [col - minCol, row - minRow]);
}


const form = document.getElementById('shape_name')
const button = document.getElementById('add_shape')

button.addEventListener('click', () => {
    const name = form.ariaValueMax
    if (form.value === ""){
        console.error("Shapemaker: No name given")
        return
    }
    // Collect all positions in Grid where value is true
    let shape = [];
    for (const [pos, e] of Grid.entries()) {
        if (e === true) {
            shape.push(parseKey(pos)); // parseKey turns "r,c" → [r, c]
        }
    }

    if (shape.length === 0) {
        console.log("No shape selected, exiting");
        return;
    }

    // Sort shape points (row first, then col)
    shape.sort((a, b) => {
        if (a[0] !== b[0]) return a[0] - b[0];
        return a[1] - b[1];
    });

    shape = normalizeShape(shape)

    console.log(shape);
    downloadCustomShape(name, shape)
})



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