export function makeCheckbox({ checked, onToggle }) {
  const el = document.createElement('span');
  el.style.cssText = 'display:inline-block;width:16px;height:16px;margin-right:8px;border:1.5px solid var(--border-strong);border-radius:3px;cursor:pointer;vertical-align:middle;text-align:center;line-height:14px;font-size:12px;transition:all 0.15s;';
  const render = (c) => {
    if (c) {
      el.style.background = 'var(--success)';
      el.style.borderColor = 'var(--success)';
      el.style.color = '#fff';
      el.textContent = '✓';
    } else {
      el.style.background = '#fff';
      el.style.borderColor = 'var(--border-strong)';
      el.textContent = '';
    }
  };
  render(checked);
  el.addEventListener('click', async () => {
    const next = !el.dataset.checked || el.dataset.checked === 'false';
    render(next);
    el.dataset.checked = next;
    try {
      await onToggle(next);
    } catch (err) {
      render(!next);
      el.dataset.checked = !next;
      alert('저장 실패: ' + err.message);
    }
  });
  el.dataset.checked = checked;
  return el;
}
