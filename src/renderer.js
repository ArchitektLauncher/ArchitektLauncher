const $ = id => document.getElementById(id);
const log = t => { const l = $('log'); l.textContent += t + '\n'; l.scrollTop = l.scrollHeight; };

$('ram').oninput = e => ($('ramVal').textContent = e.target.value);

$('login').onclick = async () => {
  $('status').textContent = 'Вход…';
  try {
    const u = await window.api.login();
    $('user').textContent = 'Игрок: ' + u.name;
    $('login').hidden = true;
    $('logout').hidden = false;
    $('play').disabled = false;
    $('status').textContent = 'Готов';
  } catch (e) {
    $('status').textContent = 'Ошибка входа';
    log(String(e.message || e));
  }
};

$('logout').onclick = async () => {
  await window.api.logout();
  $('user').textContent = 'Не авторизован';
  $('login').hidden = false;
  $('logout').hidden = true;
  $('play').disabled = true;
};

$('play').onclick = async () => {
  $('play').disabled = true;
  $('status').textContent = 'Скачивание и запуск…';
  try {
    await window.api.play({ ramGb: Number($('ram').value) });
  } catch (e) {
    $('status').textContent = 'Ошибка запуска';
    log(String(e.message || e));
    $('play').disabled = false;
  }
};

window.api.on('progress', ({ p, s }) => {
  $('fill').style.width = (s ? (p / s) * 100 : 0) + '%';
});
window.api.on('log', t => { $('status').textContent = 'Игра запущена'; log(t.trim()); });
window.api.on('closed', () => {
  $('status').textContent = 'Игра закрыта';
  $('fill').style.width = '0';
  $('play').disabled = false;
});
