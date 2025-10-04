import os
import json
import time
import pika
from pymongo import MongoClient, ReturnDocument, ASCENDING
from datetime import datetime, timezone
from dateutil import parser
from dateutil.relativedelta import relativedelta

# ==========================
#   Variables de entorno
# ==========================
mongo_bdd = os.getenv('mongo_bdd')
mongo_bdd_server = os.getenv('mongo_bdd_server')
mongo_user = os.getenv('mongo_user')
mongo_password = os.getenv('mongo_password')

rabbitmq_host = os.getenv('RABBITMQ_HOST')
rabbitmq_port = int(os.getenv('RABBITMQ_PORT', 5672))
rabbitmq_user = os.getenv('RABBITMQ_USERNAME')
rabbitmq_pass = os.getenv('RABBITMQ_PASSWORD')
rabbitmq_queue = os.getenv('RABBITMQ_QUEUE', 'activity_queue')

# ==========================
#   Conexión a MongoDB
# ==========================
mongo_uri = f"mongodb://{mongo_user}:{mongo_password}@{mongo_bdd_server}:27017/"
mongo_client = MongoClient(mongo_uri)
mongo_db = mongo_client[mongo_bdd]
collection = mongo_db["messagereport"]
counters = mongo_db["_counters"]
users_col = mongo_db["users"]

# Índices recomendados (idempotentes)
collection.create_index([("email", ASCENDING)])
collection.create_index([("timestamp", ASCENDING)])
users_col.create_index([("email", ASCENDING)], unique=False)

# ==========================
#   Conexión a RabbitMQ
# ==========================
credentials = pika.PlainCredentials(rabbitmq_user, rabbitmq_pass)
parameters = pika.ConnectionParameters(host=rabbitmq_host, port=rabbitmq_port, credentials=credentials)

print("🔄 Iniciando monitor...")

def esperar_rabbitmq():
    intentos = 0
    while True:
        try:
            connection = pika.BlockingConnection(parameters)
            connection.close()
            print("RabbitMQ está disponible.")
            return
        except pika.exceptions.AMQPConnectionError:
            intentos += 1
            print(f"RabbitMQ no disponible. Reintentando en 5 segundos... (intento {intentos})")
            time.sleep(5)

def get_next_sequence(name, cantidad):
    result = counters.find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": cantidad}},
        return_document=ReturnDocument.AFTER,
        upsert=True
    )
    return result["seq"]

# --- Utils ---
def normalize_utc(dt: datetime | None) -> datetime | None:
    """Devuelve dt como datetime 'aware' en UTC. Si dt es None, devuelve None."""
    if dt is None:
        return None
    if not isinstance(dt, datetime):
        return None
    if dt.tzinfo is None:
        # dato 'naive' -> asumimos que estaba en UTC
        return dt.replace(tzinfo=timezone.utc)
    # asegurar UTC
    return dt.astimezone(timezone.utc)

def procesar_mensajes():
    """Consume hasta 10,000 mensajes por ciclo y los vuelca en MongoDB."""
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()
    channel.queue_declare(queue=rabbitmq_queue, durable=True)

    mensajes = []
    ack_tags = []

    def recolector(ch, method, properties, body):
        try:
            mensaje = json.loads(body.decode("utf-8"))
            mensajes.append(mensaje)
            ack_tags.append(method.delivery_tag)
        except Exception as e:
            print(f"Error procesando mensaje: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    channel.basic_qos(prefetch_count=1000)
    for _ in range(10000):
        method_frame, header_frame, body = channel.basic_get(rabbitmq_queue)
        if method_frame:
            recolector(channel, method_frame, header_frame, body)
        else:
            break

    if mensajes:
        print(f"📥 Procesando {len(mensajes)} mensajes desde RabbitMQ...")
        secuencia_final = get_next_sequence("messagereport", len(mensajes))
        secuencia_inicio = secuencia_final - len(mensajes) + 1

        documentos = []
        now_utc = datetime.now(timezone.utc)

        for i, mensaje in enumerate(mensajes):
            # timestamp del evento (si no viene o es inválido, usamos now_utc)
            ts_raw = mensaje.get("timestamp")
            try:
                ts_parsed = parser.parse(ts_raw) if ts_raw else None
            except Exception:
                ts_parsed = None

            ts_final = normalize_utc(ts_parsed) or now_utc

            documentos.append({
                "message_id": mensaje.get("message_id"),
                "email": mensaje.get("email"),
                "zona": mensaje.get("zona"),
                "estado": mensaje.get("estado"),
                "timestamp": ts_final,            # siempre 'aware' en UTC
                "item_id": secuencia_inicio + i
            })

        try:
            collection.insert_many(documentos, ordered=False)
            print(f"✅ Insertados {len(documentos)} registros en MongoDB")
            for tag in ack_tags:
                channel.basic_ack(delivery_tag=tag)
        except Exception as e:
            print(f"❌ Error al insertar en MongoDB: {e}")
            for tag in ack_tags:
                channel.basic_nack(delivery_tag=tag, requeue=True)

    connection.close()

def clean_users():
    """
    Elimina de `users` a los emails cuya ÚLTIMA actividad en `messagereport`
    (campo `timestamp`) sea ANTERIOR a (ahora - 4 meses).
    - Solo se consideran emails que aparezcan al menos una vez en `messagereport`.
    - Usuarios sin registros en `messagereport` (nuevos) NO se eliminan.
    """
    now_utc = datetime.now(timezone.utc)
    cutoff = now_utc - relativedelta(months=4)     # aware (UTC)

    # Agrupamos por email y obtenemos el ÚLTIMO timestamp registrado
    pipeline = [
        {"$match": {"email": {"$exists": True, "$ne": None, "$ne": ""}}},
        {"$group": {"_id": "$email", "last_ts": {"$max": "$timestamp"}}}
    ]

    old_emails: list[str] = []

    for doc in collection.aggregate(pipeline, allowDiskUse=True):
        email = doc["_id"]
        last_ts = normalize_utc(doc.get("last_ts"))  # <-- normalizamos a UTC aware
        if not email or last_ts is None:
            continue
        if last_ts < cutoff:
            old_emails.append(email)

    if not old_emails:
        print(f"🧹 clean_users(): no hay usuarios para eliminar. (cutoff={cutoff.isoformat()})")
        return

    # Eliminación definitiva de la colección `users`
    res_delete = users_col.delete_many({"email": {"$in": old_emails}})
    print(
        f"🧹 clean_users(): eliminados {res_delete.deleted_count} usuarios "
        f"con última actividad < {cutoff.date()}."
    )

if __name__ == "__main__":
    esperar_rabbitmq()
    while True:
        # 1) Consumir y persistir mensajes
        procesar_mensajes()
        # 2) Eliminar usuarios inactivos según última actividad (solo si alguna vez tuvieron registros)
        clean_users()
        # 3) Espera 10 minutos
        time.sleep(600)
