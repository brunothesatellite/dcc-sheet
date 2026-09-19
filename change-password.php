<?php
session_start();
require_once __DIR__ . '/api/db.php';
$db = getDB();
$user = getUserFromSession($db);
if (!$user) { header('Location: login.php'); exit; }
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Changer le mot de passe - DCC Fiches</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#f1eee8;--paper:#fff;--ink:#171717;--muted:#706d68;--red:#c0392b;--yellow:#f2bd3d;--border:#d7d1c8;--field-bg:#dde4f0;--input-border:#9aa5b4}
[data-theme="dark"]{--bg:#1a1917;--paper:#242320;--ink:#e8e4dc;--muted:#9a9590;--red:#e84535;--yellow:#f5c542;--border:#4a4744;--field-bg:#2a2926;--input-border:#5a5754}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--ink);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:var(--paper);border:2px solid var(--ink);padding:30px;max-width:400px;width:100%;box-shadow:6px 6px 0 var(--yellow)}
h1{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:24px;text-transform:uppercase;text-align:center;margin-bottom:20px}
.field{margin-bottom:14px}
.field label{display:block;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:12px;text-transform:uppercase;margin-bottom:4px}
.field input{width:100%;padding:8px 10px;border:2px solid var(--input-border);background:var(--field-bg);color:var(--ink);font-family:'Inter',sans-serif;font-size:14px;border-radius:2px}
.field input:focus{outline:2px solid var(--red);outline-offset:-1px}
.btn{width:100%;padding:10px;background:var(--red);color:#fff;border:none;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:16px;text-transform:uppercase;cursor:pointer;letter-spacing:1px}
.btn:hover{opacity:.9}
.error{background:#fdecea;color:#c0392b;padding:8px 12px;font-size:13px;margin-bottom:14px;display:none}
.error.show{display:block}
.success{background:#e8f5e9;color:#2e7d32;padding:8px 12px;font-size:13px;margin-bottom:14px;display:none}
.success.show{display:block}
.link{text-align:center;margin-top:16px;font-size:13px;color:var(--muted)}
.link a{color:var(--red);text-decoration:none;font-weight:600}
.topbar{position:fixed;top:0;left:0;right:0;background:var(--ink);padding:10px 14px;display:flex;align-items:center;z-index:100}
.logo{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:18px;text-transform:uppercase;letter-spacing:2px;color:var(--paper)}
.logo span{color:var(--yellow)}
</style>
</head>
<body>
<header class="topbar"><div class="logo">DCC <span>Fiches</span></div></header>
<div class="card">
  <h1>Changer le mot de passe</h1>
  <div class="error" id="error-msg"></div>
  <div class="success" id="success-msg"></div>
  <form id="form">
    <div class="field">
      <label for="old_password">Mot de passe actuel</label>
      <input type="password" id="old_password" required>
    </div>
    <div class="field">
      <label for="new_password">Nouveau mot de passe</label>
      <input type="password" id="new_password" required minlength="6" placeholder="6 caracteres minimum">
    </div>
    <div class="field">
      <label for="new_password2">Confirmer</label>
      <input type="password" id="new_password2" required minlength="6">
    </div>
    <button type="submit" class="btn">Changer</button>
  </form>
  <div class="link"><a href="index.html">Retour a l'application</a></div>
</div>
<script>
document.getElementById('form').addEventListener('submit', async function(e) {
  e.preventDefault();
  var errEl = document.getElementById('error-msg');
  var sucEl = document.getElementById('success-msg');
  errEl.classList.remove('show'); sucEl.classList.remove('show');
  var oldPw = document.getElementById('old_password').value;
  var newPw = document.getElementById('new_password').value;
  var newPw2 = document.getElementById('new_password2').value;
  if (newPw !== newPw2) { errEl.textContent = 'Les mots de passe ne correspondent pas'; errEl.classList.add('show'); return; }
  try {
    var res = await fetch('api/auth.php?action=change_password', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({old_password: oldPw, new_password: newPw})
    });
    var data = await res.json();
    if (data.ok) { sucEl.textContent = 'Mot de passe change avec succes'; sucEl.classList.add('show'); document.getElementById('form').reset(); }
    else { errEl.textContent = data.error || 'Erreur'; errEl.classList.add('show'); }
  } catch(ex) { errEl.textContent = 'Erreur reseau'; errEl.classList.add('show'); }
});
</script>
</body>
</html>
