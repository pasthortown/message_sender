import datetime
from tornado.escape import json_decode
from base import db, BaseHandler
from helpers import get_next_id, build_projection, safe_json


class CatalogHandler(BaseHandler):
    def post(self, catalog):
        data = json_decode(self.request.body)
        collection = db[catalog]
        item_id = get_next_id(catalog)
        data['item_id'] = item_id
        data['timestamp'] = datetime.datetime.utcnow()

        if "schedule" in data and isinstance(data["schedule"], str):
            try:
                data["schedule"] = datetime.datetime.fromisoformat(data["schedule"])
            except ValueError:
                self.set_status(400)
                self.write({
                    "response": "Formato inválido para 'schedule'. Debe ser ISO 8601",
                    "status": 400
                })
                return

        result = collection.insert_one(data)
        data['_id'] = result.inserted_id

        self.write({'response': safe_json(data), 'status': 200})

    def get(self, catalog):
        collection = db[catalog]
        item_id = self.get_query_argument('id', None)
        output_model = self.get_argument('output_model', default=None)
        projection = build_projection(output_model)

        if item_id:
            try:
                item_id = int(item_id)
            except ValueError:
                self.set_status(400)
                return self.write({'error': 'item_id debe ser un entero'})

            result = collection.find_one({"item_id": item_id}, projection)
            if result:
                self.write({'response': safe_json(result), 'status': 200})
            else:
                self.set_status(404)
                self.write({'response': 'Elemento no encontrado', 'status': 404})
        else:
            cursor = collection.find({}, projection)
            items = list(cursor)
            self.write({'response': safe_json(items), 'status': 200})

    def patch(self, catalog):
        data = json_decode(self.request.body)
        item_id = data.get("item_id")
        if item_id is None:
            self.set_status(400)
            return self.write({'error': 'item_id es obligatorio'})

        try:
            item_id = int(item_id)
        except ValueError:
            self.set_status(400)
            return self.write({'error': 'item_id debe ser un entero'})

        if "schedule" in data and isinstance(data["schedule"], str):
            try:
                data["schedule"] = datetime.datetime.fromisoformat(data["schedule"])
            except ValueError:
                self.set_status(400)
                return self.write({
                    "response": "Formato inválido para 'schedule'. Debe ser ISO 8601",
                    "status": 400
                })

        collection = db[catalog]
        data['timestamp'] = datetime.datetime.utcnow()

        data_to_set = {k: v for k, v in data.items() if k != "item_id"}
        result = collection.update_one({"item_id": item_id}, {"$set": data_to_set})

        if result.matched_count == 0:
            self.set_status(404)
            return self.write({'response': 'Elemento no encontrado', 'status': 404})

        updated = collection.find_one({"item_id": item_id})
        self.write({'response': safe_json(updated), 'status': 200})

    def delete(self, catalog):
        item_id = self.get_query_argument('id', None)
        if not item_id:
            self.set_status(400)
            return self.write({'error': 'Debe enviar item_id en la URL'})

        try:
            item_id = int(item_id)
        except ValueError:
            self.set_status(400)
            return self.write({'error': 'item_id debe ser un entero'})

        collection = db[catalog]
        result = collection.delete_one({"item_id": item_id})
        if result.deleted_count == 0:
            self.set_status(404)
            return self.write({'response': 'Elemento no encontrado', 'status': 404})

        self.write({'response': 'Elemento eliminado', 'status': 200})
