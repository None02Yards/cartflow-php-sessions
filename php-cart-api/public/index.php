<?php
declare(strict_types=1);

/**
 *  allow Angular dev server (localhost/127.0.0.1:4200) 
 */
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

/** (MVP state) */

session_start();
$_SESSION['order'] = $_SESSION['order'] ?? [
  'id' => 'PO-'.date('Ymd-His'),
  'items' => [],
  'ts' => ['createdAtUtc' => (int)(microtime(true) * 1000)],
  'customerTimeZone' => 'Africa/Cairo',
  'shippingDays' => 3.5,
];
$_SESSION['user'] = $_SESSION['user'] ?? null; // { id, email } or null


$catalog = [
  ['id'=>'p1','sku'=>'SKU-001','name'=>'Mechanical Keyboard','price'=>129.99],
  ['id'=>'p2','sku'=>'SKU-002','name'=>'Desk Mat','price'=>19.95],
  ['id'=>'p3','sku'=>'SKU-003','name'=>'USB-C Hub','price'=>39.50],
  ['id'=>'p4','sku'=>'SKU-004','name'=>'Ergo Mouse','price'=>59.00],
  ['id'=>'p1','sku'=>'SKU-001','name'=>'Mechanical Keyboard','price'=>129.99],
  ['id'=>'p2','sku'=>'SKU-002','name'=>'Desk Mat','price'=>19.95],
  ['id'=>'p3','sku'=>'SKU-003','name'=>'USB-C Hub','price'=>39.50],
  ['id'=>'p4','sku'=>'SKU-004','name'=>'Ergo Mouse','price'=>59.00],
];

/** store Logging to NDJSON */
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
    'user'  => $_SESSION['user'] ?? null,
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

/** for anyone stops by here this is only Minimal file-backed user store */
const USERS_FILE = LOG_DIR . '/users.json';

function load_users(): array {
  if (!is_file(USERS_FILE)) return [];
  $json = file_get_contents(USERS_FILE);
  $arr = json_decode($json, true);
  return is_array($arr) ? $arr : [];
}
function save_users(array $users): bool {
  return (bool)file_put_contents(
    USERS_FILE,
    json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
  );
}
function user_by_email(array $users, string $email): ?array {
  foreach ($users as $u) {
    if (strcasecmp($u['email'], $email) === 0) return $u;
  }
  return null;
}
function new_user_id(): string { return 'U-' . bin2hex(random_bytes(8)); }

/** Auth */
function require_auth(): void {
  if (!isset($_SESSION['user']['id'])) {
    respond(['error' => 'Auth required'], 401);
  }
}

/* Routes!! */

if ($method === 'GET' && $path === '/api/catalog') {
  log_event('catalog_read');
  respond(['products' => $catalog]);
}

/** signup */
if ($method === 'POST' && $path === '/api/signup') {
  $b = jsonBody();
  $email = trim(strtolower((string)($b['email'] ?? '')));
  $password = (string)($b['password'] ?? '');

  if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
    respond(['error' => 'Invalid email or password too short (min 8)'], 422);
  }

  $users = load_users();
  if (user_by_email($users, $email)) {
    respond(['error' => 'Email already registered'], 409);
  }

  $user = [
    'id' => new_user_id(),
    'email' => $email,
    'hash' => password_hash($password, PASSWORD_DEFAULT),
    'createdAtUtc' => (int)(microtime(true) * 1000),
  ];
  $users[] = $user;
  if (!save_users($users)) {
    respond(['error' => 'Failed to save user'], 500);
  }

  session_regenerate_id(true);
  $_SESSION['user'] = ['id' => $user['id'], 'email' => $user['email']];
  log_event('auth_signup', ['user' => $_SESSION['user']]);
  respond(['ok' => true, 'user' => $_SESSION['user']]);
}

/* login */
if ($method === 'POST' && $path === '/api/login') {
  $b = jsonBody();
  $email = trim(strtolower((string)($b['email'] ?? '')));
  $password = (string)($b['password'] ?? '');

  $users = load_users();
  $u = user_by_email($users, $email);
  if (!$u || !password_verify($password, $u['hash'])) {
    respond(['error' => 'Invalid credentials'], 401);
  }

  session_regenerate_id(true);
  $_SESSION['user'] = ['id' => $u['id'], 'email' => $u['email']];
  log_event('auth_login', ['user' => $_SESSION['user']]);
  respond(['ok' => true, 'user' => $_SESSION['user']]);
}

