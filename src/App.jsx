// psyborg-protocols/work/Work-77d4a7d97b3b59d333daf7db767ca1e9f1caadb2/src/App.jsx

import React, { useState, useEffect, useRef } from 'react';

// --- HOOKS ---
const useDimensions = (ref) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    resizeObserver.observe(ref.current);
    return () => resizeObserver.disconnect();
  }, [ref]);

  return dimensions;
};

/**
 * Calculates the derivatives for the 3-DOF system (Order, Energy, Expectation).
 */
const getDerivatives = (t, state, params) => {
  const { O, E, P } = state; 
  // P is now part of the state, not params
  const { delta, lambda, eta, r, gamma, alphaUp, alphaDown, sigma } = params;

  // 1. Calculate The Mess
  const mess = P - O;

  // 2. Determine Work Intensity
  // Inspiration drives work: proportional to the mess
  let workRate = lambda * mess;

  // Burnout Logic: STRICT ENFORCEMENT
  if (E <= 0.01) {
    workRate = 0;
  }

  // 3. dO/dt: Dynamics of Order
  // (Efficiency * Work) - (Natural Decay)
  const dO_dt = (eta * workRate) - (delta * O);

  // 4. dP/dt: Dynamics of Expectation (The Moving Goalpost)
  // "Easier to push up, hard to get down"
  // If we are succeeding (dO > 0), Expectation rises fast (alphaUp).
  // If we are failing (dO < 0), Expectation falls slowly (alphaDown).
  const alpha = dO_dt > 0 ? alphaUp : alphaDown;
  const dP_dt = alpha * dO_dt;

  // 5. dE/dt: Dynamics of Energy
  // r = Rest
  // -workRate = Cost of effort
  // +gamma * dO_dt = Gratification from actual results
  // +sigma * dP_dt = "False Energy" from rising expectations (Hype/Mania)
  let dE_dt = r - workRate + (gamma * dO_dt) + (sigma * dP_dt);

  // HARD FLOOR LOGIC for Energy
  if (E <= 0.01 && dE_dt < 0) {
    dE_dt = 0;
  }

  return { dO: dO_dt, dE: dE_dt, dP: dP_dt };
};

/**
 * Performs one RK4 integration step for 3 variables.
 */
const rk4Step = (state, dt, params) => {
  const { O, E, P } = state;

  const k1 = getDerivatives(0, { O, E, P }, params);

  const k2 = getDerivatives(0, {
    O: O + k1.dO * dt * 0.5,
    E: E + k1.dE * dt * 0.5,
    P: P + k1.dP * dt * 0.5
  }, params);

  const k3 = getDerivatives(0, {
    O: O + k2.dO * dt * 0.5,
    E: E + k2.dE * dt * 0.5,
    P: P + k2.dP * dt * 0.5
  }, params);

  const k4 = getDerivatives(0, {
    O: O + k3.dO * dt,
    E: E + k3.dE * dt,
    P: P + k3.dP * dt
  }, params);

  const nextO = O + (dt / 6) * (k1.dO + 2 * k2.dO + 2 * k3.dO + k4.dO);
  let nextE = E + (dt / 6) * (k1.dE + 2 * k2.dE + 2 * k3.dE + k4.dE);
  const nextP = P + (dt / 6) * (k1.dP + 2 * k2.dP + 2 * k3.dP + k4.dP);

  // Safety Clamp
  if (nextE < 0) nextE = 0;

  return {
    O: nextO,
    E: nextE,
    P: nextP
  };
};


// --- VISUALIZATION COMPONENTS ---

