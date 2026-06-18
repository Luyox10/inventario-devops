import os
import json
import logging
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------
SAFETY_STOCK_FACTOR = 0.25   # 25% sobre la prediccion como stock de seguridad
MIN_ROWS_TO_TRAIN   = 10     # minimo de registros para entrenar el modelo


# ---------------------------------------------------------------------------
# Helpers de features
# ---------------------------------------------------------------------------

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Genera las variables de entrada a partir del dataframe de ventas."""
    df = df.copy()
    df['fecha'] = pd.to_datetime(df['fecha'])
    df['dia_semana']   = df['fecha'].dt.dayofweek          # 0=lunes
    df['mes']          = df['fecha'].dt.month
    df['quincena']     = (df['fecha'].dt.day > 15).astype(int)
    df['semana_anio']  = df['fecha'].dt.isocalendar().week.astype(int)
    return df


def encode_categoricals(df: pd.DataFrame, encoders: dict) -> pd.DataFrame:
    """Codifica columnas categoricas usando LabelEncoder."""
    df = df.copy()
    for col in ['producto_id', 'categoria']:
        if col in df.columns:
            if col not in encoders:
                enc = LabelEncoder()
                df[col] = enc.fit_transform(df[col].astype(str))
                encoders[col] = enc
            else:
                enc = encoders[col]
                known = set(enc.classes_)
                df[col] = df[col].astype(str).apply(
                    lambda x: x if x in known else enc.classes_[0]
                )
                df[col] = enc.transform(df[col])
    return df


FEATURE_COLS = [
    'producto_id', 'dia_semana', 'mes', 'quincena',
    'semana_anio', 'precio', 'stock_actual',
]


# ---------------------------------------------------------------------------
# Estado global del modelo (en memoria)
# ---------------------------------------------------------------------------

_model: RandomForestRegressor | None = None
_encoders: dict = {}
_last_trained: str | None = None
_training_rows: int = 0


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get('/health')
def health():
    return jsonify({
        'status': 'ok',
        'modelo_entrenado': _model is not None,
        'ultima_actualizacion': _last_trained,
        'registros_entrenamiento': _training_rows,
    })


@app.post('/train')
def train():
    """
    Recibe el historial de ventas desde el backend Node.js y entrena el modelo.

    Body JSON esperado:
    {
      "ventas": [
        {
          "fecha": "2025-01-15",
          "producto_id": 3,
          "categoria": "Bebidas",
          "cantidad": 12,
          "precio": 3.50,
          "stock_actual": 40
        },
        ...
      ]
    }
    """
    global _model, _encoders, _last_trained, _training_rows

    data = request.get_json(force=True)
    ventas = data.get('ventas', [])

    if len(ventas) < MIN_ROWS_TO_TRAIN:
        return jsonify({
            'error': f'Se necesitan al menos {MIN_ROWS_TO_TRAIN} registros para entrenar. '
                     f'Registros recibidos: {len(ventas)}'
        }), 400

    df = pd.DataFrame(ventas)
    df = build_features(df)
    _encoders = {}
    df = encode_categoricals(df, _encoders)

    X = df[FEATURE_COLS].fillna(0)
    y = df['cantidad'].astype(float)

    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X, y)

    _model = model
    _last_trained = datetime.now().isoformat()
    _training_rows = len(df)

    logger.info(f'Modelo entrenado con {_training_rows} registros.')
    return jsonify({
        'mensaje': 'Modelo entrenado correctamente.',
        'registros': _training_rows,
        'features': FEATURE_COLS,
    })


@app.post('/predict')
def predict():
    """
    Genera predicciones de ventas para los proximos N dias por producto.

    Body JSON esperado:
    {
      "productos": [
        {
          "producto_id": 3,
          "nombre": "Coca Cola 500ml",
          "categoria": "Bebidas",
          "precio": 3.50,
          "stock_actual": 40,
          "stock_minimo": 10,
          "unidad": "und"
        }
      ],
      "dias": 7
    }
    """
    if _model is None:
        return jsonify({
            'error': 'El modelo no ha sido entrenado aun. '
                     'Llama a POST /train primero cuando haya suficiente historial.',
            'modelo_listo': False,
        }), 503

    data = request.get_json(force=True)
    productos = data.get('productos', [])
    dias = int(data.get('dias', 7))

    if not productos:
        return jsonify({'error': 'Lista de productos vacia.'}), 400

    today = datetime.today()
    resultados = []

    for prod in productos:
        predicciones_diarias = []

        for d in range(dias):
            fecha = today + timedelta(days=d)
            row = {
                'producto_id':  prod.get('producto_id'),
                'categoria':    prod.get('categoria', 'Sin categoria'),
                'dia_semana':   fecha.weekday(),
                'mes':          fecha.month,
                'quincena':     int(fecha.day > 15),
                'semana_anio':  fecha.isocalendar()[1],
                'precio':       float(prod.get('precio', 0)),
                'stock_actual': float(prod.get('stock_actual', 0)),
            }
            tmp = pd.DataFrame([row])
            tmp_enc = encode_categoricals(tmp, _encoders)
            X_pred = tmp_enc[FEATURE_COLS].fillna(0)
            pred = float(_model.predict(X_pred)[0])
            predicciones_diarias.append(max(0, round(pred, 2)))

        total_predicho = round(sum(predicciones_diarias), 2)
        stock_seguridad = round(total_predicho * SAFETY_STOCK_FACTOR)
        inventario_recomendado = round(total_predicho + stock_seguridad)

        resultados.append({
            'producto_id':          prod.get('producto_id'),
            'nombre':               prod.get('nombre', ''),
            'unidad':               prod.get('unidad', 'und'),
            'stock_actual':         prod.get('stock_actual', 0),
            'stock_minimo':         prod.get('stock_minimo', 0),
            'prediccion_total':     total_predicho,
            'prediccion_diaria':    predicciones_diarias,
            'stock_seguridad':      stock_seguridad,
            'inventario_recomendado': inventario_recomendado,
            'necesita_reposicion':  inventario_recomendado > prod.get('stock_actual', 0),
        })

    resultados.sort(key=lambda r: r['prediccion_total'], reverse=True)

    return jsonify({
        'modelo_listo': True,
        'ultima_actualizacion': _last_trained,
        'registros_entrenamiento': _training_rows,
        'dias_prediccion': dias,
        'resultados': resultados,
    })


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    port = int(os.environ.get('ML_PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