/** clears user only */
if ($method === 'POST' && $path === '/api/logout') {
  log_event('auth_logout', ['user' => $_SESSION['user']]);
  $_SESSION['user'] = null;

  //  to clear cart on logout:
  $_SESSION['order'] = [
    'id' => 'PO-'.date('Ymd-His'),
    'items' => [],
    'ts' => ['createdAtUtc' => (int)(microtime(true) * 1000)],
    'customerTimeZone' => 'Africa/Cairo',
    'shippingDays' => 3.5,
  ];

  respond(['ok' => true]);
}


if ($method === 'GET' && $path === '/api/me') {
  respond(['user' => $_SESSION['user']]);
}


if ($method === 'GET' && $path === '/api/order') {
  require_auth();
  log_event('order_read');
  respond($_SESSION['order']);
}


if ($method === 'POST' && $path === '/api/cart/add') {
  require_auth();
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
  require_auth();
  $_SESSION['order']['ts']['paidAtUtc'] = (int)(microtime(true) * 1000);
  log_event('order_pay');
  respond($_SESSION['order']);
}

/**  ship 17:00 UTC */
if ($method === 'POST' && $path === '/api/order/ship') {
  require_auth();
  $now    = new DateTime('now', new DateTimeZone('UTC'));
  $cutoff = (clone $now)->setTime(17, 0, 0);
  if ($now > $cutoff) {
    $cutoff->modify('+1 day')->setTime(17, 0, 0);
  }
  $_SESSION['order']['ts']['shippedAtUtc'] = $cutoff->getTimestamp() * 1000;
  log_event('order_ship', ['shippedAtUtc' => $_SESSION['order']['ts']['shippedAtUtc']]);
  respond($_SESSION['order']);
}


/** deliver -> archive -> reset! */
if ($method === 'POST' && $path === '/api/order/deliver') {
  require_auth();
  $b  = jsonBody(); // { deliveredAtUtc: ms } 

  $ms = isset($b['deliveredAtUtc']) ? (int)$b['deliveredAtUtc'] : (int)(microtime(true) * 1000);
  if ($ms <= 0) {
    respond(['error' => 'Bad deliveredAtUtc'], 400);
  }

  $_SESSION['order']['ts']['deliveredAtUtc'] = $ms;
  $_SESSION['order']['status'] = 'delivered';

  $ordersDir = LOG_DIR . '/orders';
  if (!is_dir($ordersDir)) { @mkdir($ordersDir, 0775, true); }
  $archiveFile = $ordersDir . '/' . ($_SESSION['order']['id'] ?? ('PO-'.date('Ymd-His'))) . '.json';
  $archived = (bool)file_put_contents(
    $archiveFile,
    json_encode($_SESSION['order'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
  );


  log_event('order_complete', [
    'archived' => $archived,
    'file' => basename($archiveFile),
  ]);

  //  Reset 
  $newOrder = [
    'id' => 'PO-'.date('Ymd-His'),
    'items' => [],
    'ts' => ['createdAtUtc' => (int)(microtime(true) * 1000)],
    'customerTimeZone' => 'Africa/Cairo',
    'shippingDays' => 3.5,
    'status' => 'open',
  ];
  $_SESSION['order'] = $newOrder;


  respond([
    'ok' => true,
    'archivedFile' => basename($archiveFile),
    'newOrder' => $newOrder,
  ]);
}


if ($method === 'GET' && $path === '/api/logs') {
  require_auth();
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


if ($method === 'POST' && $path === '/api/export') {
  require_auth();
  $file = LOG_DIR . '/order-' . ($_SESSION['order']['id'] ?? 'unknown') . '.json';
  $ok   = (bool)file_put_contents(
    $file,
    json_encode($_SESSION['order'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
  );
  log_event('order_export', ['file' => basename($file), 'ok' => $ok]);
  respond(['ok' => $ok, 'file' => basename($file)]);
}

// manual reset!!!
// POST /api/order/reset  -> { ok: true, newOrder }
if ($method === 'POST' && $path === '/api/order/reset') {
  require_auth();

  $newOrder = [
    'id' => 'PO-' . date('Ymd-His'),
    'items' => [],
    'ts' => ['createdAtUtc' => (int)(microtime(true) * 1000)],
    'customerTimeZone' => 'Africa/Cairo',
    'shippingDays' => 3.5,
    'status' => 'open',
  ];

  $_SESSION['order'] = $newOrder;

  log_event('order_reset');
  respond(['ok' => true, 'newOrder' => $newOrder]);
}


/** 404 */
respond(['error' => 'Not found', 'path' => $path], 404);
