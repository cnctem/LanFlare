import * as os from "os";

const VIRTUAL_IFACE_PATTERN =
  /virtual|vmware|vbox|hyper-v|wsl|loopback|docker|vethernet|utun|tun|tap|vpn|pseudo|dummy/i;

/** Return all non-internal IPv4 addresses sorted by preference (physical LAN first). */
function getCandidateIPs(): os.NetworkInterfaceInfo[] {
  const results: os.NetworkInterfaceInfo[] = [];
  const interfaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    if (VIRTUAL_IFACE_PATTERN.test(name)) continue;
    for (const iface of addrs) {
      if (iface.family === "IPv4" && !iface.internal) {
        results.push(iface);
      }
    }
  }
  // Sort: 192.168.x.x > 10.x.x.x > 172.16-31.x.x > others
  results.sort((a, b) => lanPriority(a.address) - lanPriority(b.address));
  return results;
}

function lanPriority(ip: string): number {
  if (/^192\.168\./.test(ip)) return 0;
  if (/^10\./.test(ip)) return 1;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 2;
  return 3;
}

export function getLocalIP(): string {
  const candidates = getCandidateIPs();
  return candidates.length > 0 ? candidates[0].address : "127.0.0.1";
}

export function getBroadcastAddress(): string {
  const candidates = getCandidateIPs();
  if (candidates.length > 0) {
    const iface = candidates[0];
    const ip = iface.address.split(".").map(Number);
    const mask = iface.netmask.split(".").map(Number);
    const broadcast = ip.map((octet, i) => octet | (~mask[i] & 255));
    return broadcast.join(".");
  }
  return "255.255.255.255";
}

export function getDeviceName(): string {
  return os.hostname();
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
