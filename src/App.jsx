import React, { useState, useEffect, useRef, useMemo } from 'react';

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
 * Calculates the derivatives for the system based on the current state and parameters.
 */
const getDerivatives = (t, state, params) => {
  const { O, E } = state; // O = Order, E = Energy
  const { P, delta, lambda, eta, r, gamma } = params;

  const mess = P - O;

  // Inspiration drives work: proportional to the mess
  let workRate = lambda * mess;

  // Burnout Logic: STRICT ENFORCEMENT
  // If energy is depleted (or very close to it), the worker cannot work.
  // We use a small epsilon to catch floating point near-zero values.
  if (E <= 0.01) {
    workRate = 0;
  }

  // dO/dt = (Efficiency * Work) - (Natural Decay)
  const dO_dt = (eta * workRate) - (delta * O);

  // dE/dt = (Rest Rate) - (Cost of Work) + (Gratification from Progress)
  // Note: Cost of work is exactly the workRate (assuming 1 energy = 1 unit of effort)
  // Gratification is proportional to dO/dt (if O is increasing, we get energy)
  let dE_dt = r - workRate + (gamma * dO_dt);

  // HARD FLOOR LOGIC:
  // If Energy is at 0 and the net change is negative (trying to go lower), force dE/dt to 0.
  // This prevents the "Success Feedback" (which can be negative if order is decaying) from driving E below 0.
  if (E <= 0.01 && dE_dt < 0) {
    dE_dt = 0;
  }

  return { dO: dO_dt, dE: dE_dt };
};

/**
 * Performs one RK4 integration step.
 */
const rk4Step = (state, dt, params) => {
  const { O, E } = state;

  const k1 = getDerivatives(0, { O, E }, params);

  const k2 = getDerivatives(0, {
    O: O + k1.dO * dt * 0.5,
    E: E + k1.dE * dt * 0.5
  }, params);

  const k3 = getDerivatives(0, {
    O: O + k2.dO * dt * 0.5,
    E: E + k2.dE * dt * 0.5
  }, params);

  const k4 = getDerivatives(0, {
    O: O + k3.dO * dt,
    E: E + k3.dE * dt
  }, params);

  const nextO = O + (dt / 6) * (k1.dO + 2 * k2.dO + 2 * k3.dO + k4.dO);
  let nextE = E + (dt / 6) * (k1.dE + 2 * k2.dE + 2 * k3.dE + k4.dE);

  // FINAL SAFETY CLAMP: Ensure integrator never outputs negative energy
  if (nextE < 0) {
    nextE = 0;
  }

  return {
    O: nextO,
    E: nextE,
  };
};


// --- VISUALIZATION COMPONENTS ---

const LineChart = ({ data, width, height, maxTime }) => {
  if (!data || data.length === 0 || width === 0 || height === 0) return null;

  // Scales
  const padding = 20;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const minT = data[0].t;
  const maxT = Math.max(minT + 10, maxTime); // Keep window moving
  const maxVal = 105; // Fixed Y scale for consistency (0-100)
  const minVal = -20; // Allow dipping below zero for energy

  const getX = (t) => padding + ((t - minT) / (maxT - minT)) * graphWidth;
  const getY = (v) => height - padding - ((v - minVal) / (maxVal - minVal)) * graphHeight;

  // Path generators
  const makePath = (key) => {
    return data.map((pt, i) =>
      `${i === 0 ? 'M' : 'L'} ${getX(pt.t).toFixed(1)} ${getY(pt[key]).toFixed(1)}`
    ).join(' ');
  };

  return (
    <svg width={width} height={height} className="bg-slate-900 rounded-lg shadow-inner border border-slate-700">
      {/* Grid Lines */}
      <line x1={padding} y1={getY(0)} x2={width - padding} y2={getY(0)} stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
      <line x1={padding} y1={getY(100)} x2={width - padding} y2={getY(100)} stroke="#475569" strokeWidth="1" />

      {/* Labels */}
      <text x={10} y={getY(0) - 5} fill="#94a3b8" fontSize="10">0</text>
      <text x={10} y={getY(100) + 15} fill="#94a3b8" fontSize="10">Max</text>

      {/* Lines */}
      <path d={makePath('E')} fill="none" stroke="#f97316" strokeWidth="2" opacity="0.9" /> {/* Energy: Orange */}
      <path d={makePath('O')} fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.9" /> {/* Order: Blue */}

      {/* Legend */}
      <g transform={`translate(${width - 100}, 20)`}>
        <rect width="10" height="10" fill="#3b82f6" />
        <text x="15" y="9" fill="#cbd5e1" fontSize="12">Order</text>
        <rect y="15" width="10" height="10" fill="#f97316" />
        <text x="15" y="24" fill="#cbd5e1" fontSize="12">Energy</text>
      </g>
    </svg>
  );
};

