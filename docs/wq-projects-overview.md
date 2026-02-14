# /Users/wq 项目完整索引

> 更新时间：2026-02-14
> 总计：71 个项目 (MCU 30 / AI 10 / Software 18 / Linux 4 / Mobile 4 / Remote 5)

---

## 一、项目分类汇总

### 按项目类型
| 类型 | 数量 | 说明 |
|------|------|------|
| MCU/嵌入式 | 30 | ESP32全系列、SiFli、Arduino、K230 |
| AI/ML | 10 | 表情识别、语音交互、LLM、Computer-Use |
| 软件/Web | 18 | 含8个SDK/工具库 |
| Linux平台 | 4 | RK3566、OrangePi、RV1106、手势投影 |
| 移动端 | 4 | watchOS、macOS、Android AR |
| 远程设备 | 5 | DGX、Jetson、树莓派、Mac Mini |

### 按芯片/平台
| 芯片 | 数量 |
|------|------|
| ESP32-S3 | 14 |
| ESP32-P4 | 4 |
| ESP32 (Classic) | 5 |
| ESP32-C4 | 1 |
| ESP32-C5 | 1 |
| ESP32-C6/C61 | 1 |
| SF32LB5xx (SiFli) | 1 |
| K230 (Canaan) | 1 |
| Arduino Uno | 1 |
| RK3576/RK3588 | 1 |

### 按开发框架
| 框架 | 数量 |
|------|------|
| ESP-IDF | 18 |
| Arduino | 7 |
| PlatformIO | 1 |
| MicroPython | 2 |
| RT-Thread | 1 |
| CanMV MicroPython | 1 |

---

## 二、MCU/嵌入式项目详情 (30个)

### ESP32-S3 系列 (14个)

#### 1. 智能穿戴设备
- **路径**: `Workshop/MCU/ESP32-S3/ESP32-S3-Touch-AMOLED-1`
- **框架**: ESP-IDF | **芯片**: ESP32-S3
- **描述**: 触控AMOLED手表开发板，已初始化 .nexus，8个知识文档
- **状态**: ✅ 活跃

#### 2. InkTime 墨水屏相框
- **路径**: `Workshop/MCU/ESP32-S3/InkTime`
- **框架**: Arduino | **芯片**: ESP32-S3
- **描述**: AI驱动墨水屏回忆相框，7.3寸六色E-Paper，Floyd-Steinberg抖动
- **状态**: ✅ 活跃

#### 3. Claude AI 开发示例
- **路径**: `Workshop/MCU/ESP32-S3/claude-demos`
- **框架**: ESP-IDF | **芯片**: ESP32-S3
- **描述**: Claude辅助开发的11个子项目：表情动画、人脸追踪、IMU绘图、3D立方体等
- **状态**: ✅ 活跃

#### 4. 立创ESP32-S3例程
- **路径**: `Workshop/MCU/ESP32-S3/lichuang-examples`
- **框架**: ESP-IDF | **芯片**: ESP32-S3
- **描述**: 16个官方例程：按键、姿态、SD卡、音频、LCD、WiFi、BLE、语音识别、人脸检测、YOLO等
- **状态**: ✅ 活跃

#### 5. RobotDuck 语音机器人 🆕
- **路径**: `Workshop/MCU/ESP32-S3/RobotDuck_Head_Esp32`
- **框架**: Arduino + Python | **芯片**: XIAO ESP32-S3 Sense
- **描述**: 语音机器人：FunASR ASR + CosyVoice TTS，16通道舵机，4-DOF机械臂，MediaPipe手势
- **状态**: ✅ 活跃

#### 6. ESP32-S3 学习资料 🆕
- **路径**: `Workshop/MCU/ESP32-S3/esp32-s3-experience`
- **框架**: ESP-IDF | **芯片**: ESP32-S3
- **描述**: 立创ESP32-S3 BSP（LCD、Camera、ES7210/ES8311、QMI8658）+ AI量化部署资料
- **状态**: ✅ 活跃

#### 7. ESP32-S3 Lottie动画 🆕
- **路径**: `Workshop/MCU/ESP32-S3/esp32s3_lottie_demo`
- **框架**: ESP-IDF | **芯片**: ESP32-S3
- **描述**: ST7789 320x240 LCD上的rlottie矢量动画渲染，LVGL v8集成
- **状态**: ✅ 活跃

