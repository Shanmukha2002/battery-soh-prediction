import numpy as np

# Create SOH input (10 timesteps × features)
def create_soh_sequence(data):
    return np.array(data).reshape(1, 10, -1)

# Create RUL input (3 timesteps of SOH)
def create_rul_sequence(soh_values):
    return np.array(soh_values).reshape(1, 3, 1)