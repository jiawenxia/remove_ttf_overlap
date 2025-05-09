document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('font-upload');
    const fileNameDisplay = document.getElementById('file-name');
    const processBtn = document.getElementById('process-btn');
    const statusDiv = document.getElementById('status');
    const resultSection = document.getElementById('result-section');
    const runIdElement = document.getElementById('run-id');
    const actionLinkElement = document.getElementById('action-link');
    const checkStatusBtn = document.getElementById('check-status-btn');
    
    let selectedFile = null;
    let repoOwner = 'jiawenxia'; // 您的GitHub用户名
    let repoName = 'remove_ttf_overlap'; // 您的仓库名
    
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            fileNameDisplay.textContent = "已选择: " + selectedFile.name;
            processBtn.disabled = false;
        } else {
            selectedFile = null;
            fileNameDisplay.textContent = "";
            processBtn.disabled = true;
        }
    });
    
    processBtn.addEventListener('click', function() {
        if (!selectedFile) return;
        
        // 获取选项
        const keepHinting = document.getElementById('keep-hinting').checked;
        const ignoreErrors = document.getElementById('ignore-errors').checked;
        const keepVars = document.getElementById('keep-vars').checked;
        
        // 创建指导说明
        showStatus('info', '请按照以下步骤上传并处理您的字体文件：');
        
        // 显示结果区域，但包含手动指导
        resultSection.classList.remove('hidden');
        runIdElement.innerHTML = `<strong>请按照以下步骤操作：</strong>`;
        
        // 构建 GitHub Actions 工作流链接，包含选项参数
        const workflowUrl = `https://github.com/${repoOwner}/${repoName}/actions/workflows/process-font.yml`;
        actionLinkElement.href = workflowUrl;
        actionLinkElement.textContent = '前往 GitHub Actions 处理字体';
        actionLinkElement.target = '_blank';
        
        // 替换结果区域内容
        const resultInfo = document.querySelector('.result-info');
        resultInfo.innerHTML = `
            <ol>
                <li>点击下方的 <strong>"前往 GitHub Actions 处理字体"</strong> 链接</li>
                <li>在 GitHub 页面点击 <strong>"Run workflow"</strong> 按钮</li>
                <li>设置处理选项：
                    <ul>
                        <li>保留提示信息：${keepHinting ? '是' : '否'}</li>
                        <li>忽略错误：${ignoreErrors ? '是' : '否'}</li>
                        <li>保留可变字体功能：${keepVars ? '是' : '否'}</li>
                    </ul>
                </li>
                <li>点击 <strong>"Run workflow"</strong> 按钮启动处理</li>
                <li>等待工作流运行（大约需要 1-2 分钟）</li>
                <li>在工作流完成后，在 "Artifacts" 部分下载处理后的字体</li>
            </ol>
        `;
        
        // 隐藏检查状态按钮，因为这需要手动操作
        checkStatusBtn.classList.add('hidden');
    });
    
    function showStatus(type, message) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.classList.remove('hidden');
    }
});
