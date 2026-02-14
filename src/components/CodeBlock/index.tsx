import React, { useState } from 'react'
import { Button, message } from 'antd'
import { CopyOutlined, CheckOutlined } from '@ant-design/icons'
import Editor from '@monaco-editor/react'
import styles from './CodeBlock.module.css'

interface CodeBlockProps {
  code: string
  language?: string
  height?: string | number
  readOnly?: boolean
  onChange?: (value: string) => void
}

export function CodeBlock({ 
  code, 
  language = 'c', 
  height = 300,
  readOnly = true,
  onChange 
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      message.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      message.error('复制失败')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.language}>{language.toUpperCase()}</span>
        <Button
          type="text"
          size="small"
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={handleCopy}
          className={styles.copyBtn}
        >
          {copied ? '已复制' : '复制'}
        </Button>
      </div>
      <Editor
        height={height}
        language={language}
        value={code}
        theme="vs-dark"
        onChange={(value) => onChange?.(value || '')}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  )
}
