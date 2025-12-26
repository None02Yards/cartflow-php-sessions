<?php
declare(strict_types=1);

/**
 * ==========================================================
 * CORS — SINGLE ORIGIN, COOKIE-SAFE
 * ==========================================================
 */
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin === 'http://localhost:4200') {
    header('Access-Control-Allow-Origin: http://localhost:4200');
    header('Vary: Origin');
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('UTC');

/**
 * ==========================================================
 * SESSION — MUST COME BEFORE session_start()
 * ==========================================================
 */
session_set_cookie_params([
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax',
    // no domain → defaults to localhost (correct)
    // no secure → HTTP dev mode
]);

session_start();

/**
 * ==========================================================
 * HELPERS
 * ==========================================================
 */
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'];

function jsonBody(): array {
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond(mixed $data, int $code = 200): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function require_auth(): void {
    if (!isset($_SESSION['user']['id'])) {
        respond(['error' => 'Auth required'], 401);
    }
}

/**
 * ==========================================================
 * SESSION STATE (MVP)
 * ==========================================================
 */
$_SESSION['order'] ??= [
    'id' => 'PO-' . date('Ymd-His'),
    'items' => [],
    'ts' => ['createdAtUtc' => (int)(microtime(true) * 1000)],
    'customerTimeZone' => 'Africa/Cairo',
    'shippingDays' => 3.5,
];

$_SESSION['user'] ??= null;

/**
 * ==========================================================
 * CATALOG (STATIC, CLEAN IDS)
 * ==========================================================
 */
$catalog = [
    ['id'=>'p1','sku'=>'SKU-001','name'=>'Mechanical Keyboard','price'=>129.99],
    ['id'=>'p2','sku'=>'SKU-002','name'=>'Desk Mat','price'=>19.95],
    ['id'=>'p3','sku'=>'SKU-003','name'=>'USB-C Hub','price'=>39.50],
    ['id'=>'p4','sku'=>'SKU-004','name'=>'Ergo Mouse','price'=>59.00],
    ['id'=>'p5','sku'=>'SKU-005','name'=>'Mechanical Keyboard (White)','price'=>129.99],
    ['id'=>'p6','sku'=>'SKU-006','name'=>'Desk Mat (Large)','price'=>24.95],
    ['id'=>'p7','sku'=>'SKU-007','name'=>'USB-C Hub Pro','price'=>59.50],
    ['id'=>'p8','sku'=>'SKU-008','name'=>'Ergo Mouse Pro','price'=>79.00],
];

/**
 * ==========================================================
 * USERS (FILE-BACKED)
 * ==========================================================
 */
const DATA_DIR = __DIR__ . '/data';
const USERS_FILE = DATA_DIR . '/users.json';

if (!is_dir(DATA_DIR)) {
    mkdir(DATA_DIR, 0775, true);
}

function load_users(): array {
    if (!is_file(USERS_FILE)) return [];
    return json_decode(file_get_contents(USERS_FILE), true) ?: [];
}

function save_users(array $users): bool {
    return (bool)file_put_contents(
        USERS_FILE,
        json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
}

function user_by_email(array $users, string $email): ?array {
    foreach ($users as $u) {
        if (strcasecmp($u['email'], $email) === 0) return $u;
    }
    return null;
}

function new_user_id(): string {
    return 'U-' . bin2hex(random_bytes(8));
}

/**
 * ==========================================================
 * ROUTES
 * ==========================================================
 */

/* catalog */
if ($method === 'GET' && $path === '/api/catalog') {
    respond(['products' => $catalog]);
}

/* signup */
if ($method === 'POST' && $path === '/api/signup') {
    $b = jsonBody();
    $email = strtolower(trim($b['email'] ?? ''));
    $password = (string)($b['password'] ?? '');

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
        respond(['error' => 'Invalid email or password'], 422);
    }

    $users = load_users();
    if (user_by_email($users, $email)) {
        respond(['error' => 'Email already registered'], 409);
    }

    $user = [
        'id' => new_user_id(),
        'email' => $email,
        'hash' => password_hash($password, PASSWORD_DEFAULT),
    ];

    $users[] = $user;
    save_users($users);

    session_regenerate_id(true);
    $_SESSION['user'] = ['id' => $user['id'], 'email' => $user['email']];

    respond(['ok' => true, 'user' => $_SESSION['user']]);
}

/* login */
if ($method === 'POST' && $path === '/api/login') {
    $b = jsonBody();
    $email = strtolower(trim($b['email'] ?? ''));
    $password = (string)($b['password'] ?? '');

    $users = load_users();
    $u = user_by_email($users, $email);

    if (!$u || !password_verify($password, $u['hash'])) {
        respond(['error' => 'Invalid credentials'], 401);
    }

    session_regenerate_id(true);
    $_SESSION['user'] = ['id' => $u['id'], 'email' => $u['email']];

    respond(['ok' => true, 'user' => $_SESSION['user']]);
}

/* me */
if ($method === 'GET' && $path === '/api/me') {
    respond(['user' => $_SESSION['user']]);
}

/* order */
if ($method === 'GET' && $path === '/api/order') {
    require_auth();
    respond($_SESSION['order']);
}

/* add to cart */
if ($method === 'POST' && $path === '/api/cart/add') {
    require_auth();
    $b = jsonBody();

    $_SESSION['order']['items'][] = [
        'sku' => $b['sku'],
        'name' => $b['name'],
        'qty' => (int)$b['qty'],
        'unitPrice' => (float)$b['unitPrice'],
    ];

    respond($_SESSION['order']);
}

/* pay */
if ($method === 'POST' && $path === '/api/order/pay') {
    require_auth();
    $_SESSION['order']['ts']['paidAtUtc'] = (int)(microtime(true) * 1000);
    respond($_SESSION['order']);
}

/* ship */
if ($method === 'POST' && $path === '/api/order/ship') {
    require_auth();
    $_SESSION['order']['ts']['shippedAtUtc'] = time() * 1000;
    respond($_SESSION['order']);
}

/* logout */
if ($method === 'POST' && $path === '/api/logout') {
    $_SESSION['user'] = null;
    session_regenerate_id(true);
    respond(['ok' => true]);
}

respond(['error' => 'Not found'], 404);
