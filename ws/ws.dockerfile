# Imagen base
FROM python:3.11-slim

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar solo archivos necesarios
COPY main.py .
COPY base.py .
COPY helpers.py .
COPY requirements.txt .
COPY handlers/ ./handlers/

# Instalar dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Exponer el puerto del servicio
EXPOSE 5050

# Comando de ejecución
CMD ["python", "main.py"]
