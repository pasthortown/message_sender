from tornado.ioloop import IOLoop
from tornado.web import Application

from base import BaseHandler
from handlers.catalog_handler import CatalogHandler
from handlers.usergroup_handler import UserGroupHandler
from handlers.user_handler import UserHandler
from handlers.message_handler import MessageHandler
from handlers.messagesgroup_handler import MessagesGroupHandler
from handlers.backoffice_handler import BackofficeUserHandler, BackofficeLoginHandler

def make_app():
    return Application([
        (r"/", BaseHandler),
        (r"/([^/]+)", CatalogHandler),
        (r"/search/usersgroup/([^/]+)", UserGroupHandler),
        (r"/search/users/([^/]+)", UserHandler),
        (r"/search/messagereport", MessageHandler),
        (r"/search/messagereport/([^/]+)", MessageHandler),
        (r"/search/messagesgroup/([^/]+)", MessagesGroupHandler),
        (r"/backoffice/user", BackofficeUserHandler),
        (r"/backoffice/user/([^/]+)", BackofficeUserHandler),
        (r"/backoffice/login", BackofficeLoginHandler),
    ], debug=True)

if __name__ == "__main__":
    print("Servidor escuchando en http://localhost:5050")
    app = make_app()
    app.listen(5050)
    IOLoop.current().start()
