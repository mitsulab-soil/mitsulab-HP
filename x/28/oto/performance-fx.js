// 最終の合成出力に一度だけ掛ける演奏操作。マイク・通信・録音は使わない。
export const PERFORMANCE_DEFAULTS = Object.freeze({pitch:0,rhythm:0,filter:100,echo:0});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:a));
export const filterHz=value=>180*Math.pow(11000/180,clamp(value,0,100)/100);
export const rhythmHz=value=>[0,1,2,4,8][Math.round(clamp(value,0,4))];

export class PerformanceFX {
 constructor(ctx){
  this.ctx=ctx;this.values={...PERFORMANCE_DEFAULTS};
  this.input=ctx.createGain();this.filter=ctx.createBiquadFilter();
  this.filter.type='lowpass';this.filter.Q.value=.55;this.filter.frequency.value=11000;
  this.pulse=ctx.createGain();this.pulse.gain.value=1;
  this.lfo=ctx.createOscillator();this.lfo.type='sine';this.lfo.frequency.value=1;
  this.depth=ctx.createGain();this.depth.gain.value=0;
  this.lfo.connect(this.depth);this.depth.connect(this.pulse.gain);this.lfo.start();
  this.sum=ctx.createGain();this.dry=ctx.createGain();
  this.limit=ctx.createDynamicsCompressor();this.limit.threshold.value=-8;this.limit.knee.value=0;
  this.limit.ratio.value=20;this.limit.attack.value=.001;this.limit.release.value=.12;
  this.output=ctx.createGain();this.output.gain.value=0;
  this.input.connect(this.filter);this.filter.connect(this.pulse);
  this.pulse.connect(this.dry);this.dry.connect(this.sum);this.sum.connect(this.limit);this.limit.connect(this.output);
  this.makeEcho();
 }
 makeEcho(){
  const ctx=this.ctx;
  // 止めたときは遅延の蓄積も捨てる。次の音へ前のエコーを持ち越さない。
  if(this.delay){this.pulse.disconnect(this.delay);[this.delay,this.feedback,this.echoTone,this.wet].forEach(n=>n.disconnect());}
  this.delay=ctx.createDelay(1);this.delay.delayTime.value=.28;
  this.echoTone=ctx.createBiquadFilter();this.echoTone.type='lowpass';this.echoTone.frequency.value=3400;
  this.feedback=ctx.createGain();this.wet=ctx.createGain();
  const amount=this.values.echo/100;
  this.feedback.gain.value=amount*.42;this.wet.gain.value=amount*.42;
  this.pulse.connect(this.delay);this.delay.connect(this.echoTone);
  this.echoTone.connect(this.feedback);this.feedback.connect(this.delay);
  this.echoTone.connect(this.wet);this.wet.connect(this.sum);
 }
 set(values){
  this.values={pitch:clamp(values.pitch??this.values.pitch,-12,12),rhythm:clamp(values.rhythm??this.values.rhythm,0,4),filter:clamp(values.filter??this.values.filter,0,100),echo:clamp(values.echo??this.values.echo,0,100)};
  const t=this.ctx.currentTime,set=(p,v)=>p.setTargetAtTime(v,t,.025),hz=rhythmHz(this.values.rhythm),amount=this.values.echo/100;
  set(this.filter.frequency,filterHz(this.values.filter));set(this.lfo.frequency,hz||1);
  set(this.pulse.gain,hz?.55:1);set(this.depth.gain,hz?.45:0);
  set(this.feedback.gain,amount*.42);set(this.wet.gain,amount*.42);set(this.dry.gain,1-amount*.22);
 }
 wake(){this.output.gain.cancelScheduledValues(this.ctx.currentTime);this.output.gain.setTargetAtTime(.8,this.ctx.currentTime,.015);}
 silence(fade=.03){
  const t=this.ctx.currentTime;this.output.gain.cancelScheduledValues(t);this.output.gain.setValueAtTime(this.output.gain.value,t);this.output.gain.linearRampToValueAtTime(0,t+Math.max(.005,fade));
  this.makeEcho();
 }
}