#### 8. ESP32-S3 LED矩阵 🆕
- **路径**: `Workshop/MCU/ESP32-S3/esp32s3_matrix`
- **框架**: ESP-IDF | **芯片**: ESP32-S3
- **描述**: WS2812 LED矩阵效果：烛光、游戏、字体显示、彩虹渐变
- **状态**: ✅ 活跃

#### 9. LED矩阵效果集 (flickering_candlelight) 🆕
- **路径**: `Workshop/MCU/ESP32-S3/flickering_candlelight`
- **框架**: ESP-IDF / MicroPython | **芯片**: ESP32-S3 / ESP32-C4
- **描述**: 11个LED矩阵视觉效果子项目：火焰、水波、水流、反重力、游戏、彩虹，支持QMI8658 IMU交互
- **子项目**: `esp32s3_candlelight`, `esp32s3_water_wave`, `esp32s3_antigravity`, `esp32s3_dual_effect`, `esp32s3_matrix_game` 等
- **状态**: ✅ 活跃

#### 10. YOLO11n 目标检测 🆕
- **路径**: `Workshop/MCU/ESP32-S3/lichuang_object_detect`
- **框架**: ESP-IDF | **芯片**: ESP32-S3
- **描述**: 立创ESP32-S3实时YOLO11n目标检测，COCO 80类，三任务+双核架构
- **状态**: ✅ 活跃

#### 11. LED矩阵 Arduino例程 🆕
- **路径**: `Workshop/MCU/ESP32-S3/matrix-examples`
- **框架**: Arduino | **芯片**: ESP32-S3
- **描述**: WS2812矩阵Arduino示例：色彩、字体、QMI8658游戏、HTTP控制
- **状态**: ✅ 活跃

#### 12. 传感器数据接收端 🆕
- **路径**: `Workshop/MCU/ESP32-S3/Data_reception`
- **框架**: SwiftUI | **平台**: macOS
- **描述**: macOS应用，实时接收Apple Watch传感器数据并展示
- **状态**: ✅ 活跃

#### 13. Watch传感器采集 🆕
- **路径**: `Workshop/MCU/ESP32-S3/Data_sensor`
- **框架**: SwiftUI | **平台**: watchOS
- **描述**: Apple Watch传感器数据采集和流式传输
- **状态**: ✅ 活跃

#### 14. bbTalkie 对讲机
- **路径**: `Workshop/MCU/ESP32/bbTalkie`
- **框架**: ESP-IDF | **芯片**: ESP32
- **描述**: ESP32免按键便携对讲机
- **状态**: ✅ 活跃

### ESP32-P4 系列 (4个)

#### 15. ESP32-P4 WiFi6 LCD 开发板
- **路径**: `Workshop/MCU/ESP32-P4/ESP32-P4-WIFI6-Touch-LCD-4B`
- **框架**: ESP-IDF | **芯片**: ESP32-P4
- **描述**: 14+个示例：MIPI-DSI LCD (ST7703, 720x720)、触摸、摄像头、I2S音频、WiFi6、以太网、USB OTG、LVGL v8/v9
- **状态**: ✅ 活跃

#### 16. ESP32-P4 NANO Demo 🆕
- **路径**: `Workshop/MCU/ESP32-P4/ESP32-P4-NANO_Demo`
- **框架**: ESP-IDF | **芯片**: ESP32-P4
- **描述**: NANO开发板示例集：HelloWorld、I2C、WiFi、以太网、SDMMC、I2S、LVGL、摄像头、esp_brookesia
- **状态**: ✅ 活跃

#### 17. ESP32-P4 LVGL演示集 🆕
- **路径**: `Workshop/MCU/ESP32-P4/esp32-p4`
- **框架**: ESP-IDF | **芯片**: ESP32-P4
- **描述**: LVGL触摸演示、widgets demo、Lottie动画测试
- **状态**: ✅ 活跃

#### 18. ESP32-P4 4.3寸LCD套件 🆕
- **路径**: `Workshop/MCU/ESP32-P4/esp32-p4_4.3`
- **框架**: ESP-IDF / Arduino | **芯片**: ESP32-P4
- **描述**: 4.3寸ST7701 LCD开发套件：LVGL v8/v9、MP3播放、WiFi、视频显示、小智ESP32
- **状态**: ✅ 活跃

### ESP32-C5/C6 系列 (2个)

