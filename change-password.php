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
<link rel="stylesheet" href="style-auth.css">
<script>
(function(){var t=localStorage.getItem('dcc-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');})();
</script>
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
