const PAGE_SIZE = 60
let offset = 0

async function fetchCards(reset = false){

const search = document.getElementById("cardSearchInput").value

if(reset){
offset = 0
document.getElementById("cardGrid").innerHTML = ""
}

const { data, error } = await supabase
.from("cards")
.select("*")
.ilike("name", `%${search}%`)
.range(offset, offset + PAGE_SIZE - 1)

if(error){
console.error(error)
return
}

renderCards(data)

offset += PAGE_SIZE
}


function renderCards(cards){

const grid = document.getElementById("cardGrid")

cards.forEach(card => {

const div = document.createElement("div")
div.className = "card-tile"

div.innerHTML = `
<img src="/cards/${card.id}.jpg">
<div class="card-name">${card.name}</div>
<div class="card-type">${card.type || ""}</div>
`

grid.appendChild(div)

})

}


document
.getElementById("cardSearchInput")
.addEventListener("input", () => fetchCards(true))

document
.getElementById("loadMoreButton")
.addEventListener("click", () => fetchCards(false))


fetchCards(true)