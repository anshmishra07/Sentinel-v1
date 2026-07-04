import time
import socket
import platform
import psutil
import socketio
import uuid
import os

# Config
BACKEND_URL = os.getenv('SENTINEL_BACKEND_URL', 'http://localhost:4000')
POLL_INTERVAL = int(os.getenv('SENTINEL_POLL_INTERVAL', '3'))
DEVICE_TYPE = os.getenv('SENTINEL_DEVICE_TYPE', 'remote-server')
CONNECT_TIMEOUT = int(os.getenv('SENTINEL_CONNECT_TIMEOUT', '10'))

sio = socketio.Client(request_timeout=CONNECT_TIMEOUT)
last_net = None
last_net_at = None

DEVICE_ID = str(uuid.uuid5(uuid.NAMESPACE_DNS, socket.gethostname()))

def get_host_metrics():
    global last_net, last_net_at

    mem = psutil.virtual_memory()
    disk = psutil.disk_usage(os.path.abspath(os.sep))
    net = psutil.net_io_counters()
    now = time.time()

    rx_kbs = 0
    tx_kbs = 0
    if last_net and last_net_at:
        elapsed = max(now - last_net_at, 1)
        rx_kbs = round((net.bytes_recv - last_net.bytes_recv) / 1024 / elapsed, 2)
        tx_kbs = round((net.bytes_sent - last_net.bytes_sent) / 1024 / elapsed, 2)

    last_net = net
    last_net_at = now

    processes = []
    proc_iter = psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent'])
    while True:
        try:
            proc = next(proc_iter)
            info = proc.info
            processes.append({
                'pid': info.get('pid'),
                'name': info.get('name') or 'Unknown',
                'cpuPercent': round(info.get('cpu_percent') or 0, 2),
                'memoryPercent': round(info.get('memory_percent') or 0, 2)
            })
        except StopIteration:
            break
        except (psutil.NoSuchProcess, psutil.AccessDenied, PermissionError, OSError):
            continue

    top_processes = sorted(
        processes,
        key=lambda p: (p['cpuPercent'], p['memoryPercent']),
        reverse=True
    )[:8]
    
    return {
        'cpu': {
            'loadPercent': psutil.cpu_percent(interval=None),
            'cores': psutil.cpu_count(logical=False),
            'logicalCores': psutil.cpu_count(logical=True),
            'perCorePercent': psutil.cpu_percent(interval=None, percpu=True)
        },
        'memory': {
            'usedPercent': mem.percent,
            'usedGB': round(mem.used / (1024**3), 2),
            'availableGB': round(mem.available / (1024**3), 2),
            'totalGB': round(mem.total / (1024**3), 2)
        },
        'disk': {
            'usedPercent': disk.percent,
            'usedGB': round(disk.used / (1024**3), 2),
            'freeGB': round(disk.free / (1024**3), 2),
            'totalGB': round(disk.total / (1024**3), 2),
            'mount': os.path.abspath(os.sep)
        },
        'network': {
            'rxKBs': rx_kbs,
            'txKBs': tx_kbs,
            'totalRxMB': round(net.bytes_recv / (1024**2), 2),
            'totalTxMB': round(net.bytes_sent / (1024**2), 2),
            'iface': 'all'
        },
        'processes': top_processes,
        'uptimeSeconds': int(time.time() - psutil.boot_time())
    }

@sio.event
def connect():
    print("Connected to backend")
    # Register device
    sio.emit('register_device', {
        'deviceId': DEVICE_ID,
        'hostname': socket.gethostname(),
        'deviceType': DEVICE_TYPE,
        'os': platform.system(),
        'ip_address': socket.gethostbyname(socket.gethostname())
    })

@sio.event
def disconnect():
    print("Disconnected from backend")

if __name__ == '__main__':
    print("Starting agent...")
    print(f"Backend URL: {BACKEND_URL}")
    while True:
        try:
            if not sio.connected:
                sio.connect(BACKEND_URL, wait_timeout=CONNECT_TIMEOUT)
            
            metrics = get_host_metrics()
            
            payload = {
                'deviceId': DEVICE_ID,
                'timestamp': int(time.time() * 1000),
                'metrics': metrics
            }
            sio.emit('telemetry', payload)
            
        except KeyboardInterrupt:
            print("Stopping agent...")
            if sio.connected:
                sio.disconnect()
            break
        except Exception as e:
            print("Connection failed, retrying...", e)
        
        time.sleep(POLL_INTERVAL)
