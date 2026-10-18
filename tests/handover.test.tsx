// @vitest-environment jsdom
import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

vi.hoisted(() => {
  vi.stubGlobal('Audio', class { currentTime = 0; play = vi.fn().mockResolvedValue(undefined) })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
})

import { useChatMessages } from '../src/chat/hooks/useChatMessages'

let root: ReturnType<typeof createRoot>
let container: HTMLDivElement
let state: ReturnType<typeof useChatMessages>
const toggleFormVisibility = vi.fn()
function Harness() {
  const current = useChatMessages({ toggleFormVisibility })
  useEffect(() => { state = current })
  return null
}
beforeEach(async () => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root.render(<Harness />))
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})
const mode = (version: number, value: string, connected = true) => ({
  type: 'conversation_mode', conversation_id: 'chat-a', version, mode: value, agent_connected: connected,
})

test('human mode remains human through a counsellor reconnect and discards unfinished AI streams', async () => {
  await act(async () => state.handleServerJson({ type: 'message_delta', stream_id: 'ai-a', delta: 'unfinished' }))
  expect(state.messages).toHaveLength(1)
  await act(async () => state.handleServerJson(mode(1, 'human', false)))
  expect(state.isSupportAgentConnected).toBe(true)
  expect(state.messages).toHaveLength(0)
  expect(state.isTyping).toBe(false)
})

test('an older mode event cannot override a newer handover snapshot', async () => {
  await act(async () => state.handleServerJson(mode(5, 'human')))
  await act(async () => state.handleServerJson(mode(4, 'ai')))
  expect(state.isSupportAgentConnected).toBe(true)
  await act(async () => state.handleServerJson(mode(6, 'ai')))
  expect(state.isSupportAgentConnected).toBe(false)
})
