/**
 * Animatr (c) 2016 Stefan Goessner
 * @license
 * MIT License
 */

"use strict";

/** 
 * `Animatr` is a tiny class for simultaneously animating numerical object values in a given time interval.
 * Use case is most often parameter animation of plain javascript objects. So it works excellently with
 * canvas. `Animatr` uses `requestAnimationFrame`.
 * 
 * Do not use `new Animatr()`, call `Animatr.create()` instead for creating instances.
 * @class 
 */
var Animatr = {
/**
 * Create an `Animatr` instance by start time, duration and timing function for animating. A couple of predefined 
 * timing functions are available [s. VDI2143]:
 *   * `linear`
 *   * `quadratic`
 *   * `sinoid`
 *   * `poly5`
 * @returns {object} `Animatr` instance.
 * @param {object} [args] Arguments object.
 * @param {function|string} [args.fn="linear"] Timing function as `function` object or name of predefined function.
 * @param {float} [args.duration=0] Duration of complete timing function in [s].
 * @param {float} [args.delay=0] Lower time in [s] relative to initial time at call of `start` method. Start of timing function.
 * @param {float} [args.endDelay=0] Begin animation time in [s] relative to `t0` at start of timing function.
 * @param {float} [args.direction] End animation time in [s] relative to `t0` at start of timing function. Must be smaller than `t0 + dt`.
 */
   create: function() { var o = Object.create(this.prototype); o.constructor.apply(o,arguments); return o; },
   prototype: {
      constructor: function(handlers,options) {
         if (typeof options === "number")  // duration ...
            Object.assign(this, { fn: Animatr.linear,
                                  duration:  Math.max(0,options),
                                  delay: 0,
                                  endDelay: 0,
                                  direction: "forward" });
         else if (typeof options === "object") {
            this.fn = typeof options.fn === "string" && Animatr[options.fn] ? Animatr[options.fn]
                    : typeof options.fn === "object" ? options.fn : Animatr.linear;
            this.duration = Math.max(0,options.duration) || 0;
            this.delay = Math.max(0,options.delay) || 0;
            this.endDelay = Math.max(0,options.endDelay) || 0;
            this.direction = options.direction;
            this.onfinish = options.onfinish;
         }

         this.handlers = [];
         if (typeof handlers === "function")  // single function ..
            this.handlers.push(handlers);
         else {                                // must be array of objects or functions
            for (let hdl of handlers) {
               if (typeof hdl === "function")
                  this.handlers.push(hdl);
               else if ("value" in hdl)
                  this.handlers.push(Animatr._morph(hdl));
            }
         }
      },
      /**
       * Perfom animation step.
       * @private
       * @returns state (true / false at current).
       */
      step: function(time) {
         var t = time - this.delay, tfinish = this.duration + this.endDelay, 
             q = this.duration > 0 ? t/this.duration : 1,      // avoid q == Ininite
             Dt = this.duration > 0 ? this.duration*1e-3 : 1,  // avoid Dt == Infinite
             pos = this.fn.f(q), vel = this.fn.fd(q)/Dt, acc = this.fn.fdd(q)/Dt/Dt;
         if (t >= 0 && t <= this.duration)
            for (let hdl of this.handlers)
               hdl(pos, vel, acc);
         else if (this.onfinish && t >= tfinish)
            this.onfinish({currenttime:t});
         return t <= tfinish;
      }
   },
   _morph: function(hdl) {
      let val0 = hdl.value.get(),
          delta = hdl.to !== undefined ? hdl.to - val0 : hdl.delta;
      return hdl.value.setvel && hdl.value.setacc
                  ? (f,fd,fdd) => { hdl.value.set(val0 + f*delta); hdl.value.setvel(fd*delta); hdl.value.setacc(fdd*delta); }
           : hdl.value.setvel
                  ? (f,fd) => { hdl.value.set(val0 + f*delta); hdl.value.setvel(fd*delta); }
           : (f) => { hdl.value.set(val0 + f*delta); };
   },
   play: function(what) {
      var t0 = performance.now(),
          callbk = what && "step" in what ? (t) => what.step(t) : what;
      function _ani(t) {
         if (callbk(t-t0))
            requestAnimationFrame(_ani);
      };
      _ani(t0);
   },

   // timing functions
   reverse: function(fn) { return { f: (q) => fn.f(1-q), fd: (q) => fn.fd(1-q), fdd: (q) => fn.fdd(1-q) }; },
   // some simple motion laws (timing functions) from cam design (VDI 2143) ... all in interval [0,1]
   linear: { f: (q) => q, fd: (q) => 1, fdd: (q) => 0 },
   quadratic: { f:   (q) =>  q <= 0.5 ? 2*q*q : -2*q*q + 4*q - 1,
                fd:  (q) =>  q <= 0.5 ? 4*q : -4*q + 4,
                fdd: (q) =>  q <= 0.5 ? 4 : -4 },
   harmonic: { f:   (q) => (1 - Math.cos(Math.PI*q))/2,
               fd:  (q) => Math.PI/2*Math.sin(Math.PI*q),
               fdd: (q) => Math.PI*Math.PI/2*Math.cos(Math.PI*q) },
   sinoid: { f:   (q) => q - Math.sin(2*Math.PI*q)/2/Math.PI,
             fd:  (q) => 1 - Math.cos(2*Math.PI*q),
             fdd: (q) =>     Math.sin(2*Math.PI*q)*2*Math.PI },
   poly5: { f:   (q) => 10*q*q*q - 15*q*q*q*q + 6*q*q*q*q*q,
            fd:  (q) => 30*q*q - 60*q*q*q + 30*q*q*q*q,
            fdd: (q) => 60*q - 180*q*q + 120*q*q*q },
   ramp: function(dq) {
      dq = Math.max(Math.min(dq,0.5),0);
      if (dq === 0)
         return Animatr.linear;
      else if (dq === 0.5)
         return Animatr.quadratic;
      else {
         var a =  1/((1-dq)*dq);
         return {
                   f: function(q) {
                         return (q < dq)   ? 1/2*a*q*q
                              : (q < 1-dq) ? a*(q - 1/2*dq)*dq
                              :              a*(1 - 3/2*dq)*dq + a*(q+dq-1)*dq - 1/2*a*(q+dq-1)*(q+dq-1);
                   },
                   fd: function(q) {
                      return (q < dq)   ? a*q
                           : (q < 1-dq) ? a*dq
                           :              a*dq - a*(q+dq-1);
                   },
                   fdd: function(q) {
                      return (q < dq)   ? a
                           : (q < 1-dq) ? 0
                           :             -a;
                   }
         };
      }
   },

   // Penner's' potential functions ... why are they so popular ?
   pot : [ { f: q => 1,         fd: q => 0,          fdd: q => 0 },
           { f: q => q,         fd: q => 1,          fdd: q => 0 },
           { f: q => q*q,       fd: q => 2*q,        fdd: q => 2 },
           { f: q => q*q*q,     fd: q => 3*q*q,      fdd: q => 6*q },
           { f: q => q*q*q*q,   fd: q => 4*q*q*q,    fdd: q => 12*q*q },
           { f: q => q*q*q*q*q, fd: q => 5*q*q*q*q,  fdd: q => 20*q*q*q } ],

   inPot : function(n) { return this.pot[n]; },

   outPot: function(n) { var fn = this.pot[n];
                         return { f: q => 1 - fn.f(1-q), 
                                  fd: q =>    fn.fd(1-q), 
                                  fdd: q =>  -fn.fdd(1-q) } },

   inOutPot: function(n) { var fn = this.pot[n], exp2 = Math.pow(2,n-1);
                           return { f:   q => q < 0.5 ? exp2*fn.f(q)         : 1 - exp2*fn.f(1-q), 
                                    fd:  q => q < 0.5 ? exp2*fn.fd(q)        :  exp2*fn.fd(1-q), 
                                    fdd: q => q < 0.5 ? exp2*(n-1)*fn.fdd(q) : -exp2*(n-1)*fn.fdd(1-q) } },

   get inQuad() { return this.inPot(2); },
   get outQuad() { return this.outPot(2); },
   get inOutQuad() { return this.inOutPot(2); },
   get inCubic() { return this.inPot(3); },
   get outCubic() { return this.outPot(3); },
   get inOutCubic() { return this.inOutPot(3); },
   get inQuart() { return this.inPot(4); },
   get outQuart() { return this.outPot(4); },
   get inOutQuart() { return this.inOutPot(4); },
   get inQuint() { return this.inPot(5); },
   get outQuint() { return this.outPot(5); },
   get inOutQuint() { return this.inOutPot(5); }
};

