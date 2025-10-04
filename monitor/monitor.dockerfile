FROM python:3.11-slim

# Establecer directorio de trabajo
WORKDIR /app

# Copiar requirements e instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY main.py .

# Ejecutar el script principal
CMD ["python", "main.py"]
