import json
from bson import json_util
from datetime import datetime, timedelta
from base import db, BaseHandler

class MessagesGroupHandler(BaseHandler):
    def get(self, group_name):
        collection = db["messagesgroup"]

        # Calcular rango de fechas del día UTC actual
        today = datetime.utcnow().date()
        start_of_day = datetime.combine(today, datetime.min.time())
        end_of_day = datetime.combine(today, datetime.max.time())

        # Construir query con filtro por grupo y fecha
        query = {
            "group": group_name,
            "schedule": {
                "$gte": start_of_day,
                "$lte": end_of_day
            }
        }

        result = list(collection.find(query))

        if result:
            self.write({
                'response': json.loads(json_util.dumps(result)),
                'status': 200
            })
        else:
            self.set_status(404)
            self.write({
                'response': f"No se encontraron mensajes para el grupo '{group_name}' hoy",
                'status': 404
            })
