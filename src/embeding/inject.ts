function chatInject(chatConfig: Record<string, unknown>) {
  const div = document.createElement('div')
  div.id = 'chat-widget-interface'
  document.body.appendChild(div)

  import('./ChatRoot.tsx').then(({ mountWidget }) => {
    mountWidget(div, chatConfig)
  })
}

window.chatInject = chatInject