#### 19. ESP-Spot IMU手势库 🆕
- **路径**: `Workshop/MCU/ESP32-C5/esp32_c5_imu`
- **框架**: ESP-IDF | **芯片**: ESP32-C5 / ESP32-S3
- **描述**: BMI270 IMU手势识别库：摇晃、旋转、圆形手势、多点触击、推拉检测、ESP-NOW控灯、深睡眠唤醒
- **状态**: ✅ 活跃

#### 20. EchoEar 智能旋转底座 🆕
- **路径**: `Workshop/MCU/ESP32-C6x/esp-echoear-base`
- **框架**: ESP-IDF | **芯片**: ESP32-C61
- **描述**: 智能旋转底座：步进电机、磁吸开关、BMM150、CSI感知、UART协议，自动追踪声源
- **状态**: ✅ 活跃

### FOC 电机控制系列 (6个)

#### 21. ESP32 双轴FOC云台
- **路径**: `Workshop/MCU/FOC-Projects/esp32_dual_foc_gimbal`
- **框架**: ESP-IDF | **芯片**: ESP32
- **描述**: ESP32双轴FOC无刷电机云台控制
- **状态**: ✅ 活跃

#### 22. 灯哥FOC例程 🆕
- **路径**: `Workshop/MCU/FOC-Projects/DengFOC-examples`
- **框架**: Arduino | **芯片**: ESP32
- **描述**: 灯哥FOC课程系列代码：开/闭环速度控制、位置控制、电流检测、AS5600编码器
- **状态**: ✅ 活跃

#### 23. SimpleFOC 例程集 🆕
- **路径**: `Workshop/MCU/FOC-Projects/SimpleFOC-examples`
- **框架**: Arduino | **芯片**: ESP32
- **描述**: 25个SimpleFOC例程：双电机、AS5600/AS5047P编码器、步进电机、霍尔传感器、蓝牙控制
- **状态**: ✅ 活跃

#### 24. FOC平衡小车 🆕
- **路径**: `Workshop/MCU/FOC-Projects/balance-car`
- **框架**: ESP-IDF | **芯片**: ESP32-S3
- **描述**: FOC平衡小车/测试：AS5600编码器、开环/角度控制、K230 UART远程控制
- **状态**: ✅ 活跃

#### 25. PlatformIO云台控制 🆕
- **路径**: `Workshop/MCU/FOC-Projects/gimbal-control`
- **框架**: PlatformIO | **芯片**: ESP32-S3 (Lolin S3)
- **描述**: SimpleFOC 2.3.0 LEDC云台控制
- **状态**: ✅ 活跃

#### 26. FOC Arduino编译环境 🆕
- **路径**: `Workshop/MCU/FOC-Projects/foc_arduino_build`
- **框架**: Arduino | **芯片**: ESP32
- **描述**: ESP32 Arduino环境搭建指南和SimpleFOC编译烧录工具
- **状态**: ✅ 活跃

### 其他 MCU (4个)

#### 27. K230 开发项目
- **路径**: `Workshop/MCU/K230`
- **框架**: CanMV MicroPython | **芯片**: K230
- **描述**: 嘉楠K230 AI开发板：语音对话、表情动画、人脸检测、云台控制
- **状态**: ✅ 活跃

#### 28. SiFli SDK (OpenSiFli) 🆕
- **路径**: `Workshop/MCU/SiFli/OpenSiFli`
- **框架**: RT-Thread | **芯片**: SF32LB5xx
- **描述**: 思澈SiFli芯片SDK：100+示例，LVGL v8/v9、BLE、音频、多核通信、FlashDB
- **状态**: ✅ 活跃

#### 29. 赛博项链 9x14 LED 🆕
- **路径**: `Workshop/MCU/MicroPython/9x14led`
- **框架**: MicroPython | **芯片**: ESP32-C4
- **描述**: 穿戴式赛博项链：9x14 PWM LED矩阵，火焰、文字滚动、俄罗斯方块、赛车，BLE配置
- **状态**: ✅ 活跃

#### 30. Sphere Cyber 动画 🆕
- **路径**: `Workshop/MCU/Arduino/Sphere_Cyber_Animation`
- **框架**: Arduino | **芯片**: Arduino Uno R3
- **描述**: ST7735 TFT三态赛博风格动画：启动、录制、休眠
- **状态**: ✅ 活跃

---

## 三、AI/ML 项目详情 (10个)

#### 1. Genesis AI存在基底
- **路径**: `Workshop/AI/Genesis`
- **框架**: Python
- **描述**: AI为自己设计的存在形式
- **状态**: ✅ 活跃