// Helper function for creating dynamic sliders ...

Animatr.dynamicSlider = function(parentId,opts) {
   var args = Object.assign({},
                            { min:0, max:100, step:1, value:{get:()=>{},set:(u)=>{}}, fn:Animatr.linear, T:1000, sz:256},
                            opts),
       tmplt =
`<span class="backward" style="cursor:pointer;">&#9664;</span>
 <input class="slider" name="slider" type="range" style="min-width:${args.sz}px;vertical-align:middle;margin:0;padding:0" min="${args.min}" max="${args.max}" value="${args.value.get()}" step="${args.step}" />
 <span class="forward" style="cursor:pointer;">&#9654;</span>
 <output class="output" for="slider" style="text-align:right;">${args.out(args.value.get())}</output>
`,
       slider,
       output,
       fn = typeof args.fn === "string" ? Animatr[args.fn] : args.fn,
       sliderInput = (e) => {
          var delta = args.max - args.min,
              q = (+e.target.value - args.min)/delta,
              Dt = args.T/1000,
              pos = fn.f(q)*delta + args.min;
          args.value.set(pos);
          if (args.value.setvel) args.value.setvel(fn.fd(q)*delta/Dt);
          if (args.value.setacc) args.value.setvel(fn.fdd(q)*delta/Dt/Dt);
          output.innerHTML = args.out(pos);
       },
       forward = (e) => {
          var seq = Animatr.create( [ {value: args.value, to: args.max },
                                      () => output.innerHTML = args.out(args.value.get()),
                                      () => slider.value = Math.max(args.min,Math.min(args.max,args.value.get())) ],
                                    { fn:fn, duration:args.T });
          Animatr.play(seq);
       },
       backward = (e) => {
          var seq = Animatr.create( [ {value: args.value, to: args.min },
                                      () => output.innerHTML = args.out(args.value.get()),
                                      () => slider.value = Math.max(args.min,Math.min(args.max,args.value.get())) ],
                                    { fn:fn, duration:args.T });
          Animatr.play(seq);
       };

   document.getElementById(parentId).innerHTML = tmplt;
   output = document.querySelector(`#${parentId} > .output`);
   slider = document.querySelector(`#${parentId} > .slider`);
   slider.addEventListener("input",sliderInput,false);
   document.querySelector(`#${parentId} > .forward`)
           .addEventListener("click",forward,false);
   document.querySelector(`#${parentId} > .backward`)
           .addEventListener("click",backward,false);
}

// see http://greweb.me/2012/02/bezier-curve-based-easing-functions-from-concept-to-implementation/
