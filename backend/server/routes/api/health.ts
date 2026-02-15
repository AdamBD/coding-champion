import { eventHandler, setResponseHeader, sendNoContent } from 'h3'

export default eventHandler((event) => {
  setResponseHeader(event, 'Access-Control-Allow-Origin', '*')
  setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET, OPTIONS')
  setResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')
  
  if (event.method === 'OPTIONS') {
    sendNoContent(event, 204)
    return
  }
  
  return { status: 'ok', message: 'Coding Champion API is running' }
})