const HzLineChart = ({ data, width, height, maxTime }) => {
  if (!data || data.length === 0 || width === 0 || height === 0) return null;

  const padding = 20;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const minT = data[0].t;
  const maxT = Math.max(minT + 10, maxTime);
  
  // Find dynamic range for Y axis to accommodate P running away
  let maxVal = 120;
  let minVal = -20;
  
  // Auto-scale if P gets huge
  const currentP = data[data.length - 1].P;
  if (currentP > maxVal) maxVal = currentP + 20;

  const getX = (t) => padding + ((t - minT) / (maxT - minT)) * graphWidth;
  const getY = (v) => height - padding - ((v - minVal) / (maxVal - minVal)) * graphHeight;

  const makePath = (key) => {
    return data.map((pt, i) =>
      `${i === 0 ? 'M' : 'L'} ${getX(pt.t).toFixed(1)} ${getY(pt[key]).toFixed(1)}`
    ).join(' ');
  };

  return (
    <svg width={width} height={height} className="bg-slate-900 rounded-lg shadow-inner border border-slate-700">
      {/* Grid */}
      <line x1={padding} y1={getY(0)} x2={width - padding} y2={getY(0)} stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
      
      {/* Labels */}
      <text x={10} y={getY(0) - 5} fill="#94a3b8" fontSize="10">0</text>
      <text x={10} y={getY(100) + 5} fill="#94a3b8" fontSize="10">100</text>

      {/* Lines */}
      <path d={makePath('P')} fill="none" stroke="#a855f7" strokeWidth="2" strokeDasharray="5 5" opacity="0.8" /> {/* Expectation: Purple Dashed */}
      <path d={makePath('E')} fill="none" stroke="#f97316" strokeWidth="2" opacity="0.9" /> {/* Energy: Orange */}
      <path d={makePath('O')} fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.9" /> {/* Order: Blue */}

      {/* Legend */}
      <g transform={`translate(${width - 100}, 20)`}>
        <rect width="10" height="10" fill="#a855f7" />
        <text x="15" y="9" fill="#cbd5e1" fontSize="12">Expect (P)</text>
        
        <rect y="15" width="10" height="10" fill="#3b82f6" />
        <text x="15" y="24" fill="#cbd5e1" fontSize="12">Order (O)</text>
        
        <rect y="30" width="10" height="10" fill="#f97316" />
        <text x="15" y="39" fill="#cbd5e1" fontSize="12">Energy (E)</text>
      </g>
    </svg>
  );
};

