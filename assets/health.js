/*
  Health check script that verifies all JSON files conform to the
  required schema and are within their TTL.  Results are displayed
  as a simple table inside the #health-report element.
*/
(function() {
  async function runHealth() {
    const reportEl = document.getElementById('health-report');
    if (!reportEl) return;
    const files = [
      'config/site.json',
      'config/layout.json',
      'data/weather.json',
      'data/alerts.json',
      'data/propagation.json',
      'data/allstar.json',
      'data/streams.json',
      'data/news.json',
      'data/nets.json',
      'data/discord.json',
      'data/system.json',
      'data/now.json'
    ];
    const rows = [];
    for (const file of files) {
      let status = 'Pass';
      let reason = '';
      try {
        const res = await fetch(file);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (data.schema !== 'v1') {
          status = 'Fail';
          reason = 'Invalid schema';
        }
        if (data.updated && data.ttlMin) {
          const updated = new Date(data.updated);
          const ttlMs = data.ttlMin * 60000;
          if (Date.now() - updated.getTime() > ttlMs) {
            if (status === 'Pass') {
              status = 'Stale';
              reason = 'Data expired';
            }
          }
        }
      } catch (err) {
        status = 'Fail';
        reason = err.message;
      }
      rows.push({ file, status, reason });
    }
    // Render table
    let html = '<table style="width:100%;border-collapse:collapse;font-size:0.9rem;">';
    html += '<thead><tr><th style="text-align:left;padding:4px;border-bottom:1px solid var(--primary);">File</th><th style="text-align:left;padding:4px;border-bottom:1px solid var(--primary);">Status</th><th style="text-align:left;padding:4px;border-bottom:1px solid var(--primary);">Reason</th></tr></thead><tbody>';
    rows.forEach(r => {
      const colour = r.status === 'Pass' ? 'var(--accent)' : r.status === 'Stale' ? 'var(--muted)' : 'red';
      html += '<tr>';
      html += '<td style="padding:4px;border-bottom:1px solid var(--primary);">' + r.file + '</td>';
      html += '<td style="padding:4px;border-bottom:1px solid var(--primary);color:' + colour + ';">' + r.status + '</td>';
      html += '<td style="padding:4px;border-bottom:1px solid var(--primary);">' + (r.reason || '') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    reportEl.innerHTML = html;
  }
  window.addEventListener('DOMContentLoaded', runHealth);
})();