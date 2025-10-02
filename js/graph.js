// Reaction rate vs temperature graph

export class ReactionGraph {
  constructor(canvas, temperatureGetter, rateGetter){
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.temperatureGetter=temperatureGetter;
    this.rateGetter=rateGetter;
    this.maxT=80; this.minT=0;
    this.samples=[]; // {t, theoretical}
    this.scaleFactor = 1; // UI scaling from outside
    this.logicalWidth = canvas.width; // will be overridden by setLogicalSize
    this.logicalHeight = canvas.height;
    for(let t=0;t<=80;t+=2){
      this.samples.push({t, theoretical:this.theoreticalRate(t)});
    }
  }

  setScaleFactor(s){ this.scaleFactor = s; }
  setLogicalSize(w,h){ this.logicalWidth = w; this.logicalHeight = h; }

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
  const ctx=this.ctx; const w=this.logicalWidth; const h=this.logicalHeight;
    ctx.clearRect(0,0,w,h);
    // Recompute samples (in case formula or dynamic params change later)
    this.samples.length = 0;
    for(let t=0;t<=80;t+=2){
      this.samples.push({t, theoretical:this.theoreticalRate(t)});
    }
  const sf = this.scaleFactor;
  const leftMargin = 40 * sf;
  const topMargin = 10 * sf;
  const bottomMargin = 30 * sf;
  const rightMargin = 10 * sf;
  // Axes
  ctx.strokeStyle='#94a3b8'; ctx.lineWidth=Math.max(1,1.2*sf);
  ctx.beginPath(); ctx.moveTo(leftMargin,topMargin); ctx.lineTo(leftMargin,h-bottomMargin); ctx.lineTo(w-rightMargin,h-bottomMargin); ctx.stroke();

    const maxRate = Math.max(...this.samples.map(s=>s.theoretical))*1.1;

    // Plot theoretical curve
    ctx.strokeStyle='#4ade80'; ctx.lineWidth=Math.max(1.5,2*sf); ctx.beginPath();
    for(let i=0;i<this.samples.length;i++){
      const s=this.samples[i];
      const x = this.xForTemp(s.t,w,leftMargin,rightMargin);
      const y = this.yForRate(s.theoretical,maxRate,h,topMargin,bottomMargin);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // Current temperature vertical line (with glow near optimum)
    const ct = this.temperatureGetter();
    const cx = this.xForTemp(ct,w,leftMargin,rightMargin);
    const opt=37, tol=1.8;
    const dist = Math.abs(ct - opt);
    if(dist <= tol){
      const alpha = 1 - (dist / tol); // 1 at optimum, 0 at edge
      ctx.save();
      ctx.shadowColor=`rgba(34,211,238,${0.65 + 0.25*alpha})`;
      ctx.shadowBlur = (14 + 10*alpha) * sf;
      ctx.strokeStyle = `rgba(125,249,255,${0.7 + 0.3*alpha})`;
      ctx.lineWidth = Math.max(2.2, 2.8*sf + 1.2*alpha);
      ctx.beginPath(); ctx.moveTo(cx,h-bottomMargin); ctx.lineTo(cx,topMargin); ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle='#38bdf8';
    ctx.lineWidth=Math.max(1.4,1.8*sf);
    ctx.beginPath(); ctx.moveTo(cx,h-bottomMargin); ctx.lineTo(cx,topMargin); ctx.stroke();

    // Current measured rate point
    const rate = this.rateGetter();
  const ry = this.yForRate(rate,maxRate,h,topMargin,bottomMargin);
    ctx.fillStyle='#f87171';
  ctx.beginPath(); ctx.arc(cx,ry,5*sf,0,Math.PI*2); ctx.fill();

    // Labels
    ctx.fillStyle='#f1f5f9'; ctx.font=`${Math.round(12*sf)}px system-ui`;
    ctx.fillText('0', leftMargin-5*sf, h-bottomMargin + 12*sf);
    ctx.fillText('Temp (°C)', w/2 - 30*sf, h-5*sf);
    ctx.save();
    ctx.translate(12*sf, h/2); ctx.rotate(-Math.PI/2); ctx.fillText('Rate (relative)',0,0); ctx.restore();
    ctx.fillText(ct.toFixed(0)+'°C', cx+4*sf, topMargin + 8*sf);
    ctx.fillText(rate.toFixed(2)+' r/s', cx+6*sf, ry-8*sf);
  }

  xForTemp(t,w,leftMargin,rightMargin){
    return leftMargin + (t/(this.maxT-this.minT)) * (w - leftMargin - rightMargin);
  }
  yForRate(r,maxRate,h,topMargin,bottomMargin){
    return (h-bottomMargin) - (r/maxRate)*(h - bottomMargin - topMargin);
  }
}
