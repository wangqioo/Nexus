import React from 'react'

// MCU 芯片图标
export const McuIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    {/* 芯片主体 */}
    <rect x="6" y="6" width="12" height="12" rx="1" fill="#2d2d2d" stroke="#52c41a" strokeWidth="1"/>
    {/* 引脚 - 上 */}
    <rect x="9" y="3" width="1.5" height="3" fill="#52c41a"/>
    <rect x="13.5" y="3" width="1.5" height="3" fill="#52c41a"/>
    {/* 引脚 - 下 */}
    <rect x="9" y="18" width="1.5" height="3" fill="#52c41a"/>
    <rect x="13.5" y="18" width="1.5" height="3" fill="#52c41a"/>
    {/* 引脚 - 左 */}
    <rect x="3" y="9" width="3" height="1.5" fill="#52c41a"/>
    <rect x="3" y="13.5" width="3" height="1.5" fill="#52c41a"/>
    {/* 引脚 - 右 */}
    <rect x="18" y="9" width="3" height="1.5" fill="#52c41a"/>
    <rect x="18" y="13.5" width="3" height="1.5" fill="#52c41a"/>
    {/* 芯片标记点 */}
    <circle cx="8.5" cy="8.5" r="1" fill="#52c41a"/>
  </svg>
)

// 图标映射 - 用于替代 emoji
export const ProjectTypeIcons: Record<string, React.FC<{ size?: number }>> = {
  mcu: McuIcon,
}

// 获取项目类型图标 (emoji 或 SVG)
export const getProjectTypeIcon = (type: string, icon: string, size = 16) => {
  const IconComponent = ProjectTypeIcons[type]
  if (IconComponent) {
    return <IconComponent size={size} />
  }
  return icon
}
