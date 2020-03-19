import os
import json
import time
import hashlib
from urllib.parse import urlencode

import requests
from celery import Celery, shared_task

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

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

from .main import (url_details, fetch_episode, write_to_file, create_folder)

def enable_download_headless(browser,download_dir):
    browser.command_executor._commands["send_command"] = ("POST", '/session/$sessionId/chromium/send_command')
    params = {'cmd':'Page.setDownloadBehavior', 'params': {'behavior': 'allow', 'downloadPath': download_dir}}
    browser.execute("send_command", params)


@shared_task(name="start_download", bind=True)
def start_download(self, details, url, hashed_url, download_dir, userid,
                   update_url):
    req_session = requests.Session()
    SID, Sname, season, episode, headers, base_url = details
    print("downloading", url)
    print("Update Url", update_url)
    try:
        create_folder(SID, Sname[1], download_dir)
        final_state = None
        for is_finished, state in fetch_episode(req_session, SID, season,
                                                episode, headers,
                                                base_url):
            if is_finished:
                final_state = state
                break

            time.sleep(1)
            requests.post(update_url, json={
                "hash": hashed_url,
                "state": "loading",
                "details": round(state),
                "userid": userid
            })

        print("finished waiting! lets goooo")

        response, session, video_url, params = final_state
        response.raise_for_status()

        for chunk, speed in write_to_file(response,
                                   f"{Sname[1]}_{SID}",
                                   "{}_S{:02d}E{:02d}.mp4".format(
                                       Sname[1],
                                       season,
                                       episode
                                   ),
                                   download_dir):
            requests.post(update_url, json={
                "hash": hashed_url,
                "state": "downloading",
                "details": {
                    "speed": speed,
                    "current": chunk,
                    "total": int(response.headers['Content-length'])
                },
                "userid": userid
            })

        requests.post(update_url, json={
            "hash": hashed_url,
            "state": "download_complete",
            "userid": userid
        })

    except Exception as e:
        requests.post(update_url, json={
            "error": str(e),
            "hash": hashed_url,
            "state": "error",
            "userid": userid
        })
        raise RuntimeError from e

