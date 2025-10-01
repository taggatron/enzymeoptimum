// Reaction rate vs temperature graph

export class ReactionGraph {
  constructor(canvas, temperatureGetter, rateGetter){
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.temperatureGetter=temperatureGetter;
    this.rateGetter=rateGetter;
    this.maxT=80; this.minT=0;
    this.samples=[]; // {t, theoretical}
    for(let t=0;t<=80;t+=2){
      this.samples.push({t, theoretical:this.theoreticalRate(t)});
    }
  }

  theoreticalRate(t){
    // Rapid falloff after optimum: Q10 rise to 37, then steep exponential decay (strong denaturation impact)
    const base = Math.pow(2, (Math.min(t,37)-25)/10); // growth to optimum
    if(t <= 37) return base;
    const excess = t - 37;
    // Steeper decay factor: half-life roughly every 3°C beyond optimum
    const decay = Math.pow(0.5, excess/3); // 37+3 => 50%, 37+6 => 25%, etc.
    return base * decay;
  }

  update(){ this.draw(); }

  draw(){
    const ctx=this.ctx; const w=this.canvas.width; const h=this.canvas.height;
    ctx.clearRect(0,0,w,h);
    // Recompute samples (in case formula or dynamic params change later)
    this.samples.length = 0;
    for(let t=0;t<=80;t+=2){
      this.samples.push({t, theoretical:this.theoreticalRate(t)});
    }
    // Axes
    ctx.strokeStyle='#94a3b8'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(40,10); ctx.lineTo(40,h-30); ctx.lineTo(w-10,h-30); ctx.stroke();

    const maxRate = Math.max(...this.samples.map(s=>s.theoretical))*1.1;

    // Plot theoretical curve
    ctx.strokeStyle='#4ade80'; ctx.lineWidth=2; ctx.beginPath();
    for(let i=0;i<this.samples.length;i++){
      const s=this.samples[i];
      const x = this.xForTemp(s.t,w);
      const y = this.yForRate(s.theoretical,maxRate,h);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // Current temperature vertical line
    const ct = this.temperatureGetter();
    ctx.strokeStyle='#f87171';
    const cx = this.xForTemp(ct,w);
    ctx.beginPath(); ctx.moveTo(cx,h-30); ctx.lineTo(cx,10); ctx.stroke();

    // Current measured rate point
    const rate = this.rateGetter();
    const ry = this.yForRate(rate,maxRate,h);
    ctx.fillStyle='#f87171';
    ctx.beginPath(); ctx.arc(cx,ry,5,0,Math.PI*2); ctx.fill();

    // Labels
    ctx.fillStyle='#f1f5f9'; ctx.font='12px system-ui';
    ctx.fillText('0',35,h-30+12);
    ctx.fillText('Temp (°C)', w/2-30, h-5);
    ctx.save();
    ctx.translate(12,h/2); ctx.rotate(-Math.PI/2); ctx.fillText('Rate (relative)',0,0); ctx.restore();
    ctx.fillText(ct.toFixed(0)+'°C', cx+4, 18);
    ctx.fillText(rate.toFixed(2)+' r/s', cx+6, ry-8);
  }

  xForTemp(t,w){ return 40 + (t/ (this.maxT-this.minT)) * (w-50); }
  yForRate(r,maxRate,h){ return (h-30) - (r/maxRate)*(h-40); }
}
