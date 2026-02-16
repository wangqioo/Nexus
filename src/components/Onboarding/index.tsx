import React, { useState } from 'react'
import { Modal, Button } from 'antd'
import styles from './Onboarding.module.css'

interface OnboardingProps {
  open: boolean
  onFinish: () => void
}

const STEPS = [
  {
    icon: '🚀',
    title: 'Nexus',
    subtitle: '开发经验管理中枢',
  },
  {
    icon: '📥',
    title: '导入项目',
    subtitle: 'GitHub / 本地',
  },
  {
    icon: '🤖',
    title: 'AI 分析',
    subtitle: '自动分类归档',
  },
  {
    icon: '💻',
    title: 'Cursor 开发',
    subtitle: '自动记录经验',
  },
  {
    icon: '🔄',
    title: '同步知识',
    subtitle: '结构化复用',
  },
]

export function Onboarding({ open, onFinish }: OnboardingProps) {
  const [current, setCurrent] = useState(0)

  const handleNext = () => {
    if (current < STEPS.length - 1) {
      setCurrent(current + 1)
    } else {
      onFinish()
    }
  }

  return (
    <Modal
      open={open}
      footer={null}
      closable={false}
      width={400}
      centered
      className={styles.modal}
    >
      <div className={styles.container}>
        {/* 流程图 */}
        <div className={styles.flow}>
          {STEPS.map((step, index) => (
            <React.Fragment key={index}>
              <div 
                className={`${styles.step} ${index === current ? styles.active : ''} ${index < current ? styles.done : ''}`}
                onClick={() => setCurrent(index)}
              >
                <span className={styles.stepIcon}>{step.icon}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`${styles.line} ${index < current ? styles.lineDone : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 当前步骤信息 */}
        <div className={styles.info}>
          <div className={styles.title}>{STEPS[current].title}</div>
          <div className={styles.subtitle}>{STEPS[current].subtitle}</div>
          {current === 2 && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-secondary, #666)' }}>
              使用前可在「设置」中配置智谱 API Key，否则仅做本地检测。
            </div>
          )}
        </div>

        {/* 按钮 */}
        <div className={styles.footer}>
          <Button type="text" onClick={onFinish} className={styles.skip}>
            跳过
          </Button>
          <Button type="primary" onClick={handleNext}>
            {current === STEPS.length - 1 ? '开始' : '下一步'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default Onboarding
