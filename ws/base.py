import os
import jwt
from pymongo import MongoClient
from tornado.web import RequestHandler

# Variables de entorno
mongo_bdd = os.getenv('mongo_bdd')
mongo_bdd_server = os.getenv('mongo_bdd_server')
mongo_user = os.getenv('mongo_user')
mongo_password = os.getenv('mongo_password')
jwt_secret = os.getenv('jwt_secret', 'supersecreto')

# Conexión a MongoDB
client = MongoClient(f'mongodb://{mongo_user}:{mongo_password}@{mongo_bdd_server}/')
db = client[mongo_bdd]
counter_collection = db['_counters']

class BaseHandler(RequestHandler):
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.set_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")

    def options(self, *args, **kwargs):
        self.set_status(204)
        self.finish()

    def prepare(self):
        if self.request.method != "OPTIONS":
            auth_header = self.request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                self.set_status(401)
                self.finish({"error": "Token no proporcionado"})
                return
            token = auth_header.replace("Bearer ", "")
            try:
                jwt.decode(token, jwt_secret, algorithms=["HS256"])
            except jwt.ExpiredSignatureError:
                self.set_status(401)
                self.finish({"error": "Token expirado"})
            except jwt.InvalidTokenError:
                self.set_status(401)
                self.finish({"error": "Token inválido"})
