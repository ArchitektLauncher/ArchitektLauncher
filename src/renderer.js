const $ = id => document.getElementById(id);
const log = t => { const l = $('log'); l.textContent += t + '\n'; l.scrollTop = l.scrollHeight; };

/* ---------- Моды ---------- */
async function renderMods() {
  const mods = await window.api.modsList();
  const list = $('modList');
  list.replaceChildren();
  $('modCount').textContent = mods.length ? `(${mods.length})` : '';

  if (!mods.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = 'Модов пока нет. Нажми «Добавить моды» и выбери .jar-файлы для Fabric 1.21.11.';
    list.appendChild(e);
    return;
  }

  for (const m of mods) {
    const row = document.createElement('div');
    row.className = 'mod' + (m.enabled ? '' : ' off');

    const name = document.createElement('span');
    name.className = 'n';
    name.textContent = m.name.replace(/\.disabled$/, '');
    name.title = name.textContent;

    const toggle = document.createElement('button');
    toggle.textContent = m.enabled ? 'Выключить' : 'Включить';
    toggle.onclick = async () => { await window.api.modsToggle(m.name); renderMods(); };

    const del = document.createElement('button');
    del.className = 'del';
    del.textContent = 'Удалить';
    del.onclick = async () => { await window.api.modsRemove(m.name); renderMods(); };

    row.append(name, toggle, del);
    list.appendChild(row);
  }
}

$('modAdd').onclick = async () => {
  const n = await window.api.modsAdd();
  if (n) log(`Добавлено модов: ${n}`);
  renderMods();
};
$('modOpen').onclick = () => window.api.modsOpen();

/* ---------- Аккаунт и запуск ---------- */
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

renderMods();
