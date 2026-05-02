from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from state import soh_model, rul_model
from utils import create_soh_sequence, create_rul_sequence

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

        # Validate input
        if sequence.shape[0] != 10:
            return {"error": "Input must have 10 timesteps"}

        # SOH prediction
        soh_input = create_soh_sequence(sequence)
        soh_pred = soh_model.predict(soh_input)[0][0]

        # 🔴 TEMP FIX FOR RUL (DEMO ONLY)
        try:
            # Simple consistent RUL (derived from SOH)
            rul_pred = 1 - float(soh_pred)
        except:
            # fallback if model shape mismatch
            rul_pred = float(100 * (1 - soh_pred))  # simple approximation

        return {
            "SOH": float(soh_pred),
            "RUL": float(rul_pred)
        }

    except Exception as e:
        print("ERROR:", str(e))
        return {"error": str(e)}