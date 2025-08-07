/* --------------------------------------------
        Global constants and variables
---------------------------------------------*/


const canvas = document.getElementById('hexCanvas');
const ctx = canvas.getContext('2d');

const hexRadius = 30;
const hexHeight = Math.sqrt(3) * hexRadius;
const cols = 10;
const rows = 10;
const gray = "hsl(0,0%,50%)"

let categories = []
let AllShapes = new Map()

let hexagons = new Map();
let Grid = new Map(); // Grid ["q,r"]
let colorGrid = new Map();

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
    for (let x = 0; x < rows; x++){
        q_offset = Math.floor(x/2)
        for (let y = 0; y < cols; y++){
            Grid.set(SKey(x,y), false)
            colorGrid.set(SKey(x,y), gray)
        }
    }
}

function place(shape, offsetx, offsety, colors){
    let new_shape = shape.map(pos => [pos[0] + offsetx, pos[1] + offsety])

    let valid = new_shape.every(pos => Grid.has(SKey(pos[0], pos[1])) && !Grid.get(SKey(pos[0], pos[1])))
    if(!valid){
        return false
    }

    new_shape.forEach(pos => {
        Grid.set(SKey(pos[0], pos[1]), true)
        colorGrid.set(SKey(pos[0], pos[1]), colors[0])
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
    });
}

function place_shapes(shapes, colors, show_steps=false){
    if (shapes.length == 0)
        return true
    let offsetx = -cols
    while (offsetx < cols){
        let offsety = -rows
        while (offsety < rows){
            if (place(shapes[0], offsetx, offsety, colors)){
                if (show_steps){
                    //TODO: add a functionnality to show step by step
                    console.error("place_shapes: show steps not implemented")
                    return false
                };
                let res = place_shapes(shapes.slice(1), colors.slice(1))
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
    initGrid()
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const xOffset = hexRadius * 1.5 * col;
            const yOffset = hexHeight * row + (col % 2 ? hexHeight / 2 : 0);
            const centerX = hexRadius + xOffset;
            const centerY = hexRadius + yOffset;
            
            hexagons.set(SKey(centerX,centerY), { x: centerX, y: centerY, row: row, col:col});
            drawHex(centerX, centerY, hexRadius, row, col);
        }
    }
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

    if (!category || !shapeIndex[category]) return;

    shapeIndex[category].forEach(filename => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.textContent = filename.replace('.json', '');
    button.onclick = () => loadShape(category, filename);
    li.appendChild(button);
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

// Detect click and color tile
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    for (let i = 0; i < hexagons.length; i++) {
        const hex = hexagons[i];
        const dx = mx - hex.x;
        const dy = my - hex.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < hexRadius * 1.1) { // crude collision check
            hexagons[i].color = '#88f'; // new color
            break;
        }
    }
    redrawGrid();
});

buildGrid();


const button = document.getElementById("testButton")
button.addEventListener('click', () => {
    const colors = names.map((_, i) => {
        const hue = (i / names.length) * 360;
        return `hsl(${hue}, 100%, 50%)`;
      });
    console.log(names.map(name => AllShapes.get(name)))
    place_shapes(names.map(name => AllShapes.get(name)), colors)
    redrawGrid()
})
