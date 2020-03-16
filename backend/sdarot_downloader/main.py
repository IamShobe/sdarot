import re
import os
import ast
import time

import requests

from PIL import Image
from attrdict import AttrDict

FILE_WRITE_CHUNK = 1024 * 1024

URL_REGEX = r"(?P<base_url>.*?://.*?)/.*"

DOWNLOAD_DIR = "/mnt/downloads/sdarot/"

WINDOWS_DIR = "E:/sdarot"


TEMPLATE = "[.ShellClassInfo]\r\n" \
           "ConfirmFileOp=0\r\n" \
           "NoSharing=1\r\n" \
           "IconResource=cover.ico,0\r\n"

def url_details(session, url):
    print("fetching page")
    page = session.get(url)
    content = page.content.decode("utf-8")
    match = re.match(URL_REGEX, url.decode())
    base_url = match.group("base_url")
    print(f"base_url: {base_url}")
    headers = {
        "origin": base_url,
        "referer": url
    }

    SID = int(re.search(r"var SID\s*=\s*'(\d+)';", content).group(1))
    Sname = ast.literal_eval(
        re.search(r"var Sname\s*=\s*(\[.*\]);", content).group(1))
    season = int(re.search(r"var season\s*=\s*'(\d+)';", content).group(1))
    episode = int(re.search(r"var episode\s*=\s*'(\d+)';", content).group(1))

    return SID, Sname, season, episode, headers, base_url

def fetch_episode(session, SID, season, episode, headers, base_url):
    while True:
        while True:
            print("fetching token")
            token_resp = session.post(f"{base_url}/ajax/watch", data={
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

        vast_resp = session.post(f"{base_url}/ajax/watch", data={
            "vast": "true"
        }, headers=headers)

        print("waited token: ", token)
        print("vast response code: ", vast_resp.status_code)

        episode_response = session.post(f"{base_url}/ajax/watch", data={
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

def create_folder(sid, folder_name):
    base_dir = os.path.join(DOWNLOAD_DIR, folder_name)
    if not os.path.exists(base_dir):
        resp = requests.get(f"https://static.sdarot.pro/series/{sid}.jpg")
        os.makedirs(base_dir)
        with open(os.path.join(base_dir, "cover.jpg"), "wb") as f:
            f.write(resp.content)

        img = Image.open(os.path.join(base_dir, "cover.jpg"))
        width, height = img.size

        x0 = width // 2 - 128
        x1 = width // 2 + 128
        y0 = height // 2 - 128
        y1 = height // 2 + 128

        size_tuples = [(256, 256),
                       (128, 128),
                       (64, 64),
                       (48, 48),
                       (32, 32),
                       (24, 24),
                       (16, 16)]

        imgc = img.crop((x0, y0, x1, y1))
        imgc.save(os.path.join(base_dir, "cover.ico"), sizes=size_tuples)

        with open(os.path.join(base_dir, "Desktop.ini"), "wb") as f:
            f.write(TEMPLATE.encode())


def write_to_file(resp, folder_name, filename):
    base_dir = os.path.join(DOWNLOAD_DIR, folder_name)
    with open(os.path.join(base_dir, filename), "wb") as f:
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
