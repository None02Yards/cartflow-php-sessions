<?php
declare(strict_types=1);

$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['http://localhost:4200', 'http://127.0.0.1:4200'];
if (in_array($origin, $allowed, true)) {
  header("Access-Control-Allow-Origin: $origin");
  header('Vary: Origin');
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('UTC');


$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'];


function jsonBody(): array {
  $raw = file_get_contents('php://input') ?: '';
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}
function respond($data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

/** (MVP) */
session_start();
$_SESSION['order'] = $_SESSION['order'] ?? [
  'id' => 'PO-'.date('Ymd-His'),
  'items' => [],
  'ts' => ['createdAtUtc' => (int)(microtime(true) * 1000)],
  'customerTimeZone' => 'Africa/Cairo',
  'shippingDays' => 3.5,
];

/** Mock catalog */
$catalog = [
  ['id'=>'p1','sku'=>'SKU-001','name'=>'Mechanical Keyboard','price'=>129.99],
  ['id'=>'p2','sku'=>'SKU-002','name'=>'Desk Mat','price'=>19.95],
  ['id'=>'p3','sku'=>'SKU-003','name'=>'USB-C Hub','price'=>39.50],
  ['id'=>'p4','sku'=>'SKU-004','name'=>'Ergo Mouse','price'=>59.00],
];

/** dynamic File logging */
const LOG_DIR  = __DIR__ . '/data';
const LOG_FILE = LOG_DIR . '/events.ndjson';
if (!is_dir(LOG_DIR)) { @mkdir(LOG_DIR, 0775, true); }

function log_event(string $type, array $payload = []): void {
  $row = [
    'ts'    => (int)(microtime(true) * 1000),   // UTC ms
    'type'  => $type,
    'path'  => $_SERVER['REQUEST_URI'] ?? '',
    'ip'    => $_SERVER['REMOTE_ADDR'] ?? '',
    'order' => $_SESSION['order'] ?? null,      
    'data'  => $payload,
  ];
  $line = json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;

  $fh = fopen(LOG_FILE, 'ab');
  if ($fh === false) return;
  try {
    if (flock($fh, LOCK_EX)) {
      fwrite($fh, $line);
      fflush($fh);
      flock($fh, LOCK_UN);
    }
  } finally {
    fclose($fh);
  }
}

/**  Routes */

if ($method === 'GET' && $path === '/api/catalog') {
  log_event('catalog_read');
  respond(['products' => $catalog]);
}

if ($method === 'GET' && $path === '/api/order') {
  log_event('order_read');
  respond($_SESSION['order']);
}

if ($method === 'POST' && $path === '/api/cart/add') {
  $b = jsonBody(); // { sku, name, unitPrice, qty }
  if (!isset($b['sku'], $b['name'], $b['unitPrice'], $b['qty'])) {
    respond(['error' => 'Missing fields: sku, name, unitPrice, qty'], 400);
  }
  $qty   = (int)$b['qty'];
  $price = (float)$b['unitPrice'];
  if ($qty < 1 || $price < 0) {
    respond(['error' => 'Invalid qty or unitPrice'], 422);
  }
  $_SESSION['order']['items'][] = [
    'sku' => (string)$b['sku'],
    'name' => (string)$b['name'],
    'qty' => $qty,
    'unitPrice' => $price,
  ];
  log_event('cart_add', $b);
  respond($_SESSION['order']);
}

if ($method === 'POST' && $path === '/api/order/pay') {
  $_SESSION['order']['ts']['paidAtUtc'] = (int)(microtime(true) * 1000);
  log_event('order_pay');
  respond($_SESSION['order']);
}

if ($method === 'POST' && $path === '/api/order/ship') {
  // 17:00 UTC cutoff; 
  $now    = new DateTime('now', new DateTimeZone('UTC'));
  $cutoff = (clone $now)->setTime(17, 0, 0);
  if ($now > $cutoff) {
    $cutoff->modify('+1 day')->setTime(17, 0, 0);
  }
  $_SESSION['order']['ts']['shippedAtUtc'] = $cutoff->getTimestamp() * 1000;
  log_event('order_ship', ['shippedAtUtc' => $_SESSION['order']['ts']['shippedAtUtc']]);
  respond($_SESSION['order']);
}

if ($method === 'POST' && $path === '/api/order/deliver') {
  $b  = jsonBody(); // { deliveredAtUtc: ms }
  $ms = isset($b['deliveredAtUtc']) ? (int)$b['deliveredAtUtc'] : 0;
  if ($ms <= 0) {
    respond(['error' => 'Bad deliveredAtUtc'], 400);
  }
  $_SESSION['order']['ts']['deliveredAtUtc'] = $ms;
  log_event('order_deliver', ['deliveredAtUtc' => $ms]);
  respond($_SESSION['order']);
}

/** GET /api/logs return last N events default 200 */
if ($method === 'GET' && $path === '/api/logs') {
  $limit = isset($_GET['limit']) ? max(1, min(5000, (int)$_GET['limit'])) : 200;
  $lines = [];
  if (is_file(LOG_FILE)) {
    $fh = fopen(LOG_FILE, 'rb');
    if ($fh) {
    
      $buffer = '';
      $pos = -1;
      $found = 0;
      fseek($fh, 0, SEEK_END);
      $filesize = ftell($fh);
      while ($found < $limit && -$pos < $filesize) {
        fseek($fh, $pos--, SEEK_END);
        $char = fgetc($fh);
        if ($char === "\n") {
          if ($buffer !== '') {
            $lines[] = strrev($buffer);
            $buffer = '';
            $found++;
          }
        } else {
          $buffer .= $char;
        }
      }
      if ($buffer !== '' && $found < $limit) $lines[] = strrev($buffer);
      fclose($fh);
    }
  }
  $events = array_reverse(
    array_values(
      array_filter(
        array_map('json_decode', $lines, array_fill(0, count($lines), true))
      )
    )
  );
  respond(['count' => count($events), 'events' => $events]);
}

/** POST /api/export */
if ($method === 'POST' && $path === '/api/export') {
  $file = LOG_DIR . '/order-' . ($_SESSION['order']['id'] ?? 'unknown') . '.json';
  $ok   = (bool)file_put_contents(
    $file,
    json_encode($_SESSION['order'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
  );
  log_event('order_export', ['file' => basename($file), 'ok' => $ok]);
  respond(['ok' => $ok, 'file' => basename($file)]);
}

/** 404 */
respond(['error' => 'Not found', 'path' => $path], 404);
