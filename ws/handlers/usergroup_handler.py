import json
from bson import json_util
from base import db, BaseHandler

class UserGroupHandler(BaseHandler):
    def get(self, email):
        collection = db["usersgroup"]
        result = list(collection.find({"email": email}))
        if result:
            self.write({'response': json.loads(json_util.dumps(result)), 'status': 200})
        else:
            self.set_status(404)
            self.write({'response': 'El usuario no tiene grupos asignados', 'status': 404})
