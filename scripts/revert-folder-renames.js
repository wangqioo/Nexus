#!/usr/bin/env node
/**
 * 恢复：把被 sync-folder-names-once 改名的文件夹改回原来的名字，并更新 local-projects.json
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const DATA_DIR = path.join(os.homedir(), '.nexus')
const PROJECTS_FILE = path.join(DATA_DIR, 'local-projects.json')

// 当前文件夹名(新) -> 原文件夹名(旧)，用于恢复
const NEW_TO_OLD = {
  '智能穿戴设备': 'ESP32-S3-Touch-AMOLED-1',
  'InkTime-墨水屏相框': 'InkTime',
  'Claude-AI-开发示例': 'claude-demos',
  '立创ESP32-S3例程': 'lichuang-examples',
  'ESP32-P4-开发板示例': 'ESP32-P4-WIFI6-Touch-LCD-4B',
  'bbTalkie-对讲机': 'bbTalkie',
  'ESP32-双轴FOC云台': 'esp32_dual_foc_gimbal',
  'K230-开发项目': 'K230',
  '小智AI语音助手': 'xiaozhi-project',
  'Genesis-AI存在基底': 'Genesis',
  'MacroHard-Computer-Use': 'MacroHard',
  '智能宠物系统': 'smart-pet',
  '表情识别': 'emotion',
  'AI盲人眼镜': 'OpenAIglasses_for_Navigation',
  'Memos-笔记系统': 'memos',
  '单词卡发音': 'Word_Card_Pronounce',
  '泰山派-RK3566': 'TaiShanPai-RK3566',
  'OrangePi-5-Plus': 'OrangePi',
  'Echo-Mate-桌面机器人': 'Echo-Mate',
  'Apple-Watch-应用': 'Apple_watch',
  'Rokid-AR眼镜': 'rokid_glass',
  'Jetson-连接管理': 'Jetson',
  'Macintosh-小电脑': 'Macintosh',
  'Sphere-Cyber-动画': 'Sphere_Cyber_Animation',
  'ESP-Spot-IMU手势库': 'esp32_c5_imu',
  'EchoEar-智能旋转底座': 'esp-echoear-base',
  'ESP32-P4-NANO-Demo': 'ESP32-P4-NANO_Demo',
  'ESP32-P4-LVGL演示集': 'esp32-p4',
  'ESP32-P4-4.3寸LCD套件': 'esp32-p4_4.3',
  '传感器数据接收端': 'Data_reception',
  'Watch传感器采集': 'Data_sensor',
  'RobotDuck-语音机器人': 'RobotDuck_Head_Esp32',
  'ESP32-S3-学习资料': 'esp32-s3-experience',
  'ESP32-S3-Lottie动画': 'esp32s3_lottie_demo',
  'ESP32-S3-LED矩阵': 'esp32s3_matrix',
  'LED矩阵效果集': 'flickering_candlelight',
  'YOLO11n-目标检测': 'lichuang_object_detect',
  'LED矩阵-Arduino例程': 'matrix-examples',
  '灯哥FOC例程': 'DengFOC-examples',
  'SimpleFOC-例程集': 'SimpleFOC-examples',
  'FOC平衡小车': 'balance-car',
  'FOC-Arduino编译环境': 'foc_arduino_build',
  'PlatformIO云台控制': 'gimbal-control',
  '赛博项链-9x14-LED': '9x14led',
  '手势投影交互系统': 'gesture-projection',
  'SiFli-SDK-(OpenSiFli)': 'OpenSiFli',
  'V3P-双电机FOC': 'v3p',
  'Claude-项目集': 'Claude',
  '大模型统一管理平台': 'Model_Switch',
  '实时表情识别App': 'emotion_recognition_app',
  'AI-Agent开发教程': 'learn-claude-code',
  '树莓派连接管理': 'RaspberryPi',
  'MemOS-AI记忆后端': 'memos-core',
  'SoulOS-数据中心': 'SoulOS_DataCenter',
  'OpenClaw-AI助手': 'openclaw',
  'StarPicker-摘星': 'StarPicker',
  '微信机器人': 'WeChat_bot',
  '网页爬虫工具': 'web_scraper',
  '手势3D交互界面': 'gesture-ui-app',
  'Vision-Pro-风格界面': 'vision-pro-interface',
  'SimpleFOC-库': 'SimpleFOC',
  'ESP-AI-SDK-索引': 'esp-ai-sdk',
  'ESP-DL-Docker-环境': 'esp-dl-docker',
  'ESP-GMF-多媒体框架': 'esp-gmf',
  'ESP-IDF-多版本管理': 'esp-idf-versions',
  'ESP-TFLite-Micro-1': 'esp-tflite-micro',
  'rlottie-动画库': 'rlottie',
  '物理工程构建平台': 'BuildArena',
  'MCU开发平台': 'MCU',
  'DGX-Spark-开发环境': 'dgx-spark',
  'AI工作负载配置手册': 'dgx-spark-playbooks',
  'AI编程代理构建器': 'learn-claude-code',
}

function main() {
  if (!fs.existsSync(PROJECTS_FILE)) {
    console.error('未找到', PROJECTS_FILE)
    process.exit(1)
  }
  const data = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'))
  const projects = data.projects || []
  let reverted = 0
  for (const p of projects) {
    const currentPath = p.path
    if (!currentPath) continue
    const currentFolderName = path.basename(currentPath)
    const oldFolderName = NEW_TO_OLD[currentFolderName]
    if (!oldFolderName || oldFolderName === currentFolderName) continue
    const parentDir = path.dirname(currentPath)
    const oldPath = path.join(parentDir, oldFolderName)
    if (fs.existsSync(currentPath) && !fs.existsSync(oldPath)) {
      try {
        fs.renameSync(currentPath, oldPath)
        p.path = oldPath
        reverted++
        console.log('Revert:', currentFolderName, '->', oldFolderName)
      } catch (err) {
        console.error('FAIL:', currentPath, err.message)
      }
    }
  }
  if (reverted > 0) {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(data, null, 2), 'utf-8')
    console.log('\n已恢复', reverted, '个文件夹，已更新', PROJECTS_FILE)
  } else {
    console.log('无需恢复或目标已存在')
  }
}

main()
