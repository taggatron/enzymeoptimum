import { Simulation } from './simulation.js';
import { ReactionGraph } from './graph.js';

const tempSlider = document.getElementById('tempSlider');
const tempValue = document.getElementById('tempValue');
const rateDisplay = document.getElementById('rateDisplay');
const totalProductsEl = document.getElementById('totalProducts');

const simCanvas = document.getElementById('simCanvas');
const graphCanvas = document.getElementById('graphCanvas');

const simulation = new Simulation(simCanvas);
const graph = new ReactionGraph(graphCanvas, () => simulation.temperature, () => simulation.currentRatePer10s);

function updateTemp(val){
  simulation.setTemperature(parseInt(val,10));
  tempValue.textContent = val;
}

tempSlider.addEventListener('input', e => updateTemp(e.target.value));

// Initial temperature
updateTemp(tempSlider.value);

function loop(){
  simulation.update();
  simulation.draw();
  graph.update();
  rateDisplay.textContent = simulation.currentRatePer10s.toFixed(1);
  totalProductsEl.textContent = simulation.totalProducts.toString();
  requestAnimationFrame(loop);
}
loop();
