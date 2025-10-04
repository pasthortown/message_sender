import requests
import base64
from datetime import datetime, timedelta

# Configuración
url = "http://localhost:5050"
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYWRtaW4ifQ.j7h-lJGsQ7X5u3H2Uj92BoWVfpYdS2DQvse7Z_DTPDI"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Control de horario
sumar_horas = 1
sumar_minutos = 1

# Utilidad para POST
def post_item(endpoint, data):
    response = requests.post(f"{url}/{endpoint}", json=data, headers=headers)
    if response.status_code == 200:
        print(f"✅ Insertado en {endpoint}: {data}")
    else:
        print(f"❌ Error al insertar en {endpoint}: {response.status_code} - {response.text}")

# 1. Insertar en usersgroup
post_item("usersgroup", {"group": "Tecnología", "email": "luis.salazar"})
post_item("usersgroup", {"group": "Soporte", "email": "luis.salazar"})
