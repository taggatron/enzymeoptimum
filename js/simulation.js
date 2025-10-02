// Simple enzyme-substrate simulation
// Author: Auto-generated

const ENZYME_COUNT = 6;
const SUBSTRATE_COUNT = 14;

function rand(min,max){ return Math.random()*(max-min)+min; }
function clamp(v,min,max){ return v<min?min:v>max?max:v; }

class Particle {
  constructor(x,y,radius,type){
    this.x=x; this.y=y; this.radius=radius; this.type=type; // 'enzyme' | 'substrate'
    this.baseRadius = radius;
    this.vx=rand(-1,1); this.vy=rand(-1,1);
    this.cooldown=0; // pause after reaction
    // shapeSeed influences active site distortion when denatured
    this.shapeSeed=Math.random()*Math.PI*2;
    this.denatureFactor=0; // 0 normal, up to 1 fully distorted
    this.denatured=false; // flag for probabilistic denaturation
    if(type==='substrate'){
      this.orientation = Math.random()*Math.PI*2; // current facing
      this.targetOrientation = this.orientation; // desired facing
    }
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

  resize(newWidth,newHeight){
    const prevW = this.width; const prevH = this.height;
    this.width = newWidth; this.height = newHeight;
    const scaleX = newWidth/prevW; const scaleY = newHeight/prevH;
    const uniformScale = Math.min(scaleX, scaleY);
    for(const p of this.particles){
      p.x *= scaleX; p.y *= scaleY;
      const scaled = p.baseRadius * uniformScale;
      // Clamp for readability extremes
      p.radius = clamp(scaled, p.type==='enzyme'?10:5, p.type==='enzyme'?40:20);
      if(p.x > this.width - p.radius) p.x = this.width - p.radius;
      if(p.y > this.height - p.radius) p.y = this.height - p.radius;
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

    // Probabilistic denaturation triggers only when passing whole degrees > 37C
    if(this.temperature > 37){
      const currentDeg = Math.floor(this.temperature);
      if(currentDeg > this.lastTempForDenatureCheck){
        for(let deg=this.lastTempForDenatureCheck+1; deg<=currentDeg; deg++){
          const over = deg - 37;
            // Probability curve: grows super-linearly then clamps
          const prob = Math.min(0.9, 0.05 * Math.pow(over,1.1));
          for(const enzyme of this.particles.filter(p=>p.type==='enzyme' && !p.denatured)){
            if(Math.random() < prob){
              enzyme.denatured = true;
              enzyme.denatureFactor = 0.15; // start partially denatured then ramp
            }
          }
        }
        this.lastTempForDenatureCheck = currentDeg;
      }
    }

    // Movement & state updates
    for(const p of this.particles){
      if(p.cooldown>0) p.cooldown -= 1;
      p.x += p.vx * speedFactor;
      p.y += p.vy * speedFactor;
      // boundaries
      if(p.x < p.radius){ p.x=p.radius; p.vx*=-1; }
      if(p.x > this.width-p.radius){ p.x=this.width-p.radius; p.vx*=-1; }
      if(p.y < p.radius){ p.y=p.radius; p.vy*=-1; }
      if(p.y > this.height-p.radius){ p.y=this.height-p.radius; p.vy*=-1; }
      // random steering
      p.vx += rand(-0.1,0.1)*0.02*speedFactor;
      p.vy += rand(-0.1,0.1)*0.02*speedFactor;
      const vmag = Math.hypot(p.vx,p.vy);
      const maxV = 1.2 + speedFactor*0.8;
      if(vmag>maxV){ p.vx = (p.vx/vmag)*maxV; p.vy=(p.vy/vmag)*maxV; }
      // Denaturation severity progression
      if(p.type==='enzyme'){
        if(p.denatured){
          p.denatureFactor = Math.min(1, p.denatureFactor + 0.004*speedFactor);
        } else {
          p.denatureFactor = 0; // pristine
        }
      }
    }

    // Substrate orientation update toward nearest active enzyme
    const activeEnzymes = this.particles.filter(p=>p.type==='enzyme' && !p.denatured);
    for(const s of this.particles.filter(p=>p.type==='substrate')){
      if(activeEnzymes.length){
        // find closest active enzyme
        let closest = null; let cdist=Infinity;
        for(const e of activeEnzymes){
          const dx=e.x-s.x; const dy=e.y-s.y; const d=dx*dx+dy*dy;
          if(d<cdist){ cdist=d; closest=e; }
        }
        if(closest){
          const target = Math.atan2(closest.y - s.y, closest.x - s.x);
          if(s.orientation===undefined) s.orientation=target;
          const diff = ((target - s.orientation + Math.PI*3) % (Math.PI*2)) - Math.PI; // shortest
          s.orientation += diff * 0.15; // smooth rotate
        }
      }
    }

    // Reactions
    const enzymes = this.particles.filter(p=>p.type==='enzyme');
    const substrates = this.particles.filter(p=>p.type==='substrate');
    for(const e of enzymes){
      if(e.cooldown>0) continue;
      if(e.denatured) continue; // no activity
      for(const s of substrates){
        if(s.cooldown>0) continue;
        const dx = e.x - s.x; const dy = e.y - s.y; const dist = Math.hypot(dx,dy);
        if(dist < e.radius + s.radius - 6){
          const tempEff = this.temperatureEfficiency();
          const integrity = 1 - e.denatureFactor*0.85; // degrade function
          const chance = 0.04 * speedFactor * tempEff * integrity;
          if(Math.random() < chance){
            this.totalProducts++;
            this.reactionTimestamps.push(performance.now());
            s.x = rand(20,this.width-20); s.y = rand(20,this.height-20);
            e.cooldown = 15; s.cooldown = 10;
            this.reactionAnimations.push({x:e.x,y:e.y,started:performance.now()});
          }
        }
      }
    }
  }

  computeSpeedFactor(){
    // Maintain collision theory: kinetic energy (speed) keeps increasing with temperature (no post-37 penalty)
    // Reference baseline 25C, approximate Q10=2 behavior across full range
    const t = this.temperature;
    return Math.pow(2, (t-25)/10);
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
    const ctx=this.ctx; const r=p.radius; ctx.save(); ctx.translate(p.x,p.y);
    if(!p.denatured){
      ctx.beginPath();
      const wobble = 1 + 0.05*Math.sin(p.shapeSeed + performance.now()/900);
      ctx.fillStyle = '#38bdf8';
      ctx.ellipse(0,0,r*wobble,r,0,0,Math.PI*2);
      ctx.fill();
      // Active site notch
      ctx.beginPath();
      ctx.fillStyle = '#0f172a';
      ctx.rotate(p.shapeSeed*0.2 + performance.now()/5000);
      ctx.moveTo(0,0);
      ctx.arc(0,0,r*0.85,-0.5,0.5,false);
      ctx.closePath();
      ctx.fill();
    } else {
      const spikes = 11; const t=performance.now()/400;
      ctx.beginPath();
      for(let i=0;i<spikes;i++){
        const ang=(i/spikes)*Math.PI*2;
        const jitter=(Math.sin(t + i*1.7 + p.shapeSeed)*0.4 + 0.6);
        const rr = r * (0.6 + jitter*0.6 * (0.3 + 0.7*p.denatureFactor));
        const x=Math.cos(ang)*rr; const y=Math.sin(ang)*rr;
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.closePath();
      ctx.fillStyle='#2563eb';
      ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.25)';
      ctx.lineWidth=Math.max(1.5,r*0.09);
      ctx.stroke();
      const blobCount=4;
      for(let i=0;i<blobCount;i++){
        const ang=(i/blobCount)*Math.PI*2 + t*0.8;
        const rad = r*0.35 + 4*Math.sin(t*1.3 + i);
        const bx=Math.cos(ang)*rad*0.7; const by=Math.sin(ang)*rad*0.7;
        ctx.beginPath();
        ctx.fillStyle=`rgba(220,38,38,${0.6 + 0.4*Math.sin(t + i)})`;
        ctx.ellipse(bx,by,6,4,ang,0,Math.PI*2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawSubstrate(p){
    const ctx=this.ctx; ctx.save(); ctx.translate(p.x,p.y);
    const spread = 1.8; // slice angle
    const rot = p.orientation || 0; ctx.rotate(rot);
    ctx.beginPath();
    ctx.fillStyle='#fbbf24';
    ctx.moveTo(0,0);
    ctx.arc(0,0,p.radius,-spread/2,spread/2,false);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.35)';
    ctx.lineWidth=Math.max(1,p.radius*0.18);
    ctx.stroke();
    // ridge highlight
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(p.radius,0);
    ctx.strokeStyle='#ffe6b3'; ctx.lineWidth=Math.max(1,p.radius*0.18); ctx.stroke();
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
