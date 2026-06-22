import { fetchJson } from './http'
import type {
  Alert,
  FarmingEvent,
  Field,
  GraphPoint,
  HistogramResponse,
  VegetationIndex
} from '../types/robocare'

export function getFields() {
  return fetchJson<Field[]>('/api/fields')
}

export function getDates(taskId: string) {
  return fetchJson<string[]>(`/api/get-dates/${taskId}`)
}

export function getHistogram(taskId: string, date: string, index: VegetationIndex) {
  return fetchJson<HistogramResponse>('/api/get/max/histogram/percentile', {
    method: 'POST',
    body: JSON.stringify({ taskId, date, index })
  })
}

export function getGraphData(taskId: string) {
  return fetchJson<GraphPoint[]>(`/api/task/graph_data/pattern/get/${taskId}`)
}

export function getAlerts(taskId: string) {
  return fetchJson<Alert[]>(`/api/task/pattern/alerts/list/user-1/${taskId}/0`)
}

export function getEvents(fieldId: string) {
  return fetchJson<FarmingEvent[]>(`/api/events/${fieldId}`)
}
