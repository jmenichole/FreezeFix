#!/usr/bin/env python3
"""
ADHD Flow Widget — Background Activity Tracker & Screen Sidecar
Copyright © 2026 jmenichole (J Chapman). All rights reserved.
Author: jmenichole <j.chapman7@yahoo.com>
GitHub: https://github.com/jmenichole

Unauthorized copying, distribution, or modification of this software is prohibited.
This software is proprietary and confidential.
"""

# tracker.py — Local background activity tracker & screen capture sidecar
import os
import time
import json
import base64
import io
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.parse

try:
    from PIL import ImageGrab
except ImportError:
    ImageGrab = None

HOST = '127.0.0.1'
PORT = 8999

# Shared secret supplied by the Electron main process (main.js). When set, sensitive
# endpoints require a matching X-FreezeFix-Token header. When unset (manual
# `python tracker.py` during development), those endpoints stay reachable but a
# warning is logged so the operator knows the sidecar is unauthenticated.
TOKEN = os.environ.get('FREEZEFIX_TRACKER_TOKEN', '')


class TrackerHandler(BaseHTTPRequestHandler):
    def _app_origin(self):
        """Return the request Origin if it belongs to the Electron app, else None.

        Electron file:// pages send `Origin: null` (or no Origin). Real websites
        send an http(s):// origin — those must never be able to read screen
        captures, so we refuse to echo an Access-Control-Allow-Origin for them.
        """
        origin = self.headers.get('Origin')
        if origin is None or origin == 'null' or origin.startswith('file://'):
            return origin or 'null'
        return None

    def _send_cors(self, allow_origin):
        if allow_origin is not None:
            self.send_header('Access-Control-Allow-Origin', allow_origin)
            self.send_header('Vary', 'Origin')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-FreezeFix-Token')

    def _token_ok(self):
        if not TOKEN:
            return True  # dev mode: no token configured
        return self.headers.get('X-FreezeFix-Token') == TOKEN

    def _write_json(self, code, payload, allow_origin):
        self.send_response(code)
        self._send_cors(allow_origin)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode('utf-8'))

    def do_OPTIONS(self):
        allow_origin = self._app_origin()
        self.send_response(200)
        self._send_cors(allow_origin)
        self.end_headers()

    def do_GET(self):
        allow_origin = self._app_origin()

        # Sensitive endpoints: only the Electron app origin + a valid token.
        if self.path == '/capture' or self.path.startswith('/github'):
            if allow_origin is None or not self._token_ok():
                self._write_json(403, {'status': 'error', 'message': 'Forbidden'}, allow_origin)
                return

        if self.path == '/capture':
            if ImageGrab:
                img = ImageGrab.grab()
                # Resize slightly for faster API transmission
                img.thumbnail((1280, 720))
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=75)
                b64_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
                self._write_json(200, {'status': 'ok', 'image': b64_str}, allow_origin)
            else:
                self._write_json(200, {'status': 'error', 'message': 'Pillow library not installed'}, allow_origin)
        elif self.path.startswith('/github'):
            # Fetch recent user activity from GitHub API if username provided
            query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            user = query.get('user', [''])[0]
            if user:
                try:
                    req = urllib.request.Request(f'https://api.github.com/users/{user}/events/public', headers={'User-Agent': 'ADHD-Widget'})
                    with urllib.request.urlopen(req) as resp:
                        events = json.loads(resp.read().decode())
                        self._write_json(200, {'status': 'ok', 'events': events[:10]}, allow_origin)
                        return
                except Exception as e:
                    self._write_json(200, {'status': 'error', 'message': str(e)}, allow_origin)
                    return
            self._write_json(200, {'status': 'error', 'message': 'No user specified'}, allow_origin)
        else:
            # Non-sensitive status endpoint (used for liveness checks).
            self._write_json(200, {'status': 'ok', 'service': 'ADHD Activity Tracker'}, allow_origin)

def run():
    print(f"ADHD Local Activity & Vision Tracker listening on http://{HOST}:{PORT}")
    if not TOKEN:
        print("WARNING: FREEZEFIX_TRACKER_TOKEN not set — sensitive endpoints are "
              "unauthenticated (dev mode). Launch via the FreezeFix app for token auth.")
    httpd = HTTPServer((HOST, PORT), TrackerHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping tracker...")

if __name__ == '__main__':
    run()
