/**
 * animatr (c) 2018 Stefan Goessner
 * @license
 * MIT License
 */

"use strict";

/** 
 * `animatr` is a tiny class for simultaneously animating numerical object values in a given time interval.
 * Use case is most often parameter animation of plain javascript objects. So it works excellently with
 * canvas.
 */
// structure of values array 'v': [[T0,Q0],Func01,[T1,Q1],...,[Tn,Qn]]
const animatr = function(v,trf) {
    const len = v.length, n = (len-1)/2;  // len % n === 1
    return (T) => {
        let q, t = T || animatr.T;
        if      (t <  v[0][0])     q = v[0][1];
        else if (t >= v[len-1][0]) q = v[len-1][1];
        else {
            for (let i=0; i<len; i+=2)
                if (v[i+2] && v[i+2][0] > t) {
                    let dq = v[i+2][1] - v[i][1], ti = v[i][0], dt = v[i+2][0] - ti,
                        tn = (t-ti)/dt,  // normalized time
                        fn = v[i+1] && typeof v[i+1] ==='string' && animatr[v[i][2]] || animatr.linear;
                    q = v[i][1] + fn(tn)*dq;
                    break;
                }
        }
        return trf ? trf(q) : q;
    }
}
// timing functions
animatr.linear = q => q
animatr.quadratic = q => q <= 0.5 ? 2*q*q : -2*q*q + 4*q - 1
animatr.poly5 = q => 10*q*q*q - 15*q*q*q*q + 6*q*q*q*q*q
// transform functions
animatr.hexrgba = color => q => color + (q < 16 ? '0' : '') + Math.floor(q).toString(16)
