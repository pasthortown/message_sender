import json
from bson import json_util
from base import db, BaseHandler

class UserHandler(BaseHandler):
    def get(self, email):
        collection = db["users"]
        result = list(collection.find({"email": email}))
        if result:
            self.write({'response': json.loads(json_util.dumps(result)), 'status': 200})
        else:
            self.set_status(404)
            self.write({'response': 'Usuario no encontrado', 'status': 404})

class UsersCountHandler(BaseHandler):
    def get(self):
        collection = db["users"]
        count = collection.count_documents({})
        self.write({'response': {'count': count}, 'status': 200})