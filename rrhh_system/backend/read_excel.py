import pandas as pd
import json

try:
    # Read the Excel file without a header
    df = pd.read_excel('../../Empleados.xlsx', header=None)

    # Define the column names manually
    df.columns = [
        "Nombres", "Apellido Paterno", "Apellido Materno", "CI", 
        "Fecha de Nacimiento", "Fecha de Ingreso", "Departamento", "Cargo"
    ]

    # Convert the DataFrame to JSON
    json_data = df.to_json(orient='records', date_format='iso')

    # Print the JSON data
    print(json_data)

except FileNotFoundError:
    print(json.dumps({"error": "El archivo Empleados.xlsx no se encontró en el directorio principal."}))
except Exception as e:
    print(json.dumps({"error": f"Ocurrió un error al leer el archivo de Excel: {e}"}))