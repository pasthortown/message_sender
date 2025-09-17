import json
import bcrypt
import os
from tornado.escape import json_decode
from base import db, BaseHandler
from helpers import get_next_id, safe_json

bcrypt_salt = int(os.getenv("bcrypt_salt", 12))
collection = db["managers"]

class BackofficeUserHandler(BaseHandler):
    def get(self, username=None):
        if username:
            result = collection.find_one(
                {"username": username},
                {"_id": False, "password": False}
            )
            if result:
                self.write({'response': safe_json(result), 'status': 200})
            else:
                self.set_status(404)
                self.write({'response': 'Usuario no encontrado', 'status': 404})
        else:
            users = list(collection.find({}, {"_id": False, "password": False}))
            self.write({'response': safe_json(users), 'status': 200})

    def post(self):
        data = json_decode(self.request.body)
        if not data.get("username") or not data.get("password"):
            self.set_status(400)
            return self.write({'response': 'username y password son requeridos', 'status': 400})

        data["id"] = get_next_id("managers")
        hashed = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt(bcrypt_salt))
        data["password"] = hashed.decode()

        collection.insert_one(data)

        response_data = {k: v for k, v in data.items() if k != "password"}
        response_data.pop("_id", None)
        self.set_status(201)
        self.write({'response': safe_json(response_data), 'status': 201})

    def patch(self):
        data = json_decode(self.request.body)
        user_id = data.get("id")
        if user_id is None:
            self.set_status(400)
            return self.write({'response': 'id es requerido para actualizar', 'status': 400})

        # Asegura tipo entero
        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            self.set_status(400)
            return self.write({'response': 'id debe ser un entero', 'status': 400})

        update_data = {}
        if "username" in data and data["username"]:
            update_data["username"] = data["username"]
        if "password" in data and data["password"]:
            hashed = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt(bcrypt_salt))
            update_data["password"] = hashed.decode()

        if not update_data:
            self.set_status(400)
            return self.write({'response': 'No hay campos válidos para actualizar', 'status': 400})

        result = collection.update_one({"id": user_id}, {"$set": update_data})

        if result.matched_count == 0:
            self.set_status(404)
            return self.write({'response': 'Usuario no encontrado', 'status': 404})

        # Devuelve el documento actualizado (sin password ni _id)
        updated = collection.find_one({"id": user_id}, {"_id": False, "password": False})
        self.write({'response': safe_json(updated), 'status': 200})

    def delete(self):
        user_id = self.get_query_argument("id", None)
        if user_id is None:
            self.set_status(400)
            return self.write({'response': 'id es requerido', 'status': 400})

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            self.set_status(400)
            return self.write({'response': 'id debe ser un entero', 'status': 400})

        result = collection.delete_one({"id": user_id})
        if result.deleted_count:
            self.write({'response': 'Usuario eliminado', 'status': 200})
        else:
            self.set_status(404)
            self.write({'response': 'Usuario no encontrado', 'status': 404})

class BackofficeLoginHandler(BaseHandler):
    def post(self):
        data = json_decode(self.request.body)
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            self.set_status(400)
            return self.write({'response': 'username y password son requeridos', 'status': 400})

        user = collection.find_one({"username": username})
        allowed = False

        if user and bcrypt.checkpw(password.encode(), user["password"].encode()):
            allowed = True

        # Por consistencia usamos safe_json
        self.write(safe_json({'username': username, 'allowed': allowed, 'status': 200}))
