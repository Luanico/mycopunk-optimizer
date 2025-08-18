import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";
import saveAs from "https://cdn.jsdelivr.net/npm/file-saver@2.0.5/+esm";

/* --------------------------------------------
        Global constants and variables
---------------------------------------------*/

export const canvas = document.getElementById('hexCanvas');
export const ctx = canvas.getContext('2d');

export const hexRadius = 30;
export const hexHeight = Math.sqrt(3) * hexRadius;
export let cols = 7;
export let rows = 7;
export const gray = "hsl(0,0%,50%)"

export let categories = []
export let categoriesMap = new Map()
export let AllShapes = new Map()
let selected = []

export let hexagons = new Map();
export let Grid = new Map(); // Grid ["q,r"]
export let colorGrid = new Map();
export let GridToShape = new Map()

/* --------------------------------------------
              Helper functions
---------------------------------------------*/

export function SKey(x,y){
    return (`${x},${y}`)
}

export async function GetLines(filepath){
    try {
        const response = await fetch(filepath);
        const text = await response.text();
        const lines = text.split(/\r?\n/);
        return lines.filter(line => line.length > 0)
      } catch (error) {
        console.error('Error loading file:', error);
      }
}

export function parseKey(s){
    return(s.split(',').map(c => {
        return parseInt(c)
    }))
}


export function hex_to_pixel_flat(q, r, size){
    let x = size * 3/2 * q
    let y = size * Math.sqrt(3) * (r + q / 2)
    return ([x, y])
}

//returns coordinates of neighbors
export function neighbors(r, c){
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

export async function load_shape(filepath){ 
    const lines = await GetLines(filepath)
    let shape = lines.map(s => {
        let pos = s.split(',')
        return([parseInt(pos[0]), parseInt(pos[1])])
    })
    return shape
}

export function loadShapes(){
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

//rotations
function axialToCube(q, r) {
    let x = q;
    let z = r;
    let y = -x - z;
    return [x, y, z];
}

function cubeToAxial(x, y, z) {
    return [x, z];
}

function getCubeCenter(shape) {
    let sumX = 0, sumY = 0, sumZ = 0;
    shape.forEach(([q, r]) => {
        let [x, y, z] = axialToCube(q, r);
        sumX += x;
        sumY += y;
        sumZ += z;
    });
    let n = shape.length
    return [sumX / n, sumY / n, sumZ / n]
}
function rotateCubeClockwise([x, y, z]) {
    return [-z, -x, -y]
}

export function rotateShapeAroundCenter(shape) {
    // Convert to cube coordinates
    let cubeShape = shape.map(([q, r]) => axialToCube(q, r))

    // Find center
    let [cx, cy, cz] = getCubeCenter(shape)

    // Translate to center, rotate, translate back
    let rotated = cubeShape.map(([x, y, z]) => {
        let tx = x - cx
        let ty = y - cy
        let tz = z - cz

        let [rx, ry, rz] =  rotateCubeClockwise([tx, ty, tz])

        return cubeToAxial(rx + cx, ry + cy, rz + cz)
    });

    // Round back to integers (since floating errors may appear)
    return rotated.map(([q, r]) => [Math.round(q), Math.round(r)]);
}

function waitForClick(buttonId) {
    return new Promise(resolve => {
      const button = document.getElementById(buttonId);
      const handler = () => {
        button.removeEventListener("click", handler);
        resolve();
      };
      button.addEventListener("click", handler);
    });
  }

/* --------------------------------------------
                Main functions
---------------------------------------------*/

export function initGrid(){
    rows = parseInt(document.getElementById('rowsInput').value, 10);
    cols = parseInt(document.getElementById('colsInput').value, 10);
    Grid.clear()
    GridToShape.clear()
    colorGrid.clear()
    for (let x = 0; x < rows; x++){
        let q_offset = Math.floor(x/2)
        for (let y = -q_offset; y < cols - q_offset; y++){
            Grid.set(SKey(x,y), false)
            colorGrid.set(SKey(x,y), gray)
            GridToShape.set(SKey(x,y), "")
        }
    }
}

export function place(shape, offsetx, offsety, colors, shape_name){
    let new_shape = shape.map(pos => [pos[0] + offsetx, pos[1] + offsety])

    let valid = new_shape.every(pos => Grid.has(SKey(pos[0], pos[1])) && !Grid.get(SKey(pos[0], pos[1])))
    console.log(valid)
    if(!valid){
        return false
    }
    console.log("erm")
    new_shape.forEach(pos => {
        Grid.set(SKey(pos[0], pos[1]), true)
        colorGrid.set(SKey(pos[0], pos[1]), colors[0])
        GridToShape.set(SKey(pos[0], pos[1]), shape_name)
    });
    return true
}

export function unplace(shape, offsetx, offsety){
    console.log("unplace")
    let new_shape = shape.map(pos => [pos[0] + offsetx, pos[1] + offsety])

    new_shape.forEach(pos => {
        if (Grid.get(SKey(pos[0], pos[1])) == false)
            console.error(`Unplace: hex is already False at pos ${pos}!`)
        Grid.set(SKey(pos[0], pos[1]), false)
        colorGrid.set(SKey(pos[0], pos[1]), gray)
        GridToShape.set(SKey(pos[0], pos[1]), "")
    });
}

export async function place_shapes(shapes, colors, shape_names, show_steps=false){
    if (shapes.length == 0)
        return true
    let current = shapes[0]
    let i = 0 // times rotated
    while (i < 6){
        let offsetx = -cols
        while (offsetx < cols){
            let offsety = -rows
            while (offsety < rows){
                    if (place(current, offsetx, offsety, colors, shape_names[0])){
                        if (show_steps){
                            redrawGrid()
                            await waitForClick("nextStepButton")
                        };
                        let res = await place_shapes(shapes.slice(1), colors.slice(1), shape_names.slice(1), show_steps)
                        if (res)
                            return true
                        else
                            unplace(current, offsetx, offsety)
                    }
                
                offsety++
            }
            offsetx++
        }
        current = rotateShapeAroundCenter(current)
        i++
    }

    // Couldn't place the shape, return false
    return false
}

/* --------------------------------------------
              Drawing functions
---------------------------------------------*/

export function drawHex(x, y, radius, row, col) {
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

export function buildGrid() {
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

export function redrawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hexagons.forEach(hex => drawHex(hex.x, hex.y, hexRadius, hex.row, hex.col));
}

/* --------------------------------------------
                Weapon selector
---------------------------------------------*/

export async function loadIndex() {
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

export function showShapes(category) {
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
               File manipulation
---------------------------------------------*/

export function downloadCustomShape(filename, shape) {
    const lines = shape.map(([q, r]) => `${q},${r}`);
    const content = lines.join("\n") + "\n";

    // a blob represents the file in memory
    const blob = new Blob([content], { type: 'text/plain' });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

export function downloadShapesZip(shapesByCategory) {
    const zip = new JSZip();

    // shapesByCategory = { "animals": [shape1, shape2], "vehicles": [shape3] }
    for (const [category, shapes] of Object.entries(categoriesMap)) {
        const folder = zip.folder(category);
        shapes.forEach((name, i) => {
            const shape = AllShapes.get(name)
            const content = shape.map(([q, r]) => `${q},${r}`).join("\n") + "\n";
            folder.file(`${name}`, content);
        });
    }

    // Generate the ZIP and trigger download
    zip.generateAsync({ type: "blob" }).then(content => {
        saveAs(content, "shapes.zip");
    });
}