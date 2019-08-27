import gevent
from gevent import lock
from gevent import monkey

monkey.patch_all(subprocess=True)

import json
import time
import hashlib

import requests
from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from flask_socketio import join_room, leave_room
from flask import render_template, copy_current_request_context, request

from main import url_details, fetch_episode, write_to_file

app = Flask(__name__)
app.debug = True
socketio = SocketIO(app, debug=True, async_mode="gevent")


ready_to_download = {}
MAX_WORKERS = 4

workers = lock.BoundedSemaphore(MAX_WORKERS)


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


@app.route("/api/details/<hash>")
def details(hash):
    if hash in ready_to_download:
        return app.response_class(
            response=json.dumps(ready_to_download[hash]),
            status=200,
            mimetype='application/json'
        )

    return app.response_class(
        response=json.dumps({"error": "invalid hash given!"}),
        status=400,
        mimetype='application/json'
    )

@app.route("/api/<room_id>/download_url", methods=["POST"])
def download(room_id):
    session = requests.Session()
    content = request.json
    url = content["url"].encode()

    hashed_url = hashlib.md5(url).hexdigest()
    SID, Sname, season, episode, headers = url_details(session, url)
    ready_to_download[hashed_url] = {
        "name": Sname,
        "season": season,
        "episode": episode,
        "state": "fetching"
    }

    @copy_current_request_context
    def start_download(room, url):
        print("downloading", url)
        try:
            emit("event", {
                "hash": hashed_url,
                "state": "fetching",
                "details": {
                    "name": Sname,
                    "season": season,
                    "episode": episode
                }
            },
                 namespace="/", room=room)
            ready_to_download[hashed_url]["state"] = "pending"
            emit("event", {
                "hash": hashed_url,
                "state": "pending"
            },
                 namespace="/", room=room)

            with workers:
                ready_to_download[hashed_url]["state"] = "loading"
                final_state = None
                for is_finished, state in fetch_episode(session, SID, season,
                                                        episode, headers):
                    if is_finished:
                        final_state = state
                        break

                    gevent.sleep(1)
                    emit("event", {
                        "hash": hashed_url,
                        "state": "loading",
                        "details": round(state)
                    },
                         namespace="/", room=room)

                print("finished waiting! lets goooo")

                ready_to_download[hashed_url]["state"] = "downloading"
                for chunk in write_to_file(final_state,
                                           "{}_S{:02d}E{:02d}.mp4".format(
                                               Sname[1],
                                               season,
                                               episode
                                           )):
                    emit("event", {
                        "hash": hashed_url,
                        "state": "downloading",
                        "details": {
                            "current": chunk,
                            "total": int(final_state.headers['Content-length'])
                        }
                    }, namespace="/", room=room)

                emit("event", {
                    "hash": hashed_url,
                    "state": "download_complete",
                }, namespace="/", room=room)
                ready_to_download[hashed_url]["state"] = "download_complete"


        except RuntimeError as e:
            emit("event", { "error": str(e)}, namespace="/", room=room)
            raise RuntimeError from e



    socketio.start_background_task(start_download, room=room_id, url=url)
    return app.response_class(
        response=json.dumps({
            "hash": hashed_url
        }),
        status=201,
        mimetype='application/json'
    )


@app.route("/")
def hello():
    return render_template('index.html')


if __name__ == "__main__":
    socketio.run(app=app, debug=True, host="0.0.0.0", port=5002)