const PhasePortrait = ({ currentO, currentE, currentP, history, params,KZ, width, height }) => {
  const bgCanvasRef = useRef(null);
  const fgCanvasRef = useRef(null);

  // Buffer Vector Field (Background)
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    const ctx = canvas.getContext('2d');

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const minO = 0, maxO = 150;
    const minE = -20, maxE = 120;
    const toScreenX = (o) => (o - minO) / (maxO - minO) * width;
    const toScreenY = (e) => height - (e - minE) / (maxE - minE) * height;

    const steps = 15;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;

    // We draw the vector field based on the CURRENT P (Expectation)
    // This shows "Where the forces are pushing RIGHT NOW given our expectations"
    for (let o = minO; o < maxO; o += (maxO - minO) / steps) {
      for (let e = minE; e < maxE; e += (maxE - minE) / steps) {
        // Evaluate derivatives at this grid point (o, e) using current P
        const derivs = getDerivatives(0, { O: o, E: e, P: currentP }, params);
        
        const len = Math.sqrt(derivs.dO ** 2 + derivs.dE ** 2);
        const scale = 15;
        // Avoid division by zero
        const safeLen = len + 0.01;
        const dx = (derivs.dO / safeLen) * scale;
        const dy = (derivs.dE / safeLen) * scale;

        const x = toScreenX(o);
        const y = toScreenY(e);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y - dy);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(x + dx, y - dy, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [params, currentP, width, height]);

  // Foreground
  useEffect(() => {
    const canvas = fgCanvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    const minO = 0, maxO = 150;
    const minE = -20, maxE = 120;
    const toScreenX = (o) => (o - minO) / (maxO - minO) * width;
    const toScreenY = (e) => height - (e - minE) / (maxE - minE) * height;

    // Trace
    if (history && history.length > 2) {
      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      const slice = history.slice(-150);
      slice.forEach((pt, i) => {
        const x = toScreenX(pt.O);
        const y = toScreenY(pt.E);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Point
    const cx = toScreenX(currentO);
    const cy = toScreenY(currentE);

    // Glow
    const gradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, 15);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw P (Goal Line) on X-axis projection
    const px = toScreenX(currentP);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1;
    ctx.setybDash = [5, 5];
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
    ctx.stroke();
    ctx.setLineDash([]);

  }, [currentO, currentE, currentP, history, width, height]);

  return (
    <div className="relative border border-slate-700 rounded-lg overflow-hidden shadow-inner w-full h-full" style={{ width: width || '100%', height: height || '100%' }}>
      <canvas ref={bgCanvasRef} width={width} height={height} className="absolute inset-0" />
      <canvas ref={fgCanvasRef} width={width} height={height} className="absolute inset-0" />
      <div className="absolute bottom-1 right-2 text-xs text-slate-500 font-mono">Order →</div>
      <div className="absolute top-2 left-2 text-xs text-slate-500 font-mono">↑ Energy</div>
    </div>
  );
};


// --- MAIN APP COMPONENT ---

export default function App() {
  // Constants
  const [params, setParams] = useState({
    // Physics
    delta: 0.1,   // Entropy
    lambda: 0.05, // Inspiration
    eta: 2.0,     // Efficiency
    r: 2.0,       // Recovery
    gamma: 0.5,   // Real Gratification (from O)
    
    // NEW: Expectation Dynamics
    alphaUp: 0.8,    // Inflation: How fast P rises when O rises
    alphaDown: 0.05, // Sticky: How slow P falls when O falls
    sigma: 2.0,      // Mania: "False Energy" from rising P
  });

  const chartContainerRef = useRef(null);
  const chartDims = useDimensions(chartContainerRef);

  // State now includes P (Expectation)
  const [time, setTime] = useState(0);
  const [history, setHistory] = useState([{ t: 0, O: 0, E: 50, P: 50 }]); // Start P at 50
  const [isRunning, setIsRunning] = useState(false);

  const stateRef = useRef({ O: 0, E: 50, P: 50 });
  const paramsRef = useRef(params);
  const requestRef = useRef();

  useEffect(() => { paramsRef.current = params; }, [params]);

  const animate = (timestamp) => {
    const dt = 0.05;
    // Fast forward physics
    for (let i = 0; i < 4; i++) {
      stateRef.current = rk4Step(stateRef.current, dt, paramsRef.current);
    }

    setTime(prev => {
      const newTime = prev + (dt * 4);
      setHistory(prevHist => {
        const last = prevHist[prevHist.length - 1];
        if (newTime - last.t > 0.5) {
          const newHist = [...prevHist, { t: newTime, ...stateRef.current }];
          if (newHist.length > 300) newHist.shift(); 
          return newHist;
        }
        return prevHist;
      });
      return newTime;
    });

    if (isRunning) requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isRunning]);

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
    stateRef.current = { O: 0, E: 50, P: 50 };
    setHistory([{ t: 0, O: 0, E: 50, P: 50 }]);
  };

  const Slider = ({ label, val, setVal, min, max, step, desc, color }) => (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1">
        <label className={`text-sm font-semibold ${color || 'text-slate-300'}`}>{label}</label>
        <span className="text-xs font-mono text-cyan-400">{val.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={val}
        onChange={(e) => setVal(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
      />
      <p className="text-xs text-slate-500 mt-1">{desc}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Controls */}
        <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent mb-2">
              The 3-DOF Organizer
            </h1>
            <p className="text-sm text-slate-400 mb-6">
              Simulating Order (O), Energy (E), and <strong>Expectation (P)</strong>.
            </p>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`flex-1 py-2 px-4 rounded font-bold transition-colors ${isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
              >
                {isRunning ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
              >
                Reset
              </button>
            </div>

            <div className="space-y-1 h-96 overflow-y-auto pr-2 custom-scrollbar">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1">Dynamics of P (Expectation)</h3>
              <Slider
                label="α-Up (Inflation)" val={params.alphaUp} min={0} max={2.0} step={0.1}
                setVal={v => setParams({ ...params, alphaUp: v })}
                desc="How fast expectations rise when you succeed."
                color="text-purple-400"
              />
              <Slider
                label="α-Down (Stickiness)" val={params.alphaDown} min={0} max={0.5} step={0.01}
                setVal={v => setParams({ ...params, alphaDown: v })}
                desc="How slow expectations drop when you fail."
                color="text-purple-400"
              />
               <Slider
                label="σ (Mania/Hype)" val={params.sigma} min={0} max={5.0} step={0.1}
                setVal={v => setParams({ ...params, sigma: v })}
                desc="False energy gained from rising expectations."
                color="text-orange-400"
              />
              
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1 mt-6">Core Physics</h3>
              <Slider
                label="δ (Entropy)" val={params.delta} min={0} max={0.5} step={0.01}
                setVal={v => setParams({ ...params, delta: v })}
                desc="Natural decay of Order."
              />
              <Slider
                label="λ (Inspiration)" val={params.lambda} min={0} max={0.2} step={0.01}
                setVal={v => setParams({ ...params, lambda: v })}
                desc="Sensitivity to the Mess (P - O)."
              />
              <Slider
                label="η (Efficiency)" val={params.eta} min={0.5} max={5} step={0.1}
                setVal={v => setParams({ ...params, eta: v })}
                desc="Order created per unit of energy."
              />
               <Slider
                label="γ (Real Reward)" val={params.gamma} min={0} max={2} step={0.1}
                setVal={v => setParams({ ...params, gamma: v })}
                desc="Energy from actual results."
              />
            </div>
          </div>
        </div>

        {/* Visuals */}
        <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">

          {/* Timeline */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-300 mb-4 flex justify-between">
              <span>Timeline</span>
              <span className="text-xs font-normal text-slate-500 self-center">t = {time.toFixed(1)}</span>
            </h2>
            <div ref={chartContainerRef} className="w-full h-64">
              {/* @ts-ignore */}
              <HzLineChart data={history} width={chartDims.width} height={chartDims.height} maxTime={time} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stats */}
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-blue-500">
                <div className="text-slate-400 text-xs uppercase tracking-wider">Current Order</div>
                <div className="text-3xl font-bold text-white">{stateRef.current.O.toFixed(1)}</div>
              </div>
              
              <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-purple-500">
                <div className="text-slate-400 text-xs uppercase tracking-wider">Expectation (P)</div>
                <div className="text-3xl font-bold text-white">{stateRef.current.P.toFixed(1)}</div>
                <div className="text-xs text-purple-300 mt-1">
                  Mess: {(stateRef.current.P - stateRef.current.O).toFixed(1)}
                </div>
              </div>

              <div className={`bg-slate-800/50 p-4 rounded-lg border-l-4 transition-colors ${stateRef.current.E < 10 ? 'border-red-500 bg-red-900/10' : 'border-orange-500'}`}>
                <div className="text-slate-400 text-xs uppercase tracking-wider">Energy</div>
                <div className="text-3xl font-bold text-white">{stateRef.current.E.toFixed(1)}</div>
              </div>
            </div>

            {/* Phase Portrait */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl flex flex-col items-center">
              <h2 className="text-lg font-semibold text-slate-300 mb-2 w-full text-left">Phase Space (O vs E)</h2>
              {/* @ts-ignore */}
              <PhasePortrait
                currentO={stateRef.current.O}
                currentE={stateRef.current.E}
                currentP={stateRef.current.P}
                history={history}
                params={params}
                width={280}
                height={200}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}