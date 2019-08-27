import gevent
from gevent import monkey
monkey.patch_all(subprocess=True)

import json
import time
import hashlib

from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from flask_socketio import join_room, leave_room
from flask import render_template, copy_current_request_context, request

from main import download_url

app = Flask(__name__)
app.debug = True
socketio = SocketIO(app, debug=True, async_mode="gevent")


ready_to_download = {}

@socketio.on('connect')
def on_connect():
    emit('set_sid', {'sid': request.sid})


@socketio.on('changed_sid')
def changed_sid():
    emit('event', {'data': 'got it!'})

@socketio.on('join')
def on_join(data):
    room = data['room']
    join_room(room)
    emit("event", ' has entered the room.', room=room)


@socketio.on('leave')
def on_leave(data):
    room = data['room']
    leave_room(room)
    emit("event", ' has left the room.', room=room)

@app.route("/api/<room_id>/download_url", methods=["POST"])
def download(room_id):
    @copy_current_request_context
    def start_download(room, url):
        print("downloading", url)
        try:
            final_state = None
            for is_finished, state in download_url(url):
                if is_finished:
                    final_state = state
                    break

                emit("event", state, namespace="/", room=room)
                gevent.sleep(1)

            print("finished waiting! lets goooo")
            hashed_url = hashlib.md5(url.encode())
            ready_to_download = {
                hashed_url: final_state
            }
            emit("event", {
                "ready": True,
                "hash": hashed_url
            }, namespace="/", room=room)


        except RuntimeError as e:
            emit("event", str(e), namespace="/", room=room)


    content = request.json
    url = content["url"]
    socketio.start_background_task(start_download, room=room_id, url=url)
    return app.response_class(
        response={},
        status=201,
        mimetype='application/json'
    )


@app.route("/")
def hello():
    return render_template('index.html')



if __name__ == "__main__":
    socketio.run(app=app, debug=True, host="0.0.0.0", port=5002)
