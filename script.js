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
    let currentWorkflowRunId = null;
    let repoOwner = 'YOUR_USERNAME'; // 替换为你的GitHub用户名
    let repoName = 'YOUR_REPO';      // 替换为你的仓库名
    
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
    
    processBtn.addEventListener('click', async function() {
        if (!selectedFile) return;
        
        // 显示处理状态
        showStatus('info', '正在上传字体文件...');
        processBtn.disabled = true;
        
        try {
            // 将文件转换为Base64
            const base64Font = await fileToBase64(selectedFile);
            
            // 获取选项
            const keepHinting = document.getElementById('keep-hinting').checked;
            const ignoreErrors = document.getElementById('ignore-errors').checked;
            const keepVars = document.getElementById('keep-vars').checked;
            
            // 创建GitHub Action的输入参数
            const params = new URLSearchParams({
                fontBase64: base64Font,
                fileName: selectedFile.name,
                keepHinting: keepHinting,
                ignoreErrors: ignoreErrors,
                keepVars: keepVars
            });
            
            // 此处需要一个代理服务器来触发GitHub Action
            // 因为浏览器直接调用GitHub API会有CORS问题
            // 这里使用一个示例API端点
            showStatus('info', '正在触发字体处理...');
            
            // 在实际部署中，你需要创建一个GitHub App或第三方服务来处理这一步
            // 以下是一个简化的示例，假设有一个API可用
            const response = await fetch(`https://api.example.com/trigger-workflow?${params.toString()}`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('无法触发工作流');
            }
            
            const data = await response.json();
            currentWorkflowRunId = data.run_id;
            
            // 显示结果区域
            resultSection.classList.remove('hidden');
            runIdElement.textContent = `运行ID: ${currentWorkflowRunId}`;
            
            const actionUrl = `https://github.com/${repoOwner}/${repoName}/actions/runs/${currentWorkflowRunId}`;
            actionLinkElement.href = actionUrl;
            
            showStatus('success', '已成功触发字体处理，请查看GitHub Action运行详情。');
            
        } catch (error) {
            console.error('处理错误:', error);
            showStatus('error', '处理失败: ' + error.message);
            processBtn.disabled = false;
        }
    });
    
    checkStatusBtn.addEventListener('click', async function() {
        if (!currentWorkflowRunId) return;
        
        showStatus('info', '正在检查处理状态...');
        
        try {
            // 同样，在实际部署中需要一个代理服务
            const response = await fetch(`https://api.example.com/check-workflow-status?run_id=${currentWorkflowRunId}`);
            
            if (!response.ok) {
                throw new Error('无法获取工作流状态');
            }
            
            const data = await response.json();
            
            if (data.status === 'completed' && data.conclusion === 'success') {
                showStatus('success', '字体处理完成！可以从GitHub Action页面下载处理后的字体。');
                
                // 添加直接下载链接（如果GitHub Action工作流配置了上传处理后的字体）
                const downloadUrl = `https://github.com/${repoOwner}/${repoName}/actions/runs/${currentWorkflowRunId}/artifacts`;
                actionLinkElement.href = downloadUrl;
                actionLinkElement.textContent = '下载处理后的字体';
                
                checkStatusBtn.classList.add('hidden');
            } else if (data.status === 'completed') {
                showStatus('error', `处理失败，结论: ${data.conclusion}`);
            } else {
                showStatus('info', `当前状态: ${data.status}，请稍后再检查。`);
            }
            
        } catch (error) {
            console.error('检查状态错误:', error);
            showStatus('error', '检查状态失败: ' + error.message);
        }
    });
    
    function showStatus(type, message) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.classList.remove('hidden');
    }
    
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // 移除base64前缀
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }
});
