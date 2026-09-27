#!/usr/bin/env python3
"""Serve Dither Lab on http://localhost:4560 — localhost only, stdlib only.

    python3 tools/serve.py            # serve (Ctrl-C to stop)
    python3 tools/serve.py --open     # …and open it in the browser
    python3 tools/serve.py --stop     # stop a server started by the launcher

Safe to run twice: if Dither Lab is already being served on the port it just says so.
"""
import argparse
import http.server
import os
import signal
import sys
import threading
import time
import urllib.request
import webbrowser

WEB = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web"))
PIDFILE = os.path.join(os.environ.get("TMPDIR", "/tmp"), "dither-lab-server.pid")
last_hit = time.monotonic()


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".json": "application/json",
        ".webmanifest": "application/manifest+json",
        ".svg": "image/svg+xml",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB, **kwargs)

    def end_headers(self):
        # revalidate every load, so edits show up without cache-busting
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        global last_hit
        last_hit = time.monotonic()
        super().do_GET()

    def log_message(self, fmt, *args):
        if os.environ.get("DITHERLAB_VERBOSE"):
            super().log_message(fmt, *args)


def already_serving(url):
    try:
        with urllib.request.urlopen(url + "manifest.json", timeout=1) as r:
            return b"Dither Lab" in r.read()
    except Exception:
        return False


def stop():
    try:
        pid = int(open(PIDFILE).read().strip())
        os.kill(pid, signal.SIGTERM)
        print(f"stopped Dither Lab server (pid {pid})")
    except (OSError, ValueError):
        print("no Dither Lab server running from the launcher")
    try:
        os.remove(PIDFILE)
    except OSError:
        pass


def main():
    ap = argparse.ArgumentParser(description="Serve Dither Lab locally.")
    ap.add_argument("--port", type=int, default=4560)
    ap.add_argument("--open", action="store_true", help="open the app in the default browser")
    ap.add_argument("--idle-hours", type=float, default=12, help="exit after this long without requests (0 = never)")
    ap.add_argument("--stop", action="store_true", help="stop the background server")
    args = ap.parse_args()
    if args.stop:
        return stop()

    url = f"http://localhost:{args.port}/"
    if already_serving(url):
        print(f"Dither Lab is already running at {url}")
        if args.open:
            webbrowser.open(url)
        return
    try:
        server = http.server.ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    except OSError as err:
        sys.exit(f"port {args.port} is busy ({err.strerror}); try --port 4570")

    with open(PIDFILE, "w") as f:
        f.write(str(os.getpid()))
    if args.idle_hours > 0:
        def watchdog():
            while True:
                time.sleep(60)
                if time.monotonic() - last_hit > args.idle_hours * 3600:
                    server.shutdown()
                    return
        threading.Thread(target=watchdog, daemon=True).start()

    print(f"Dither Lab → {url}   (Ctrl-C to stop)")
    if args.open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        try:
            if open(PIDFILE).read().strip() == str(os.getpid()):
                os.remove(PIDFILE)
        except OSError:
            pass


if __name__ == "__main__":
    main()
