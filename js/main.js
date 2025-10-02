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

function resizeCanvases(){
  const dpr = window.devicePixelRatio || 1;
  // Target logical widths based on container; full width minus padding
  const containerWidth = simCanvas.parentElement.clientWidth;
  const simHeight = Math.max(300, Math.min(520, Math.round(containerWidth*0.6)));
  const graphHeight = 240;
  simCanvas.style.width = '100%';
  simCanvas.style.height = simHeight + 'px';
  graphCanvas.style.width = '100%';
  graphCanvas.style.height = graphHeight + 'px';
  simulation.resize(Math.floor(simCanvas.clientWidth * dpr), Math.floor(simHeight * dpr));
  graphCanvas.width = Math.floor(graphCanvas.clientWidth * dpr);
  graphCanvas.height = Math.floor(graphHeight * dpr);
  // Scale contexts for HiDPI sharpness
  simulation.ctx.setTransform(dpr,0,0,dpr,0,0);
  const gctx = graphCanvas.getContext('2d');
  gctx.setTransform(dpr,0,0,dpr,0,0);
}

window.addEventListener('resize', resizeCanvases, {passive:true});
window.addEventListener('orientationchange', ()=>{ setTimeout(resizeCanvases, 150); }, {passive:true});
resizeCanvases();

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
