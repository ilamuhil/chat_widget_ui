export type Role = 'user' | 'assistant' | 'agent'
type Message = { role: Role | string; content: string; contentType: string; timestamp: string; agentName?: string }
export type MessageSide = 'user' | 'staff'
type MessageMeta = Message & { side: MessageSide; isLastOfGroup: boolean; initials: string }

function getRoleGroup(role: Message['role']): 'user' | 'staff' {
  return role === 'user' ? 'user' : 'staff'
}


export function getInitials(name?: string | null, role?: Role | string): string {
  const cleaned = (name ?? '').trim().replace(/\s+/g, ' ')
  if (cleaned) {
    const parts = cleaned.split(' ').filter(Boolean)

    if (parts.length >= 2) {
      const first = parts[0][0] ?? ''
      const last = parts[parts.length - 1][0] ?? ''
      return (first + last).toUpperCase()
    }

    return (parts[0][0] ?? '').toUpperCase()
  }

  if (role === 'user') return 'U'
  if (role === 'assistant') return 'AI'
  return 'S'
}


export function getMessageMeta(messages: Array<Message>): Array<MessageMeta> {
  if (!messages?.length) return []

  return messages.map((message, index, all) => {
    const side = getRoleGroup(message.role)
    const isLastOfGroup =
      index === all.length - 1 || getRoleGroup(all[index].role) !== getRoleGroup(all[index + 1].role)

    return {
      ...message,
      side,
      isLastOfGroup,
      initials: getInitials(message.agentName, message.role),
    }
  })
}