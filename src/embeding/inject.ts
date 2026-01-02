declare global {
  interface Window {
    chatInject?: (chatConfig: Record<string, unknown>) => void
  }
}

function chatInject(chatConfig: Record<string, unknown>) {
  const div = document.createElement('div')
  div.id = 'chat-widget-interface'
  document.body.appendChild(div)

  import('../ChatRoot').then(({ mountWidget }) => {
    mountWidget(div, chatConfig)
  })
}

window.chatInject = chatInject

export {}
