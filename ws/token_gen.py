import jwt
token = jwt.encode({'user': 'admin'}, '12345678', algorithm='HS256')
print(token)
