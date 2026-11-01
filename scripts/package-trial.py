"""Package the already built standalone HTML; no runtime dependency."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
source=Path('dist/find-crowd-v03.html')
if not source.exists():
    raise SystemExit('Run npm run build first')
instructions='''寻找人群 V0.3 离线试玩
解压后，用桌面 Chrome / Edge / Safari 打开 play.html。
脚本、样式与150个人物都包含在此文件内，不需要安装或联网。
手机文件查看器可能不执行网页脚本；真实手机Safari行为尚待真机验证。
第一关10人；第二关150人；另有明确标注的35人密集样板。
短屏视野不足时150人入口会锁定，不会把正式人数减少。
本包不等于已部署的在线网站。
'''
output=Path('dist/find-crowd-v03.zip')
with ZipFile(output,'w',ZIP_DEFLATED,compresslevel=9) as z:
    z.write(source,'play.html')
    z.writestr('README.txt',instructions)
with ZipFile(output) as z:
    assert z.testzip() is None
    assert z.read('play.html') == source.read_bytes()
print(output,round(output.stat().st_size/1024/1024,2),'MiB, CRC and HTML contents verified')
