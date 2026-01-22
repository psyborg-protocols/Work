The Organizer: 3-DOF System Dynamics Model
==========================================

This project simulates a worker's struggle not just against entropy, but against their own shifting standards. It uses a system of three coupled Ordinary Differential Equations (ODEs) to model the interplay between **Order** ($O$), **Energy** ($E$), and **Expectation** ($P$).

The Mathematical Model
----------------------

The system is defined by three primary variables that change over time ($t$):

1.  $O(t)$: The current level of Organization (Order).
    
2.  $E(t)$: The worker's current Energy.
    
3.  $P(t)$: The current Level of Expectation (The Goalpost).
    

### 1\. The Dynamics of Order ($O$)

Order is built by work and destroyed by entropy.

$$\\frac{dO}{dt} = \\underbrace{\\eta \\cdot \\lambda (P - O)}\_{\\text{Work Done}} - \\underbrace{\\delta O}\_{\\text{Natural Decay}}$$

*   **The Mess**: Defined as $P - O$ (Expectation - Current Order).
    
*   **Inspiration (**$\\lambda$**)**: The worker is driven by the gap between where they are and where they want to be.
    
*   **Efficiency (**$\\eta$**)**: Converts energy spent working into actual results.
    
*   **Entropy (**$\\delta$**)**: A constant percentage of the existing order decays every moment.
    

### 2\. The Dynamics of Expectation ($P$)

Expectations are not static. They are a moving target that reacts to your performance.

$$\\frac{dP}{dt} = \\begin{cases} \\alpha\_{up} \\cdot \\frac{dO}{dt} & \\text{if } \\frac{dO}{dt} > 0 \\text{ (Inflation)} \\\\ \\alpha\_{down} \\cdot \\frac{dO}{dt} & \\text{if } \\frac{dO}{dt} \\le 0 \\text{ (Stickiness)} \\end{cases}$$

*   **The Hedonic Treadmill (**$\\alpha\_{up}$**)**: When you make progress ($\\frac{dO}{dt} > 0$), your expectations rise immediately. If $\\alpha\_{up}$ is high, you never feel "done" because the goal moves as fast as you work.
    
*   **Sticky Standards (**$\\alpha\_{down}$**)**: When you fail ($\\frac{dO}{dt} < 0$), your expectations lower, but usually much slower than they rose. This resistance to lowering standards causes "The Mess" ($P-O$) to grow uncontrollably during a crash.
    

### 3\. The Dynamics of Energy ($E$)

Energy is spent to work but regained through rest, gratification, and "hype."

$$\\frac{dE}{dt} = \\underbrace{r}\_{\\text{Rest}} - \\underbrace{\\lambda (P - O)}\_{\\text{Cost of Work}} + \\underbrace{\\gamma \\frac{dO}{dt}}\_{\\text{Real Reward}} + \\underbrace{\\sigma \\frac{dP}{dt}}\_{\\text{False Energy}}$$

*   **Cost of Work**: Energy is drained proportional to the effort managed.
    
*   **Real Reward (**$\\gamma$**)**: Energy gained from seeing actual Order increase.
    
*   **False Energy / Mania (**$\\sigma$**)**: Energy gained purely from the _feeling_ of raising standards. When expectations skyrocket ($\\frac{dP}{dt} > 0$), the worker gets a burst of manic energy. This creates a dangerous positive feedback loop where hype fuels more work, which raises expectations further, eventually leading to a crash when energy runs out.
    

Variable Definitions
--------------------

Symbol

Name

Description

$O$

**Order**

The current state of organization.

$E$

**Energy**

The worker's fuel. If $E \\le 0$, work stops.

$P$

**Expectation**

The dynamic goal. No longer a fixed constant.

$\\delta$

Decay

Rate of natural entropy.

$\\lambda$

Inspiration

Sensitivity to the mess ($P-O$).

$\\eta$

Efficiency

How effectively effort translates to order.

$\\alpha\_{up}$

Inflation

How fast expectations rise when succeeding.

$\\alpha\_{down}$

Stickiness

How slow expectations drop when failing.

$\\sigma$

Sigma (Mania)

"False energy" gained from rising expectations.

System Behaviors
----------------

### The Moving Goalpost

In this 3-DOF system, reaching "perfection" ($O = P$) is nearly impossible if $\\alpha\_{up}$ is high. As you approach the goal, the goal moves away. This simulates the psychological phenomenon where high-performers constantly normalize their success and feel inadequate despite objective progress.

### The Manic Crash

The term $\\sigma \\frac{dP}{dt}$ allows for "Mania."

1.  **The Boom**: You work hard $\\to$ Order rises $\\to$ Expectations rise $\\to$ You get "False Energy" ($\\sigma$) $\\to$ You work even harder.
    
2.  **The Peak**: Eventually, entropy ($\\delta O$) or the sheer size of the mess ($P-O$) drains energy faster than hype can replenish it.
    
3.  **The Crash**: Energy hits 0. Work stops. Order begins to decay ($\\frac{dO}{dt} < 0$).
    
4.  **The Depression**: Because $\\alpha\_{down}$ is small, expectations stay high while Order collapses. The "Mess" ($P-O$) becomes overwhelming, but you have no energy to tackle it. Expectations eventually drift down, but painfully slowly.