import re
import os
import ast
import time

import requests
from attrdict import AttrDict

FILE_WRITE_CHUNK = 1024 * 1024

HEADERS = {
    "origin": "https://www.sdarot.pro",
}

DOWNLOAD_DIR = "/mnt/downloads/sdarot/"


def url_details(session, url):
    print("fetching page")
    page = session.get(url)
    content = page.content.decode("utf-8")

    headers = HEADERS.copy()
    headers["referer"] = url

    SID = int(re.search(r"var SID\s*=\s*'(\d+)';", content).group(1))
    Sname = ast.literal_eval(
        re.search(r"var Sname\s*=\s*(\[.*\]);", content).group(1))
    season = int(re.search(r"var season\s*=\s*'(\d+)';", content).group(1))
    episode = int(re.search(r"var episode\s*=\s*'(\d+)';", content).group(1))

    return SID, Sname, season, episode, headers

def fetch_episode(session, SID, season, episode, headers):
    while True:
        while True:
            print("fetching token")
            token_resp = session.post("https://www.sdarot.pro/ajax/watch", data={
                "preWatch": True,
                "SID": SID,
                "season": season,
                "episode": episode
            }, headers=headers)

            if token_resp.status_code == 200:
                break

        token = token_resp.content
        print("Acquired token: ", token)

        print("Waiting 30 seconds.....")
        start_time = time.time()
        while True:
            time_passed = time.time() - start_time
            yield False, time_passed
            if time_passed > 30:
                break

        print("Times up!")

        vast_resp = session.post("https://www.sdarot.pro/ajax/watch", data={
            "vast": "true"
        }, headers=headers)

        print("waited token: ", token)
        print("vast response code: ", vast_resp.status_code)

        episode_response = session.post("https://www.sdarot.pro/ajax/watch", data={
            "watch": "false",
            "token": token.decode(),
            "serie": SID,
            "season": season,
            "episode": episode,
            "type": "episode"
        }, headers=headers)

        print("response code: ", episode_response.status_code)

        if episode_response.status_code == 200:
            break

    video_details = AttrDict(episode_response.json())
    if "error" in video_details:
        raise RuntimeError(video_details.error)

    episode_id = next(iter(video_details.watch))
    episode_token = video_details.watch[episode_id]

    video_url = f"https://{video_details.url}/w/episode/" \
                f"{episode_id}/{video_details.VID}.mp4"

    video_resp = session.get(video_url, params={
        "token": episode_token,
        "time": video_details.time,
        "uid": video_details.uid
    }, stream=True)

    yield True, video_resp


def write_to_file(resp, filename):
    with open(os.path.join(DOWNLOAD_DIR, filename), "wb") as f:
        total = 0
        for chunk in resp.iter_content(FILE_WRITE_CHUNK):
            f.write(chunk)
            total += FILE_WRITE_CHUNK
            yield total


def main():
    for is_finished, state in download_url(url):
        pass


if __name__ == '__main__':
    main()
