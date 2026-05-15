const fs = require('fs');
const cssToAdd = `
        /* 导航栏 */
        .navbar {
            background: white;
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            margin-bottom: 24px;
            border-radius: 16px;
        }
        .nav-brand { font-size: 20px; font-weight: bold; color: #764ba2; display: flex; align-items: center; gap: 8px; }
        .nav-links { display: flex; gap: 20px; align-items: center; }
        .nav-link { text-decoration: none; color: #555; font-weight: 500; padding: 8px 16px; border-radius: 8px; transition: all 0.2s; }
        .nav-link:hover { background: #f0f2f5; color: #667eea; }
        .nav-link.active { background: #667eea; color: white; }
        .user-panel { display: flex; align-items: center; gap: 12px; border-left: 1px solid #eee; padding-left: 20px; }
        .username-badge { color: #667eea; font-weight: 600; }
        .btn-small { padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
        .btn-small:hover { opacity: 0.9; }
        
        /* 模态框 */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; }
        .modal-content { background: white; padding: 32px; border-radius: 16px; width: 90%; max-width: 400px; }
        .modal-title { font-size: 24px; margin-bottom: 20px; text-align: center; color: #333; }
        .form-control { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; margin-bottom: 16px; box-sizing: border-box; }
        .modal-btn { width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
        
        @media (max-width: 600px) {
            .navbar { flex-direction: column; gap: 12px; padding: 16px; }
            .nav-links { flex-wrap: wrap; justify-content: center; }
            .user-panel { border-left: none; padding-left: 0; border-top: 1px solid #eee; padding-top: 12px; width: 100%; justify-content: center; }
        }
`;

const navHtmlIndex = `
        <!-- 导航栏 -->
        <nav class="navbar">
            <div class="nav-brand">📚 408考研助手</div>
            <div class="nav-links">
                <a href="index.html" class="nav-link active">学习大厅</a>
                <a href="community.html" class="nav-link">交流社区</a>
                <div class="user-panel">
                    <span id="usernameDisplay" class="username-badge">未登录</span>
                    <button id="loginBtnNav" class="btn-small">登录/注册</button>
                    <button id="logoutBtn" class="btn-small hidden" style="background:#e53e3e">退出</button>
                </div>
            </div>
        </nav>
`;

const navHtmlCommunity = navHtmlIndex.replace('active">学习大厅', '">学习大厅').replace('">交流社区', 'active">交流社区');

const loginModalHtml = `
    <!-- 登录模态框 -->
    <div id="loginModal" class="modal-overlay hidden">
        <div class="modal-content">
            <h3 class="modal-title">账号登录</h3>
            <input type="text" id="usernameInput" class="form-control" placeholder="请输入您的昵称（随便填即可）">
            <button id="submitLoginBtn" class="modal-btn">进入学习</button>
            <button id="closeLoginBtn" style="width:100%; background: none; color: #888; border: none; margin-top: 12px; cursor: pointer;">暂不登录 (游客)</button>
        </div>
    </div>
`;

const loginJS = `
        // ------------------ 登录及导航栏逻辑 ------------------
        const loginBtnNav = document.getElementById('loginBtnNav');
        const logoutBtn = document.getElementById('logoutBtn');
        const loginModal = document.getElementById('loginModal');
        const closeLoginBtn = document.getElementById('closeLoginBtn');
        const submitLoginBtn = document.getElementById('submitLoginBtn');
        const usernameInput = document.getElementById('usernameInput');
        const usernameDisplay = document.getElementById('usernameDisplay');

        function updateLoginUI() {
            const savedName = localStorage.getItem('username');
            if (savedName) {
                if(usernameDisplay) usernameDisplay.textContent = '👋 ' + savedName;
                if(loginBtnNav) loginBtnNav.classList.add('hidden');
                if(logoutBtn) logoutBtn.classList.remove('hidden');
            } else {
                if(usernameDisplay) usernameDisplay.textContent = '未登录(游客)';
                if(loginBtnNav) loginBtnNav.classList.remove('hidden');
                if(logoutBtn) logoutBtn.classList.add('hidden');
            }
        }

        if (loginBtnNav) loginBtnNav.addEventListener('click', () => loginModal.classList.remove('hidden'));
        if (closeLoginBtn) closeLoginBtn.addEventListener('click', () => loginModal.classList.add('hidden'));
        if (submitLoginBtn) {
            submitLoginBtn.addEventListener('click', () => {
                const name = usernameInput.value.trim();
                if (name) {
                    localStorage.setItem('username', name);
                    localStorage.setItem('userId', 'user_' + encodeURIComponent(name));
                    loginModal.classList.add('hidden');
                    updateLoginUI();
                    if (typeof loadPosts === 'function') loadPosts(); // for community
                } else {
                    alert('请输入昵称');
                }
            });
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('username');
                localStorage.setItem('userId', 'guest_' + Date.now()); 
                updateLoginUI();
            });
        }
        
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = 'guest_' + Date.now();
            localStorage.setItem('userId', userId);
        }
        
        updateLoginUI();
        // --------------------------------------------------------
`;

function processFile(file, navHtml) {
    let content = fs.readFileSync(file, 'utf8');
    
    if (!content.includes('/* 导航栏 */')) {
        content = content.replace('</style>', cssToAdd + '\n</style>');
    }
    
    if (!content.includes('<nav class="navbar">')) {
        content = content.replace('<div class="container">', '<div class="container">\n' + navHtml);
    }
    
    if (!content.includes('id="loginModal"')) {
        content = content.replace('</body>', loginModalHtml + '\n</body>');
    }
    
    if (content.match(/let userId = localStorage\.getItem\('userId'\);[\s\S]*?localStorage\.setItem\('userId', userId\);\s*\}/)) {
        content = content.replace(/let userId = localStorage\.getItem\('userId'\);[\s\S]*?localStorage\.setItem\('userId', userId\);\s*\}/, '');
    }
    
    if (!content.includes('const loginBtnNav')) {
        if (content.includes('const API_BASE_URL')) {
             content = content.replace("const API_BASE_URL = 'http://localhost:3000';", "const API_BASE_URL = 'http://localhost:3000';\n" + loginJS);
        } else {
             content = content.replace('<script>', '<script>\n' + loginJS);
        }
    }
    
    // cleanup old community btn which is floating on bottom left
    if(file === 'frontend/index.html') {
       content = content.replace(/<button class="community-btn".+?<\/button>/, '');
    }

    if(content.includes('<button class="back-btn" id="backBtn">← 返回学习</button>')) {
        content = content.replace('<button class="back-btn" id="backBtn">← 返回学习</button>', '');
    }

    fs.writeFileSync(file, content, 'utf8');
}

processFile('frontend/index.html', navHtmlIndex);
processFile('frontend/community.html', navHtmlCommunity);
console.log('Update done.');