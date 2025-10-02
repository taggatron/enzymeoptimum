import { Simulation } from './simulation.js';
import { ReactionGraph } from './graph.js';

const tempSlider = document.getElementById('tempSlider');
const tempValue = document.getElementById('tempValue');
const rateDisplay = document.getElementById('rateDisplay');
const totalProductsEl = document.getElementById('totalProducts');
const tempNote = document.getElementById('tempNote');

const simCanvas = document.getElementById('simCanvas');
const graphCanvas = document.getElementById('graphCanvas');

const simulation = new Simulation(simCanvas);
const graph = new ReactionGraph(graphCanvas, () => simulation.temperature, () => simulation.currentRatePer10s);

// Baseline logical width for scaling heuristics
const BASE_WIDTH = 800;

function resizeCanvases(){
  const dpr = window.devicePixelRatio || 1;
  const containerWidth = simCanvas.parentElement.clientWidth;
  // Scale factor relative to baseline, clamped for extreme sizes
  const scale = Math.min(1.4, Math.max(0.55, containerWidth / BASE_WIDTH));
  const simHeight = Math.round(420 * scale); // proportional height
  const graphHeight = Math.round(340 * Math.max(0.6, scale*0.95));

  simCanvas.style.width = '100%';
  simCanvas.style.height = simHeight + 'px';
  graphCanvas.style.width = '100%';
  graphCanvas.style.height = graphHeight + 'px';

  // Logical (CSS) dimensions
  const logicalSimW = simCanvas.clientWidth;
  const logicalSimH = simHeight;
  const logicalGraphW = graphCanvas.clientWidth;
  const logicalGraphH = graphHeight;

  // Backing store size (HiDPI)
  simCanvas.width = Math.floor(logicalSimW * dpr);
  simCanvas.height = Math.floor(logicalSimH * dpr);
  graphCanvas.width = Math.floor(logicalGraphW * dpr);
  graphCanvas.height = Math.floor(logicalGraphH * dpr);

  // Inform simulation using logical pixels so boundary math matches displayed size
  simulation.resize(logicalSimW, logicalSimH);

  simulation.ctx.setTransform(dpr,0,0,dpr,0,0);
  const gctx = graphCanvas.getContext('2d');
  gctx.setTransform(dpr,0,0,dpr,0,0);
  graph.setScaleFactor(scale);
  graph.setLogicalSize(logicalGraphW, logicalGraphH);
}

window.addEventListener('resize', resizeCanvases, {passive:true});
window.addEventListener('orientationchange', ()=>{ setTimeout(resizeCanvases, 150); }, {passive:true});

// Use ResizeObserver for container-based changes (e.g., CSS layout shifts)
if('ResizeObserver' in window){
  const ro = new ResizeObserver(()=> resizeCanvases());
  ro.observe(simCanvas.parentElement);
}
resizeCanvases();

function updateTemp(val){
  simulation.setTemperature(parseInt(val,10));
  tempValue.textContent = val;
  const t = simulation.temperature;
  if(t < 37){
    tempNote.textContent = 'As the temperature increases the substrates and enzymes collide more often (collision theory) leading to an increase in the rate of reaction.';
  } else if (Math.round(t) === 37){
    tempNote.textContent = 'The temperature is now at the optimum. This means there are the most collisions without any enzyme shape changes.';
  } else {
    tempNote.textContent = 'Temperature above 37°C causes denaturation (active site distortion).';
  }
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
