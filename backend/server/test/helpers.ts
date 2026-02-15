import type { H3Event } from 'h3'

/**
 * Create a mock H3 event for testing
 */
export function createMockEvent(method: string = 'GET', body?: any): H3Event {
  const headers: Record<string, string> = {}
  const event = {
    method,
    url: '/api/test',
    headers,
    node: {
      req: {
        method,
        url: '/api/test',
        headers: {},
      } as any,
      res: {
        statusCode: 200,
        setHeader: (key: string, value: string) => {
          headers[key] = value
        },
        getHeader: (key: string) => headers[key],
      } as any,
    },
    context: {
      body,
    },
  } as any as H3Event

  return event
}

/**
 * Helper to extract response from h3 event handler
 */
export async function callHandler(handler: any, event: H3Event): Promise<any> {
  try {
    const result = await handler(event)
    return result
  } catch (error) {
    throw error
  }
}

