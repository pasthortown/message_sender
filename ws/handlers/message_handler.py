import json
from bson import json_util
from datetime import datetime, timezone
from base import db, BaseHandler

class MessageHandler(BaseHandler):
    def get(self, message_id=None):
        collection = db["messagereport"]

        # Rango del año en curso: [01-ene YYYY, ahora]
        now = datetime.now(timezone.utc)
        year_start = datetime(now.year, 1, 1, tzinfo=timezone.utc)

        # Acepta registros cuya fecha esté en rango usando cualquiera de los campos
        time_filter = {
            '$or': [
                {'timestamp': {'$gte': year_start, '$lte': now}},
                {'timestate': {'$gte': year_start, '$lte': now}},
            ]
        }

        query = {'$and': [time_filter]}

        if message_id:
            try:
                query['$and'].append({'message_id': int(message_id)})
            except ValueError:
                self.set_status(400)
                self.write({'response': 'message_id inválido', 'status': 400})
                return

        # Devuelve solo el año en curso, opcionalmente ordenado por fecha
        cursor = collection.find(query).sort([('timestamp', 1), ('timestate', 1)])
        result = list(cursor)

        if result:
            self.write({'response': json.loads(json_util.dumps(result)), 'status': 200})
        else:
            self.set_status(404)
            self.write({'response': 'Mensaje(s) no encontrado(s)', 'status': 404})
