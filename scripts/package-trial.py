"""Package the already built standalone HTML; no runtime dependency."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
source=Path('dist/find-crowd-v06.html')
if not source.exists():
    raise SystemExit('Run npm run build first')
instructions='''寻找人群 V0.6 审核草稿
解压后用桌面浏览器打开 play.html；不需要安装或联网。
第一关完成后点击 NEXT LEVEL 进入第二关。正确点击奖励三秒，错误点击扣两秒，批次动画不计时。
第二关在既有75/45人规模上采用新的自然排列；180/200人方案仍待容量、资源与人工审核。
真实 Safari、手机本地文件查看器、振动与手指精度仍需人工实测。
本包不等于已部署的在线网站。
'''
output=Path('dist/find-crowd-v06.zip')
with ZipFile(output,'w',ZIP_DEFLATED,compresslevel=9) as z:
    z.write(source,'play.html')
    z.writestr('README.txt',instructions)
with ZipFile(output) as z:
    assert z.testzip() is None
    assert z.read('play.html') == source.read_bytes()
print(output,round(output.stat().st_size/1024/1024,2),'MiB, CRC and HTML contents verified')
