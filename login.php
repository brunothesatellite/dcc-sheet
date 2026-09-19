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
<title>Connexion - DCC Fiches</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style-auth.css">
<script>
(function(){var t=localStorage.getItem('dcc-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');})();
</script>
</head>
<body>
<header class="topbar"><a href="index.html" class="logo" style="text-decoration:none">DCC <span>Fiches</span></a></header>
<div class="card">
  <h1>Connexion</h1>
  <div class="error" id="error-msg"></div>
  <form id="form">
    <div class="field">
      <label for="pseudo">Pseudo</label>
      <input type="text" id="pseudo" name="pseudo" required placeholder="Votre pseudo">
    </div>
    <div class="field">
      <label for="password">Mot de passe</label>
      <input type="password" id="password" name="password" required placeholder="Mot de passe">
    </div>
    <button type="submit" class="btn">Se connecter</button>
  </form>
  <div class="link">Pas encore de compte ? <a href="register.php">S'inscrire</a></div>
  <div class="link"><a href="index.html">Retour a l'application</a></div>
</div>
<script>
document.getElementById('form').addEventListener('submit', async function(e) {
  e.preventDefault();
  var errEl = document.getElementById('error-msg');
  errEl.classList.remove('show');
  var pseudo = document.getElementById('pseudo').value.trim();
  var pw = document.getElementById('password').value;
  try {
    var res = await fetch('api/auth.php?action=login', {
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
