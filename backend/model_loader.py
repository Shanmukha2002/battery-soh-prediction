import tensorflow as tf

SOH_MODEL_PATH = "models/SOH_LSTM.h5"
RUL_MODEL_PATH = "models/RUL_LSTM.h5"

def load_models():
    soh_model = tf.keras.models.load_model(SOH_MODEL_PATH)
    rul_model = tf.keras.models.load_model(RUL_MODEL_PATH)
    return soh_model, rul_model