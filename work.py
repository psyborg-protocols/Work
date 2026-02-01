# Let's simulate the proposed system and plot a 3D trajectory.
import numpy as np
import matplotlib.pyplot as plt

# Parameters
alpha = 2.0   # effectiveness of energy on order
delta = 0.5   # decay of order
r1 = 1.0      # energy recovery rate
r2 = 1.2      # energy depletion rate

G = 1.0       # fixed organizational goal

# Time settings
dt = 0.01
T = 200
steps = int(T / dt)

# Storage
O = np.zeros(steps)
E = np.zeros(steps)
M = np.zeros(steps)

# Initial conditions
O[0] = 0.2
E[0] = 0.5

def f(M):
    return M * np.exp(-M**2)

def g(M):
    return 1.0 / (1.0 + M**2)

# Simulation loop
for i in range(steps - 1):
    M[i] = G - O[i]
    
    dO = alpha * E[i] * f(M[i]) - delta * O[i]
    dE = r1 * g(M[i]) - r2 * E[i] * abs(f(M[i]))
    
    O[i+1] = O[i] + dO * dt
    E[i+1] = E[i] + dE * dt

M[-1] = G - O[-1]

# 3D plot
fig = plt.figure()
ax = fig.add_subplot(projection='3d')
ax.plot(O, E, M)
ax.set_xlabel("Order (O)")
ax.set_ylabel("Energy (E)")
ax.set_zlabel("Messiness (M)")
plt.show()
