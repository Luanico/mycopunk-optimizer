/* --------------------------------------------
        Global constants and variables
---------------------------------------------*/

const debugging = false
const canvas = document.getElementById('hexCanvas');
const ctx = canvas.getContext('2d');

const hexRadius = 30;
const hexHeight = Math.sqrt(3) * hexRadius;
let cols = 7;
let rows = 7;
const gray = "hsl(0,0%,50%)"

let categories = []
let categoriesMap = new Map()
let AllShapes = new Map()
let selected = []

let hexagons = new Map();
let Grid = new Map(); // Grid ["q,r"]
let colorGrid = new Map();
let GridToShape = new Map()

/* --------------------------------------------
              Helper functions
---------------------------------------------*/

function SKey(x,y){
    return (`${x},${y}`)
}

async function GetLines(filepath){
    try {
        const response = await fetch(filepath);
        const text = await response.text();
        const lines = text.split(/\r?\n/);
        return lines.filter(line => line.length > 0)
      } catch (error) {
        console.error('Error loading file:', error);
      }
}

function parseKey(s){
    return(s.split(',').map(c => {
        return parseInt(c)
    }))
}


function hex_to_pixel_flat(q, r, size){
    let x = size * 3/2 * q
    let y = size * Math.sqrt(3) * (r + q / 2)
    return ([x, y])
}

//returns coordinates of neighbors
function neighbors(r, c){
    const res = [
        [r + 1, c],
        [r + 1, c - 1],
        [r, c - 1],
        [r - 1, c],
        [r - 1, c + 1],
        [r, c + 1]
    ];
    
    return res.filter(([x, y]) =>
        x >= 0 && y >= 0 && x < size[0] && y < size[1]
    );
}

async function load_shape(filepath){ 
    const lines = await GetLines(filepath)
    let shape = lines.map(s => {
        let pos = s.split(',')
        return([parseInt(pos[0]), parseInt(pos[1])])
    })
    return shape
}

function loadShapes(){
    fetch('filelist.json')
    .then(res => res.json())
    .then(res => {
        categories = Object.keys(res)
        for (const [key, value] of Object.entries(res)) {
            categoriesMap.set(key, value)
        }          
        return Object.entries(res).flatMap(([key, list]) => list.map(str => "shapes/" + key + '/' + str))
    })
    .then(files => {
        files.forEach(file => load_shape(file).then(shape => {
            let name = file.split('/').at(-1)
            if (AllShapes.has(name)){
                console.error("loadShapes: Multiple times the same name!!!")
                return
            }
            AllShapes.set(name, shape)
        }))
    })
    .then(() => loadIndex())
}

/* --------------------------------------------
                Main functions
---------------------------------------------*/

function initGrid(){
    rows = parseInt(document.getElementById('rowsInput').value, 10);
    cols = parseInt(document.getElementById('colsInput').value, 10);
    Grid.clear()
    GridToShape.clear()
    colorGrid.clear()
    for (let x = 0; x < rows; x++){
        q_offset = Math.floor(x/2)
        for (let y = -q_offset; y < cols - q_offset; y++){
            Grid.set(SKey(x,y), false)
            colorGrid.set(SKey(x,y), gray)
            GridToShape.set(SKey(x,y), "")
        }
    }
}

function place(shape, offsetx, offsety, colors, shape_name){
    let new_shape = shape.map(pos => [pos[0] + offsetx, pos[1] + offsety])

    let valid = new_shape.every(pos => Grid.has(SKey(pos[0], pos[1])) && !Grid.get(SKey(pos[0], pos[1])))
    if(!valid){
        return false
    }

    new_shape.forEach(pos => {
        Grid.set(SKey(pos[0], pos[1]), true)
        colorGrid.set(SKey(pos[0], pos[1]), colors[0])
        GridToShape.set(SKey(pos[0], pos[1]), shape_name)
    });
    return true
}

function unplace(shape, offsetx, offsety){
    let new_shape = shape.map(pos => (pos[0] + offsetx, pos[1] + offsety))

    new_shape.forEach(pos => {
        if (Grid.get(SKey(pos[0], pos[1])) == false)
            console.error("Unplace: hex is already False!")
        Grid.set(SKey(pos[0], pos[1]), false)
        colorGrid.set(SKey(pos[0], pos[1]), gray)
        GridToShape.set(SKey(pos[0], pos[1]), "")
    });
}

function place_shapes(shapes, colors, shape_names, show_steps=false){
    if (shapes.length == 0)
        return true
    let offsetx = -cols
    while (offsetx < cols){
        let offsety = -rows
        while (offsety < rows){
            if (place(shapes[0], offsetx, offsety, colors, shape_names[0])){
                if (show_steps){
                    //TODO: add a functionnality to show step by step
                    console.error("place_shapes: show steps not implemented")
                    return false
                };
                let res = place_shapes(shapes.slice(1), colors.slice(1), shape_names.slice(1))
                if (res)
                    return true
                else
                    unplace(shapes[0], offsetx, offsety)
            }
            offsety++
        }
        offsetx++
    }

    // Couldn't place the shape, return false
    return false
}

/* --------------------------------------------
              Drawing functions
---------------------------------------------*/

function drawHex(x, y, radius, row, col) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i;
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        if (i === 0) 
            ctx.moveTo(px, py);
        else 
            ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = colorGrid.get(SKey(row, col));
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.stroke();
}

function buildGrid() {
    hexagons.clear()
    initGrid()
    Grid.keys().forEach(s => {
        let coord = parseKey(s)
        let [x,y] = hex_to_pixel_flat(coord[0], coord[1], hexRadius)

        // padding 
        x += hexRadius + 10
        y += hexRadius * Math.sqrt(3) / 2 + 10
        hexagons.set(SKey(x,y), { x: x, y: y, row: coord[0], col:coord[1]});
        
        drawHex(x, y, hexRadius, coord[0], coord[1]);
    })
}

function redrawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hexagons.forEach(hex => drawHex(hex.x, hex.y, hexRadius, hex.row, hex.col));
}


/* --------------------------------------------
                Weapon selector
---------------------------------------------*/

let shapeIndex = {};
    
async function loadIndex() {
    const select = document.getElementById('categorySelect');
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    })

    select.addEventListener('change', () => {
        showShapes(select.value);
    });
}

function showShapes(category) {
    const shapeList = document.getElementById('shapeList');
    shapeList.innerHTML = '';

    if (!category || !categoriesMap.has(category))
        return;

    categoriesMap.get(category).forEach(filename => {
        const li = document.createElement('li');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = filename;
        checkbox.id = `${category}-${filename}`
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = filename.replace('.json', '');

        li.appendChild(checkbox);
        li.appendChild(label);
        shapeList.appendChild(li);
    });
}


/* --------------------------------------------
                  MAIN PART
---------------------------------------------*/


names = [
    "Decay_energy",
    "Smart_slide",
    "Ricochet",
    "Dump_charge"
]

// when page loads:
window.addEventListener('DOMContentLoaded', () => {
    loadShapes()
    
});


buildGrid();


const button = document.getElementById("testButton")
button.addEventListener('click', () => {
    const checkedBoxes = document.querySelectorAll('#shapeList input[type="checkbox"]:checked');
    let names = Array.from(checkedBoxes).map(cb => cb.value)
    console.log(names)
    buildGrid()
    const colors = names.map((_, i) => {
        const hue = (i / names.length) * 360;
        return `hsl(${hue}, 100%, 50%)`;
      });
    console.log(names.map(name => AllShapes.get(name)))
    place_shapes(names.map(name => AllShapes.get(name)), colors, names)
    console.log(Grid)
    redrawGrid()
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