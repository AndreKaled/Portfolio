var ideia = document.getElementById('ideia');

var cores = ['#0000CD','#6959CD','#808080',
'#00BFFF','#90EE90','#00FF00',
'#DAA520','#D2691E','#FF00FF','#FF4500','#FFFF00',
'#A020F0','#DC143C','#B0E0E6',
'#FFE4B5','#F0F8FF'];

function sortCor(){
    return Math.floor(Math.random() * cores.length);
}

function trocaCor(){
    var numero = sortCor()
    ideia.style = "color: " +cores[numero];
    console.log(cores[numero])
}

setInterval(trocaCor,250);