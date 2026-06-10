import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Polyfill window.storage for Anthropic artifact storage API
// In production (outside Claude artifacts), we use localStorage as a fallback
if (!window.storage) {
  window.storage = {
    _store: {},
    async get(key, shared) {
      try {
        const raw = localStorage.getItem(`wc26_${shared ? 'shared' : 'local'}_${key}`)
        if (!raw) throw new Error('not found')
        return { key, value: raw, shared: !!shared }
      } catch {
        throw new Error('not found')
      }
    },
    async set(key, value, shared) {
      try {
        localStorage.setItem(`wc26_${shared ? 'shared' : 'local'}_${key}`, value)
        return { key, value, shared: !!shared }
      } catch {
        return null
      }
    },
    async delete(key, shared) {
      localStorage.removeItem(`wc26_${shared ? 'shared' : 'local'}_${key}`)
      return { key, deleted: true, shared: !!shared }
    },
    async list(prefix, shared) {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        const base = `wc26_${shared ? 'shared' : 'local'}_`
        if (k && k.startsWith(base)) {
          keys.push(k.replace(base, ''))
        }
      }
      return { keys, prefix, shared: !!shared }
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
