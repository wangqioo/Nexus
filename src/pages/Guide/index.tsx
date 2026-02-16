import React from 'react'
import { Typography, Card, Collapse, Space, Button } from 'antd'
import {
  BookOutlined,
  FolderAddOutlined,
  RobotOutlined,
  CodeOutlined,
  SyncOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import styles from './Guide.module.css'

const { Title, Paragraph, Text } = Typography

/** 占位：后续可替换为真实截图 */
const ImgPlaceholder: React.FC<{ name: string }> = ({ name }) => (
  <div className={styles.imgPlaceholder}>
    <span>[图：{name}]</span>
  </div>
)

export function Guide() {
  const navigate = useNavigate()

  const sections = [
    {
      key: '1',
      label: '一、码迹在解决什么问题？',
      icon: <QuestionCircleOutlined />,
      children: (
        <>
          <Paragraph strong>项目管理</Paragraph>
          <Paragraph>
            项目一多就乱：文件夹一堆，哪个是啥、干啥的，光看目录名想不起来。码迹帮你：<strong>多种方式导入</strong>（本地 / GitHub / 批量），AI <strong>自动分类</strong>，并生成<strong>项目概括名</strong>和<strong>项目简介</strong>，在列表里一目了然。
          </Paragraph>
          <Paragraph strong>经验管理</Paragraph>
          <Paragraph>
            踩过的坑、写过的片段、记的笔记分散在各仓库里，想复用要靠记忆或满盘搜。码迹：<strong>项目级记录 + 中央知识库</strong>。你在每个项目里照常记，码迹帮你同步到「总库」（<code>~/.nexus/</code>），之后按类型、关键词检索，跨项目复用。
          </Paragraph>
          <ImgPlaceholder name="左边散落各项目 → 右边码迹中央知识库" />
        </>
      ),
    },
    {
      key: '2',
      label: '二、核心逻辑：两处存储，一条流水线',
      icon: <BookOutlined />,
      children: (
        <>
          <Paragraph strong>两处存储</Paragraph>
          <ul>
            <li><strong>项目里的 .nexus/</strong>：当前项目的调试经验、代码片段、笔记等，在 Cursor 里随写随存。</li>
            <li><strong>本机的 ~/.nexus/</strong>：所有项目汇总后的「中央知识库」+ 笔记库，在码迹里检索、浏览。</li>
          </ul>
          <Paragraph>关系：项目内 .nexus 是「输入端」，~/.nexus 是「汇总库」；同步 = 把输入端的新内容写入汇总库。</Paragraph>
          <ImgPlaceholder name="项目 .nexus → 同步 → ~/.nexus" />
          <Paragraph strong style={{ marginTop: 16 }}>一条流水线</Paragraph>
          <Paragraph><code>导入项目 → 在 Cursor 里开发、记录 → 回到码迹「一键同步」→ 知识库/笔记库里可查</code></Paragraph>
          <ImgPlaceholder name="三步流程图" />
        </>
      ),
    },
    {
      key: '3',
      label: '三、第一步：导入项目',
      icon: <FolderAddOutlined />,
      children: (
        <>
          <Paragraph>入口：左侧 <strong>「项目」</strong> → 右上 <strong>「导入项目」</strong>。多种灵活方式，满足不同习惯。</Paragraph>
          <ImgPlaceholder name="项目管理页 - 导入项目按钮" />
          <Paragraph strong>三种导入方式</Paragraph>
          <ul>
            <li><strong>本地项目</strong>：选文件夹 → 点「AI 分析」→ 自动归类、生成概括名与简介，并创建 .nexus。</li>
            <li><strong>GitHub</strong>：填仓库地址 → 克隆完成后 AI 分析 → 自动分类、概括名与简介、创建 .nexus。</li>
            <li><strong>批量扫描</strong>：选父目录 → 扫描未导入项目 → 批量 AI 分析并归档，每个项目都有概括名与简介。</li>
          </ul>
          <Paragraph>导入后项目卡片上会显示 <strong>概括名、简介、类型标签</strong>，一目了然。使用前请在「设置」→「大模型 API」中配置 API Key（用于自动分类与概括名/简介生成）。</Paragraph>
        </>
      ),
    },
    {
      key: '4',
      label: '四、第二步：在 Cursor 里开发并记录',
      icon: <CodeOutlined />,
      children: (
        <>
          <Paragraph>在项目列表中点击 <strong>「在 Cursor 打开」</strong>，开发时用自然语言让 AI 帮你记：</Paragraph>
          <ul>
            <li>「帮我记录这个 bug 的解决方案」→ 进入 .nexus/debug/</li>
            <li>「把这段代码保存到 nexus」→ 进入 .nexus/snippets/</li>
            <li>「记个笔记：I2C 时钟限制」→ 进入 .nexus/notes/</li>
          </ul>
          <Paragraph>.nexus 结构：project.yaml、notes/、debug/、snippets/、configs/、other/（所有项目共用同一套模板）。</Paragraph>
        </>
      ),
    },
    {
      key: '5',
      label: '五、第三步：回到码迹，一键同步',
      icon: <SyncOutlined />,
      children: (
        <>
          <Paragraph>在<strong>项目</strong>页找到对应项目，点击 <strong>「一键同步」</strong>。.nexus 里的内容会进入 ~/.nexus 知识库和笔记，之后在左侧「知识库」「笔记库」里检索复用。</Paragraph>
          <Paragraph>若在「设置」中开启了「同步时用 AI 分析」并已配置 API Key，同步时还会用 AI 补全标题、标签。</Paragraph>
          <ImgPlaceholder name="一键同步与知识库/笔记入口" />
        </>
      ),
    },
    {
      key: '6',
      label: '六、建议你先做的几件事',
      icon: <RobotOutlined />,
      children: (
        <ol>
          <li>在 <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate('/settings')}>设置</Button> →「大模型 API」中配置 API Key（用于导入时的 AI 分类与概括名/简介）。</li>
          <li>在 <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate('/projects')}>项目</Button> 页导入一个项目，确认出现且带 .nexus。</li>
          <li>用 Cursor 打开该项目，试记一条经验或笔记。</li>
          <li>回到码迹点「一键同步」，在 <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate('/knowledge')}>知识库</Button> 或 <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate('/notes')}>笔记库</Button> 中确认已出现。</li>
        </ol>
      ),
    },
  ]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2}>码迹 · 新手指南</Title>
        <Paragraph type="secondary">
          码迹做两件事：<strong>项目管理</strong>（多种方式导入、AI 自动分类、生成概括名与简介，一目了然）+ <strong>经验管理</strong>（记录 → 同步 → 知识库复用）。完整版见 <code>docs/新手指南.md</code>。
        </Paragraph>
        <Button
          type="primary"
          ghost
          size="small"
          style={{ marginTop: 8 }}
          onClick={() => {
            localStorage.removeItem('nexus_onboarding_completed')
            window.location.reload()
          }}
        >
          再次查看欢迎引导
        </Button>
      </div>
      <Card className={styles.card}>
        <Collapse
          defaultActiveKey={['1', '2', '3']}
          items={sections.map(s => ({
            key: s.key,
            label: (
              <Space>
                {s.icon}
                <span>{s.label}</span>
              </Space>
            ),
            children: s.children,
          }))}
        />
      </Card>
    </div>
  )
}

export default Guide
