const podHits = new Map();

const els = {
  bannerText: document.getElementById('bannerText'),
  navVersion: document.getElementById('navVersion'),
  podName: document.getElementById('podName'),
  appVersion: document.getElementById('appVersion'),
  appEnv: document.getElementById('appEnv'),
  podUptime: document.getElementById('podUptime'),
  healthStatus: document.getElementById('healthStatus'),
  uniquePodsCount: document.getElementById('uniquePodsCount'),
  podsDistribution: document.getElementById('podsDistribution'),
  footerMeta: document.getElementById('footerMeta'),
  btnRefresh: document.getElementById('btnRefresh'),
  btnBurst: document.getElementById('btnBurst'),
  btnResetStats: document.getElementById('btnResetStats'),
  toast: document.getElementById('toast')
};

function formatUptime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function renderPodsDistribution() {
  els.uniquePodsCount.textContent = String(podHits.size);
  els.podsDistribution.innerHTML = '';

  for (const [pod, count] of podHits.entries()) {
    const chip = document.createElement('div');
    chip.className = 'pod-chip mono';

    const label = document.createElement('span');
    label.textContent = pod;

    const badge = document.createElement('span');
    badge.className = 'count';
    badge.textContent = `${count} req`;

    chip.append(label, badge);
    els.podsDistribution.appendChild(chip);
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('visible');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    els.toast.classList.remove('visible');
  }, 2600);
}

async function fetchRuntimeInfo() {
  const response = await fetch(`/api/runtime?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();

  podHits.set(data.pod, (podHits.get(data.pod) || 0) + 1);

  els.bannerText.textContent = `${data.bannerMessage} · Respondiendo desde [${data.pod}]`;
  els.navVersion.textContent = `v${data.version.replace(/^v/, '')}`;
  els.podName.textContent = data.pod;
  els.appVersion.textContent = `v${data.version.replace(/^v/, '')}`;
  els.appEnv.textContent = data.environment;
  els.podUptime.textContent = formatUptime(data.uptimeSeconds);
  els.healthStatus.textContent = 'Healthcheck /healthz: 200 OK';
  els.footerMeta.textContent = `Pod: ${data.pod} | Version: ${data.version} | Env: ${data.environment}`;

  renderPodsDistribution();
  return data;
}

els.btnRefresh.addEventListener('click', async () => {
  try {
    const info = await fetchRuntimeInfo();
    showToast(`Respuesta recibida desde ${info.pod}`);
  } catch (err) {
    showToast(`Error consultando servidor: ${err.message}`);
  }
});

els.btnBurst.addEventListener('click', async () => {
  els.btnBurst.disabled = true;
  els.btnBurst.textContent = 'Enviando ráfaga...';
  try {
    for (let i = 0; i < 12; i += 1) {
      await fetchRuntimeInfo();
    }
    showToast(`Ráfaga completada: ${podHits.size} Pod(s) único(s) detectado(s)`);
  } catch (err) {
    showToast(`Error durante la ráfaga: ${err.message}`);
  } finally {
    els.btnBurst.disabled = false;
    els.btnBurst.textContent = 'Simular Ráfaga (x12)';
  }
});

els.btnResetStats.addEventListener('click', () => {
  podHits.clear();
  els.uniquePodsCount.textContent = '0';
  els.podsDistribution.innerHTML = '<span class="muted">Conteo reiniciado. Haz clic en Consultar o Simular Ráfaga.</span>';
});

document.querySelectorAll('.toast-trigger').forEach((button) => {
  button.addEventListener('click', () => {
    showToast(`Demo Frontend: Plan "${button.dataset.plan}" seleccionado`);
  });
});

fetchRuntimeInfo().catch(() => {
  els.bannerText.textContent = 'Modo estático sin conexión al servidor Node';
});
