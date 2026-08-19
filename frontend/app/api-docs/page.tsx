'use client'

import { useEffect, useState } from 'react'

// A reader for the OpenAPI document the Go service serves.
//
// Deliberately hand rolled rather than Swagger UI or Scalar from a CDN: this
// app runs offline in Docker, and a documentation page that needs the internet
// is a documentation page that is down exactly when you are debugging. It
// renders the parts that get read, and the raw document is one click away for
// anything else.

type Schema = {
  type?: string
  format?: string
  description?: string
  default?: unknown
  const?: unknown
  minLength?: number
  minimum?: number
  required?: string[]
  properties?: Record<string, Schema>
  items?: Schema
  additionalProperties?: Schema | boolean
  $ref?: string
}

type Operation = {
  tags?: string[]
  summary?: string
  description?: string
  security?: unknown[]
  requestBody?: { content?: Record<string, { schema?: Schema }> }
  responses?: Record<string, { description?: string; content?: Record<string, { schema?: Schema }> }>
}

type Spec = {
  openapi: string
  info: { title: string; version: string; description?: string }
  servers?: { url: string; description?: string }[]
  tags?: { name: string; description?: string }[]
  paths: Record<string, Record<string, Operation>>
  components?: { schemas?: Record<string, Schema>; securitySchemes?: Record<string, Schema> }
}

const METHOD_COLOUR: Record<string, string> = {
  get: 'var(--accent-2)',
  post: 'var(--good)',
  put: 'var(--warn)',
  delete: 'var(--bad)',
}

/** "#/components/schemas/User" -> "User" */
const refName = (ref: string) => ref.split('/').pop() || ref

function typeOf(schema?: Schema): string {
  if (!schema) return ''
  if (schema.$ref) return refName(schema.$ref)
  if (schema.type === 'array') return `${typeOf(schema.items)}[]`
  if (schema.type === 'object' && schema.additionalProperties && schema.additionalProperties !== true) {
    return `map of ${typeOf(schema.additionalProperties as Schema)}`
  }
  return [schema.type, schema.format].filter(Boolean).join(' ')
}

function SchemaTable({ schema, spec }: { schema?: Schema; spec: Spec }) {
  const resolved = schema?.$ref ? spec.components?.schemas?.[refName(schema.$ref)] : schema
  if (!resolved?.properties) {
    return resolved ? <code>{typeOf(resolved)}</code> : null
  }
  const required = new Set(resolved.required || [])
  return (
    <table className="mono" style={{ fontSize: 13 }}>
      <thead>
        <tr>
          <th>Field</th>
          <th>Type</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(resolved.properties).map(([name, prop]) => (
          <tr key={name}>
            <td>
              {name}
              {required.has(name) && <span style={{ color: 'var(--bad)' }}> *</span>}
            </td>
            <td style={{ color: 'var(--muted)' }}>{typeOf(prop)}</td>
            <td style={{ color: 'var(--muted)' }}>{prop.description || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function ApiDocs() {
  const [spec, setSpec] = useState<Spec | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/openapi.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setSpec)
      .catch((e) => setError(e instanceof Error ? e.message : 'could not load the API document'))
  }, [])

  if (error) {
    return (
      <div className="panel">
        <h2>API</h2>
        <p className="error">Could not load /api/openapi.json: {error}</p>
        <p className="muted">The Go service may not be running. Try docker compose up -d api.</p>
      </div>
    )
  }
  if (!spec) return <p className="muted">Loading...</p>

  return (
    <>
      <h1>{spec.info.title}</h1>
      <p className="muted">
        Version {spec.info.version} · OpenAPI {spec.openapi} ·{' '}
        <a href="/api/openapi.json">the raw document</a>
      </p>
      {spec.info.description && <p>{spec.info.description}</p>}

      {spec.servers && (
        <div className="panel">
          <h2>Servers</h2>
          {spec.servers.map((s) => (
            <div key={s.url} style={{ marginBottom: 6 }}>
              <code>{s.url}</code>{' '}
              <span className="muted" style={{ fontSize: 13 }}>
                {s.description}
              </span>
            </div>
          ))}
        </div>
      )}

      {Object.entries(spec.paths).map(([path, methods]) =>
        Object.entries(methods).map(([method, op]) => (
          <div className="panel" key={`${method} ${path}`}>
            <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
              <span
                className="badge"
                style={{ color: METHOD_COLOUR[method] || 'var(--text)', fontWeight: 700 }}
              >
                {method.toUpperCase()}
              </span>
              <code style={{ fontSize: 15 }}>{path}</code>
              {op.security && op.security.length > 0 && (
                <span className="badge" title="Needs the session cookie">
                  session required
                </span>
              )}
            </div>

            <h3 style={{ margin: '10px 0 4px' }}>{op.summary}</h3>
            {op.description && (
              <p className="muted" style={{ marginTop: 0 }}>
                {op.description}
              </p>
            )}

            {op.requestBody?.content?.['application/json']?.schema && (
              <>
                <div className="label">Request body</div>
                <SchemaTable schema={op.requestBody.content['application/json'].schema} spec={spec} />
              </>
            )}

            <div className="label" style={{ marginTop: 12 }}>
              Responses
            </div>
            <table className="mono" style={{ fontSize: 13 }}>
              <tbody>
                {Object.entries(op.responses || {}).map(([code, res]) => (
                  <tr key={code}>
                    <td
                      style={{
                        width: 60,
                        color: code.startsWith('2') ? 'var(--good)' : 'var(--warn)',
                      }}
                    >
                      {code}
                    </td>
                    <td style={{ color: 'var(--muted)' }}>{res.description}</td>
                    <td style={{ color: 'var(--muted)' }}>
                      {res.content?.['application/json']?.schema
                        ? typeOf(res.content['application/json'].schema)
                        : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )),
      )}

      <div className="panel">
        <h2>Schemas</h2>
        {Object.entries(spec.components?.schemas || {}).map(([name, schema]) => (
          <div key={name} style={{ marginBottom: 18 }}>
            <h3 style={{ marginBottom: 4 }}>{name}</h3>
            <SchemaTable schema={schema} spec={spec} />
          </div>
        ))}
      </div>
    </>
  )
}
