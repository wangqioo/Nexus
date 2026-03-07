import React, { useState } from 'react'
import { Modal, Button, Progress } from 'antd'
import styles from './Onboarding.module.css'

interface OnboardingProps {
  open: boolean
  onFinish: () => void
}

const STEPS = [
  {
    icon: '🖊️',
    title: '欢迎使用码迹',
    subtitle: '项目管理 + 开发经验管理',
    detail: '码迹帮你：用多种方式导入项目，AI 自动分类并生成概括名与简介，一目了然；在 Cursor 里记录经验，回到码迹一键同步到知识库，跨项目复用。最核心一句话：按照 .nexus 执行，提取知识文档并归类。',
    visualCaption: '按照 .nexus 执行，提取知识文档并归类。',
  },
  {
    icon: '📥',
    title: '导入项目',
    subtitle: '本地 / GitHub / 批量扫描',
    detail: '在「项目」页点「导入项目」，任选一种方式添加。AI 会分析项目类型并自动分类，同时生成项目概括名和简介，卡片上一目了然，并为项目创建 .nexus 目录。',
    visualCaption: '三种导入方式，满足不同习惯',
  },
  {
    icon: '🤖',
    title: 'AI 分析',
    subtitle: '自动分类、生成概括名与简介',
    detail: '导入与同步可选用 AI 分析。在「设置」→「大模型 API」中默认使用 MiniMax，也可选智谱、OpenAI、Kimi 或自定义接口，用于自动识别项目类型、生成概括名与简介，以及同步时补全标题与标签。',
    visualCaption: '设置中可配置 MiniMax（默认）或其它大模型 API',
  },
  {
    icon: '💻',
    title: 'Cursor 里记录',
    subtitle: '调试经验、代码片段、笔记',
    detail: '在码迹中点「在 Cursor 打开」，在项目里用自然语言让 AI 帮你记：如「帮我记录这个 bug 的解决方案」「把这段代码保存到 nexus」「记个笔记：I2C 时钟限制」。',
    visualCaption: '自然语言即可写入 .nexus',
  },
  {
    icon: '🔄',
    title: '一键同步',
    subtitle: '汇总到知识库与笔记',
    detail: '回到码迹，在项目卡片上点「一键同步」。.nexus 里的内容会进入中央知识库和笔记库，之后在「知识库」「笔记库」里检索、跨项目复用。',
    visualCaption: '项目内记录 → 中央库检索',
  },
]

export function Onboarding({ open, onFinish }: OnboardingProps) {
  const [current, setCurrent] = useState(0)
  const step = STEPS[current]
  const total = STEPS.length
  const percent = ((current + 1) / total) * 100

  const handleNext = () => {
    if (current < total - 1) {
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
      width={640}
      centered
      className={styles.modal}
    >
      <div className={styles.container}>
        {/* 顶部进度 */}
        <div className={styles.progressWrap}>
          <span className={styles.progressLabel}>步骤 {current + 1} / {total}</span>
          <Progress percent={percent} showInfo={false} strokeColor="var(--onboarding-progress)" strokeWidth={4} className={styles.progressBar} />
        </div>

        {/* 步骤指示器（可点击切换） */}
        <div className={styles.flow}>
          {STEPS.map((s, index) => (
            <React.Fragment key={index}>
              <div
                className={`${styles.step} ${index === current ? styles.active : ''} ${index < current ? styles.done : ''}`}
                onClick={() => setCurrent(index)}
              >
                <span className={styles.stepIcon}>{s.icon}</span>
              </div>
              {index < total - 1 && (
                <div className={`${styles.line} ${index < current ? styles.lineDone : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 步骤内容 */}
        <div className={styles.main}>
          <div className={styles.visualCard}>
            <span className={styles.visualIcon}>{step.icon}</span>
            <span className={styles.visualCaption}>{step.visualCaption}</span>
          </div>
          <div className={styles.content}>
            <h2 className={styles.title}>{step.title}</h2>
            <p className={styles.subtitle}>{step.subtitle}</p>
            <p className={styles.detail}>{step.detail}</p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className={styles.footer}>
          <Button type="text" onClick={onFinish} className={styles.skip}>
            跳过
          </Button>
          <Button type="primary" size="large" onClick={handleNext} className={styles.nextBtn}>
            {current === total - 1 ? '开始使用' : '下一步'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default Onboarding
