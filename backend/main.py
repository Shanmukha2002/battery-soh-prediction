from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from state import soh_model, rul_model
from utils import create_soh_sequence

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Input schema
class InputData(BaseModel):
    sequence: list

@app.get("/")
def home():
    return {"message": "Battery SOH & RUL API Running"}

@app.post("/predict")
def predict(data: InputData):
    try:
        sequence = np.array(data.sequence)

        # Validate: must have exactly 10 timesteps
        if sequence.shape[0] != 10:
            return {"error": "Input must have exactly 10 rows"}

        # Validate: must have exactly 7 features per row
        if sequence.shape[1] != 7:
            return {"error": f"Each row must have 7 values (ambient_temp, voltage, current, temperature, load_current, load_voltage, time). Got {sequence.shape[1]}"}

        # SOH prediction
        soh_input = create_soh_sequence(sequence)
        soh_pred = float(soh_model.predict(soh_input, verbose=0)[0][0])

        # Clamp SOH between 0 and 1
        soh_pred = max(0.0, min(1.0, soh_pred))

        # RUL estimation using SOH
        # Battery end-of-life is at SOH = 0.70 (70% threshold)
        # RUL = how much life remains from current SOH down to 0.70
        # Normalized between 0 (end of life) and 1 (brand new)
        SOH_NEW = 1.0     # brand new battery
        SOH_EOL = 0.70    # end of life threshold

        if soh_pred <= SOH_EOL:
            rul_pred = 0.0   # battery is at or past end of life
        else:
            rul_pred = (soh_pred - SOH_EOL) / (SOH_NEW - SOH_EOL)

        rul_pred = max(0.0, min(1.0, rul_pred))

        return {
            "SOH": round(soh_pred, 4),
            "RUL": round(rul_pred, 4)
        }

    except Exception as e:
        print("ERROR:", str(e))
        return {"error": str(e)}
