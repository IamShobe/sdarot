import os
import json
import time
import hashlib

import requests
import yaml
from attrdict import AttrDict
from celery import Celery

import redis

from flask import (Flask,
                   request,
                   render_template,
                   session,
                   redirect,
                   url_for,
                   jsonify,
                   current_app)
from flask_socketio import (
    SocketIO,
    emit,
    disconnect,
    join_room,
    leave_room
)

from .main import (url_details, fetch_episode, write_to_file, create_folder,
                   Metadata)
from .tasks import start_download

app = Flask(__name__)
app.clients = {}
redis_server = os.environ.get("REDIS_SERVER")
rabbit_server = os.environ.get("RABBIT_SERVER")
conn = redis.Redis(redis_server)
app.debug = True
app.config['SECRET_KEY'] = 'top-secret!'

ROOT = os.path.dirname(os.path.abspath(__file__))

# Celery configuration
RABBIT = f'amqp://{str(os.environ.get("USERNAME"))}:' \
         f'{str(os.environ.get("PASSWORD"))}@{rabbit_server}:5672/sdarot'
app.config.update(
    broker_url=RABBIT,
    result_backend=RABBIT
)

socketio = SocketIO(app, debug=True, async_mode='gevent')


def get_config():
    with open(os.path.join(ROOT, "settings.yaml")) as f:
        return AttrDict(yaml.safe_load(f))

def get_metadata_dir():
    settings = get_config()
    return settings.config.metadataDir


# Initialize Celery
def make_celery(app):
    celery = Celery(
        app.import_name,
        backend=app.config['result_backend'],
        broker=app.config['broker_url']
    )
    celery.conf.update(app.config)

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery


celery = make_celery(app)


def update(hash, key, value):
    d = json.loads(conn.get(f"session_{hash}"))
    d[key] = value
    conn.set(f"session_{hash}", json.dumps(d))


@app.route('/api/clients', methods=['GET'])
def clients():
    return jsonify({'clients': app.clients.keys()})


@app.route('/api/config', methods=['GET'])
def config():
    with open(os.path.join(ROOT, "settings.yaml")) as f:
        return jsonify(yaml.safe_load(f))


@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'GET':
        return render_template('index.html')

    return redirect(url_for('index'))


@app.route("/api/details/<hash>")
def details(hash):
    if conn.exists(f"session_{hash}"):
        return jsonify(json.loads(conn.get(f"session_{hash}"))), 200

    return jsonify({"error": "invalid hash given!"}), 400


@app.route("/api/metadata", methods=["PUT"])
def update_metadata():
    try:
        url = request.args.get('url')
        data = Metadata(url)
        metadata_dir = get_metadata_dir()
        os.makedirs(metadata_dir, exist_ok=True)
        data_file = os.path.join(metadata_dir, data.config_name)
        dump = data.dump
        with open(data_file, "w") as f:
            yaml.safe_dump(data.dump, f)

        return jsonify(dump)

    except RuntimeError as e:
        return str(e), 400


@app.route("/api/metadata")
def get_metadata():
    metadata_dir = get_metadata_dir()
    try:
        url = request.args.get('url')
        if url is None:
            name = request.args.get('name')

            if name is None:
                return "You must specify url or name args", 400

            data_file = os.path.join(metadata_dir, Metadata.dump_file(name))

        else:
            data = Metadata(url)
            data_file = os.path.join(metadata_dir, data.config_name)

        if os.path.exists(data_file):
            with open(data_file) as f:
                return jsonify(yaml.safe_load(f))

        return "Not found", 404

    except RuntimeError as e:
        return str(e), 400


@app.route("/api/get_hash", methods=["POST"])
def get_hash():
    content = request.json
    url = content['url'].encode()
    return hashlib.md5(url).hexdigest()


@app.route("/api/<room_id>/download_url", methods=["POST"])
def download_url(room_id):
    content = request.json
    url = content['url'].encode()
    userid = room_id

    hashed_url = hashlib.md5(url).hexdigest()
    print("hashed_url", hashed_url)
    try:
        details = url_details(url)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    conn.set(f"session_{hashed_url}", json.dumps({
        "details": details._asdict(),
        "state": "fetching"
    }))

    emit("event", {
        "hash": hashed_url,
        "state": "fetching",
        "details": details._asdict()
    }, namespace="/", room=userid)
    update(hashed_url, "state", "pending")

    emit("event", {
        "hash": hashed_url,
        "details": details._asdict(),
        "state": "pending"
    }, namespace="/", room=userid)

    settings = get_config()

    task = start_download.delay(details, url.decode(), hashed_url,
                                settings.config.downloadPath, userid,
                                url_for('event', _external=True))
    time.sleep(3)
    return jsonify({"hash": hashed_url}), 201


@app.route('/api/event/', methods=['POST'])
def event():
    userid = request.json['userid']
    data = request.json
    hashed_url = request.json['hash']
    state = request.json['state']
    update(hashed_url, "state", state)
    print(userid)
    emit("event", data, room=userid, namespace="/")
    return "ok"


@socketio.on('status')
def events_message(message):
    emit('status', {'status': message['status']})


@socketio.on('disconnect request')
def disconnect_request():
    emit('status', {'status': 'Disconnected!'})
    disconnect()


@socketio.on('get_sid')
def events_connect():
    userid = request.sid
    session['userid'] = userid
    current_app.clients[userid] = request.namespace
    print(f"connected - {userid}")
    emit('set_sid', {'sid': userid})
    emit('status', {'status': 'Connected user', 'userid': userid})


@socketio.on('disconnect')
def events_disconnect():
    if 'userid' in session:
        del current_app.clients[session['userid']]
        print('Client %s disconnected' % session['userid'])


@socketio.on('join')
def on_join(data):
    room = data['room']
    join_room(room)
    emit("event", f'Entered the room: {room}', room=room)


@socketio.on('leave')
def on_leave(data):
    room = data['room']
    leave_room(room)
    emit("event", f'Left the room: {room}', room=room)


if __name__ == '__main__':
    # app.run(debug=True)
    socketio.run(app, host="0.0.0.0", port=5002)
