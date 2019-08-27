from gevent import monkey
monkey.patch_all()
from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from flask_socketio import join_room, leave_room
from flask import render_template, copy_current_request_context, request

from main import download_url

app = Flask(__name__)
app.debug = True
socketio = SocketIO(app, debug=True, async_mode="gevent")


@app.route("/api/download_url", methods=["POST"])
def download():
    url = request.form.get('url')
    socketio.start_background_task(download_url, url=url)
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
