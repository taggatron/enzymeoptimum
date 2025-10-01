// Simple enzyme-substrate simulation
// Author: Auto-generated

const ENZYME_COUNT = 6;
const SUBSTRATE_COUNT = 14;

function rand(min,max){ return Math.random()*(max-min)+min; }
function clamp(v,min,max){ return v<min?min:v>max?max:v; }

class Particle {
  constructor(x,y,radius,type){
    this.x=x; this.y=y; this.radius=radius; this.type=type; // 'enzyme' | 'substrate'
    this.vx=rand(-1,1); this.vy=rand(-1,1);
    this.cooldown=0; // pause after reaction
    // shapeSeed influences active site distortion when denatured
    this.shapeSeed=Math.random()*Math.PI*2;
    this.denatureFactor=0; // 0 normal, up to 1 fully distorted
    this.denatured=false; // flag for probabilistic denaturation
  }
}

export class Simulation {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width; this.height = canvas.height;
    this.temperature = 25;
    this.particles=[];
    this.totalProducts=0;
    this.reactionTimestamps=[]; // store ms timestamps
    this.reactionAnimations=[]; // {x,y,started}
    this.lastTempForDenatureCheck = 25;
    for(let i=0;i<ENZYME_COUNT;i++){
      this.particles.push(new Particle(rand(50,this.width-50), rand(50,this.height-50), 22,'enzyme'));
    }
    for(let i=0;i<SUBSTRATE_COUNT;i++){
      this.particles.push(new Particle(rand(30,this.width-30), rand(30,this.height-30), 10,'substrate'));
    }
  }

  setTemperature(t){ this.temperature = t; }

  get currentRatePer10s(){
    const cutoff = performance.now()-10000;
    this.reactionTimestamps = this.reactionTimestamps.filter(ts=>ts>=cutoff);
    return this.reactionTimestamps.length / 10; // per second average over last 10s
  }

  update(){
    const speedFactor = this.computeSpeedFactor();
    // Probabilistic denaturation: only begin once temperature > 37
    if(this.temperature > 37){
      // For each integer degree increase beyond last check, run probability trials
      const currentDeg = Math.floor(this.temperature);
      if(currentDeg > this.lastTempForDenatureCheck){
        for(let deg = this.lastTempForDenatureCheck+1; deg<=currentDeg; deg++){
          const over = deg - 37; // degrees above threshold
          // Base probability per enzyme to become denatured grows with temperature
            // e.g., 5% per degree^1.1 capped at 90%
          const p = Math.min(0.9, 0.05 * Math.pow(over,1.1));
          for(const enzyme of this.particles.filter(p=>p.type==='enzyme' && !p.denatured)){
            if(Math.random() < p){
              enzyme.denatured = true;
              // initial denature factor small so visual ramps
              enzyme.denatureFactor = 0.15;
            }
          }
        }
        this.lastTempForDenatureCheck = currentDeg;
      }
    }

    for(const p of this.particles){
      if(p.cooldown>0) p.cooldown -= 1;
      // random jitter plus scaled velocity
      p.x += p.vx * speedFactor;
      p.y += p.vy * speedFactor;
      // boundaries
      if(p.x < p.radius) { p.x=p.radius; p.vx*=-1; }
      if(p.x > this.width-p.radius){ p.x=this.width-p.radius; p.vx*=-1; }
      if(p.y < p.radius){ p.y=p.radius; p.vy*=-1; }
      if(p.y > this.height-p.radius){ p.y=this.height-p.radius; p.vy*=-1; }
      // slight steering randomness
      p.vx += rand(-0.1,0.1)*speedFactor*0.02;
      p.vy += rand(-0.1,0.1)*speedFactor*0.02;
      const vmag = Math.hypot(p.vx,p.vy);
      const maxBase = 1.2 + speedFactor*0.8;
      if(vmag>maxBase){ p.vx = (p.vx/vmag)*maxBase; p.vy=(p.vy/vmag)*maxBase; }
      // Progress denaturation severity only for denatured enzymes; none below or at 37
      if(p.type==='enzyme'){
        if(!p.denatured){
          p.denatureFactor = 0; // pristine until denature event
        } else {
          // Increase toward 1 as temperature rises further; logistic with temp
          const over = Math.max(0,this.temperature-37);
          const target = 1 - 1/(1+Math.exp(-(over-8)/4));
            // Smoothly lerp current toward target
          p.denatureFactor += (target - p.denatureFactor)*0.02;
        }
      } else p.denatureFactor=0;
    }

    // Collision detection enzyme-substrate
    const enzymes = this.particles.filter(p=>p.type==='enzyme');
    const substrates = this.particles.filter(p=>p.type==='substrate');

    for(const e of enzymes){
      if(e.cooldown>0) continue;
      for(const s of substrates){
        if(s.cooldown>0) continue;
        const dx = e.x - s.x;
        const dy = e.y - s.y;
        const dist = Math.hypot(dx,dy);
        if(dist < e.radius + s.radius - 6){ // within active site proximity
          // Reaction probability depends on active site integrity and temp optimum (37C)
          const tempEfficiency = this.temperatureEfficiency();
          const activeIntegrity = 1 - e.denatureFactor*0.85; // lose most of function
          const chance = 0.04 * speedFactor * tempEfficiency * activeIntegrity;
          if(Math.random() < chance){
            // Reaction happened -> product formed
            this.totalProducts++;
            this.reactionTimestamps.push(performance.now());
            // Reset substrate position (simulate product leaving and new substrate entering)
            s.x = rand(20,this.width-20); s.y=rand(20,this.height-20);
            e.cooldown = 15;
            s.cooldown = 10;
            this.reactionAnimations.push({x:e.x, y:e.y, started:performance.now()});
          }
        }
      }
    }
  }

  computeSpeedFactor(){
    // Basic Q10-like scaling: rate doubles each 10C up to 37 then declines with denaturation
    const t = this.temperature;
    const base = Math.pow(2, (Math.min(t,37)-25)/10); // reference 25C baseline
    const penalty = t>37 ? Math.exp(-(t-37)/15) : 1; // gradual decline
    return base * penalty;
  }

  temperatureEfficiency(){
    // Bell-shaped efficiency centered near 37C ignoring denature shape factor
    const t=this.temperature; const optimum=37; const spread=14; // wider curve
    return Math.exp(-Math.pow(t-optimum,2)/(2*spread*spread));
  }

  draw(){
    const ctx=this.ctx; ctx.clearRect(0,0,this.width,this.height);
    for(const p of this.particles){
      if(p.type==='enzyme') this.drawEnzyme(p); else this.drawSubstrate(p);
    }
    this.drawReactionAnimations();
  }

  drawEnzyme(p){
    const ctx=this.ctx;
    ctx.save();
    ctx.translate(p.x,p.y);
    // Enzyme body
    ctx.beginPath();
    ctx.fillStyle = '#38bdf8';
    const wobble = 1 + p.denatureFactor*0.4*Math.sin(p.shapeSeed + performance.now()/700);
    ctx.ellipse(0,0,p.radius*wobble,p.radius*(1 - 0.1*p.denatureFactor),0,0,Math.PI*2);
    ctx.fill();

    // Active site (a cut-out or contrasting shape)
    // We'll draw a contrasting arc notch; denaturation distorts angle and size
    const notchAngle = 0.9 + p.denatureFactor*0.8;
    const notchSize = 0.55 + p.denatureFactor*0.3*Math.sin(p.shapeSeed + performance.now()/500);
    ctx.beginPath();
    ctx.fillStyle = '#0f172a';
    ctx.rotate(p.shapeSeed * 0.2 + performance.now()/5000);
    ctx.moveTo(0,0);
    ctx.arc(0,0,p.radius*0.85, -notchAngle*notchSize, notchAngle*notchSize, false);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawSubstrate(p){
    const ctx=this.ctx; ctx.save(); ctx.translate(p.x,p.y);
    ctx.beginPath();
    ctx.fillStyle = '#fbbf24';
    ctx.arc(0,0,p.radius,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  drawReactionAnimations(){
    const ctx=this.ctx;
    const now=performance.now();
    const DURATION=450; // ms
    this.reactionAnimations = this.reactionAnimations.filter(a=> now - a.started < DURATION);
    for(const a of this.reactionAnimations){
      const t = (now - a.started)/DURATION; // 0..1
      const alpha = 1 - t;
      const radius = 10 + t*40;
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = `rgba(250,250,250,${alpha.toFixed(3)})`;
      ctx.lineWidth = 2 + (1-t)*2;
      ctx.arc(a.x,a.y,radius,0,Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