#### 2. MacroHard Computer-Use
- **路径**: `Workshop/AI/MacroHard`
- **框架**: Python
- **描述**: AI桌面控制代理，Claude Computer Use
- **状态**: ✅ 活跃

#### 3. MiniCPM
- **路径**: `Workshop/AI/MiniCPM`
- **框架**: llama.cpp | **模型**: LLM
- **描述**: 轻量级大语言模型端侧部署
- **状态**: ✅ 活跃

#### 4. 智能宠物系统
- **路径**: `Workshop/AI/smart-pet`
- **框架**: Python
- **描述**: 云端+本地智能宠物交互系统
- **状态**: ✅ 活跃

#### 5. 表情识别
- **路径**: `Workshop/AI/emotion`
- **框架**: TensorFlow | **模型**: CNN
- **描述**: 人脸表情识别项目
- **状态**: ✅ 活跃

#### 6. AI盲人眼镜
- **路径**: `Workshop/AI/OpenAIglasses_for_Navigation`
- **框架**: Python
- **描述**: 视障人士智能导航辅助系统
- **状态**: ✅ 活跃

#### 7. Claude 项目集 🆕
- **路径**: `Workshop/AI/Claude`
- **框架**: Python/FastAPI + Vue 3
- **描述**: 社交视频自动上传 (regart/未及) + MemOS AI记忆操作系统
- **状态**: ✅ 活跃

#### 8. 大模型统一管理平台 🆕
- **路径**: `Workshop/AI/Model_Switch`
- **框架**: Tauri 2 + Vue 3 + Rust
- **描述**: LLM API统一管理桌面应用
- **状态**: ✅ 活跃

#### 9. 实时表情识别App 🆕
- **路径**: `Workshop/AI/emotion_recognition_app`
- **框架**: RKNN-Lite2 | **模型**: CNN
- **描述**: RK3576/RK3588 NPU加速实时人脸表情识别，7种情绪
- **状态**: ✅ 活跃

#### 10. AI Agent开发教程 🆕
- **路径**: `Workshop/AI/learn-claude-code`
- **框架**: Anthropic API
- **描述**: 从零构建AI编程代理教程，兼容Claude Code/Cursor
- **状态**: ✅ 活跃

---

## 四、软件/Web 项目详情 (10个)

#### 1. Memos 笔记系统
- **路径**: `Workshop/Software/Go/memos`
- **技术栈**: Go, React, SQLite
- **描述**: 轻量级笔记和知识管理系统
- **状态**: ✅ 活跃

#### 2. 单词卡发音
- **路径**: `Workshop/Software/Word_Card_Pronounce`
- **技术栈**: Python, TTS
- **描述**: 单词卡发音学习应用
- **状态**: ✅ 活跃

#### 3. MemOS AI记忆后端 🆕
- **路径**: `Workshop/Software/Go/memos-core`
- **技术栈**: Python, FastAPI, PostgreSQL, Neo4j, Qdrant
- **描述**: AI记忆操作系统后端：知识图谱+向量数据库+异步处理
- **状态**: ✅ 活跃

#### 4. SoulOS 数据中心 🆕
- **路径**: `Workshop/Software/Node/SoulOS_DataCenter`
- **技术栈**: Next.js, React, TypeScript, Radix UI
- **描述**: 个人AI数据中心：数据源管理、ASR、Obsidian集成、AI对话
- **状态**: ✅ 活跃

#### 5. OpenClaw AI助手 🆕
- **路径**: `Workshop/Software/Node/openclaw`
- **技术栈**: Node.js, TypeScript
- **描述**: 自托管AI助手：WhatsApp/Telegram/Slack/Discord多平台聊天机器人
- **状态**: ✅ 活跃

#### 6. StarPicker 摘星 🆕
- **路径**: `Workshop/Software/Python/StarPicker`
- **技术栈**: Python, OpenAI, SQLite, yt-dlp
- **描述**: 网页内容提取和AI摘要：文章、图片、视频、LLM总结
- **状态**: ✅ 活跃

#### 7. 微信机器人 🆕
- **路径**: `Workshop/Software/Python/WeChat_bot`
- **技术栈**: Go, Beego
- **描述**: 基于iPad协议的微信自动化
- **状态**: ✅ 活跃

