export function openModal(title, contentHtml, onSave) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:200;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:8px;padding:20px 24px;width:min(440px, 90vw);max-height:80vh;overflow-y:auto">
      <h3 style="margin:0 0 14px;font-size:18px">${title}</h3>
      <div id="modal-content">${contentHtml}</div>
      <div style="margin-top:18px;display:flex;justify-content:flex-end;gap:8px">
        <button class="btn" id="modal-cancel">취소</button>
        <button class="btn btn-primary" id="modal-save">저장</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#modal-save').addEventListener('click', async () => {
    try {
      const result = onSave(overlay.querySelector('#modal-content'));
      if (result instanceof Promise) await result;
      close();
    } catch (e) {
      alert(e.message);
    }
  });

  return overlay;
}
