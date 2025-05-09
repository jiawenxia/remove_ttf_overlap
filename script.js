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
    let repoOwner = 'jiawenxia'; // 替换为你的GitHub用户名
    let repoName = 'remove_ttf_overlap'; // 替换为你的仓库名
    
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
        
        // 获取用户的 GitHub Token
        const githubToken = document.getElementById('github-token').value.trim();
        
        if (!githubToken) {
            showStatus('error', '请输入 GitHub Token 才能处理字体。');
            return;
        }
        
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
            const workflowData = {
                ref: 'main', // 您的主分支名
                inputs: {
                    fontBase64: base64Font,
                    fileName: selectedFile.name,
                    keepHinting: keepHinting.toString(),
                    ignoreErrors: ignoreErrors.toString(),
                    keepVars: keepVars.toString()
                }
            };
            
            showStatus('info', '正在触发字体处理...');
            
            // 使用用户提供的 token 调用 GitHub API
            const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/process-font.yml/dispatches`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(workflowData)
            });
            
            // GitHub 的工作流调度 API 通常返回 204 No Content
            if (response.status !== 204) {
                throw new Error(`GitHub API 返回了状态码 ${response.status}`);
            }
            
            // 获取最新的工作流运行信息
            const runsResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/process-font.yml/runs`, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!runsResponse.ok) {
                throw new Error('无法获取工作流运行信息');
            }
            
            const runsData = await runsResponse.json();
            if (runsData.workflow_runs && runsData.workflow_runs.length > 0) {
                currentWorkflowRunId = runsData.workflow_runs[0].id;
            } else {
                currentWorkflowRunId = 'unknown';
            }
            
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
        } finally {
            // 清除输入的 token，增加安全性
            document.getElementById('github-token').value = '';
        }
    });
    
    checkStatusBtn.addEventListener('click', async function() {
        if (!currentWorkflowRunId || currentWorkflowRunId === 'unknown') {
            showStatus('error', '无法检查状态：未知的工作流运行ID');
            return;
        }
        
        // 获取用户的 GitHub Token
        const githubToken = document.getElementById('github-token').value.trim();
        
        if (!githubToken) {
            showStatus('error', '请输入 GitHub Token 才能检查状态。');
            return;
        }
        
        showStatus('info', '正在检查处理状态...');
        
        try {
            const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/runs/${currentWorkflowRunId}`, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                throw new Error('无法获取工作流状态');
            }
            
            const data = await response.json();
            
            if (data.status === 'completed' && data.conclusion === 'success') {
                showStatus('success', '字体处理完成！可以从GitHub Action页面下载处理后的字体。');
                
                // 获取生成的字体文件
                const artifactsUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/runs/${currentWorkflowRunId}/artifacts`;
                const artifactsResponse = await fetch(artifactsUrl, {
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (artifactsResponse.ok) {
                    const artifactsData = await artifactsResponse.json();
                    if (artifactsData.artifacts && artifactsData.artifacts.length > 0) {
                        const downloadUrl = `https://github.com/${repoOwner}/${repoName}/actions/runs/${currentWorkflowRunId}/artifacts/${artifactsData.artifacts[0].id}`;
                        actionLinkElement.href = downloadUrl;
                        actionLinkElement.textContent = '下载处理后的字体';
                    }
                }
                
                checkStatusBtn.classList.add('hidden');
            } else if (data.status === 'completed') {
                showStatus('error', `处理失败，结论: ${data.conclusion}`);
            } else {
                showStatus('info', `当前状态: ${data.status}，请稍后再检查。`);
            }
            
        } catch (error) {
            console.error('检查状态错误:', error);
            showStatus('error', '检查状态失败: ' + error.message);
        } finally {
            // 清除输入的 token，增加安全性
            document.getElementById('github-token').value = '';
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