#### 8. 网页爬虫工具 🆕
- **路径**: `Workshop/Software/Python/web_scraper`
- **技术栈**: Python, BeautifulSoup, html2text
- **描述**: 网页文本提取为Markdown+图片下载
- **状态**: ✅ 活跃

#### 9. 手势3D交互界面 🆕
- **路径**: `Workshop/Software/Web/gesture-ui-app`
- **技术栈**: Three.js, MediaPipe, HTML/JS
- **描述**: MediaPipe手势识别控制Three.js 3D界面
- **状态**: ✅ 活跃

#### 10. Vision Pro 风格界面 🆕
- **路径**: `Workshop/Software/Web/vision-pro-interface`
- **技术栈**: HTML5, CSS3, MediaPipe
- **描述**: Vision Pro风格桌面手势交互UI，毛玻璃效果
- **状态**: ✅ 活跃

---

## 五、SDK/工具库 (8个)

#### 1. SimpleFOC 库 🆕
- **路径**: `SDK/SimpleFOC`
- **技术**: C++, Arduino
- **描述**: 开源FOC无刷/步进电机控制库，支持Arduino/ESP32/STM32/RP2040

#### 2. ESP AI SDK 索引 🆕
- **路径**: `SDK/esp-ai-sdk`
- **描述**: Espressif AI仓库聚合：ESP-DL、ESP-WHO、ESP-SR、ESP-SKAINet、ESP-DSP

#### 3. ESP-DL Docker 环境 🆕
- **路径**: `SDK/esp-dl-docker`
- **技术**: Docker, Python, PyTorch, ESP-PPQ
- **描述**: Docker化ESP-DL开发：模型训练 -> 量化 -> ESP32部署

#### 4. ESP-GMF 多媒体框架 🆕
- **路径**: `SDK/esp-gmf`
- **技术**: C, ESP-IDF
- **描述**: Espressif通用多媒体框架：音频/图像/视频管线处理

#### 5. ESP-IDF v5.5.2 🆕
- **路径**: `SDK/esp-idf-home`
- **描述**: Espressif官方ESP32开发框架本地安装

#### 6. ESP-IDF 多版本管理 🆕
- **路径**: `SDK/esp-idf-versions`
- **描述**: ESP-IDF多版本存储，支持版本切换

#### 7. ESP TFLite Micro 🆕
- **路径**: `SDK/esp-tflite-micro`
- **技术**: C++, TensorFlow Lite Micro
- **描述**: TensorFlow Lite Micro for ESP32，支持ESP-IDF v4.4+

#### 8. rlottie 动画库 🆕
- **路径**: `SDK/rlottie`
- **技术**: C++14, CMake/Meson
- **描述**: Samsung开源Lottie矢量动画渲染库

---

## 六、Linux平台项目详情 (4个)

#### 1. 泰山派 RK3566
- **路径**: `Workshop/Linux/TaiShanPai-RK3566`
- **系统**: Debian | **内核**: Linux 5.10
- **描述**: 立创泰山派开发板资料和项目，含Cairo动态表情系统
- **状态**: ✅ 活跃

#### 2. OrangePi 5 Plus
- **路径**: `Workshop/Linux/OrangePi`
- **系统**: Ubuntu | **内核**: Linux 5.10
- **描述**: OrangePi 5 Plus RK3588开发
- **状态**: ✅ 活跃

#### 3. Echo-Mate 桌面机器人
- **路径**: `Workshop/Linux/RV1106/Echo-Mate`
- **系统**: Buildroot
- **描述**: RV1106 Linux桌面机器人
- **状态**: ✅ 活跃

#### 4. 手势投影交互系统 🆕
- **路径**: `Workshop/MCU/RK3588/gesture-projection`
- **系统**: Debian 12 / Buildroot
- **描述**: RK3576/RK3588桌面手势投影：红外摄像头+RKNN推理+WebSocket
- **状态**: 🔄 进行中

---

## 七、移动端项目详情 (4个)

#### 1. Apple Watch 应用
- **路径**: `Workshop/Mobile/watchOS/Apple_watch`
- **平台**: watchOS 9.0+ | **框架**: SwiftUI
- **描述**: Apple Watch 传感器数据采集和流式传输

#### 2. Rokid AR眼镜
- **路径**: `Workshop/Mobile/AR/rokid_glass`
- **平台**: Android
- **描述**: Rokid AR眼镜开发

