// Thin fetch wrapper over the host /pomasa endpoints. No DSH client modules needed.
function createApi() {
  async function request(path, opts) {
    const res = await fetch(path, Object.assign({}, opts, {
      headers: Object.assign({ 'Content-Type': 'application/json' }, (opts && opts.headers) || {}),
    }))
    if (!res.ok && res.status === 404) return { ok: false, error: 'not found' }
    return res.json()
  }
  function q(params) {
    const keys = Object.keys(params)
    if (!keys.length) return ''
    return '?' + keys.map((k) => k + '=' + encodeURIComponent(params[k] == null ? '' : params[k])).join('&')
  }
  return {
    meta: () => request('/pomasa/meta'),
    listMas: () => request('/pomasa/mas.list'),
    getMas: (masId) => request('/pomasa/mas.get' + q({ masId })),
    generationStatus: (masId) => request('/pomasa/generation.status' + q({ masId })),
    unitList: (masId) => request('/pomasa/unit.list' + q({ masId })),
    unitState: (masId, unit) => request('/pomasa/unit.state' + q({ masId, unit: unit || '' })),
    artifact: (masId, unit, path) => request('/pomasa/artifact.read' + q({ masId, unit: unit || '', path })),
    artifactHead: (masId, unit, path) => request('/pomasa/artifact.read' + q({ masId, unit: unit || '', path, head: '1' })),
    blueprintRead: (masId, path, stage) => request('/pomasa/blueprint.read' + q({ masId, path, ...(stage != null ? { stage } : {}) })),
    runLog: (masId, unit) => request('/pomasa/run.log' + q({ masId, unit: unit || '' })),
    generationLog: (masId) => request('/pomasa/generation.log' + q({ masId })),
    // prepare a run: validates and returns the orchestrator prompt (the session
    // itself is created by the client through the workspace flow). mode 'fresh'
    // wipes the unit's outputs first; 'continue' keeps them and the instruction
    // steers how existing outputs evolve.
    startRun: (masId, unit, opts) => request('/pomasa/run.start', { method: 'POST', body: JSON.stringify({
      masId,
      units: unit == null ? [] : [unit],
      mode: (opts && opts.mode) || 'continue',
      instruction: (opts && opts.instruction) || '',
    }) }),
    unitAdd: (masId, key) => request('/pomasa/unit.add', { method: 'POST', body: JSON.stringify({ masId, key }) }),
    createMas: (fields) => request('/pomasa/mas.create', { method: 'POST', body: JSON.stringify(fields) }),
    recordSession: (masId, kind, unit, sessionId) => request('/pomasa/record', { method: 'POST', body: JSON.stringify({ masId, kind, unit: unit || 'single', sessionId }) }),
    deleteMas: (masId) => request('/pomasa/mas.delete', { method: 'POST', body: JSON.stringify({ masId }) }),
  }
}