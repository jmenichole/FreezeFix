#!/usr/bin/env python3
"""
ADHD Flow Widget — Background Activity Tracker & Screen Sidecar
Copyright © 2026 jmenichole (J Chapman). All rights reserved.
Author: jmenichole <j.chapman7@yahoo.com>
GitHub: https://github.com/jmenichole

Unauthorized copying, distribution, or modification of this software is prohibited.
This software is proprietary and confidential.
"""

/* tracker.py — Local background activity tracker & screen capture sidecar */
import time
import json
import base64
import io
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request

try:
    from PIL import ImageGrab
except ImportError:
    ImageGrab = None

PORT = 8999

class TrackerHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()

        if self.path == '/capture':
            if ImageGrab:
                img = ImageGrab.grab()
                # Resize slightly for faster API transmission
                img.thumbnail((1280, 720))
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=75)
                b64_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
                res = json.dumps({'status': 'ok', 'image': b64_str}).encode('utf-8')
            else:
                res = json.dumps({'status': 'error', 'message': 'Pillow library not installed'}).encode('utf-8')
            self.wfile.write(res)
        elif self.path.startswith('/github'):
            # Fetch recent user activity from GitHub API if username provided
            query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            user = query.get('user', [''])[0]
            if user:
                try:
                    req = urllib.request.Request(f'https://api.github.com/users/{user}/events/public', headers={'User-Agent': 'ADHD-Widget'})
                    with urllib.request.urlopen(req) as resp:
                        events = json.loads(resp.read().decode())
                        self.wfile.write(json.dumps({'status': 'ok', 'events': events[:10]}).encode('utf-8'))
                        return
                except Exception as e:
                    self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode('utf-8'))
                    return
            self.wfile.write(json.dumps({'status': 'error', 'message': 'No user specified'}).encode('utf-8'))
        else:
            self.wfile.write(json.dumps({'status': 'ok', 'service': 'ADHD Activity Tracker'}).encode('utf-8'))

def run():
    print(f"🚀 ADHD Local Activity & Vision Tracker listening on http://localhost:{PORT}")
    httpd = HTTPServer(('localhost', PORT), TrackerHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping tracker...")

if __name__ == '__main__':
    run()
