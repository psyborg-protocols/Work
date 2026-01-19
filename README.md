The Organizer: System Dynamics Model
====================================

This project simulates a worker's struggle to organize a system against the natural forces of entropy. It uses a system of coupled Ordinary Differential Equations (ODEs) to model the interplay between **Order** ($O$) and the worker's **Energy** ($E$).

The Mathematical Model
----------------------

The system is defined by two primary variables that change over time ($t$):

1.  $O(t)$: The current level of Organization (Order).
    
2.  $E(t)$: The worker's current Energy.
    

### 1\. The Dynamics of Order

Order is built by work and destroyed by entropy.

$$\\frac{dO}{dt} = \\underbrace{\\eta \\cdot \\lambda (P - O)}\_{\\text{Work Done}} - \\underbrace{\\delta O}\_{\\text{Natural Decay}}$$

*   **The Mess**: Defined as $P - O$ (Potential - Current Order).
    
*   **Inspiration (**$\\lambda$**)**: The worker is driven by the mess. The messier it is, the harder they try to work.
    
*   **Efficiency (**$\\eta$**)**: Converts the energy spent working into actual results.
    
*   **Entropy (**$\\delta$**)**: A constant percentage of the existing order decays every moment.
    

### 2\. The Dynamics of Energy

Energy is a finite resource that is spent to work but regained through rest and the psychological reward of success.

$$\\frac{dE}{dt} = \\underbrace{r}\_{\\text{Rest}} - \\underbrace{\\lambda (P - O)}\_{\\text{Cost of Work}} + \\underbrace{\\gamma \\frac{dO}{dt}}\_{\\text{Success Feedback}}$$

*   **Rest (**$r$**)**: A constant rate of recovery (e.g., sleeping, eating).
    
*   **Cost of Work**: The energy spent is proportional to the effort ($\\lambda(P-O)$).
    
*   **Gratification (**$\\gamma$**)**: A feedback loop. If the worker sees Order increasing ($\\frac{dO}{dt} > 0$), they gain a burst of energy (dopamine/morale). If Order is falling despite their efforts, this term becomes negative, draining energy faster (discouragement).
    

Variable Definitions
--------------------

| Symbol | Name | Description |

| $P$ | Potential | The maximum theoretical level of order the system can hold. |

| $O$ | Order | The current state of organization. $0 \\le O \\le P$. |

| $E$ | Energy | The worker's fuel. If $E \\le 0$, work stops. |

| $\\delta$ | Decay (Delta) | The rate of natural entropy. Higher $\\delta$ means order falls apart faster. |

| $\\lambda$ | Inspiration (Lambda) | Sensitivity to mess. High $\\lambda$ means the worker attacks mess aggressively. |

| $\\eta$ | Efficiency (Eta) | How effectively effort translates to order. |

| $r$ | Recovery (r) | Base energy regeneration rate. |

| $\\gamma$ | Gratification (Gamma) | The strength of the "flow state." High $\\gamma$ allows work to sustain itself. |

System Behaviors
----------------

### The Burnout Condition

The simulation strictly enforces an energy floor. The equations are modified by a condition:

$$\\text{If } E(t) \\le 0, \\text{ then Work} = 0$$

When this happens, the "Cost of Work" drops to zero, but the "Work Done" also drops to zero. The system acts purely under the influence of **Rest** ($r$) and **Decay** ($-\\delta O$) until energy recovers.

### The Equilibrium (Steady State)

Without burnout, the system naturally tends toward a state where the work done exactly matches the rate of decay.

$$O\_{steady} = \\frac{\\eta \\lambda P}{\\eta \\lambda + \\delta}$$

Notice that if $\\delta > 0$ (entropy exists), $O\_{steady}$ will always be less than $P$. Perfection is mathematically impossible in this model.

### The Flow State

The term $\\gamma \\frac{dO}{dt}$ creates a powerful feedback loop.

*   **Positive Feedback:** If the worker is highly efficient ($\\eta$) and gratification ($\\gamma$) is high, the act of cleaning generates enough energy to offset the cost of the work. This is the "Flow State."
    
*   **Negative Feedback:** If entropy ($\\delta$) is too high, $\\frac{dO}{dt}$ becomes negative. The worker loses energy _because_ they are failing. This leads to a rapid crash.