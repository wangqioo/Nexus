#!/usr/bin/env node
/**
 * 测试 MiniMax API 是否打通（与 Nexus 内使用的格式一致）
 * 用法: MINIMAX_API_KEY=你的key node scripts/test-minimax-api.js
 * 可选: MINIMAX_GROUP_ID=你的group_id（鉴权失败时加上再试）
 */
const url = 'https://api.minimaxi.com/v1/text/chatcompletion_v2'
const apiKey = process.env.MINIMAX_API_KEY
const groupId = process.env.MINIMAX_GROUP_ID

if (!apiKey) {
  console.error('请设置环境变量 MINIMAX_API_KEY')
  process.exit(1)
}

let finalUrl = url
if (groupId) finalUrl += (url.includes('?') ? '&' : '?') + 'GroupId=' + encodeURIComponent(groupId)

const body = {
  model: 'MiniMax-M2.5',
  messages: [{ role: 'user', content: '你好，请回复“连通成功”' }],
  temperature: 0.3,
  max_tokens: 100,
}

;(async () => {
  try {
    const res = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    if (!res.ok) {
      console.error('请求失败:', res.status, text)
      process.exit(1)
    }
    const data = JSON.parse(text)
    const content = data.choices?.[0]?.message?.content
    if (content) {
      console.log('MiniMax API 连通成功。回复:', content)
    } else {
      console.error('返回无 content:', data)
      process.exit(1)
    }
  } catch (e) {
    console.error('请求异常:', e.message)
    process.exit(1)
  }
})()
