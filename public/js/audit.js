/**
 * LinkedOut Live Security Auditor Frontend
 * Executes and visualizes the automated 12-point security diagnostic suite.
 */

const SecurityAuditor = (() => {

  async function runAudit() {
    const tableBody = document.getElementById('audit-table-body');
    const scoreEl = document.getElementById('audit-score');
    const statusEl = document.getElementById('audit-overall-status');
    const latencyEl = document.getElementById('audit-latency');

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
            ⚡ Executing real-time security diagnostic across 12 controls...
          </td>
        </tr>
      `;
    }

    try {
      const res = await fetch('/api/security/audit');
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Security audit failed to return data.');
      }

      if (scoreEl) scoreEl.textContent = data.auditScore;
      if (latencyEl) latencyEl.textContent = `${data.durationMs} ms`;
      if (statusEl) {
        statusEl.textContent = data.overallStatus === 'PASSED_SECURE' ? '100% SECURE & AUDITED' : 'ATTENTION REQUIRED';
        statusEl.style.color = data.overallStatus === 'PASSED_SECURE' ? 'var(--accent-emerald)' : 'var(--toxic-red)';
      }

      if (tableBody && Array.isArray(data.results)) {
        tableBody.innerHTML = data.results.map(test => `
          <tr>
            <td style="font-family: monospace; font-weight: 700; color: var(--text-muted);">${test.id}</td>
            <td>
              <strong style="color: var(--text-primary);">${test.name}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${test.details}</div>
            </td>
            <td>
              <span style="font-size: 0.75rem; font-family: monospace; background: var(--bg-surface); padding: 2px 6px; border-radius: 4px; color: var(--brand-blue);">
                ${test.defense}
              </span>
            </td>
            <td>
              <span class="${test.status === 'PASSED' ? 'badge-pass' : 'badge-fail'}">
                ${test.status === 'PASSED' ? '✓ PASS' : '✗ FAIL'}
              </span>
            </td>
          </tr>
        `).join('');
      }

    } catch (err) {
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; color: var(--toxic-red); padding: 1.5rem;">
              Error executing security audit: ${err.message}
            </td>
          </tr>
        `;
      }
    }
  }

  return {
    runAudit
  };
})();

// Attach listeners for modal open and re-run
document.addEventListener('DOMContentLoaded', () => {
  const auditNavBtn = document.getElementById('nav-audit-btn');
  const sidebarAuditBtn = document.getElementById('sidebar-run-audit-btn');
  const reRunBtn = document.getElementById('re-run-audit-btn');
  const auditModal = document.getElementById('audit-modal');

  function openAuditModal() {
    if (auditModal) {
      auditModal.classList.add('active');
      SecurityAuditor.runAudit();
    }
  }

  if (auditNavBtn) auditNavBtn.addEventListener('click', openAuditModal);
  if (sidebarAuditBtn) sidebarAuditBtn.addEventListener('click', openAuditModal);
  if (reRunBtn) reRunBtn.addEventListener('click', () => SecurityAuditor.runAudit());
});
