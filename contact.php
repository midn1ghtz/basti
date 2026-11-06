<?php
/**
 * midn1ghtz — simple contact form mailer (for PHP hosting such as IONOS, Strato, all-inkl).
 * Usage: in index.html and contact.html set  data-endpoint="contact.php"  on the <form>.
 * Edit the two settings below. The FROM address must belong to your own domain.
 */
$TO   = 'hello@midn1ghtz.com';      // where requests are delivered
$FROM = 'no-reply@midn1ghtz.com';   // sender address on your domain

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

// Honeypot: bots fill hidden fields, humans don't.
if (!empty($_POST['company_url'])) {
    echo json_encode(['ok' => true]);
    exit;
}

function clean($v, $max = 2000) {
    $v = is_string($v) ? trim($v) : '';
    $v = str_replace(["\r", "\0"], '', $v);
    return mb_substr($v, 0, $max);
}
function oneline($v, $max = 200) {
    return str_replace("\n", ' ', clean($v, $max));
}

$name    = oneline($_POST['name'] ?? '');
$email   = oneline($_POST['email'] ?? '');
$company = oneline($_POST['company'] ?? '');
$website = oneline($_POST['website'] ?? '');
$plan    = oneline($_POST['plan'] ?? '');
$billing = oneline($_POST['billing'] ?? '');
$addons  = isset($_POST['addons']) && is_array($_POST['addons']) ? array_map('oneline', $_POST['addons']) : [];
$message = clean($_POST['message'] ?? '', 5000);
$consent = ($_POST['consent'] ?? '') === 'yes';

if ($name === '' || $message === '' || !$consent || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Please fill in all required fields.']);
    exit;
}

$subject = 'Project request — ' . $name;
$body = "Name: $name\nEmail: $email\nCompany: " . ($company ?: '-') . "\nWebsite: " . ($website ?: '-') .
        "\nPlan: " . ($plan ?: '-') . " ($billing)\nAdd-ons: " . ($addons ? implode(', ', $addons) : '-') .
        "\n\n$message\n";

$headers = [
    'From: midn1ghtz <' . $FROM . '>',
    'Reply-To: ' . $email,
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . phpversion(),
];

$ok = mail($TO, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers));

http_response_code($ok ? 200 : 500);
echo json_encode(['ok' => (bool) $ok]);
