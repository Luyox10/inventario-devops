import argparse
import json
import random
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder

# Replicamos las constantes y funciones de app.py para poder evaluar el modelo
# de forma independiente sin iniciar el servidor Flask.

SAFETY_STOCK_FACTOR = 0.25
MIN_ROWS_TO_TRAIN = 10

FEATURE_COLS = [
    'producto_id', 'dia_semana', 'mes', 'quincena',
    'semana_anio', 'precio', 'stock_actual',
    'lag_1', 'lag_7', 'rolling_mean_7', 'rolling_mean_14',
    'tendencia_7d', 'tendencia_14d',
]

DEMANDA_BASE = {
    'bebidas': (8, 25), 'snacks': (5, 18), 'limpieza': (3, 10),
    'lacteos': (6, 20), 'abarrotes': (4, 15), 'sin categoria': (3, 12),
}


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['fecha'] = pd.to_datetime(df['fecha'])
    df = df.sort_values(['producto_id', 'fecha']).reset_index(drop=True)

    # Calcular features temporales por producto usando transform
    g = df.groupby('producto_id')['cantidad']
    df['lag_1'] = g.shift(1)
    df['lag_7'] = g.shift(7)
    df['rolling_mean_7'] = g.shift(1).transform(lambda x: x.rolling(7, min_periods=1).mean())
    df['rolling_mean_14'] = g.shift(1).transform(lambda x: x.rolling(14, min_periods=1).mean())

    # Tendencia: pendiente de la recta de ajuste lineal sobre ventanas moviles
    def poly_slope(x, window):
        x = x.shift(1).rolling(window, min_periods=2)
        return x.apply(lambda s: np.polyfit(range(len(s)), s, 1)[0] if len(s) > 1 else 0, raw=False)

    df['tendencia_7d'] = g.transform(lambda x: poly_slope(x, 7))
    df['tendencia_14d'] = g.transform(lambda x: poly_slope(x, 14))

    df['dia_semana'] = df['fecha'].dt.dayofweek
    df['mes'] = df['fecha'].dt.month
    df['quincena'] = (df['fecha'].dt.day > 15).astype(int)
    df['semana_anio'] = df['fecha'].dt.isocalendar().week.astype(int)
    return df


def encode_categoricals(df: pd.DataFrame, encoders: dict) -> pd.DataFrame:
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


def simulate_data(productos, dias=90, seed=42):
    """Genera datos historicos simulados para productos sin historial real."""
    random.seed(seed)
    np.random.seed(seed)

    ventas_simuladas = []
    today = datetime.today()

    for prod in productos:
        cat = str(prod.get('categoria', 'Sin categoria')).lower()
        base_min, base_max = DEMANDA_BASE.get(cat, (3, 12))
        precio = float(prod.get('precio', 5))
        stock_base = float(prod.get('stock_actual', 20))
        precio_factor = max(0.4, min(1.5, 10 / max(precio, 1)))

        for d in range(dias):
            fecha = today - timedelta(days=(dias - d))
            dia_semana = fecha.weekday()
            dia_factor = 1.4 if dia_semana >= 5 else (1.1 if dia_semana == 4 else 1.0)
            mes_factor = 1.2 if fecha.day in range(14, 17) or fecha.day in range(29, 32) else 1.0
            temp_factor = 1.3 if fecha.month in [1, 2, 12] else (1.15 if fecha.month in [6, 7] else 1.0)

            demanda_media = (
                random.uniform(base_min, base_max)
                * precio_factor * dia_factor * mes_factor * temp_factor
            )
            cantidad = max(1, int(np.random.poisson(demanda_media)))

            ventas_simuladas.append({
                'fecha': fecha.strftime('%Y-%m-%d'),
                'producto_id': prod.get('producto_id'),
                'categoria': prod.get('categoria', 'Sin categoria'),
                'cantidad': cantidad,
                'precio': precio,
                'stock_actual': stock_base,
            })

    return ventas_simuladas


def load_data(path):
    """Carga datos desde CSV o JSON."""
    if path.endswith('.csv'):
        df = pd.read_csv(path)
    elif path.endswith('.json'):
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, dict):
            df = pd.DataFrame(data.get('ventas', data))
        else:
            df = pd.DataFrame(data)
    else:
        raise ValueError('Soporta archivos .csv o .json')
    return df


def split_temporal(df, test_size=0.2):
    """Divide cronologicamente los datos para respetar el orden temporal."""
    df = df.sort_values('fecha').reset_index(drop=True)
    split_idx = int(len(df) * (1 - test_size))
    return df.iloc[:split_idx], df.iloc[split_idx:]


