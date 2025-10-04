import json
from base import counter_collection
from bson import json_util

def get_next_id(catalog):
    result = counter_collection.find_one_and_update(
        {'_id': catalog},
        {'$inc': {'seq': 1}},
        upsert=True,
        return_document=True
    )
    return result['seq']

def build_projection(output_model_raw):
    if not output_model_raw:
        return None
    try:
        model = json.loads(output_model_raw)
        model['_id'] = False
        model['item_id'] = True
        model['timestamp'] = True
        return model
    except Exception:
        return None

def safe_json(obj):
    return json.loads(json_util.dumps(obj))