#### 3. 传感器数据接收端 🆕
- **路径**: `Workshop/MCU/ESP32-S3/Data_reception`
- **平台**: macOS | **框架**: SwiftUI
- **描述**: macOS应用，实时接收Apple Watch传感器数据

#### 4. Watch传感器采集 🆕
- **路径**: `Workshop/MCU/ESP32-S3/Data_sensor`
- **平台**: watchOS | **框架**: SwiftUI
- **描述**: Apple Watch传感器数据采集和流式传输

---

## 八、远程设备管理 (5个)

#### 1. DGX Spark
- **路径**: `Workshop/Remote/DGX-Spark`
- **描述**: NVIDIA DGX Spark 部署和管理

#### 2. Jetson 连接管理
- **路径**: `Workshop/Remote/Jetson`
- **描述**: NVIDIA Jetson 远程连接和部署

#### 3. Mac Mini M4
- **路径**: `Workshop/Remote/Mac-Mini-M4`
- **描述**: Mac Mini M4 远程连接

#### 4. Macintosh 小电脑
- **路径**: `Workshop/Remote/Macintosh`
- **描述**: 泰山派核心的Macintosh小电脑

#### 5. 树莓派连接管理 🆕
- **路径**: `Workshop/Linux/RaspberryPi`
- **描述**: Raspberry Pi 5 SSH连接和状态检查脚本

---

## 九、MCU其他项目

#### V3P 双电机FOC 🆕
- **路径**: `Workshop/Linux/v3p`
- **芯片**: ESP32 / STM32 | **框架**: Arduino
- **描述**: V3P开发板FOC控制例程：SimpleFOC、DengFOC、AS5600

#### 小智AI语音助手
- **路径**: `Workshop/MCU/xiaozhi/xiaozhi-project`
- **芯片**: ESP32-S3 | **框架**: ESP-IDF
- **描述**: 基于MCP协议的AI语音助手，支持70+开源硬件

---

## 十、按功能分类索引

### 显示类
| 项目 | 显示方式 | 芯片 |
|------|----------|------|
| ESP32-P4-WIFI6-Touch-LCD-4B | MIPI-DSI LCD (ST7703, 720x720) | ESP32-P4 |
| ESP32-P4 NANO Demo | MIPI-DSI LCD | ESP32-P4 |
| ESP32-P4 4.3寸LCD | ST7701 480x480 | ESP32-P4 |
| InkTime | 7.3寸六色E-Paper | ESP32-S3 |
| flickering_candlelight | WS2812 8x8 LED矩阵 | ESP32-S3 |
| esp32s3_matrix | WS2812 LED矩阵 | ESP32-S3 |
| esp32s3_lottie_demo | ST7789 320x240 SPI LCD | ESP32-S3 |
| 赛博项链 9x14 LED | 9x14 PWM LED | ESP32-C4 |
| Sphere Cyber | ST7735 160x128 TFT | Arduino Uno |

### AI/语音类
| 项目 | AI能力 | 芯片 |
|------|--------|------|
| 小智AI | ASR+LLM+TTS | ESP32-S3 |
| K230 开发项目 | 语音对话+人脸检测 | K230 |
| RobotDuck | FunASR+CosyVoice+视觉QA | ESP32-S3 |
| YOLO11n 目标检测 | YOLO11n实时推理 | ESP32-S3 |
| 手势投影系统 | RKNN手势/物体检测 | RK3576 |
| 实时表情识别App | RKNN表情识别 | RK3576 |

### 电机/运动控制
| 项目 | 控制方式 | 芯片 |
|------|----------|------|
| ESP32 双轴FOC云台 | FOC双轴 | ESP32 |
| SimpleFOC 例程集 | 25个FOC示例 | ESP32 |
| 灯哥FOC例程 | DengFOC系列 | ESP32 |
| FOC平衡小车 | FOC+K230控制 | ESP32-S3 |
| PlatformIO云台控制 | SimpleFOC+PIO | ESP32-S3 |
| V3P 双电机FOC | SimpleFOC/DengFOC | ESP32/STM32 |

### 传感器/手势
| 项目 | 传感器 | 芯片 |
|------|--------|------|
| ESP-Spot IMU手势库 | BMI270 | ESP32-C5 |
| flickering_candlelight | QMI8658 | ESP32-S3 |
| Apple Watch | 多传感器 | watchOS |
| EchoEar 旋转底座 | BMM150+CSI | ESP32-C61 |

---

*文档生成于 Nexus 项目管理器 - 2026-02-14*
