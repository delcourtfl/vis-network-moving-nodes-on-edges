import http.server
import socketserver
import signal

# Define the signal handler
def signal_handler(signal, frame):
    print("Stopping server...")
    httpd.server_close()

# Set up the signal handler for Ctrl+C
signal.signal(signal.SIGINT, signal_handler)

PORT = 8000

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
    ".js": "application/javascript",
})

httpd = socketserver.TCPServer(("", PORT), Handler)

print("Serving at port", PORT)
print(Handler.extensions_map[".js"])

# Start the server
httpd.serve_forever()