def train_and_evaluate(df, test_size=0.2, random_state=42):
    """Entrena el modelo y calcula MAE, RMSE y R2."""
    if len(df) < MIN_ROWS_TO_TRAIN:
        raise ValueError(f'Se necesitan al menos {MIN_ROWS_TO_TRAIN} registros para entrenar.')

    df = build_features(df)
    encoders = {}
    df = encode_categoricals(df, encoders)

    df_train, df_test = split_temporal(df, test_size=test_size)

    X_train = df_train[FEATURE_COLS].fillna(0)
    y_train = df_train['cantidad'].astype(float)
    X_test = df_test[FEATURE_COLS].fillna(0)
    y_test = df_test['cantidad'].astype(float)

    model = RandomForestRegressor(
        n_estimators=100, max_depth=10, random_state=random_state, n_jobs=-1
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    # RandomForest puede predecir negativo, forzamos a 0
    y_pred = np.maximum(0, y_pred)

    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = float(r2_score(y_test, y_pred))

    # Baseline: predecir la media del conjunto de entrenamiento
    mean_baseline = np.full_like(y_test, y_train.mean())
    mae_baseline = float(mean_absolute_error(y_test, mean_baseline))
    rmse_baseline = float(np.sqrt(mean_squared_error(y_test, mean_baseline)))
    r2_baseline = float(r2_score(y_test, mean_baseline))

    return {
        'test_size': len(df_test),
        'train_size': len(df_train),
        'mae': round(mae, 4),
        'rmse': round(rmse, 4),
        'r2': round(r2, 4),
        'mape': round(float(np.mean(np.abs((y_test - y_pred) / np.maximum(y_test, 1))) * 100), 4),
        'baseline': {
            'mae': round(mae_baseline, 4),
            'rmse': round(rmse_baseline, 4),
            'r2': round(r2_baseline, 4),
        },
        'feature_importance': dict(
            sorted(zip(FEATURE_COLS, model.feature_importances_), key=lambda x: x[1], reverse=True)
        ),
    }


def main():
    parser = argparse.ArgumentParser(description='Evalua el modelo de prediccion de ventas.')
    parser.add_argument('--data-file', type=str, help='Ruta a CSV/JSON con datos historicos de ventas.')
    parser.add_argument('--dias', type=int, default=90, help='Dias de historial simulado si no hay data-file.')
    parser.add_argument('--test-size', type=float, default=0.2, help='Proporcion de datos para test (default 0.2).')
    args = parser.parse_args()

    if args.data_file:
        print(f'Cargando datos desde {args.data_file}')
        df = load_data(args.data_file)
    else:
        print('Generando datos simulados de ventas...')
        productos = [
            {'producto_id': 1, 'nombre': 'Coca Cola 500ml', 'categoria': 'Bebidas', 'precio': 3.50, 'stock_actual': 40},
            {'producto_id': 2, 'nombre': 'Papitas Lays', 'categoria': 'Snacks', 'precio': 2.80, 'stock_actual': 25},
            {'producto_id': 3, 'nombre': 'Detergente', 'categoria': 'Limpieza', 'precio': 5.00, 'stock_actual': 15},
            {'producto_id': 4, 'nombre': 'Leche Gloria', 'categoria': 'Lacteos', 'precio': 4.20, 'stock_actual': 30},
            {'producto_id': 5, 'nombre': 'Arroz Costeno', 'categoria': 'Abarrotes', 'precio': 6.50, 'stock_actual': 50},
        ]
        ventas = simulate_data(productos, dias=args.dias)
        df = pd.DataFrame(ventas)

    print(f'Registros disponibles: {len(df)}')
    print(df.head())

    resultados = train_and_evaluate(df, test_size=args.test_size)

    print('\n' + '=' * 60)
    print('RESULTADOS DE EVALUACION DEL MODELO')
    print('=' * 60)
    print(f'Tamanio de entrenamiento: {resultados["train_size"]} registros')
    print(f'Tamanio de prueba:        {resultados["test_size"]} registros')
    print('-' * 60)
    print(f'MAE:   {resultados["mae"]:.4f}')
    print(f'RMSE:  {resultados["rmse"]:.4f}')
    print(f'R2:    {resultados["r2"]:.4f}')
    print(f'MAPE:  {resultados["mape"]:.4f}%')
    print('-' * 60)
    print('Baseline (prediccion media):')
    print(f'  MAE:  {resultados["baseline"]["mae"]:.4f}')
    print(f'  RMSE: {resultados["baseline"]["rmse"]:.4f}')
    print(f'  R2:   {resultados["baseline"]["r2"]:.4f}')
    print('-' * 60)
    print('Importancia de features:')
    for feature, importance in resultados['feature_importance'].items():
        print(f'  {feature:15s} {importance:.4f}')

    # Guardar resultados para usarlos en el informe
    with open('ml-service/evaluation_results.json', 'w', encoding='utf-8') as f:
        json.dump(resultados, f, indent=2, ensure_ascii=False)
    print('\nResultados guardados en: ml-service/evaluation_results.json')


if __name__ == '__main__':
    main()
