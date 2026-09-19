<?php
session_start();
require_once __DIR__ . '/api/db.php';
$db = getDB();
$user = getUserFromSession($db);
if ($user) { header('Location: index.html'); exit; }
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Inscription - DCC Fiches</title>
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
.link{text-align:center;margin-top:16px;font-size:13px;color:var(--muted)}
.link a{color:var(--red);text-decoration:none;font-weight:600}
.link a:hover{text-decoration:underline}
.topbar{position:fixed;top:0;left:0;right:0;background:var(--ink);padding:10px 14px;display:flex;align-items:center;z-index:100}
.logo{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:18px;text-transform:uppercase;letter-spacing:2px;color:var(--paper)}
.logo span{color:var(--yellow)}
</style>
</head>
<body>
<header class="topbar"><a href="index.html" class="logo" style="text-decoration:none">DCC <span>Fiches</span></a></header>
<div class="card">
  <h1>Inscription</h1>
  <div class="error" id="error-msg"></div>
  <form id="form">
    <div class="field">
      <label for="pseudo">Pseudo</label>
      <input type="text" id="pseudo" name="pseudo" required minlength="3" maxlength="20" pattern="[a-zA-Z0-9_-]+" placeholder="3 a 20 caracteres">
    </div>
    <div class="field">
      <label for="password">Mot de passe</label>
      <input type="password" id="password" name="password" required minlength="6" placeholder="6 caracteres minimum">
    </div>
    <div class="field">
      <label for="password2">Confirmer</label>
      <input type="password" id="password2" name="password2" required minlength="6" placeholder="Confirmer le mot de passe">
    </div>
    <button type="submit" class="btn">Creer mon compte</button>
  </form>
  <div class="link">Deja un compte ? <a href="login.php">Se connecter</a></div>
  <div class="link"><a href="index.html">Retour a l'application</a></div>
</div>
<script>
document.getElementById('form').addEventListener('submit', async function(e) {
  e.preventDefault();
  var errEl = document.getElementById('error-msg');
  errEl.classList.remove('show');
  var pseudo = document.getElementById('pseudo').value.trim();
  var pw = document.getElementById('password').value;
  var pw2 = document.getElementById('password2').value;
  if (pw !== pw2) { errEl.textContent = 'Les mots de passe ne correspondent pas'; errEl.classList.add('show'); return; }
  try {
    var res = await fetch('api/auth.php?action=register', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({pseudo: pseudo, password: pw})
    });
    var data = await res.json();
    if (data.ok) { window.location.href = 'index.html'; }
    else { errEl.textContent = data.error || 'Erreur'; errEl.classList.add('show'); }
  } catch(ex) { errEl.textContent = 'Erreur reseau'; errEl.classList.add('show'); }
});
</script>
</body>
</html>
