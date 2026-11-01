# V0.4 场景源图

AI 生成的独立空场景，只有环境，没有人物、文字或交互元素。角色继续沿用 V0.3 原文件。
- garden-source.png：温暖明亮的奶油色庭院、浅陶土建筑、鼠尾草绿叶、柔和晨光。
- town-source.png：低对比城镇花园、浅色建筑、绿树与远山。
- 画风为柔和2D卡通，避免环境细节压过人物；不是将参考人群整图当背景。

运行时导出：
magick art-source/v04/garden-source.png -resize 720x960 -strip -quality 82 public/art/backgrounds/garden.webp
magick art-source/v04/town-source.png -resize 720x960 -strip -quality 82 public/art/backgrounds/town.webp

两张运行时图约 96KiB 和 131KiB；由 Phaser 用 cover 铺底，不调用 setInteractive，不参与人物命中。