const PhasePortrait = ({ currentO, currentE, history, params, width, height }) => {
  const bgCanvasRef = useRef(null);
  const fgCanvasRef = useRef(null);

  // Buffer Vector Field (Background)
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    const ctx = canvas.getContext('2d');

    // Clear
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    // Scales
    const minO = 0, maxO = 110;
    const minE = -20, maxE = 120;
    const toScreenX = (o) => (o - minO) / (maxO - minO) * width;
    const toScreenY = (e) => height - (e - minE) / (maxE - minE) * height;

    // Draw Vector Field
    const steps = 15;
    ctx.strokeStyle = '#334155'; // slate-700
    ctx.lineWidth = 1;

    for (let o = minO; o < maxO; o += (maxO - minO) / steps) {
      for (let e = minE; e < maxE; e += (maxE - minE) / steps) {
        const derivs = getDerivatives(0, { O: o, E: e }, params);
        const len = Math.sqrt(derivs.dO ** 2 + derivs.dE ** 2);

        const scale = 15;
        const dx = (derivs.dO / (len + 0.1)) * scale;
        const dy = (derivs.dE / (len + 0.1)) * scale;

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
  }, [params, width, height]);

  // Draw Dynamic Trace & Point (Foreground)
  useEffect(() => {
    const canvas = fgCanvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    const ctx = canvas.getContext('2d');

    // Clear Foreground
    ctx.clearRect(0, 0, width, height);

    const minO = 0, maxO = 110;
    const minE = -20, maxE = 120;
    const toScreenX = (o) => (o - minO) / (maxO - minO) * width;
    const toScreenY = (e) => height - (e - minE) / (maxE - minE) * height;

    // Draw Trace
    if (history && history.length > 2) {
      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b'; // Amber-500
      ctx.lineWidth = 2;
      const slice = history.slice(-100);
      slice.forEach((pt, i) => {
        const x = toScreenX(pt.O);
        const y = toScreenY(pt.E);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Draw Point
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

    // Core
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

  }, [currentO, currentE, history, width, height]);

  return (
    <div className="relative border border-slate-700 rounded-lg overflow-hidden shadow-inner w-full h-full" style={{ width: width || '100%', height: height || '100%' }}>
      <canvas ref={bgCanvasRef} width={width} height={height} className="absolute inset-0" />
      <canvas ref={fgCanvasRef} width={width} height={height} className="absolute inset-0" />

      {/* Axes Labels */}
      <div className="absolute bottom-1 right-2 text-xs text-slate-500 font-mono">Order →</div>
      <div className="absolute top-2 left-2 text-xs text-slate-500 font-mono">↑ Energy</div>
    </div>
  );
};


// --- MAIN APP COMPONENT ---

export default function App() {
  // Simulation Constants
  const [params, setParams] = useState({
    P: 100,      // Max Potential Order
    delta: 0.1,  // Decay Rate (Entropy)
    lambda: 0.05,// Inspiration (sensitivity to mess)
    eta: 2.0,    // Efficiency (Energy -> Order conversion)
    r: 2.0,      // Recovery Rate (Rest)
    gamma: 0.7,  // Gratification (Energy back from progress)
  });

  const chartContainerRef = useRef(null);
  const chartDims = useDimensions(chartContainerRef);

  // Simulation State
  const [time, setTime] = useState(0);
  const [history, setHistory] = useState([{ t: 0, O: 0, E: 50 }]); // Initial history
  const [isRunning, setIsRunning] = useState(false);

  // Refs for physics loop to avoid closure staleness
  const stateRef = useRef({ O: 0, E: 50 });
  const paramsRef = useRef(params);
  const requestRef = useRef();

  // Update refs when React state changes
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // Simulation Loop
  const animate = (timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = 0.05; // Fixed physics step for stability

    // Multiple physics steps per frame for speed
    for (let i = 0; i < 4; i++) {
      stateRef.current = rk4Step(stateRef.current, dt, paramsRef.current);
    }

    // Update React State less frequently for UI performance (every 200ms approx logic, but here we just update every frame)
    // Actually, updating state every frame (60fps) is fine for this amount of data.
    // However, to keep the history array manageable:

    setTime(prev => {
      const newTime = prev + (dt * 4);

      // Push to history buffer (debounced logic inside setState)
      setHistory(prevHist => {
        const last = prevHist[prevHist.length - 1];
        // Only save a point every ~0.5 time units to prevent array bloat
        if (newTime - last.t > 0.5) {
          const newHist = [...prevHist, { t: newTime, ...stateRef.current }];
          if (newHist.length > 300) newHist.shift(); // Keep last 300 points
          return newHist;
        }
        return prevHist;
      });

      return newTime;
    });

    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate);
    }
  };

  const lastTimeRef = useRef();

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(requestRef.current);
      lastTimeRef.current = null;
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isRunning]);

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
    stateRef.current = { O: 0, E: 50 };
    setHistory([{ t: 0, O: 0, E: 50 }]);
  };

  // Slider Helper
  const Slider = ({ label, val, setVal, min, max, step, desc }) => (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1">
        <label className="text-sm font-semibold text-slate-300">{label}</label>
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

        {/* Header & Controls */}
        <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
              The Organizer
            </h1>
            <p className="text-sm text-slate-400 mb-6">
              A dynamic simulation of a worker fighting entropy.
            </p>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`flex-1 py-2 px-4 rounded font-bold transition-colors ${isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
              >
                {isRunning ? 'Pause' : 'Start Work'}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
              >
                Reset
              </button>
            </div>

            <div className="space-y-1">

              <Slider
                label="P (Potential)" val={params.P} min={50} max={200} step={10}
                setVal={v => setParams({ ...params, P: v })}
                desc="Maximum possible Organization."
              />
              <Slider
                label="δ (Entropy)" val={params.delta} min={0} max={0.5} step={0.01}
                setVal={v => setParams({ ...params, delta: v })}
                desc="Natural decay rate of Order."
              />
              <Slider
                label="λ (Inspiration)" val={params.lambda} min={0} max={0.2} step={0.01}
                setVal={v => setParams({ ...params, lambda: v })}
                desc="How strongly mess triggers work."
              />
              <Slider
                label="η (Efficiency)" val={params.eta} min={0.5} max={5} step={0.1}
                setVal={v => setParams({ ...params, eta: v })}
                desc="Order created per unit of energy."
              />
              <Slider
                label="γ (Gratification)" val={params.gamma} min={0} max={2} step={0.1}
                setVal={v => setParams({ ...params, gamma: v })}
                desc="Energy regained from seeing progress."
              />
              <Slider
                label="r (Recovery)" val={params.r} min={0} max={5} step={0.1}
                setVal={v => setParams({ ...params, r: v })}
                desc="Constant resting energy gain."
              />
            </div>
          </div>
        </div>

        {/* Visualizations */}
        <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">

          {/* Main Time Series */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-300 mb-4 flex justify-between">
              <span>Timeline</span>
              <span className="text-xs font-normal text-slate-500 self-center">t = {time.toFixed(1)}</span>
            </h2>
            <div ref={chartContainerRef} className="w-full h-64">
              <LineChart data={history} width={chartDims.width} height={chartDims.height} maxTime={time} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stats Cards */}
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-blue-500">
                <div className="text-slate-400 text-xs uppercase tracking-wider">Current Order</div>
                <div className="text-3xl font-bold text-white">{stateRef.current.O.toFixed(1)} <span className="text-sm text-slate-500">/ {params.P}</span></div>
              </div>

              <div className={`bg-slate-800/50 p-4 rounded-lg border-l-4 transition-colors ${stateRef.current.E < 10 ? 'border-red-500 bg-red-900/10' : 'border-orange-500'}`}>
                <div className="text-slate-400 text-xs uppercase tracking-wider">Current Energy</div>
                <div className="text-3xl font-bold text-white">{stateRef.current.E.toFixed(1)}</div>
                {stateRef.current.E <= 0 && (
                  <div className="text-red-400 text-xs font-bold mt-1">⚠ EXHAUSTED</div>
                )}
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-purple-500">
                <div className="text-slate-400 text-xs uppercase tracking-wider">Mess Level</div>
                <div className="text-3xl font-bold text-white">{(params.P - stateRef.current.O).toFixed(1)}</div>
              </div>
            </div>

            {/* Phase Portrait */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl flex flex-col items-center">
              <h2 className="text-lg font-semibold text-slate-300 mb-2 w-full text-left">Phase Space</h2>
              <PhasePortrait
                currentO={stateRef.current.O}
                currentE={stateRef.current.E}
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