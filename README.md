# 字体去重叠工具

这是一个基于 GitHub Pages 和 GitHub Actions 的字体去重叠工具。它可以移除字体中的重叠轮廓，优化字体文件。

## 功能

- 移除字形中的重叠部分
- 可选择是否保留提示信息（hinting）
- 可选择是否保留可变字体功能
- 可选择是否忽略处理错误

## 如何使用

1. 访问 [https://your-username.github.io/your-repo-name](https://your-username.github.io/your-repo-name)
2. 上传您的字体文件
3. 选择处理选项
4. 点击"处理字体"按钮
5. 等待处理完成后，下载处理后的字体

## 技术说明

此工具使用：
- GitHub Pages 托管前端界面
- GitHub Actions 在后端处理字体
- fonttools 和 skia-pathops 库执行字体去重叠操作

## 本地开发

要在本地运行此项目：

```bash
# 克隆仓库
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name

# 安装Python依赖
pip install fonttools skia-pathops

# 测试脚本
python scripts/remove_overlaps.py input.ttf output.ttf
