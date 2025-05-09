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
    let repoOwner = 'jiawenxia'; // 您的GitHub用户名
    let repoName = 'remove_ttf_overlap'; // 您的仓库名
    
    console.log("页面初始化完成，等待用户操作...");
    
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            fileNameDisplay.textContent = "已选择: " + selectedFile.name;
            processBtn.disabled = false;
            console.log("用户选择了文件:", selectedFile.name, "大小:", (selectedFile.size / 1024 / 1024).toFixed(2), "MB");
        } else {
            selectedFile = null;
            fileNameDisplay.textContent = "";
            processBtn.disabled = true;
            console.log("用户取消了文件选择");
        }
    });
    
    processBtn.addEventListener('click', async function() {
        if (!selectedFile) {
            console.log("没有选择文件，无法处理");
            return;
        }
        
        // 获取用户的 GitHub Token
        const githubToken = document.getElementById('github-token').value.trim();
        
        if (!githubToken) {
            showStatus('error', '请输入 GitHub Token 才能处理字体。');
            console.log("未提供 GitHub Token");
            return;
        }
        
        // 检查 token 格式
        console.log("Token 格式检查 - 长度:", githubToken.length, "前缀:", githubToken.substring(0, 4));
        if (!githubToken.startsWith("ghp_") && !githubToken.startsWith("github_pat_")) {
            showStatus('error', '无效的 GitHub Token 格式。应以 ghp_ 或 github_pat_ 开头。');
            console.log("Token 格式不正确");
            return;
        }
        
        // 检查文件大小 - GitHub有请求大小限制
        if (selectedFile.size > 25 * 1024 * 1024) { // 25MB
            showStatus('error', '文件太大，无法通过API处理。请使用小于25MB的文件。');
            console.log("文件太大:", (selectedFile.size / 1024 / 1024).toFixed(2), "MB");
            return;
        }
        
        // 显示处理状态
        showStatus('info', '正在准备字体文件...');
        processBtn.disabled = true;
        console.log("开始处理文件...");
        
        try {
            // 将文件转换为Base64
            console.log("开始转换文件为Base64...");
            const base64Font = await fileToBase64(selectedFile);
            console.log("Base64转换完成，长度:", base64Font.length);
            
            // 获取选项
            const keepHinting = document.getElementById('keep-hinting').checked;
            const ignoreErrors = document.getElementById('ignore-errors').checked;
            const keepVars = document.getElementById('keep-vars').checked;
            
            console.log("处理选项:", {
                keepHinting,
                ignoreErrors,
                keepVars,
                fileName: selectedFile.name
            });
            
            // 检查工作流文件是否存在
            console.log("检查工作流文件是否存在...");
            try {
                const workflowCheckResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/.github/workflows/process-font.yml`, {
                    headers: {
                        'Authorization': `Bearer ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (!workflowCheckResponse.ok) {
                    console.log("工作流文件检查失败:", workflowCheckResponse.status);
                    if (workflowCheckResponse.status === 404) {
                        showStatus('error', '仓库中找不到工作流文件 process-font.yml。请先创建工作流文件。');
                        return;
                    }
                } else {
                    console.log("工作流文件存在");
                }
            } catch (e) {
                console.log("检查工作流文件时出错:", e);
            }
            
            // 创建GitHub Action的输入参数
            const workflowData = {
                ref: 'main', // 确认这是您的默认分支名称
                inputs: {
                    fontBase64: base64Font,
                    fileName: selectedFile.name,
                    keepHinting: keepHinting.toString(),
                    ignoreErrors: ignoreErrors.toString(),
                    keepVars: keepVars.toString()
                }
            };
            
            showStatus('info', '正在触发字体处理...');
            
            // 调试输出请求详情（不含敏感信息）
            console.log("发送请求到:", `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/process-font.yml/dispatches`);
            console.log("请求方法:", "POST");
            console.log("请求头:", {
                'Authorization': 'Bearer [REDACTED]',
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            });
            
            const workflowDataForLog = {
                ref: workflowData.ref,
                inputs: {
                    fileName: workflowData.inputs.fileName,
                    keepHinting: workflowData.inputs.keepHinting,
                    ignoreErrors: workflowData.inputs.ignoreErrors,
                    keepVars: workflowData.inputs.keepVars,
                    fontBase64: `[base64 string length: ${base64Font.length}]`
                }
            };
            console.log("请求体:", JSON.stringify(workflowDataForLog));
            
            // 发送API请求
            console.log("发送请求...");
            const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/process-font.yml/dispatches`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(workflowData)
            });
            
            console.log("收到响应 - 状态码:", response.status);
            
            // 更详细的错误处理
            if (!response.ok) {
                console.log("请求失败 - 状态码:", response.status);
                
                let errorText = '';
                try {
                    const errorData = await response.json();
                    console.log("错误响应数据:", errorData);
                    errorText = JSON.stringify(errorData);
                } catch (e) {
                    console.log("无法解析错误响应为JSON:", e);
                    errorText = await response.text();
                    console.log("错误响应文本:", errorText);
                }
                
                // 对422错误进行特殊处理
                if (response.status === 422) {
                    console.log("触发422错误 - 请检查分支名称和工作流是否存在");
                    
                    // 检查仓库分支
                    console.log("获取仓库分支信息...");
                    try {
                        const branchesResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/branches`, {
                            headers: {
                                'Authorization': `Bearer ${githubToken}`,
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        });
                        
                        if (branchesResponse.ok) {
                            const branches = await branchesResponse.json();
                            console.log("仓库分支:", branches.map(b => b.name));
                            
                            // 检查默认分支
                            console.log("检查默认分支...");
                            const repoResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
                                headers: {
                                    'Authorization': `Bearer ${githubToken}`,
                                    'Accept': 'application/vnd.github.v3+json'
                                }
                            });
                            
                            if (repoResponse.ok) {
                                const repoData = await repoResponse.json();
                                console.log("仓库默认分支:", repoData.default_branch);
                                
                                // 如果默认分支与请求中的不一致，给出警告
                                if (repoData.default_branch !== workflowData.ref) {
                                    console.log("警告: 请求中的分支与默认分支不一致");
                                    workflowData.ref = repoData.default_branch;
                                    console.log("尝试使用默认分支:", repoData.default_branch);
                                    
                                    // 尝试使用正确的分支重新发送请求
                                    console.log("使用正确的分支重新发送请求...");
                                    const retryResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/process-font.yml/dispatches`, {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${githubToken}`,
                                            'Accept': 'application/vnd.github.v3+json',
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(workflowData)
                                    });
                                    
                                    console.log("重试响应状态码:", retryResponse.status);
                                    
                                    if (retryResponse.ok) {
                                        console.log("使用正确的分支重试成功!");
                                        // 继续处理成功的情况
                                    } else {
                                        let retryErrorText = '';
                                        try {
                                            const retryErrorData = await retryResponse.json();
                                            retryErrorText = JSON.stringify(retryErrorData);
                                            console.log("重试错误响应:", retryErrorData);
                                        } catch (e) {
                                            retryErrorText = await retryResponse.text();
                                            console.log("重试错误文本:", retryErrorText);
                                        }
                                        throw new Error(`使用正确分支 ${repoData.default_branch} 重试失败: ${retryResponse.status} - ${retryErrorText}`);
                                    }
                                } else {
                                    throw new Error(`GitHub API 返回了状态码 ${response.status}: ${errorText}\n\n请确认以下内容:\n1. 工作流文件 process-font.yml 存在\n2. Token有足够权限\n3. 分支名称正确`);
                                }
                            }
                        }
                    } catch (branchError) {
                        console.log("获取分支信息失败:", branchError);
                    }
                } else {
                    throw new Error(`GitHub API 返回了状态码 ${response.status}: ${errorText}`);
                }
            }
            
            // 成功处理后的逻辑
            console.log("请求发送成功");
            
            // 获取最新的工作流运行信息
            showStatus('info', '字体处理已触发，正在获取运行信息...');
            
            // 等待几秒钟确保工作流已创建
            console.log("等待3秒以确保工作流已创建...");
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log("获取工作流运行列表...");
            const runsResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/process-font.yml/runs?per_page=1`, {
                headers: {
                    'Authorization': `Bearer ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            console.log("工作流列表响应状态码:", runsResponse.status);
            
            if (!runsResponse.ok) {
                console.log("获取工作流列表失败");
                throw new Error('无法获取工作流运行信息');
            }
            
            const runsData = await runsResponse.json();
            console.log("工作流列表响应:", runsData);
            
            if (runsData.workflow_runs && runsData.workflow_runs.length > 0) {
                currentWorkflowRunId = runsData.workflow_runs[0].id;
                console.log("获取到工作流运行ID:", currentWorkflowRunId);
            } else {
                console.log("没有找到工作流运行记录");
                currentWorkflowRunId = '未知';
                showStatus('info', '工作流已触发，但无法获取运行ID。请在GitHub Actions页面查看。');
            }
            
            // 显示结果区域
            resultSection.classList.remove('hidden');
            runIdElement.textContent = `运行ID: ${currentWorkflowRunId}`;
            
            const actionUrl = `https://github.com/${repoOwner}/${repoName}/actions/runs/${currentWorkflowRunId}`;
            actionLinkElement.href = actionUrl;
            actionLinkElement.textContent = '查看运行详情';
            
            showStatus('success', '已成功触发字体处理，请查看GitHub Action运行详情。');
            console.log("处理完成，显示成功消息");
            
        } catch (error) {
            console.error('处理错误:', error);
            console.log("错误详情:", error.stack);
            showStatus('error', '处理失败: ' + error.message);
            processBtn.disabled = false;
        } finally {
            // 清除输入的 token，增加安全性
            document.getElementById('github-token').value = '';
            console.log("已清除Token输入框");
        }
    });
    
    checkStatusBtn.addEventListener('click', async function() {
        if (!currentWorkflowRunId || currentWorkflowRunId === '未知') {
            showStatus('error', '无法检查状态：未知的工作流运行ID');
            console.log("无法检查状态：工作流运行ID未知");
            return;
        }
        
        // 获取用户的 GitHub Token
        const githubToken = document.getElementById('github-token').value.trim();
        
        if (!githubToken) {
            showStatus('error', '请输入 GitHub Token 才能检查状态。');
            console.log("未提供 GitHub Token，无法检查状态");
            return;
        }
        
        showStatus('info', '正在检查处理状态...');
        console.log("开始检查工作流状态，ID:", currentWorkflowRunId);
        
        try {
            console.log("发送状态检查请求...");
            const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/runs/${currentWorkflowRunId}`, {
                headers: {
                    'Authorization': `Bearer ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            console.log("状态检查响应状态码:", response.status);
            
            if (!response.ok) {
                console.log("状态检查请求失败");
                let errorText = '';
                try {
                    const errorData = await response.json();
                    errorText = JSON.stringify(errorData);
                    console.log("错误响应:", errorData);
                } catch (e) {
                    errorText = await response.text();
                    console.log("错误文本:", errorText);
                }
                throw new Error(`GitHub API 返回了状态码 ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log("工作流状态数据:", data);
            
            if (data.status === 'completed' && data.conclusion === 'success') {
                console.log("工作流已完成，结果成功");
                showStatus('success', '字体处理完成！可以从GitHub Action页面下载处理后的字体。');
                
                // 获取生成的字体文件
                console.log("尝试获取构件信息...");
                const artifactsUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/runs/${currentWorkflowRunId}/artifacts`;
                const artifactsResponse = await fetch(artifactsUrl, {
                    headers: {
                        'Authorization': `Bearer ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                console.log("构件响应状态码:", artifactsResponse.status);
                
                if (artifactsResponse.ok) {
                    const artifactsData = await artifactsResponse.json();
                    console.log("构件数据:", artifactsData);
                    
                    if (artifactsData.artifacts && artifactsData.artifacts.length > 0) {
                        console.log("找到构件，设置下载链接");
                        const downloadUrl = `https://github.com/${repoOwner}/${repoName}/actions/runs/${currentWorkflowRunId}/artifacts/${artifactsData.artifacts[0].id}`;
                        actionLinkElement.href = downloadUrl;
                        actionLinkElement.textContent = '下载处理后的字体';
                    } else {
                        console.log("未找到构件");
                    }
                } else {
                    console.log("获取构件信息失败");
                }
                
                checkStatusBtn.classList.add('hidden');
            } else if (data.status === 'completed') {
                console.log("工作流已完成，但结果不成功:", data.conclusion);
                showStatus('error', `处理失败，结论: ${data.conclusion}`);
            } else {
                console.log("工作流尚未完成，当前状态:", data.status);
                showStatus('info', `当前状态: ${data.status}，请稍后再检查。`);
            }
            
        } catch (error) {
            console.error('检查状态错误:', error);
            console.log("错误详情:", error.stack);
            showStatus('error', '检查状态失败: ' + error.message);
        } finally {
            // 清除输入的 token，增加安全性
            document.getElementById('github-token').value = '';
            console.log("已清除Token输入框");
        }
    });
    
    function showStatus(type, message) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.classList.remove('hidden');
        console.log(`状态消息 [${type}]: ${message}`);
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
            reader.onerror = error => {
                console.log("文件读取错误:", error);
                reject(error);
            };
        });
    }
});
