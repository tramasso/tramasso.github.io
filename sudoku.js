black_border = "2px solid black"
red_border = "2px solid red"
default_speed = 100 // default execution "delay"
load_button = document.getElementById("load-game")

// ========= HELPER FUNCTIONS ========= //

//function to check if two arrays are equal
function is_equal(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

//This function reads a game from the json object and maps it into an array of numbers
function parse_game(game) {
    var game_data = game.split(" ")
    var init = game_data[0]
    var sol = game_data[1]
    let parsed_game = []
    parsed_game.push(init.split("").map(Number))
    parsed_game.push(sol.split("").map(Number))

    return parsed_game

}


// ========== UI FUNCTIONS ========== //

//updates Table interface
function updateTable(tableData) {
    let table = document.getElementById("main-table")
    
    if(!table) {
        createTable(tableData)
        return
    }

    for(let i=0;i<81;i++) {
        let cell = document.getElementById(`cell-${i}`)
        cell.style.backgroundColor = "white"
        cell.innerText = `${tableData[i]}`
    }
}
//Creates table interface
function createTable(tableData) {
    var table = document.createElement('table');
    table.classList.add("table", "is-bordered", "is-striped", "is-narrow","level-item", "has-background-light")
    table.id = "main-table"
    var tableBody = document.createElement('tbody');
  
    for (let i=0; i<tableData.length; i+=9){
        var row = document.createElement('tr');
        if (i%27 == 0) row.style.borderTop = black_border 
        row.style.borderLeft = black_border
        row.style.borderRight = black_border
        
        for(let j=i;j<i+9;j++){
            
            var cell = document.createElement('td');
            if(j%3 == 2) cell.style.borderRight = black_border
            cell.style.backgroundColor = "white"
            cell.id = `cell-${j}`
            cell.width="50px"
            cell.classList.add("subtitle","has-text-centered")
            cell.appendChild(document.createTextNode(tableData[j]));
            row.appendChild(cell);
      
        }
      tableBody.appendChild(row);
    
    }   
    tableBody.style.borderBottom = black_border
    table.appendChild(tableBody);

    document.getElementById("main-column").appendChild(table)
}

//update cell color on DSatur
function cell_edit(cell) {
    return new Promise((res) => {
        setTimeout(() => {
            cell.style.backgroundColor = "LightGrey"
            res()
        },100)
        
    })
}
// function that waits color to be updated
async function highlight_cell(v) {
    let cell = document.getElementById(`cell-${v}`)
    await cell_edit(cell)
    
}

// Set spinning running classes to buttons and disables them
function running_update_view(running,disabled) {
setTimeout(() => {
    running.classList.toggle(`is-loading`)
    disabled.disabled = ! disabled.disabled
    load_button.disabled = !load_button.disabled

},5)

}



// ========= main class ========= //
class Sudoku {
    constructor(game){
     
        this.vertices = [...Array(81)].map(() => []); // adjacency list
        /* some inputs used in the class */
        this.speed = document.getElementById("speed-input")
        this.dsatur_button = document.getElementById("dsatur")
        this.backtracking_button = document.getElementById("backtracking")
        this.speed_val = default_speed

        //build the graph adjacency list
        this.build_sudoku_graph()
        // this.sort_edges()
    }
    //sets initial game values
    set_game(game) {
        this.initial_colors = game[0]
        this.result = game[0].slice()
        this.solution = game[1]
        updateTable(this.result)
    }

    get graph(){
        return this.vertices
    }
    sort_edges() {
        this.vertices.forEach(e => e.sort((a,b) => a-b))
    }
 
    // checks for each neighbor if a color is available
    color_available(v,color){
        let vertex = this.vertices[v]
        for(let i=0; i<vertex.length; i++){
            let adj = vertex[i]
            if(this.result[adj] == color) return false

        }
        return true
    }

    // main m backtracking function
    m_graph_coloring(m){
        this.result = this.initial_colors.slice() //updates result to initial board
        /* Deal with UI changes */
        updateTable(this.result)
        this.speed.value ? this.speed_val = this.speed.value : default_speed
        running_update_view(this.backtracking_button,this.dsatur_button)

        // Run the method
        this.m_graph_coloring_util(m,0).then(()=> {
            updateTable(this.result)
            running_update_view(this.backtracking_button,this.dsatur_button)
        })
    

    }
    //Utility backtracking method, async because theres a delay to display iterations
    async m_graph_coloring_util(m,v){
        // console.log(v)
        
        if (v == 81) return true
        for (let c = 1; c <= m; c++){

            if (this.color_available(v,c)){
  
                await this.set_result_value(v,c)

                if( await this.m_graph_coloring_util(m,v+1)) return true

                await this.set_result_value(v,0)
            }
        }
        return false
    }

    //DSatur method
    async dsatur(){
        /* Loads initial config and update UI */
        running_update_view(this.dsatur_button,this.backtracking_button)
        this.result = this.initial_colors.slice()
        updateTable(this.result)
        this.speed.value ? this.speed_val = this.speed.value : default_speed

        var saturation = [...Array(81)].map(() => 0)
        var used_colors = []
        var available_colors = [...Array(20).keys()].slice(1)
        var remaining = [...Array(81).keys()]
        var v_count = 0

        /* Method to caluculate the saturation for the initial board */
        for (let i=0; i < 81; i++) {
            let sat = []
            if(this.result[i] == 0) {
                let vertex =  this.vertices[i]
                vertex.forEach((adj) => {
                    let color = this.result[adj]
                    if(color > 0 && !sat.includes(color))
                        sat.push(color)
                })
                saturation[i] = sat.length
            } else {
                if(!used_colors.includes(this.result[i])) used_colors.push(this.result[i])
                available_colors = available_colors.filter(e => e !== this.result[i])
                remaining = remaining.filter(e => e !== i)
                v_count++
                saturation[i] = -1
            }
         
        }

        /* Main DSatur loop */
        while(v_count < 81) {
            // get index of max saturation
            let max = saturation.indexOf(Math.max(...saturation));
            highlight_cell(max)
            let colored = false
            // look colors and update the color/saturation if the color is available
            for(let c=1;c<=9; c++) {
                if(this.color_available(max,c)) {
                    this.update_saturation(this.vertices[max],c,saturation)
                    await this.set_result_value(max,c)
                    saturation[max] = -1
                    v_count++
                    colored = true
                    break
                }
            }
            if(!colored) {
              return false
            }
            
        }
        //Wait to update the view
        setTimeout(() => {
            updateTable(this.result)
            running_update_view(this.dsatur_button,this.backtracking_button)
        },100)
        return true
    }
    // updates saturation given a vertex,color combination
    update_saturation(vertex,c,sat) {
        vertex.forEach((v) => {
            if(this.color_available(v,c) && sat[v]!=-1)
                sat[v]++

        })
    }

    // ======== METHOD TO UPDATE COLOR ON A VERTEX IN BOTH COLORS AND UI ========= //

    // update new color value into the Table UI
    set_result_value(p,v){
        return new Promise((res) => {
            this.result[p] = v
            setTimeout(() => {
                let cell = document.getElementById(`cell-${p}`)
                cell.innerText = `${v}`
                res()
            },this.speed_val)
        })
    
    }

    // ======= SUDOKU GRAPH BUILDING FUNCTIONS ========= //

    // Helper to return 3x3 Regions in the graph
     get_small_regions(){
        let regions = [...Array(9)].map(() => [])
        let idx = 0
        for(let i = 0; i<9; i++){
            if (i%3 == 0) { idx = i*9 }
            const fst = [idx,idx+1,idx+2,idx+9,idx+10,idx+11,idx+18,idx+19,idx+20]
            regions[i].push(...fst)
            idx += 3
        }
        return regions
    }
    // Helper to set edges on the 3x3 regions
    set_small_regions(index){
        let regions = this.get_small_regions()

        for(let i=0;i<9;i++) {
            const r = regions[i]
            if(r.includes(index)){
                r.forEach((v) => {
                    if (this.is_available(index,v)){
                        this.vertices[index].push(v)
                    }
                })
            }
           
        }
    }

    // set grap row and column edges
    set_graph_rc(i,j){
        let rows = []
        let idx = i*9+j

        for(let k=0;k<9;k++){
            let r = i*9+k
            let c = k*9+j
            if(this.is_available(idx,r)) {
                this.vertices[idx].push(r)
            }
            if(this.is_available(idx,c)) {
                this.vertices[idx].push(c)
            }
        }

    }

    // check if edge has been included already
    is_available(idx,value) {
        return ((idx!=value) && (!this.vertices[idx].includes(value)))
    }
    // main function to build graph
    build_sudoku_graph(){
        for(let i=0; i<9; i++){
            for(let j=0; j<9; j++){
                let idx = i*9+j
                this.set_graph_rc(i,j)
                this.set_small_regions(idx)
            }
            
        }
    }
} 

// updates the object game configuration based on input
function loadgame() {
    let input = document.getElementById("id-input")
    let id = (input.value) ? input.value : 3
    if (id > 1000 || id <= 0){ alert('Choose an ID between 0 and 1000'); return; }
    let game = parse_game(data[id-1])
    sudoku.set_game(game)
}

var sudoku = new Sudoku()
loadgame()

