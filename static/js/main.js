const API_BASE = 'https://abdocash-system.onrender.com';

        // ==========================================
        // ===== نظام الدخول بكلمة المرور =====
        // ==========================================
        const DEFAULT_PASS = '1234';
        function getSysPass() { return localStorage.getItem('abdo_sys_pass') || DEFAULT_PASS; }



        // Functions moved to auth_system.js:
        // - showChangePassFromLogin → openChangeMyPass
        // - submitChangePass (updated for multi-user)
        // - checkSession → initAuthSystem


        // ============================================================
        // ===== نظام المستخدمين والصلاحيات — قاعدة بيانات مستقلة =====
        // ===== المفتاح: ABDO_USERS_AUTH — منفصل 100% عن sysDB =====
        // ============================================================

        const AUTH_DB_KEY = 'ABDO_USERS_AUTH';

        // الأقسام المتاحة في النظام
        const SYSTEM_SECTIONS = [
            { id: 1,  key: 'customers',  label: '👥 ديون العملاء',       tab: 1 },
            { id: 2,  key: 'companies',  label: '🏢 حسابات الشركات',     tab: 2 },
            { id: 3,  key: 'wholesale',  label: '📦 كبار العملاء',       tab: 3 },
            { id: 4,  key: 'trusts',     label: '🔒 الودائع والأمانات',   tab: 4 },
            { id: 5,  key: 'treasury',   label: '💰 الخزينة المتقدمة',   tab: 5 },
            { id: 6,  key: 'purchases',  label: '💸 إدارة المشتريات',    tab: 6 },
            { id: 8,  key: 'fatima',     label: '👩‍💼 قسم فاطمة',          tab: 8 },
        ];

        const ROLE_LABELS = {
            admin:      { label: 'مدير النظام',  badge: 'role-admin',     emoji: '👑' },
            manager:    { label: 'مدير مالي',   badge: 'role-manager',   emoji: '💼' },
            accountant: { label: 'محاسب',        badge: 'role-accountant', emoji: '📊' },
            user:       { label: 'مستخدم',       badge: 'role-user',      emoji: '👤' },
        };

        // ألوان الأفاتار
        const AVATAR_COLORS = ['#00f2fe','#f59e0b','#34d399','#a78bfa','#f87171'];

        // ===== تهيئة / قراءة قاعدة بيانات المستخدمين =====
        function getAuthDB() {
            try { return JSON.parse(localStorage.getItem(AUTH_DB_KEY)) || null; } catch(e) { return null; }
        }
        function saveAuthDB(db) {
            try { localStorage.setItem(AUTH_DB_KEY, JSON.stringify(db)); } catch(e) {}
        }

        function initAuthDB() {
            let db = getAuthDB();
            if (db && db.users && db.users.length > 0) return db;

            // المرة الأولى: إنشاء المستخدمين الافتراضيين
            // كلمة مرور المدير = كلمة المرور القديمة الموجودة في النظام
            let oldPass = localStorage.getItem('abdo_sys_pass') || '1234';

            let allPerms = {};
            SYSTEM_SECTIONS.forEach(s => allPerms[s.key] = true);

            db = {
                version: 1,
                created: Date.now(),
                users: [
                    {
                        id: 1, name: 'المدير', role: 'admin',
                        password: oldPass,
                        color: AVATAR_COLORS[0], emoji: '👑',
                        permissions: { ...allPerms },
                        active: true, created: Date.now()
                    },
                    {
                        id: 2, name: 'مستخدم 2', role: 'user',
                        password: '1234',
                        color: AVATAR_COLORS[1], emoji: '👤',
                        permissions: { ...allPerms },
                        active: true, created: Date.now()
                    },
                    {
                        id: 3, name: 'مستخدم 3', role: 'user',
                        password: '1234',
                        color: AVATAR_COLORS[2], emoji: '👤',
                        permissions: { ...allPerms },
                        active: true, created: Date.now()
                    },
                    {
                        id: 4, name: 'مستخدم 4', role: 'user',
                        password: '1234',
                        color: AVATAR_COLORS[3], emoji: '👤',
                        permissions: { ...allPerms },
                        active: true, created: Date.now()
                    },
                    {
                        id: 5, name: 'مستخدم 5', role: 'user',
                        password: '1234',
                        color: AVATAR_COLORS[4], emoji: '👤',
                        permissions: { ...allPerms },
                        active: true, created: Date.now()
                    }
                ]
            };
            saveAuthDB(db);
            return db;
        }

        // ===== الجلسة الحالية =====
        let currentUser = null; // الكائن الكامل للمستخدم المسجل

        function getCurrentUser() { return currentUser; }

        function loadCurrentUserFromSession() {
            try {
                let uid = parseInt(sessionStorage.getItem('abdo_user_id'));
                if (!uid) return null;
                let db = initAuthDB();
                return db.users.find(u => u.id === uid) || null;
            } catch(e) { return null; }
        }

        function hasPermission(sectionKey) {
            if (!currentUser) return false;
            if (currentUser.role === 'admin') return true;
            return currentUser.permissions[sectionKey] !== false;
        }

        // ===== شاشة الدخول الجديدة =====
        let loginSelectedUserId = null;

        function renderLoginScreen() {
            let db = initAuthDB();
            let activeUsers = db.users.filter(u => u.active);

            let usersHtml = activeUsers.map(u => {
                let roleInfo = ROLE_LABELS[u.role] || ROLE_LABELS.user;
                return `
                <div class="user-select-card" id="ucard-${u.id}" onclick="selectLoginUser(${u.id})">
                    <div class="user-avatar" style="background:${u.color}22; color:${u.color}; border:2px solid ${u.color}44;">${u.emoji || u.name[0]}</div>
                    <div class="user-card-info">
                        <div class="user-card-name">${u.name}</div>
                        <div class="user-card-role"><span class="role-badge ${roleInfo.badge}">${roleInfo.label}</span></div>
                    </div>
                    <div class="user-card-check" id="ucheck-${u.id}">✓</div>
                </div>`;
            }).join('');

            document.getElementById('loginScreen').innerHTML = `
                <div class="login-box" style="max-width:440px; position:relative;">

                    <!-- الخطوة 1: اختيار المستخدم -->
                    <div id="loginStep1" class="login-step">
                        <div class="login-logo">🏦</div>
                        <div class="login-title">المنظومة المالية المركزية</div>
                        <div class="login-subtitle">عبده | نظام محاسبي متكامل</div>
                        <p style="color:#94a3b8;font-size:12px;margin-bottom:12px;font-weight:700;">اختر حسابك للمتابعة:</p>
                        <div class="user-select-grid">${usersHtml}</div>
                        <button class="login-btn" id="loginNextBtn" onclick="goToPasswordStep()" style="opacity:0.5;pointer-events:none;">
                            التالي — إدخال كلمة المرور ←
                        </button>
                        <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.08);">
                            <button onclick="emergencyRecover()" style="width:100%; background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.3); color:#fbbf24; border-radius:6px; padding:7px; font-size:11px; font-weight:900; cursor:pointer; font-family:'Tajawal',sans-serif;">
                                🚨 استعادة طارئة للبيانات
                            </button>
                        </div>
                        <div id="recoveryStatus" style="font-size:11px; color:#94a3b8; margin-top:6px; text-align:center;"></div>
                    </div>

                    <!-- الخطوة 2: كلمة المرور -->
                    <div id="loginStep2" class="login-step hidden" style="position:relative; width:100%;">
                        <div id="loginUserDisplay" style="display:flex;align-items:center;gap:10px;background:rgba(0,242,254,0.06);border:1px solid rgba(0,242,254,0.15);border-radius:10px;padding:10px 14px;margin-bottom:18px;text-align:right;"></div>
                        <div class="login-error" id="loginError" style="display:none;">❌ كلمة المرور غير صحيحة!</div>
                        <input type="password" id="loginPassInput" class="login-input" placeholder="••••••" autocomplete="off"
                            onkeydown="if(event.key==='Enter') tryLogin()">
                        <button class="login-btn" onclick="tryLogin()">🔓 دخول</button>
                        <button onclick="backToUserSelect()" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;border-radius:8px;padding:10px;font-size:13px;font-weight:900;cursor:pointer;font-family:'Tajawal',sans-serif;margin-top:6px;">
                            ← العودة لاختيار الحساب
                        </button>
                    </div>
                </div>`;
        }

        function selectLoginUser(uid) {
            loginSelectedUserId = uid;
            document.querySelectorAll('.user-select-card').forEach(c => c.classList.remove('selected'));
            document.querySelectorAll('.user-card-check').forEach(c => { c.style.background=''; c.style.borderColor='#475569'; c.style.color=''; });
            let card = document.getElementById('ucard-' + uid);
            let check = document.getElementById('ucheck-' + uid);
            if (card) card.classList.add('selected');
            if (check) { check.style.background='#00f2fe'; check.style.borderColor='#00f2fe'; check.style.color='#000'; }
            let btn = document.getElementById('loginNextBtn');
            if (btn) { btn.style.opacity='1'; btn.style.pointerEvents='auto'; }
        }

        function goToPasswordStep() {
            if (!loginSelectedUserId) return;
            let db = initAuthDB();
            let user = db.users.find(u => u.id === loginSelectedUserId);
            if (!user) return;

            let roleInfo = ROLE_LABELS[user.role] || ROLE_LABELS.user;
            document.getElementById('loginUserDisplay').innerHTML = `
                <div style="width:40px;height:40px;border-radius:50%;background:${user.color}22;color:${user.color};border:2px solid ${user.color}44;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${user.emoji || user.name[0]}</div>
                <div>
                    <div style="font-size:14px;font-weight:900;color:#e2e8f0;">${user.name}</div>
                    <div><span class="role-badge ${roleInfo.badge}">${roleInfo.label}</span></div>
                </div>`;

            document.getElementById('loginStep1').classList.add('hidden');
            document.getElementById('loginStep2').classList.remove('hidden');
            setTimeout(() => document.getElementById('loginPassInput').focus(), 100);
        }

        function backToUserSelect() {
            document.getElementById('loginStep2').classList.add('hidden');
            document.getElementById('loginStep1').classList.remove('hidden');
            document.getElementById('loginPassInput').value = '';
        }
function tryLogin() {
            if (!loginSelectedUserId) { backToUserSelect(); return; }
            let db = initAuthDB();
            let user = db.users.find(u => u.id === loginSelectedUserId);
            let err = document.getElementById('loginError');
            let input = document.getElementById('loginPassInput').value;

            let validPass = (input === user.password) ||
                (user.role === 'admin' && input === (localStorage.getItem('abdo_sys_pass') || '1234'));

            if (validPass) {
                currentUser = user;
                sessionStorage.setItem('abdo_logged_in', '1');
                sessionStorage.setItem('abdo_user_id', user.id);
                document.getElementById('loginPassInput').value = '';
                if (err) err.style.display = 'none';

                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('dashboardSection').style.display = 'flex';
                document.getElementById('autoSaveBar').style.display = 'flex';

                   // ===== كابل السحب السحابي من قاعدة البيانات =====
                // ===== كابل السحب السحابي من قاعدة البيانات =====
                fetch('https://abdocash-system.onrender.com/api/load_data') // تم توجيه الكابل للسحابة العالمية
                    .then(response => {
                        if(response.ok) return response.json();
                        throw new Error('جاري العمل على الذاكرة المحلية مؤقتاً');
                    })
                   .then(serverData => {
                        // السيرفر بتاعك بيبعت البيانات جوه صندوق اسمه "data"
                        if(serverData && serverData.status === "success" && serverData.data) {
                            console.log("تم سحب البيانات من السحابة بنجاح!");
                            // بناخد البيانات الصافية من الصندوق ونفرشها في المنظومة
                            localStorage.setItem('ABDO_SYSTEM_FINAL_DB', JSON.stringify(serverData.data));
                            sysDB = serverData.data;
                        }
                        finalizeLoginSteps(user);
                    })
                    .catch(error => {
                        console.log(error.message);
                        finalizeLoginSteps(user); // تشغيل المنظومة أوتوماتيك حتى لو مفيش اتصال
                    });
            } else {
                if (err) { err.style.display = 'block'; err.innerText = '❌ كلمة المرور غير صحيحة!'; }
                document.getElementById('loginPassInput').value = '';
                document.getElementById('loginPassInput').focus();
                setTimeout(() => { if (err) err.style.display = 'none'; }, 3000);
                logAction(`محاولة دخول فاشلة للحساب: ${user.name}`, 'النظام');
            }
        }

        // دالة مساعدة لتشغيل وعرض الجداول بعد تسجيل الدخول
        function finalizeLoginSteps(user) {
            renderSidebar();
            updateUserChip();
            logAction(`تسجيل دخول: ${user.name} (${ROLE_LABELS[user.role]?.label || user.role})`, 'النظام');
            if (typeof checkDebtNotifications === 'function') checkDebtNotifications();
            renderActiveSection();
        }
    

        function logout() {
            if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
                if (currentUser) logAction(`تسجيل خروج: ${currentUser.name}`, 'النظام');
                currentUser = null;
                sessionStorage.removeItem('abdo_logged_in');
                sessionStorage.removeItem('abdo_user_id');
                loginSelectedUserId = null;
                document.getElementById('loginScreen').style.display = 'flex';
                document.getElementById('dashboardSection').style.display = 'none';
                document.getElementById('autoSaveBar').style.display = 'none';
                updateUserChip();
                renderLoginScreen();
            }
        }

        // ===== رندر الشريط الجانبي الديناميكي =====
        function renderSidebar() {
            if (!currentUser) return;
            let roleInfo = ROLE_LABELS[currentUser.role] || ROLE_LABELS.user;

            // معلومات المستخدم
            let userInfoHtml = `
                <div class="sidebar-user-info">
                    <div class="sidebar-user-avatar" style="background:${currentUser.color}22;color:${currentUser.color};border:2px solid ${currentUser.color}44;">${currentUser.emoji || currentUser.name[0]}</div>
                    <div>
                        <div class="sidebar-user-name">${currentUser.name}</div>
                        <div class="sidebar-user-role"><span class="role-badge ${roleInfo.badge}" style="font-size:9px;">${roleInfo.label}</span></div>
                    </div>
                </div>`;

            // بناء قائمة الأقسام ديناميكياً حسب الصلاحيات
            let menuItems = '';
            let sectionTabMap = {
                1: { key:'customers', label:'👥 ديون العملاء' },
                2: { key:'companies', label:'🏢 حسابات الشركات' },
                3: { key:'wholesale', label:'📦 كبار العملاء (جملة)' },
                4: { key:'trusts',    label:'🔒 الودائع والأمانات' },
                5: { key:'treasury',  label:'💰 الخزينة المتقدمة' },
                6: { key:'purchases', label:'💸 إدارة المشتريات' },
                8: { key:'fatima',    label:'👩‍💼 قسم فاطمة' },
            };

            [1,2,3,4,5,6,8].forEach(tab => {
                let s = sectionTabMap[tab];
                if (hasPermission(s.key)) {
                    let isActive = currentTabNum === tab;
                    menuItems += `<li class="menu-item ${isActive ? 'active' : ''}" id="item_${tab}" onclick="switchTab(${tab})">${s.label}</li>`;
                }
            });

            // زر لوحة تحكم الأدمن (للمدير فقط)
            let adminBtn = currentUser.role === 'admin' ? `
                <button class="btn-sidebar" style="background:linear-gradient(135deg,rgba(251,191,36,0.15),rgba(251,191,36,0.05));border:1px solid rgba(251,191,36,0.3);color:#fbbf24;" onclick="openAdminPanel()">
                    ⚙️ لوحة التحكم والصلاحيات
                </button>` : '';

            document.querySelector('.sidebar').innerHTML = `
                <h2>المنظومة المالية | عبده</h2>
                ${userInfoHtml}
                <ul class="menu-list">${menuItems}</ul>
                <div class="sidebar-divider"></div>
                <div style="margin-top:auto;">
                    ${adminBtn}
                    <button class="btn-sidebar btn-restore" onclick="openRestoreModal()">🔄 استعادة نسخة</button>
                    <button class="btn-sidebar btn-import" onclick="document.getElementById('importModal').style.display='flex'">📥 استيراد إكسيل</button>
                    <button class="btn-sidebar btn-code" onclick="createBackup()">💾 نسخة احتياطية</button>
                    <button class="btn-sidebar" style="background:#1e3a5f;color:#93c5fd;border:1px solid #2563eb;" onclick="document.getElementById('exportModal').style.display='flex'">📤 تصدير PDF / Excel</button>
                    <button class="btn-sidebar btn-audit" onclick="openAuditLog(1)">📜 سجل العمليات</button>
                    <button class="btn-sidebar btn-trash" onclick="openTrashModal()">🗑️ سلة المحذوفات</button>
                    <button class="btn-sidebar btn-theme" onclick="toggleTheme()">🌓 المظهر</button>
                    <button class="btn-sidebar" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;" onclick="openChangeMyPass()">🔑 تغيير كلمة المروري</button>
                    <button class="btn-sidebar btn-logout" onclick="logout()">🚪 تسجيل الخروج</button>
                </div>`;
        }

        // ===== تغيير كلمة مرور المستخدم الحالي =====
        function openChangeMyPass() {
            document.getElementById('changePassModal').style.display = 'flex';
        }

        function submitChangePass() {
            let oldP = document.getElementById('oldPass').value;
            let newP = document.getElementById('newPass').value;
            let newP2 = document.getElementById('newPass2').value;
            let errEl = document.getElementById('changePassError');

            let db = initAuthDB();
            let user = db.users.find(u => u.id === (currentUser ? currentUser.id : 1));
            if (!user) return;

            let validOld = (oldP === user.password) ||
                (user.role === 'admin' && oldP === (localStorage.getItem('abdo_sys_pass') || '1234'));

            if (!validOld) { errEl.innerText = '❌ كلمة المرور الحالية غير صحيحة!'; errEl.style.display = 'block'; return; }
            if (newP.length < 3) { errEl.innerText = '❌ كلمة المرور قصيرة جداً!'; errEl.style.display = 'block'; return; }
            if (newP !== newP2) { errEl.innerText = '❌ كلمتا المرور غير متطابقتان!'; errEl.style.display = 'block'; return; }

            user.password = newP;
            if (user.role === 'admin') localStorage.setItem('abdo_sys_pass', newP); // توافق مع القديم
            saveAuthDB(db);
            if (currentUser) currentUser.password = newP;

            errEl.style.display = 'none';
            document.getElementById('changePassModal').style.display = 'none';
            ['oldPass','newPass','newPass2'].forEach(id => document.getElementById(id).value = '');
            showToast('✅ تم تغيير كلمة المرور بنجاح!', 'success');
            logAction(`${user.name}: تغيير كلمة المرور`, 'النظام');
        }

        // ===== لوحة التحكم والصلاحيات (للمدير فقط) =====
        function openAdminPanel() {
            if (!currentUser || currentUser.role !== 'admin') { showToast('❌ هذه الخاصية للمدير فقط', 'error'); return; }
            document.getElementById('adminPanelOverlay').style.display = 'flex';
            renderAdminPanel();
        }

        function closeAdminPanel() {
            document.getElementById('adminPanelOverlay').style.display = 'none';
        }

        function renderAdminPanel() {
            let db = initAuthDB();
            let content = document.getElementById('adminPanelContent');

            let usersHtml = db.users.map((u, uidx) => {
                let roleInfo = ROLE_LABELS[u.role] || ROLE_LABELS.user;
                let permsHtml = SYSTEM_SECTIONS.map(s => {
                    let isOn = u.role === 'admin' ? true : (u.permissions[s.key] !== false);
                    let disabled = u.role === 'admin' ? 'style="opacity:0.5;pointer-events:none;"' : '';
                    return `<div class="perm-toggle" ${disabled}>
                        <span class="perm-toggle-label">${s.label}</span>
                        <div class="toggle-switch ${isOn ? 'on' : ''}" id="tog-${u.id}-${s.key}"
                            onclick="togglePerm(${u.id},'${s.key}')"></div>
                    </div>`;
                }).join('');

                let roleOptions = Object.entries(ROLE_LABELS).map(([k, v]) =>
                    `<option value="${k}" ${u.role === k ? 'selected' : ''}>${v.emoji} ${v.label}</option>`).join('');

                return `
                <div class="admin-user-row" id="arow-${u.id}">
                    <div class="admin-user-row-header" onclick="toggleAdminRow(${u.id})">
                        <div class="user-avatar" style="background:${u.color}22;color:${u.color};border:2px solid ${u.color}44;width:36px;height:36px;font-size:16px;">${u.emoji || u.name[0]}</div>
                        <div style="flex:1;">
                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <input type="text" value="${u.name}" onchange="renameUser(${u.id},this.value)"
                                    style="background:transparent;border:none;outline:none;font-size:14px;font-weight:900;color:#e2e8f0;font-family:'Tajawal',sans-serif;width:130px;"
                                    onclick="event.stopPropagation()">
                                <span class="role-badge ${roleInfo.badge}">${roleInfo.label}</span>
                                ${u.id === currentUser.id ? '<span style="font-size:10px;color:#00f2fe;font-weight:900;">← أنت</span>' : ''}
                            </div>
                            <div style="font-size:11px;color:#64748b;margin-top:3px;">
                                الدور:
                                <select onchange="changeUserRole(${u.id},this.value)" onclick="event.stopPropagation()"
                                    style="background:#1e293b;border:1px solid #334155;color:#94a3b8;border-radius:4px;padding:2px 6px;font-size:11px;font-family:'Tajawal',sans-serif;cursor:pointer;">
                                    ${roleOptions}
                                </select>
                            </div>
                        </div>
                        <div style="display:flex;gap:6px;align-items:center;" onclick="event.stopPropagation()">
                            <button class="change-user-pass-btn" onclick="promptChangeUserPass(${u.id})">🔑 كلمة المرور</button>
                            ${u.id !== 1 ? `<div class="toggle-switch ${u.active ? 'on' : ''}" onclick="toggleUserActive(${u.id})" title="${u.active ? 'إيقاف' : 'تفعيل'}"></div>` : ''}
                        </div>
                        <div class="admin-user-expand" id="aexpand-${u.id}">▼</div>
                    </div>
                    <div id="aperms-${u.id}" style="display:none;">
                        <div style="font-size:11px;color:#64748b;margin-bottom:8px;font-weight:700;">🔐 الصلاحيات — الأقسام المتاحة:</div>
                        <div class="perm-grid">${permsHtml}</div>
                        <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.05);">
                            <button onclick="grantAllPerms(${u.id})" style="background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.2);color:#34d399;border-radius:6px;padding:5px 12px;font-size:11px;font-weight:900;cursor:pointer;font-family:'Tajawal',sans-serif;margin-left:6px;">✅ منح الكل</button>
                            <button onclick="revokeAllPerms(${u.id})" style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.2);color:#f87171;border-radius:6px;padding:5px 12px;font-size:11px;font-weight:900;cursor:pointer;font-family:'Tajawal',sans-serif;">❌ سحب الكل</button>
                        </div>
                    </div>
                </div>`;
            }).join('');

            content.innerHTML = `
                <div style="margin-bottom:16px;padding:12px;background:rgba(0,242,254,0.05);border:1px solid rgba(0,242,254,0.1);border-radius:8px;">
                    <div style="font-size:12px;color:#94a3b8;font-weight:700;">💡 تلميح: اضغط على أي مستخدم لتوسيع صلاحياته. التغييرات تُطبَّق فوراً.</div>
                </div>
                ${usersHtml}
                <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06);">
                    <div style="font-size:12px;font-weight:900;color:#fbbf24;margin-bottom:8px;">🗝️ كلمات المرور الحالية (للمدير فقط):</div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px;">
                        ${db.users.map(u => `<div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:8px 10px;font-size:11px;font-weight:900;color:#94a3b8;">
                            ${u.emoji} ${u.name}: <span style="color:#fbbf24;letter-spacing:2px;">${u.password}</span>
                        </div>`).join('')}
                    </div>
                </div>`;
        }

        function toggleAdminRow(uid) {
            let perms = document.getElementById('aperms-' + uid);
            let expand = document.getElementById('aexpand-' + uid);
            if (!perms) return;
            let isOpen = perms.style.display !== 'none';
            perms.style.display = isOpen ? 'none' : 'block';
            if (expand) expand.classList.toggle('open', !isOpen);
        }

        function togglePerm(uid, sectionKey) {
            let db = initAuthDB();
            let user = db.users.find(u => u.id === uid);
            if (!user || user.role === 'admin') return;
            user.permissions[sectionKey] = !user.permissions[sectionKey];
            saveAuthDB(db);
            // تحديث الـ toggle فوراً
            let tog = document.getElementById(`tog-${uid}-${sectionKey}`);
            if (tog) tog.classList.toggle('on', user.permissions[sectionKey]);
            logAction(`تعديل صلاحية "${sectionKey}" للمستخدم ${user.name}: ${user.permissions[sectionKey] ? 'مسموح' : 'محظور'}`, 'النظام');
            showToast(`تم تعديل صلاحية ${user.name}`, 'success');
            // إعادة رندر الشريط الجانبي إذا كان هذا المستخدم مسجلاً
            if (currentUser && currentUser.id === uid) { currentUser = user; renderSidebar(); }
        }

        function grantAllPerms(uid) {
            let db = initAuthDB();
            let user = db.users.find(u => u.id === uid);
            if (!user) return;
            SYSTEM_SECTIONS.forEach(s => user.permissions[s.key] = true);
            saveAuthDB(db);
            logAction(`منح جميع الصلاحيات للمستخدم ${user.name}`, 'النظام');
            renderAdminPanel();
            showToast('✅ تم منح جميع الصلاحيات', 'success');
        }

        function revokeAllPerms(uid) {
            let db = initAuthDB();
            let user = db.users.find(u => u.id === uid);
            if (!user || user.role === 'admin') { showToast('لا يمكن سحب صلاحيات المدير', 'error'); return; }
            SYSTEM_SECTIONS.forEach(s => user.permissions[s.key] = false);
            saveAuthDB(db);
            logAction(`سحب جميع الصلاحيات من المستخدم ${user.name}`, 'النظام');
            renderAdminPanel();
            showToast('⚠️ تم سحب جميع الصلاحيات', 'warning');
        }

        function changeUserRole(uid, newRole) {
            let db = initAuthDB();
            let user = db.users.find(u => u.id === uid);
            if (!user) return;
            if (uid === 1 && newRole !== 'admin') { showToast('لا يمكن تغيير دور المدير الأول', 'error'); renderAdminPanel(); return; }
            let oldRole = user.role;
            user.role = newRole;
            user.emoji = ROLE_LABELS[newRole]?.emoji || '👤';
            saveAuthDB(db);
            logAction(`تغيير دور ${user.name} من ${ROLE_LABELS[oldRole]?.label} إلى ${ROLE_LABELS[newRole]?.label}`, 'النظام');
            renderAdminPanel();
            showToast(`✅ تم تغيير دور ${user.name}`, 'success');
        }

        function renameUser(uid, newName) {
            if (!newName.trim()) return;
            let db = initAuthDB();
            let user = db.users.find(u => u.id === uid);
            if (!user) return;
            let oldName = user.name;
            user.name = newName.trim();
            saveAuthDB(db);
            if (currentUser && currentUser.id === uid) { currentUser.name = user.name; renderSidebar(); }
            logAction(`إعادة تسمية ${oldName} إلى ${user.name}`, 'النظام');
        }

        function toggleUserActive(uid) {
            if (uid === 1) return;
            let db = initAuthDB();
            let user = db.users.find(u => u.id === uid);
            if (!user) return;
            user.active = !user.active;
            saveAuthDB(db);
            logAction(`${user.active ? 'تفعيل' : 'إيقاف'} حساب ${user.name}`, 'النظام');
            renderAdminPanel();
            showToast(`${user.active ? '✅ تم تفعيل' : '⚠️ تم إيقاف'} حساب ${user.name}`, user.active ? 'success' : 'warning');
        }

        function promptChangeUserPass(uid) {
            let db = initAuthDB();
            let user = db.users.find(u => u.id === uid);
            if (!user) return;
            let newPass = prompt(`كلمة المرور الجديدة لـ "${user.name}":\n(3 أحرف على الأقل)`);
            if (!newPass || newPass.trim().length < 3) { showToast('⚠️ كلمة مرور قصيرة جداً', 'error'); return; }
            user.password = newPass.trim();
            if (user.role === 'admin') localStorage.setItem('abdo_sys_pass', newPass.trim());
            saveAuthDB(db);
            logAction(`المدير غيّر كلمة مرور ${user.name}`, 'النظام');
            renderAdminPanel();
            showToast(`✅ تم تغيير كلمة مرور ${user.name}`, 'success');
        }

        // ===== logAction المحسّن يضيف اسم المستخدم =====
        // نُغلّف logAction الأصلية لإضافة معلومات المستخدم
        const _originalLogAction = typeof logAction !== 'undefined' ? logAction : null;

        // ===== تهيئة النظام عند التحميل =====
        function initAuthSystem() {
            initAuthDB();
            renderLoginScreen();
            // إذا كانت الجلسة نشطة
            let savedUser = loadCurrentUserFromSession();
            if (savedUser) {
                currentUser = savedUser;
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('dashboardSection').style.display = 'flex';
                document.getElementById('autoSaveBar').style.display = 'flex';
                renderSidebar();
                checkDebtNotifications();
            }
        }

        // حماية التبويبات: التحقق من الصلاحية قبل التبديل
        const _originalSwitchTab = typeof switchTab !== 'undefined' ? switchTab : null;
        function switchTab(num) {
            let sectionKeyMap = {1:'customers',2:'companies',3:'wholesale',4:'trusts',5:'treasury',6:'purchases',8:'fatima'};
            let key = sectionKeyMap[num];
            if (key && !hasPermission(key)) {
                showToast('❌ ليس لديك صلاحية الوصول لهذا القسم', 'error');
                return;
            }
            currentTabNum = num;
            document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
            let item = document.getElementById('item_' + num);
            if (item) item.classList.add('active');
            renderActiveSection();
        }

        // ===== شريط المستخدم في autoSaveBar =====
        function updateUserChip() {
            let chip = document.getElementById('currentUserChip');
            if (!chip || !currentUser) return;
            chip.innerHTML = `<span class="current-user-chip">${currentUser.emoji || '👤'} ${currentUser.name}</span>`;
        }


        // checkSession moved to initAuthSystem in auth_system.js

        function initTheme() {
            let savedTheme = localStorage.getItem('theme_2030') || 'dark';
            document.documentElement.setAttribute('data-theme', savedTheme);
            let isLarge = localStorage.getItem('abdo_large_text') === 'true';
            if (isLarge) document.body.classList.add('large-text');
        }
        initTheme();

        function toggleTheme() {
            let current = document.documentElement.getAttribute('data-theme');
            let newTheme = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme_2030', newTheme);
        }

        function toggleFontSize() {
            document.body.classList.toggle('large-text');
            localStorage.setItem('abdo_large_text', document.body.classList.contains('large-text'));
        }

        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerText = (type === 'success' ? '✅ ' : (type === 'warning' ? '⚠️ ' : '❌ ')) + message;
            container.appendChild(toast);
            setTimeout(() => { toast.style.animation = 'slideOut 0.4s forwards'; setTimeout(() => toast.remove(), 400); }, 3000);
        }

        function formatDateOnly(ts) { return new Date(ts).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }); }

        let sysDB = null;
        // محاولة 1: المفتاح الرئيسي
        try { sysDB = JSON.parse(localStorage.getItem('ABDO_SYSTEM_FINAL_DB')); } catch(e) {}

        // محاولة 2: المفاتيح القديمة
        if (!sysDB || (!sysDB.customer_pages && !sysDB.customers && !sysDB.trusts)) {
            let oldKeys = ['sys_2030_db_v6', 'sys_2030_db_v5', 'sys_2030_db_v4', 'sys_2030_db_v3', 'sys_2030_db_v2', 'sys_2030_db'];
            for (let key of oldKeys) {
                try {
                    let data = JSON.parse(localStorage.getItem(key));
                    if(data && (data.customer_pages || data.customers || data.trusts)) { sysDB = data; break; }
                } catch(e) {}
            }
        }

        // محاولة 3: snapshots التلقائية
        if (!sysDB || (!sysDB.customer_pages && !sysDB.customers)) {
            for(let i = 0; i < 6; i++) {
                try {
                    let snap = JSON.parse(localStorage.getItem('abdo_snap_' + i));
                    if(snap && snap.data) {
                        let d = JSON.parse(snap.data);
                        if(d && (d.customer_pages || d.customers)) { sysDB = d; break; }
                    }
                } catch(e) {}
            }
        }

        // الحالة الأخيرة: قاعدة بيانات فارغة جديدة
        if (!sysDB) {
            sysDB = {
                customer_pages: [{ page: 1, date: formatDateOnly(Date.now()), debts: [] }],
                company_pages: [{ page: 1, date: formatDateOnly(Date.now()), debts: [] }],
                wholesale_pages: [{ page: 1, date: formatDateOnly(Date.now()), debts: [] }],
                trusts: [], treasury: [], purchases: { bayan: [], semsem: [] },
                fatima: { prev_val: '', total_work: '', received_val: '', final_rem: '', rows: Array.from({length:25},()=>({val:'',comm:'',tot:''})) },
                audit_log: [], trash_bin: [], last_backup_time: Date.now()
            };
        }

        // حفظ فوري لضمان وجود البيانات
        try { localStorage.setItem('ABDO_SYSTEM_FINAL_DB', JSON.stringify(sysDB)); } catch(e) {}
        
        // ترقية الحقول الناقصة بأمان
        try {
            if(!sysDB.customer_pages && sysDB.customers) sysDB.customer_pages = [{ page: 1, date: formatDateOnly(Date.now()), debts: sysDB.customers }];
            if(!sysDB.company_pages && sysDB.companies) sysDB.company_pages = [{ page: 1, date: formatDateOnly(Date.now()), debts: sysDB.companies }];
            if(!sysDB.wholesale_pages) sysDB.wholesale_pages = [{ page: 1, date: formatDateOnly(Date.now()), debts: sysDB.wholesale || [] }];
            if(!sysDB.trusts) sysDB.trusts = [];
            if(!sysDB.treasury) sysDB.treasury = [];
        } catch(e) {}
        
        if(!sysDB.purchases || typeof sysDB.purchases !== 'object' || Array.isArray(sysDB.purchases)) {
            sysDB.purchases = { bayan: [], semsem: [] };
        }
        if(!sysDB.purchases.bayan) sysDB.purchases.bayan = [];
        if(!sysDB.purchases.semsem) sysDB.purchases.semsem = [];

        // تنظيف وحذف قسم اليدوي والبريد من البيانات
        if(sysDB.manual_kafr) {
            delete sysDB.manual_kafr;
        }

        if(!sysDB.fatima) {
            sysDB.fatima = {
                prev_val: '', total_work: '', received_val: '', final_rem: '', rows: Array.from({length: 25}, () => ({val: '', comm: '', tot: ''}))
            };
        }
        // ترقية قاعدة البيانات: إضافة نظام الأيام مع الترحيل التلقائي
        if(!sysDB.fatima_days) {
            let today = new Date().toLocaleDateString('ar-EG', {year:'numeric', month:'long', day:'numeric'});
            sysDB.fatima_days = [{
                id: 1,
                label: 'اليوم الأول — ' + today,
                created_at: Date.now(),
                carried_forward: false,
                prev_val: sysDB.fatima ? sysDB.fatima.prev_val : '',
                total_work: sysDB.fatima ? sysDB.fatima.total_work : '',
                received_val: sysDB.fatima ? sysDB.fatima.received_val : '',
                final_rem: sysDB.fatima ? sysDB.fatima.final_rem : '',
                rows: sysDB.fatima ? sysDB.fatima.rows : Array.from({length: 25}, () => ({val: '', comm: '', tot: ''}))
            }];
            sysDB.fatima_active_day = 0;
            // حفظ مباشر بدون استدعاء saveDB لتجنب الأخطاء المبكرة
            try { localStorage.setItem('ABDO_SYSTEM_FINAL_DB', JSON.stringify(sysDB)); } catch(e) {}
        }
        if(sysDB.fatima_active_day === undefined) sysDB.fatima_active_day = 0;

        if(!sysDB.audit_log) sysDB.audit_log = [];
        if(!sysDB.last_backup_time) sysDB.last_backup_time = Date.now();
        if(!sysDB.trash_bin) sysDB.trash_bin = [];

        sysDB.customer_pages.forEach(p => p.debts.forEach(d => delete d.frozen));
        sysDB.company_pages.forEach(p => p.debts.forEach(d => delete d.frozen));
        sysDB.wholesale_pages.forEach(p => p.debts.forEach(d => delete d.frozen));

        let currentTabNum = 1;
        let activeCustomerPageIndex = sysDB.customer_pages.length - 1;
        let activeCompanyPageIndex = sysDB.company_pages.length - 1;
        let activeWholesalePageIndex = sysDB.wholesale_pages.length - 1;
        let activeMerchant = 'bayan'; 
        let inlineActionState = {}; 
        let deletedItemsStore = {};

        // ===== saveDB الآمنة المبكرة =====
        let _saveDBBusy = false;
        function saveDB() {
         if (!sysDB.trash_bin) sysDB.trash_bin = [];       
            if(_saveDBBusy) return;
            _saveDBBusy = true;
            try {
                localStorage.setItem('ABDO_SYSTEM_FINAL_DB', JSON.stringify(sysDB));
            } catch(e) {}
            // الوظائف التالية تعمل فقط بعد تحميل الواجهة
            try { if(typeof setSaveStatus === 'function') setSaveStatus('saving', '⏳ حفظ...'); } catch(e) {}
            try { if(typeof updateDataLists === 'function') updateDataLists(); } catch(e) {}
            try { if(typeof updateLastSaveText === 'function') updateLastSaveText(); } catch(e) {}
            setTimeout(() => {
                _saveDBBusy = false;
                try { if(typeof setSaveStatus === 'function') setSaveStatus('ok', 'جاهز'); } catch(e) {}
            }, 300);
        }

        // ===== استعادة طارئة من الشاشة =====
        function emergencyRecover() {
            let statusEl = document.getElementById('recoveryStatus');
            let found = [];

            // فحص كل المفاتيح المحتملة
            let keys = ['ABDO_SYSTEM_FINAL_DB', 'sys_2030_db_v6', 'sys_2030_db_v5', 'sys_2030_db_v4', 'sys_2030_db_v3', 'sys_2030_db', 'abdo_snap_0', 'abdo_snap_1', 'abdo_snap_2', 'abdo_snap_3', 'abdo_snap_4', 'abdo_snap_5'];
            for(let key of keys) {
                try {
                    let raw = localStorage.getItem(key);
                    if(!raw) continue;
                    let data = JSON.parse(raw);
                    // إذا كانت snapshot
                    if(data.data && typeof data.data === 'string') data = JSON.parse(data.data);
                    if(data && (data.customer_pages || data.customers || data.trusts)) {
                        found.push({ key, data, size: raw.length });
                    }
                } catch(e) {}
            }

            if(!found.length) {
                if(statusEl) statusEl.innerHTML = '<span style="color:#f87171;">لم يتم العثور على بيانات محفوظة.</span>';
                return;
            }

            // أكبر ملف بيانات = الأحدث والأكمل
            found.sort((a,b) => b.size - a.size);
            let best = found[0];
            let d = best.data;

            // ترقية البنية
            if(d.customers && !d.customer_pages) d.customer_pages = [{ page: 1, date: new Date().toLocaleDateString('ar-EG'), debts: d.customers }];
            if(d.companies && !d.company_pages) d.company_pages = [{ page: 1, date: new Date().toLocaleDateString('ar-EG'), debts: d.companies }];
            if(d.wholesale && !d.wholesale_pages) d.wholesale_pages = [{ page: 1, date: new Date().toLocaleDateString('ar-EG'), debts: d.wholesale }];
            if(!d.trusts) d.trusts = [];
            if(!d.treasury) d.treasury = [];
            if(!d.audit_log) d.audit_log = [];
            if(!d.trash_bin) d.trash_bin = [];
            if(!d.purchases) d.purchases = { bayan: [], semsem: [] };

            let totalRec = (d.customer_pages?.[d.customer_pages.length-1]?.debts?.length||0)
                + (d.company_pages?.[d.company_pages.length-1]?.debts?.length||0)
                + (d.wholesale_pages?.[d.wholesale_pages.length-1]?.debts?.length||0);

            localStorage.setItem('ABDO_SYSTEM_FINAL_DB', JSON.stringify(d));
            if(statusEl) statusEl.innerHTML = `<span style="color:#34d399;">✅ تم استعادة ${totalRec} سجل! أعد تحميل الصفحة.</span>`;

            setTimeout(() => location.reload(), 1500);
        }

        // دالة تسجيل الخروج
        function logout() {
            if(confirm("هل أنت متأكد من تسجيل الخروج؟")) {
                sessionStorage.removeItem('abdo_logged_in');
                document.getElementById('loginScreen').style.display = 'flex';
                document.getElementById('dashboardSection').style.display = 'none';
                document.getElementById('autoSaveBar').style.display = 'none';
                document.getElementById('loginPassInput').value = '';
                document.getElementById('loginPassInput').focus();
                logAction('تسجيل خروج من النظام.');
            }
        }

        // ==========================================
        // ===== تنبيهات الديون القديمة =====
        // ==========================================
        function getDaysSince(ts) { return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24)); }

        function checkDebtNotifications() {
            let alerts = [];
            const OLD_DAYS = 30;   // تحذير بعد 30 يوم
            const CRIT_DAYS = 60;  // حرج بعد 60 يوم

            let allDebts = [];
            sysDB.customer_pages.forEach(p => p.debts.forEach(d => allDebts.push({ ...d, section: 'ديون العملاء' })));
            sysDB.company_pages.forEach(p => p.debts.forEach(d => allDebts.push({ ...d, section: 'حسابات الشركات' })));
            sysDB.wholesale_pages.forEach(p => p.debts.forEach(d => allDebts.push({ ...d, section: 'كبار العملاء' })));

            allDebts.forEach(d => {
                if(!d.lastPaymentDate) return;
                let days = getDaysSince(d.lastPaymentDate);
                if(days >= CRIT_DAYS) {
                    alerts.push({ name: d.name, amount: d.amount, days, section: d.section, level: 'critical' });
                } else if(days >= OLD_DAYS) {
                    alerts.push({ name: d.name, amount: d.amount, days, section: d.section, level: 'old' });
                }
            });

            // تنبيهات تواريخ الاستحقاق
            let allDebtsForDue = [];
            sysDB.customer_pages.forEach(p => p.debts.forEach(d => allDebtsForDue.push({ ...d, section: 'ديون العملاء' })));
            sysDB.company_pages.forEach(p => p.debts.forEach(d => allDebtsForDue.push({ ...d, section: 'حسابات الشركات' })));
            sysDB.wholesale_pages.forEach(p => p.debts.forEach(d => allDebtsForDue.push({ ...d, section: 'كبار العملاء' })));
            allDebtsForDue.forEach(d => {
                if(!d.dueDate) return;
                let daysLeft = Math.floor((d.dueDate - Date.now()) / (1000 * 60 * 60 * 24));
                if(daysLeft <= 0) {
                    alerts.push({ name: d.name, amount: d.amount, days: Math.abs(daysLeft), section: d.section, level: 'critical', isDue: true });
                } else if(daysLeft <= 7) {
                    alerts.push({ name: d.name, amount: d.amount, days: daysLeft, section: d.section, level: 'old', isDue: true, daysLeft });
                }
            });

            // تحديث badge
            let badge = document.getElementById('notifBadge');
            if(badge) {
                if(alerts.length > 0) { badge.innerText = alerts.length; badge.style.display = 'inline'; }
                else { badge.style.display = 'none'; }
            }

            // عرض popup للتنبيهات الحرجة فقط (أول 3)
            let panel = document.getElementById('notifPanel');
            if(panel) {
                panel.innerHTML = '';
                alerts.filter(a => a.level === 'critical').slice(0, 3).forEach(a => {
                    let div = document.createElement('div');
                    div.className = `notif-item ${a.level}`;
                    div.innerHTML = `
                        <div class="notif-icon">${a.isDue ? '📅' : '⚠️'}</div>
                        <div class="notif-body">
                            <div class="notif-title">${a.isDue ? 'استحقاق متأخر' : 'دين بدون تسديد'}: ${a.name}</div>
                            <div class="notif-sub">${a.section} • ${Math.floor(a.amount)} د.ل • ${a.isDue ? `متأخر ${a.days} يوم` : `${a.days} يوم بدون دفع`}</div>
                        </div>
                        <button class="notif-close" onclick="this.parentElement.remove()">✕</button>
                    `;
                    panel.appendChild(div);
                    setTimeout(() => { if(div.parentElement) { div.style.animation = 'slideOut 0.4s forwards'; setTimeout(() => div.remove(), 400); } }, 8000);
                });
            }

            return alerts;
        }

        function openNotifsModal() {
            let alerts = checkDebtNotifications();
            let content = document.getElementById('notifsContent');
            document.getElementById('notifsModal').style.display = 'flex';

            if(!alerts.length) {
                content.innerHTML = `<div style="text-align:center; padding:30px; color:#10b981; font-size:16px; font-weight:900;">✅ لا توجد تنبيهات! جميع الحسابات في وضع جيد.</div>`;
                return;
            }

            let criticals = alerts.filter(a => a.level === 'critical');
            let warnings = alerts.filter(a => a.level === 'old');

            let html = '';
            if(criticals.length) {
                html += `<h4 style="color:#ef4444; font-weight:900; margin-bottom:8px;">🚨 حرجة (${criticals.length})</h4>`;
                criticals.forEach(a => {
                    html += `<div style="background:#fff5f5; border-right:4px solid #ef4444; border-radius:6px; padding:10px 12px; margin-bottom:6px;">
                        <div style="font-weight:900; font-size:13px; color:#0f172a;">${a.isDue ? '📅' : '⚠️'} ${a.name} — ${Math.floor(a.amount)} د.ل</div>
                        <div style="font-size:11px; color:#64748b; margin-top:3px;">${a.section} • ${a.isDue ? `تاريخ الاستحقاق تجاوز ${a.days} يوم` : `${a.days} يوم بدون تسديد`}</div>
                    </div>`;
                });
            }
            if(warnings.length) {
                html += `<h4 style="color:#f59e0b; font-weight:900; margin-top:15px; margin-bottom:8px;">⚠️ تحذيرات (${warnings.length})</h4>`;
                warnings.forEach(a => {
                    html += `<div style="background:#fffbeb; border-right:4px solid #f59e0b; border-radius:6px; padding:10px 12px; margin-bottom:6px;">
                        <div style="font-weight:900; font-size:13px; color:#0f172a;">${a.isDue ? '📅' : '🕐'} ${a.name} — ${Math.floor(a.amount)} د.ل</div>
                        <div style="font-size:11px; color:#64748b; margin-top:3px;">${a.section} • ${a.isDue ? `يتبقى ${a.daysLeft} يوم على الاستحقاق` : `${a.days} يوم بدون تسديد`}</div>
                    </div>`;
                });
            }
            content.innerHTML = html;
        }

        // تشغيل فحص التنبيهات كل 5 دقائق
        setInterval(() => { if(sessionStorage.getItem('abdo_logged_in') === '1') checkDebtNotifications(); }, 300000);

        // ==========================================
        // ===== نظام النسخ الاحتياطي الاحترافي =====
        // ==========================================
        let _pendingRestoreData = null;

        function createBackup() {
            try {
                let jsonStr = JSON.stringify(sysDB, null, 2);
                let blob = new Blob([jsonStr], { type: "application/json" });
                let url = URL.createObjectURL(blob);
                let a = document.createElement('a');
                let now = new Date();
                let ds = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
                a.href = url;
                a.download = `المنظومة_احتياطية_${ds}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                logAction('إنشاء نسخة احتياطية يدوية.');
                resetBackupTimer();
                showToast('✅ تم تنزيل النسخة الاحتياطية بنجاح!', 'success');
            } catch(e) {
                showToast('❌ فشل في إنشاء النسخة الاحتياطية!', 'error');
            }
        }

        function openRestoreModal() {
            _pendingRestoreData = null;
            document.getElementById('restoreFileInfo').style.display = 'none';
            document.getElementById('restoreError').style.display = 'none';
            document.getElementById('restoreConfirmBtn').style.display = 'none';
            document.getElementById('restoreFileInput').value = '';
            document.getElementById('restoreModal').style.display = 'flex';
        }

        function closeRestoreModal() {
            document.getElementById('restoreModal').style.display = 'none';
            _pendingRestoreData = null;
        }

        function handleRestoreDrop(event) {
            event.preventDefault();
            document.getElementById('restoreDropZone').style.background = '';
            let file = event.dataTransfer.files[0];
            if(file) handleRestoreFile(file);
        }

        function handleRestoreFile(file) {
            let infoEl = document.getElementById('restoreFileInfo');
            let errEl = document.getElementById('restoreError');
            let confirmBtn = document.getElementById('restoreConfirmBtn');
            infoEl.style.display = 'none';
            errEl.style.display = 'none';
            confirmBtn.style.display = 'none';
            _pendingRestoreData = null;

            if(!file) return;
            if(!file.name.endsWith('.json')) {
                errEl.innerText = '❌ الملف غير صالح! يجب أن يكون ملف .json';
                errEl.style.display = 'block';
                return;
            }

            let reader = new FileReader();
            reader.onload = function(e) {
                try {
                    let data = JSON.parse(e.target.result);
                    // التحقق من صحة البيانات
                    let isValid = data && typeof data === 'object' && (
                        data.customer_pages || data.customers || data.trusts !== undefined
                    );
                    if(!isValid) throw new Error('بنية البيانات غير متوافقة');

                    // ترقية البنية القديمة
                    if(data.customers && !data.customer_pages) data.customer_pages = [{ page: 1, date: formatDateOnly(Date.now()), debts: data.customers }];
                    if(data.companies && !data.company_pages) data.company_pages = [{ page: 1, date: formatDateOnly(Date.now()), debts: data.companies }];
                    if(data.wholesale && !data.wholesale_pages) data.wholesale_pages = [{ page: 1, date: formatDateOnly(Date.now()), debts: data.wholesale }];
                    if(!data.trusts) data.trusts = [];
                    if(!data.treasury) data.treasury = [];
                    if(!data.purchases) data.purchases = { bayan: [], semsem: [] };
                    if(!data.fatima) data.fatima = { prev_val: '', total_work: '', received_val: '', final_rem: '', rows: Array.from({length: 25}, () => ({val: '', comm: '', tot: ''})) };
                    if(!data.audit_log) data.audit_log = [];
                    if(!data.trash_bin) data.trash_bin = [];

                    let totalRecords = (data.customer_pages?.[data.customer_pages.length-1]?.debts?.length || 0)
                        + (data.company_pages?.[data.company_pages.length-1]?.debts?.length || 0)
                        + (data.wholesale_pages?.[data.wholesale_pages.length-1]?.debts?.length || 0);
                    let fileSize = Math.round(e.target.result.length / 1024);

                    _pendingRestoreData = data;
                    infoEl.innerHTML = `✅ الملف صالح: <b>${file.name}</b><br>الحجم: ${fileSize} KB • إجمالي السجلات: ${totalRecords} حساب`;
                    infoEl.style.display = 'block';
                    confirmBtn.style.display = 'block';
                } catch(err) {
                    errEl.innerText = `❌ الملف تالف أو غير متوافق: ${err.message}`;
                    errEl.style.display = 'block';
                }
            };
            reader.readAsText(file);
        }

        function confirmRestore() {
            if(!_pendingRestoreData) { showToast('لا توجد بيانات للاستعادة!', 'error'); return; }
            if(!confirm('⚠️ سيتم استبدال جميع البيانات الحالية بالنسخة المختارة. هل أنت متأكد؟')) return;
            try {
                sysDB = _pendingRestoreData;
                saveDB();
                logAction('استعادة نسخة احتياطية من ملف.');
                closeRestoreModal();
                showToast('✅ تم استعادة البيانات بنجاح! سيتم إعادة تحميل الصفحة.', 'success');
                setTimeout(() => location.reload(), 1500);
            } catch(e) {
                showToast('❌ فشل في استعادة البيانات!', 'error');
            }
        }

        // للتوافق مع الكود القديم
        function backupData() { createBackup(); }
        function processManualRestore() { openRestoreModal(); }

        function processImport() {
            let text = document.getElementById('importText').value;
            let targetDb = document.getElementById('importTargetDb').value;
            if (!text.trim()) { showToast("مربع النص فارغ!", "error"); return; }
            let lines = text.split('\n');
            let importedCount = 0;
            
            if (targetDb === 'trusts') {
                for (let line of lines) {
                    if (!line.trim()) continue;
                    let tokens = line.trim().split(/\s+/);
                    let nameParts = []; let numParts = [];
                    for(let token of tokens) {
                        let cleanToken = token.replace(/,/g, '');
                        if(!isNaN(cleanToken) && cleanToken !== '') { numParts.push(Math.floor(parseFloat(cleanToken))); } 
                        else { nameParts.push(token); }
                    }
                    let name = nameParts.join(' ').trim();
                    if(name && numParts.length > 0) {
                        if(sysDB.trusts.some(t => t.name === name)) continue;
                        let lyd = numParts[0] || 0; 
                        let egp = 0; 
                        sysDB.trusts.push({ id: Date.now() + importedCount + Math.floor(Math.random() * 1000), name: name, lyd: lyd, egp: egp });
                        importedCount++;
                    }
                }
            } else {
                let arr = getDbArr(targetDb);
                for (let line of lines) {
                    if (!line.trim()) continue;
                    let tokens = line.trim().split(/\s+/);
                    let nameParts = []; let numParts = [];
                    for(let token of tokens) {
                        let cleanToken = token.replace(/,/g, '');
                        if(!isNaN(cleanToken) && cleanToken !== '') { numParts.push(Math.floor(parseFloat(cleanToken))); } 
                        else { nameParts.push(token); }
                    }
                    let name = nameParts.join(' ').trim();
                    if(name && numParts.length > 0) {
                        if(arr.some(item => item.name === name)) continue;
                        let amt = numParts[0] || 0;
                        arr.push({ id: Date.now() + importedCount + Math.floor(Math.random() * 1000), name: name, amount: amt, lastPaymentDate: Date.now() });
                        importedCount++;
                    }
                }
                setDbArr(targetDb, arr);
            }

            if (importedCount > 0) {
                logAction(`📥 استيراد إكسيل: إضافة ${importedCount} حساب لقسم ${targetDb}.`);
                saveDB(); renderActiveSection(); document.getElementById('importModal').style.display = 'none'; document.getElementById('importText').value = ''; showToast(`تم استيراد ${importedCount} حساب!`, "success");
            } else { showToast("لم يتم التعرف على أي بيانات جديدة.", "error"); }
        }

       


        window.onload = function() {
           initAuthSystem();
            updateDataLists(); 
            renderActiveSection(); 
            checkBackupTime();
            startAutoSaveSystem();
            if(sessionStorage.getItem('abdo_logged_in') === '1') {
                setTimeout(checkDebtNotifications, 1500);
            }
        };

        setInterval(checkBackupTime, 60000); 
        function checkBackupTime() { let hoursPassed = (Date.now() - sysDB.last_backup_time) / (1000 * 60 * 60); document.getElementById('backupBtnAlert')?.style.display === hoursPassed >= 1 ? 'block' : 'none'; }
        function resetBackupTimer() { sysDB.last_backup_time = Date.now(); saveDB(); checkBackupTime(); }

        // --- تحويل الجداول لصور بأعلى جودة ---
        function downloadAsImage(title, htmlContent) {
            showToast("⏳ جاري تجهيز الصورة...", "warning");

            let container = document.createElement('div');
            container.style.cssText = `
                position: absolute; left: -99999px; top: 0;
                width: 1100px; background: #ffffff; padding: 40px;
                direction: rtl; font-family: 'Tajawal', sans-serif;
                box-sizing: border-box;
            `;

            let style = document.createElement('style');
            style.innerHTML = `
                * { box-sizing: border-box; font-family: 'Tajawal', sans-serif; }
                .report-box { border: 2px solid #cbd5e1; border-radius: 12px; padding: 30px; background: #fff; }
                .report-header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #0369a1; padding-bottom: 18px; }
                .report-title { font-size: 28px; font-weight: 900; color: #0f172a; margin: 0; }
                .report-date { font-size: 14px; color: #64748b; margin-top: 8px; }
                .report-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: center; font-size: 14px; color: #0f172a; }
                .report-table th, .report-table td { border: 1px solid #94a3b8; padding: 10px 12px; font-weight: bold; }
                .report-table th { background: #e0f2fe; color: #0c4a6e; font-weight: 900; font-size: 14px; }
                .report-table tr:nth-child(even) td { background: #f8fafc; }
                .total-row td { font-weight: 900; background: #fef9c3; font-size: 15px; color: #78350f; }
                h2 { color: #1e3a5f; font-size: 17px; margin: 20px 0 10px; border-right: 5px solid #0369a1; padding-right: 12px; text-align: right; background: #f0f9ff; padding: 8px 12px; border-radius: 4px; }
                .footer-note { text-align: center; margin-top: 25px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            `;
            container.appendChild(style);

            let contentDiv = document.createElement('div');
            contentDiv.className = 'report-box';
            contentDiv.innerHTML = htmlContent;
            container.appendChild(contentDiv);

            // تذييل
            let footer = document.createElement('div');
            footer.className = 'footer-note';
            footer.innerText = `المنظومة المالية المركزية — عبده | ${new Date().toLocaleDateString('ar-EG', {year:'numeric',month:'long',day:'numeric'})}`;
            contentDiv.appendChild(footer);

            document.body.appendChild(container);

            setTimeout(() => {
                html2canvas(container, {
                    scale: 3,
                    backgroundColor: '#ffffff',
                    useCORS: true,
                    allowTaint: false,
                    logging: false,
                    width: container.scrollWidth,
                    height: container.scrollHeight,
                    windowWidth: container.scrollWidth,
                    windowHeight: container.scrollHeight
                }).then(canvas => {
                    let link = document.createElement('a');
                    link.download = title + '.png';
                    link.href = canvas.toDataURL('image/png', 1.0);
                    link.click();
                    document.body.removeChild(container);
                    showToast('✅ تم التنزيل بجودة عالية!', 'success');
                }).catch(e => {
                    document.body.removeChild(container);
                    showToast('❌ فشل التنزيل: ' + e.message, 'error');
                });
            }, 600);
        }

        function exportToImage() {
            function generateTable(title, data, isTrust = false) {
                if (!data || data.length === 0) return '';
                let res = `<h2>${title}</h2><table class="report-table"><tr><th>ت</th><th>الاسم</th>`;
                if (isTrust) {
                    res += `<th>ليبي</th><th>مصري</th></tr>`; let tLy = 0, tEg = 0;
                    data.forEach((row, i) => { tLy += Math.floor(row.lyd); tEg += Math.floor(row.egp); res += `<tr><td>${i+1}</td><td>${row.name}</td><td style="color:#16a34a;">${Math.floor(row.lyd)}</td><td style="color:#9333ea;">${Math.floor(row.egp)}</td></tr>`; });
                    res += `<tr class="total-row"><td colspan="2">الإجمالي</td><td style="color:#16a34a;">${tLy}</td><td style="color:#9333ea;">${tEg}</td></tr></table>`;
                } else {
                    res += `<th>المديونية</th></tr>`; let total = 0;
                    data.forEach((row, i) => { total += Math.floor(row.amount); res += `<tr><td>${i+1}</td><td>${row.name}</td><td style="color:#dc2626;">${Math.floor(row.amount)}</td></tr>`; });
                    res += `<tr class="total-row"><td colspan="2">الإجمالي</td><td style="color:#dc2626;">${total}</td></tr></table>`;
                } return res;
            }

            let html = `
                <div class="report-header">
                    <h1 class="report-title">التقرير المحاسبي العام</h1>
                    <div class="report-date">تاريخ التقرير: ${formatDateOnly(Date.now())}</div>
                </div>
            `;
            html += generateTable('ديون العملاء', sysDB.customer_pages[sysDB.customer_pages.length-1].debts);
            html += generateTable('حسابات الشركات التجارية', sysDB.company_pages[sysDB.company_pages.length-1].debts);
            html += generateTable('كبار العملاء - جملة', sysDB.wholesale_pages[sysDB.wholesale_pages.length-1].debts);
            html += generateTable('الودائع والأمانات', sysDB.trusts, true);

            downloadAsImage("التقرير_المحاسبي_العام", html);
            logAction("استخراج تقرير كامل كصورة."); 
            resetBackupTimer();
        }

        function downloadPurchasesImage() {
            let merchantName = activeMerchant === 'bayan' ? 'البيان' : 'سمسم';
            let records = sysDB.purchases[activeMerchant] || [];
            let totalRem = records.reduce((s, i) => s + i.remaining, 0);

            let v_remaining_egp = 0;
            records.forEach(item => {
                if (item.name.includes('فودافون') && !item.parent_id) {
                    let consumed = (item.v_c1||0) + (item.v_c2||0) + (item.v_c3||0) + (item.v_c4||0);
                    let currentDeficit = getVodafoneDeficit(activeMerchant, item.id);
                    let net = item.qty - consumed + currentDeficit;
                    if (net > 0) v_remaining_egp += net;
                }
            });

            let html = `
                <div class="report-header">
                    <h1 class="report-title">كشف حساب مشتريات التاجر: ${merchantName}</h1>
                    <div class="report-date">التاريخ: ${formatDateOnly(Date.now())}</div>
                </div>
                <table class="report-table">
                    <thead><tr><th>ت</th><th>البيان</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th><th>التسديد</th><th>الباقي</th></tr></thead>
                    <tbody>
            `;
            records.forEach((item, index) => {
                html += `<tr><td>${index + 1}</td><td>${item.name}</td><td>${item.qty}</td><td>${item.price}</td><td>${item.total}</td><td>${item.paid}</td><td>${item.remaining}</td></tr>`;
            });
            html += `<tr class="total-row"><td colspan="6">إجمالي الباقي المستحق</td><td style="color:#dc2626;">${totalRem} د.ل</td></tr>`;
            
            if (v_remaining_egp > 0) {
                html += `<tr class="total-row"><td colspan="6" style="color:#9333ea;">إجمالي باقي فودافون (مصري)</td><td style="color:#9333ea;">${v_remaining_egp} ج.م</td></tr>`;
            }
            html += `</tbody></table>`;
            
            downloadAsImage("مشتريات_" + merchantName, html);
            logAction(`استخراج تقرير كصورة لمشتريات التاجر [${merchantName}].`);
        }

        function downloadFatimaImage() {
            let f = sysDB.fatima;

            let html = `
                <div class="report-header">
                    <h1 class="report-title">خلاصة الإجماليات - قسم فاطمة</h1>
                    <div class="report-date">التاريخ: ${formatDateOnly(Date.now())}</div>
                </div>
                <table class="report-table" style="max-width: 600px; margin: 0 auto; font-size:18px;">
                    <tbody>
                        <tr><td style="background-color: #f1f5f9; text-align: right; width: 50%;">القيمة السابقة</td><td>${f.prev_val || ''}</td></tr>
                        <tr><td style="background-color: #f1f5f9; text-align: right;">القيمة المستلمة</td><td>${f.received_val || ''}</td></tr>
                        <tr><td style="background-color: #f1f5f9; text-align: right;">إجمالي الشغل</td><td>${f.total_work || ''}</td></tr>
                        <tr><td style="background-color: #f1f5f9; text-align: right;">الباقي النهائي</td><td style="color:#dc2626;">${f.final_rem || ''}</td></tr>
                    </tbody>
                </table>
            `;
            
            downloadAsImage("خلاصة_قسم_فاطمة", html);
            logAction('استخراج تقرير كصورة لخلاصة قسم فاطمة.');
        }

        function printFatimaPDF() {
            let f = sysDB.fatima;
            let date = new Date().toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });
            let printWin = window.open('', '_blank', 'width=600,height=500');
            printWin.document.write(`
                <!DOCTYPE html>
                <html dir="rtl" lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <title>خلاصة قسم فاطمة</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
                        * { margin:0; padding:0; box-sizing:border-box; }
                        body { font-family:'Tajawal',sans-serif; direction:rtl; background:#fff; color:#0f172a; padding:30px; }
                        .header { text-align:center; margin-bottom:25px; border-bottom:3px solid #7c3aed; padding-bottom:15px; }
                        .header h1 { font-size:22px; font-weight:900; color:#7c3aed; }
                        .header .date { font-size:13px; color:#64748b; margin-top:5px; }
                        table { width:100%; border-collapse:collapse; margin-top:10px; }
                        td { padding:14px 18px; font-size:15px; border:1px solid #e2e8f0; }
                        tr:nth-child(odd) td:first-child { background:#f8f5ff; font-weight:900; color:#374151; }
                        tr:nth-child(even) td:first-child { background:#f1f5f9; font-weight:900; color:#374151; }
                        td:last-child { text-align:center; font-size:18px; font-weight:900; }
                        .row-total td:last-child { color:#d97706; }
                        .row-rem td:last-child { color:#dc2626; }
                        .row-rec td:last-child { color:#16a34a; }
                        .footer { text-align:center; margin-top:30px; font-size:11px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:12px; }
                        @media print { body { padding:15px; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>📊 خلاصة قسم فاطمة</h1>
                        <div class="date">التاريخ: ${date}</div>
                    </div>
                    <table>
                        <tbody>
                            <tr><td>القيمة السابقة</td><td>${f.prev_val || '—'}</td></tr>
                            <tr class="row-rec"><td>القيمة المستلمة</td><td>${f.received_val || '—'}</td></tr>
                            <tr class="row-total"><td>إجمالي الشغل</td><td>${f.total_work || '—'}</td></tr>
                            <tr class="row-rem"><td>الباقي النهائي</td><td>${f.final_rem || '—'}</td></tr>
                        </tbody>
                    </table>
                    <div class="footer">المنظومة المالية المركزية — عبده</div>
                    <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }<\/script>
                </body>
                </html>
            `);
            printWin.document.close();
            logAction('طباعة PDF لخلاصة قسم فاطمة.');
        }

        function backupData() { 
            let jsonStr = JSON.stringify(sysDB);
            let blob = new Blob([jsonStr], { type: "application/json" });
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = "System_Backup.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            logAction("حفظ نسخة احتياطية من البيانات."); 
            resetBackupTimer(); 
            showToast("تم الحفظ بنجاح!", "success");
        }

      
        // =====================================================
        // ===== نظام سجل العمليات المُعاد بناؤه بالكامل =====
        // =====================================================
        // مستقل تماماً عن sysDB — يُخزَّن في localStorage منفصل
        // يعمل حتى لو كان sysDB فيه مشكلة

        const AUDIT_KEY = 'ABDO_AUDIT_LOG_V2';
        const AUDIT_MAX = 500;

        // كتابة سجل — لا تعتمد على أي دالة أخرى
        function logAction(msg, section) {
            try {
                let logs = [];
                try { logs = JSON.parse(localStorage.getItem(AUDIT_KEY)) || []; } catch(e) { logs = []; }
                let now = new Date();
                let entry = {
                    ts: now.getTime(),
                    time: now.toLocaleString('ar-EG', {year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit'}),
                    msg: msg,
                    section: section || 'عام'
                };
                logs.unshift(entry);
                if(logs.length > AUDIT_MAX) logs = logs.slice(0, AUDIT_MAX);
                localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
                // تحديث sysDB.audit_log للتوافق مع الكود القديم
                if(sysDB && sysDB.audit_log !== undefined) {
                    sysDB.audit_log = logs.map(e => `[${e.time}] ${e.msg}`);
                }
            } catch(err) {}
        }

        // قراءة السجل
        function getAuditLogs() {
            try { return JSON.parse(localStorage.getItem(AUDIT_KEY)) || []; } catch(e) { return []; }
        }

        // أيقونة حسب نوع العملية
        function getAuditIcon(msg) {
            if(msg.includes('إضافة') || msg.includes('فتح حساب') || msg.includes('تسجيل')) return '🟢';
            if(msg.includes('حذف') || msg.includes('مسح')) return '🔴';
            if(msg.includes('تسديد') || msg.includes('سداد')) return '🔵';
            if(msg.includes('تعديل') || msg.includes('تغيير')) return '🟡';
            if(msg.includes('نسخة') || msg.includes('استعادة')) return '💾';
            if(msg.includes('استيراد') || msg.includes('تصدير')) return '📤';
            if(msg.includes('دخول') || msg.includes('خروج')) return '🔐';
            return '⚙️';
        }

        let currentAuditPage = 1;

        function openAuditLog(page) {
            page = page || 1;
            currentAuditPage = page;
            try {
                let modal = document.getElementById('auditModal');
                if(!modal) { alert('خطأ: نافذة السجل غير موجودة'); return; }
                modal.style.display = 'flex';
                renderAuditLog();
            } catch(err) {
                alert('خطأ في فتح السجل: ' + err.message);
            }
        }

        function renderAuditLog() {
            let content = document.getElementById('auditLogContent');
            if(!content) return;
            let logs = getAuditLogs();

            if(!logs.length) {
                content.innerHTML = `
                    <div style="text-align:center; padding:30px; color:#64748b;">
                        <div style="font-size:40px; margin-bottom:10px;">📋</div>
                        <div style="font-weight:900; font-size:14px;">السجل فارغ حالياً</div>
                        <div style="font-size:12px; margin-top:5px;">ستظهر هنا جميع العمليات تلقائياً</div>
                    </div>`;
                return;
            }

            const PER_PAGE = 15;
            let totalPages = Math.ceil(logs.length / PER_PAGE);
            currentAuditPage = Math.max(1, Math.min(currentAuditPage, totalPages));
            let start = (currentAuditPage - 1) * PER_PAGE;
            let pageLogs = logs.slice(start, start + PER_PAGE);

            let html = pageLogs.map((entry, idx) => {
                let absIdx = start + idx;
                let icon = getAuditIcon(entry.msg);
                let sectionBadge = entry.section && entry.section !== 'عام'
                    ? `<span style="background:rgba(56,189,248,0.15);color:#38bdf8;border-radius:3px;padding:1px 6px;font-size:10px;margin-left:6px;">${entry.section}</span>`
                    : '';
                return `
                <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:6px;margin-bottom:5px;background:#f8fafc;border-right:3px solid #e2e8f0;border:1px solid #e2e8f0;">
                    <span style="font-size:16px;flex-shrink:0;margin-top:1px;">${icon}</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:900;font-size:13px;color:#0f172a;line-height:1.4;">${entry.msg}${sectionBadge}</div>
                        <div style="font-size:10px;color:#94a3b8;margin-top:2px;">⏱ ${entry.time} • #${logs.length - absIdx}</div>
                    </div>
                    <button onclick="deleteSingleLog(${absIdx})" style="background:none;border:none;cursor:pointer;color:#cbd5e1;font-size:14px;flex-shrink:0;padding:2px 4px;" title="حذف">✕</button>
                </div>`;
            }).join('');

            // ترقيم الصفحات
            let pages = '';
            if(totalPages > 1) {
                pages = `<div style="display:flex;gap:5px;justify-content:center;margin-top:12px;flex-wrap:wrap;">`;
                if(currentAuditPage > 1) pages += `<button onclick="currentAuditPage=1;renderAuditLog()" style="padding:4px 10px;border-radius:4px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;font-size:12px;">⟪</button>`;
                for(let i=Math.max(1,currentAuditPage-2); i<=Math.min(totalPages,currentAuditPage+2); i++) {
                    let s = i===currentAuditPage ? 'background:#0369a1;color:#fff;' : 'background:#f8fafc;color:#0f172a;';
                    pages += `<button onclick="currentAuditPage=${i};renderAuditLog()" style="padding:4px 10px;border-radius:4px;border:1px solid #cbd5e1;cursor:pointer;font-size:12px;${s}">${i}</button>`;
                }
                if(currentAuditPage < totalPages) pages += `<button onclick="currentAuditPage=${totalPages};renderAuditLog()" style="padding:4px 10px;border-radius:4px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;font-size:12px;">⟫</button>`;
                pages += `</div>`;
            }

            let counter = `<div style="font-size:11px;color:#64748b;text-align:center;margin-bottom:8px;font-weight:700;">
                إجمالي ${logs.length} عملية مسجلة — صفحة ${currentAuditPage} من ${totalPages||1}
            </div>`;

            content.innerHTML = counter + html + pages;
        }

        function closeAuditLog() {
            try { document.getElementById('auditModal').style.display = 'none'; } catch(e) {}
        }

        function clearAllAuditLogs() {
            if(!confirm('مسح كل سجل العمليات بالكامل؟')) return;
            localStorage.removeItem(AUDIT_KEY);
            if(sysDB) sysDB.audit_log = [];
            try { saveDB(); } catch(e) {}
            renderAuditLog();
            showToast('تم مسح السجل بالكامل', 'warning');
        }

        function clearSingleAuditLog() {
            let logs = getAuditLogs();
            if(!logs.length) { showToast('السجل فارغ!', 'error'); return; }
            logs.shift();
            localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
            renderAuditLog();
            showToast('تم مسح أحدث عملية', 'warning');
        }

        function deleteSingleLog(absIdx) {
            let logs = getAuditLogs();
            logs.splice(absIdx, 1);
            localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
            renderAuditLog();
        }

        // ترحيل السجل القديم من sysDB.audit_log إذا وُجد
        (function migrateOldAuditLog() {
            try {
                let existing = localStorage.getItem(AUDIT_KEY);
                if(existing) return; // موجود مسبقاً
                let old = sysDB && sysDB.audit_log;
                if(!old || !old.length) return;
                let migrated = old.map((line, i) => {
                    let m = line.match(/^\[(.+?)\]\s(.+)$/);
                    return { ts: Date.now() - i*1000, time: m ? m[1] : '', msg: m ? m[2] : line, section: 'عام' };
                });
                localStorage.setItem(AUDIT_KEY, JSON.stringify(migrated));
            } catch(e) {}
        })();

        // ==========================================
        // ===== تصدير PDF و Excel =====
        // ==========================================

        function exportAllPDF() {
            let date = new Date().toLocaleDateString('ar-EG', {year:'numeric', month:'long', day:'numeric'});
            let w = window.open('', '_blank', 'width=900,height=700');

            let customers = sysDB.customer_pages[sysDB.customer_pages.length-1].debts;
            let companies = sysDB.company_pages[sysDB.company_pages.length-1].debts;
            let wholesale = sysDB.wholesale_pages[sysDB.wholesale_pages.length-1].debts;
            let trusts = sysDB.trusts;

            function makeTable(title, headers, rows, totals) {
                let h = headers.map(h => `<th>${h}</th>`).join('');
                let r = rows.map(r => `<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
                let t = totals ? `<tr class="tot">${totals.map(c=>`<td>${c}</td>`).join('')}</tr>` : '';
                return `<div class="sec"><h2>${title}</h2><table><thead><tr>${h}</tr></thead><tbody>${r}${t}</tbody></table></div>`;
            }

            let custRows = customers.map((d,i)=>[i+1, d.name, Math.floor(d.amount)+' د.ل']);
            let custTotal = customers.reduce((s,d)=>s+Math.floor(d.amount),0);

            let compRows = companies.map((d,i)=>[i+1, d.name, Math.floor(d.amount)+' د.ل']);
            let compTotal = companies.reduce((s,d)=>s+Math.floor(d.amount),0);

            let whoRows = wholesale.map((d,i)=>[i+1, d.name, Math.floor(d.amount)+' د.ل']);
            let whoTotal = wholesale.reduce((s,d)=>s+Math.floor(d.amount),0);

            let trustRows = trusts.map((t,i)=>[i+1, t.name, Math.floor(t.lyd)+' ل.ل', Math.floor(t.egp)+' ج.م']);
            let trustTotLyd = trusts.reduce((s,t)=>s+Math.floor(t.lyd),0);
            let trustTotEgp = trusts.reduce((s,t)=>s+Math.floor(t.egp),0);

            let grandDebt = custTotal + compTotal + whoTotal;

            w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
            <meta charset="UTF-8"><title>تقرير المنظومة المالية</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
                *{margin:0;padding:0;box-sizing:border-box} body{font-family:'Tajawal',sans-serif;direction:rtl;background:#fff;color:#0f172a;padding:20px;font-size:13px}
                .header{text-align:center;border-bottom:3px solid #0284c7;padding-bottom:15px;margin-bottom:20px}
                .header h1{font-size:24px;font-weight:900;color:#0284c7} .header p{color:#64748b;margin-top:5px}
                .sec{margin-bottom:25px;page-break-inside:avoid}
                .sec h2{font-size:15px;font-weight:900;color:#1e40af;background:#eff6ff;padding:8px 12px;border-right:4px solid #3b82f6;margin-bottom:8px;border-radius:4px}
                table{width:100%;border-collapse:collapse} th{background:#1e40af;color:#fff;padding:8px;font-size:12px;text-align:center}
                td{padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px}
                tr:nth-child(even) td{background:#f8fafc} .tot td{background:#fef3c7;font-weight:900;color:#92400e}
                .summary{background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;padding:15px;margin-bottom:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
                .sbox{text-align:center} .sbox .val{font-size:20px;font-weight:900;color:#dc2626} .sbox .lbl{font-size:11px;color:#64748b}
                .footer{text-align:center;margin-top:20px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
                @media print{body{padding:10px} .no-print{display:none}}
            </style></head><body>
            <div class="header"><h1>📊 تقرير المنظومة المالية المركزية</h1><p>التاريخ: ${date}</p></div>
            <div class="summary">
                <div class="sbox"><div class="val">${custTotal}</div><div class="lbl">ديون العملاء (د.ل)</div></div>
                <div class="sbox"><div class="val">${compTotal}</div><div class="lbl">حسابات الشركات (د.ل)</div></div>
                <div class="sbox"><div class="val">${whoTotal}</div><div class="lbl">كبار العملاء (د.ل)</div></div>
                <div class="sbox"><div class="val" style="color:#7c3aed">${trustTotLyd}</div><div class="lbl">الأمانات ليبي</div></div>
                <div class="sbox"><div class="val" style="color:#7c3aed">${trustTotEgp}</div><div class="lbl">الأمانات مصري</div></div>
                <div class="sbox"><div class="val" style="color:#dc2626">${grandDebt}</div><div class="lbl">إجمالي الديون</div></div>
            </div>
            ${makeTable('👥 ديون العملاء', ['ت','الاسم','المبلغ'], custRows, ['','الإجمالي', custTotal+' د.ل'])}
            ${makeTable('🏢 حسابات الشركات', ['ت','الاسم','المبلغ'], compRows, ['','الإجمالي', compTotal+' د.ل'])}
            ${makeTable('📦 كبار العملاء', ['ت','الاسم','المبلغ'], whoRows, ['','الإجمالي', whoTotal+' د.ل'])}
            ${makeTable('🔒 الودائع والأمانات', ['ت','الاسم','ليبي','مصري'], trustRows, ['','الإجمالي', trustTotLyd+' ل.ل', trustTotEgp+' ج.م'])}
            <div class="footer">المنظومة المالية المركزية — عبده • ${date}</div>
            <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script>
            </body></html>`);
            w.document.close();
            logAction('تصدير تقرير PDF شامل للمنظومة.');
            document.getElementById('exportModal').style.display = 'none';
        }

        function exportAllExcel() {
            try {
                let wb = XLSX.utils.book_new();

                function addSheet(name, headers, rows) {
                    let data = [headers, ...rows];
                    let ws = XLSX.utils.aoa_to_sheet(data);
                    // عرض الأعمدة
                    ws['!cols'] = headers.map(() => ({wch: 20}));
                    XLSX.utils.book_append_sheet(wb, ws, name);
                }

                let customers = sysDB.customer_pages[sysDB.customer_pages.length-1].debts;
                addSheet('ديون العملاء',
                    ['ت', 'الاسم', 'المبلغ (د.ل)'],
                    [...customers.map((d,i)=>[i+1, d.name, Math.floor(d.amount)]),
                     ['', 'الإجمالي', customers.reduce((s,d)=>s+Math.floor(d.amount),0)]]
                );

                let companies = sysDB.company_pages[sysDB.company_pages.length-1].debts;
                addSheet('حسابات الشركات',
                    ['ت', 'الاسم', 'المبلغ (د.ل)'],
                    [...companies.map((d,i)=>[i+1, d.name, Math.floor(d.amount)]),
                     ['', 'الإجمالي', companies.reduce((s,d)=>s+Math.floor(d.amount),0)]]
                );

                let wholesale = sysDB.wholesale_pages[sysDB.wholesale_pages.length-1].debts;
                addSheet('كبار العملاء',
                    ['ت', 'الاسم', 'المبلغ (د.ل)'],
                    [...wholesale.map((d,i)=>[i+1, d.name, Math.floor(d.amount)]),
                     ['', 'الإجمالي', wholesale.reduce((s,d)=>s+Math.floor(d.amount),0)]]
                );

                let trusts = sysDB.trusts;
                addSheet('الودائع والأمانات',
                    ['ت', 'الاسم', 'ليبي', 'مصري'],
                    [...trusts.map((t,i)=>[i+1, t.name, Math.floor(t.lyd), Math.floor(t.egp)]),
                     ['', 'الإجمالي', trusts.reduce((s,t)=>s+Math.floor(t.lyd),0), trusts.reduce((s,t)=>s+Math.floor(t.egp),0)]]
                );

                let treasury = sysDB.treasury || [];
                addSheet('الخزينة',
                    ['ت', 'النوع', 'المبلغ (د.ل)', 'المصدر', 'الملاحظات'],
                    treasury.map((t,i)=>[i+1, t.type==='in'?'وارد':'منصرف', Math.floor(t.amount), t.source||'', t.desc||''])
                );

                // ملخص شامل
                let grandDebt = customers.reduce((s,d)=>s+Math.floor(d.amount),0)
                    + companies.reduce((s,d)=>s+Math.floor(d.amount),0)
                    + wholesale.reduce((s,d)=>s+Math.floor(d.amount),0);
                let treasuryIn = treasury.filter(t=>t.type==='in').reduce((s,t)=>s+Math.floor(t.amount),0);
                let treasuryOut = treasury.filter(t=>t.type==='out').reduce((s,t)=>s+Math.floor(t.amount),0);
                addSheet('ملخص عام',
                    ['البند', 'القيمة'],
                    [
                        ['إجمالي ديون العملاء', customers.reduce((s,d)=>s+Math.floor(d.amount),0)],
                        ['إجمالي حسابات الشركات', companies.reduce((s,d)=>s+Math.floor(d.amount),0)],
                        ['إجمالي كبار العملاء', wholesale.reduce((s,d)=>s+Math.floor(d.amount),0)],
                        ['إجمالي الديون الكلي', grandDebt],
                        ['إجمالي الأمانات ليبي', trusts.reduce((s,t)=>s+Math.floor(t.lyd),0)],
                        ['إجمالي الأمانات مصري', trusts.reduce((s,t)=>s+Math.floor(t.egp),0)],
                        ['وارد الخزينة', treasuryIn],
                        ['منصرف الخزينة', treasuryOut],
                        ['صافي الخزينة', treasuryIn - treasuryOut],
                        ['تاريخ التصدير', new Date().toLocaleDateString('ar-EG')],
                    ]
                );

                let now = new Date();
                let ds = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                XLSX.writeFile(wb, `المنظومة_المالية_${ds}.xlsx`);
                logAction('تصدير ملف Excel شامل للمنظومة.');
                document.getElementById('exportModal').style.display = 'none';
                showToast('✅ تم تصدير ملف Excel بنجاح!', 'success');
            } catch(e) {
                showToast('❌ فشل التصدير: ' + e.message, 'error');
            }
        }

        function updateDataLists() {
            let names = new Set();
            sysDB.customer_pages[sysDB.customer_pages.length-1]?.debts.forEach(d => names.add(d.name));
            sysDB.company_pages[sysDB.company_pages.length-1]?.debts.forEach(d => names.add(d.name));
            sysDB.wholesale_pages[sysDB.wholesale_pages.length-1]?.debts.forEach(d => names.add(d.name));
            sysDB.trusts.forEach(t => names.add(t.name));
            document.getElementById('savedNames').innerHTML = Array.from(names).map(n => `<option value="${n}">`).join('');
        }

        function autoCloseDay() {}

        function getDbArr(dbKey) {
            if (dbKey === 'customers') return sysDB.customer_pages[activeCustomerPageIndex].debts;
            if (dbKey === 'companies') return sysDB.company_pages[activeCompanyPageIndex].debts;
            if (dbKey === 'wholesale') return sysDB.wholesale_pages[activeWholesalePageIndex].debts;
            if (dbKey === 'trusts') return sysDB.trusts;
            return sysDB[dbKey];
        }
        
        function setDbArr(dbKey, arr) {
            if (dbKey === 'customers') sysDB.customer_pages[activeCustomerPageIndex].debts = arr;
            else if (dbKey === 'companies') sysDB.company_pages[activeCompanyPageIndex].debts = arr;
            else if (dbKey === 'wholesale') sysDB.wholesale_pages[activeWholesalePageIndex].debts = arr;
            else if (dbKey === 'trusts') sysDB.trusts = arr;
            else sysDB[dbKey] = arr;
        }

        function switchTab(num) { 
            currentTabNum = num; 
            document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active')); 
            document.getElementById('item_' + num).classList.add('active'); 
            renderActiveSection(); 
        }
        
        function switchMerchant(merchant) {
            activeMerchant = merchant;
            renderActiveSection();
        }

        function updateLiveTotal() {
            let qty = parseFloat(document.getElementById('p_qty').value) || 0;
            let price = parseFloat(document.getElementById('p_price').value) || 0;
            let op = document.querySelector('input[name="p_op"]:checked').value;
            let total = op === '*' ? (qty * price) : (price > 0 ? qty / price : 0);
            document.getElementById('live_total_disp').innerText = Math.floor(total);
        }

        function getVodafoneDeficit(merchant, parentId) {
            return sysDB.purchases[merchant]
                .filter(i => i.parent_id === parentId)
                .reduce((s, i) => s + i.qty, 0);
        }

        function updateVodafone(id, fieldIdx, val) {
            let record = sysDB.purchases[activeMerchant].find(i => i.id === id);
            if(!record) return;

            record['v_c' + fieldIdx] = parseFloat(val) || 0;

            let consumed = (record.v_c1||0) + (record.v_c2||0) + (record.v_c3||0) + (record.v_c4||0);
            let currentDeficit = getVodafoneDeficit(activeMerchant, record.id);
            let net = record.qty - consumed + currentDeficit;

            if (net < 0) {
                let deficit = Math.abs(net);
                let deficitTotal = Math.floor(record.op === '*' ? deficit * record.price : (record.price > 0 ? deficit / record.price : 0));
                
                sysDB.purchases[activeMerchant].push({
                    id: Date.now() + Math.random(),
                    parent_id: record.id,
                    name: "ت - عجز " + record.name,
                    qty: deficit,
                    price: record.price,
                    op: record.op,
                    total: deficitTotal,
                    paid: 0,
                    remaining: deficitTotal
                });
                
                logAction(`تسجيل عجز استهلاك تلقائي: ${deficit} للعملية [${record.name}]`);
                showToast(`تم اكتشاف عجز وإدراجه في التسلسل العام: ${deficit}`, "warning");
            }

            saveDB();
            renderActiveSection();
        }

        function updateDeficitPrice(id, newPrice) {
            let price = Math.floor(parseFloat(newPrice)) || 0;
            let record = sysDB.purchases[activeMerchant].find(i => i.id === id);
            if(record && record.parent_id) {
                record.price = price;
                let total = record.op === '*' ? (record.qty * price) : (price > 0 ? record.qty / price : 0);
                record.total = Math.floor(total);
                record.remaining = record.total - record.paid;
                saveDB();
                renderActiveSection();
                showToast("تم تحديث سعر الصرف وتعديل الإجمالي للعجز", "success");
            }
        }

        function addPurchaseRecord() {
            let name = document.getElementById('p_name').value.trim();
            let qty = parseFloat(document.getElementById('p_qty').value) || 0;
            let price = parseFloat(document.getElementById('p_price').value) || 0;
            let op = document.querySelector('input[name="p_op"]:checked').value;
            let paid = parseFloat(document.getElementById('p_paid').value) || 0;

            if (!name || qty <= 0 || price <= 0) {
                showToast("يرجى إدخال نوع العملية، الكمية، والسعر بشكل صحيح", "error");
                return;
            }

            let total = op === '*' ? (qty * price) : (qty / price);
            total = Math.floor(total); 
            let remaining = total - paid;
            
            let isVodafone = name.includes('فودافون');

            let newRecord = {
                id: Date.now(),
                name: name,
                qty: qty,
                price: price,
                op: op,
                total: total,
                paid: paid,
                remaining: remaining
            };

            if(isVodafone) {
                newRecord.v_c1 = '';
                newRecord.v_c2 = '';
                newRecord.v_c3 = '';
                newRecord.v_c4 = '';
            }

            sysDB.purchases[activeMerchant].push(newRecord);

            let merchantName = activeMerchant === 'bayan' ? 'البيان' : 'سمسم';
            logAction(`إضافة مشتريات لتاجر [${merchantName}]: ${name} بإجمالي ${total}`);
            
            saveDB();
            renderActiveSection();
            showToast("تم إضافة العملية بنجاح", "success");
        }

        // ======================================================
        // ===== قسم فاطمة — نظام الأيام مع الترحيل التلقائي =====
        // ======================================================

        function getFatimaDay() {
            return sysDB.fatima_days[sysDB.fatima_active_day];
        }

        // إنشاء يوم جديد مع ترحيل الباقي النهائي تلقائياً
        function createNewFatimaDay() {
            let currentDay = getFatimaDay();
            let finalRem = parseFloat(currentDay.final_rem) || 0;

            if(!confirm(`إنشاء يوم جديد؟\n${finalRem !== 0 ? `سيتم ترحيل الباقي النهائي (${finalRem}) تلقائياً كـ "قيمة سابقة" لليوم الجديد.` : 'لا يوجد رصيد للترحيل، ستبدأ من صفر.'}`)) return;

            let today = new Date().toLocaleDateString('ar-EG', {year:'numeric', month:'long', day:'numeric'});
            let dayNum = sysDB.fatima_days.length + 1;
            let ordinals = ['','الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر'];
            let ordLabel = ordinals[dayNum] || `رقم ${dayNum}`;

            let newDay = {
                id: Date.now(),
                label: `اليوم ${ordLabel} — ${today}`,
                created_at: Date.now(),
                carried_forward: finalRem !== 0,  // علامة أن الترحيل تم
                prev_val: finalRem !== 0 ? finalRem : '',  // ← الترحيل التلقائي هنا
                total_work: '',
                received_val: '',
                final_rem: '',
                rows: Array.from({length: 25}, () => ({val: '', comm: '', tot: ''}))
            };

            sysDB.fatima_days.push(newDay);
            sysDB.fatima_active_day = sysDB.fatima_days.length - 1;
            // مزامنة sysDB.fatima للتوافق مع الكود القديم
            sysDB.fatima = newDay;
            saveDB();
            renderActiveSection();

            let msg = finalRem !== 0
                ? `✅ تم إنشاء "${newDay.label}" وترحيل الباقي (${finalRem}) تلقائياً.`
                : `✅ تم إنشاء "${newDay.label}" (بدون ترحيل).`;
            showToast(msg, 'success');
            logAction(`إنشاء يوم جديد في قسم فاطمة: "${newDay.label}" — ترحيل: ${finalRem !== 0 ? finalRem : 'لا يوجد'}`);
        }

        function switchFatimaDay(idx) {
            sysDB.fatima_active_day = idx;
            sysDB.fatima = sysDB.fatima_days[idx]; // مزامنة
            saveDB();
            renderActiveSection();
        }

        // حساب فوري وعرض مباشر لتحديثات قسم فاطمة 
        function recalcFatimaLive(idx) {
            let v = Math.floor(parseFloat(document.getElementById('f_v_'+idx).value)) || 0;
            let c = Math.floor(parseFloat(document.getElementById('f_c_'+idx).value)) || 0;
            let tot = v + c;
            document.getElementById('f_t_'+idx).value = tot || '';
            
            let grandTotal = 0;
            for(let i=0; i<25; i++) {
                grandTotal += Math.floor(parseFloat(document.getElementById('f_t_'+i)?.value)) || 0;
            }
            document.getElementById('f_total_work').value = grandTotal || '';
            
            let prev = Math.floor(parseFloat(document.getElementById('f_prev').value)) || 0;
            let rec = Math.floor(parseFloat(document.getElementById('f_rec').value)) || 0;
            
            let rem = (prev + rec) - grandTotal;
            let f_rem = document.getElementById('f_rem');
            f_rem.value = (rem === 0 && !prev && !grandTotal && !rec) ? '' : rem;
            
            let day = getFatimaDay();
            day.rows[idx].val = document.getElementById('f_v_'+idx).value ? v : '';
            day.rows[idx].comm = document.getElementById('f_c_'+idx).value ? c : '';
            day.rows[idx].tot = document.getElementById('f_t_'+idx).value ? tot : '';
            day.total_work = document.getElementById('f_total_work').value ? grandTotal : '';
            day.prev_val = document.getElementById('f_prev').value ? prev : '';
            day.received_val = document.getElementById('f_rec').value ? rec : '';
            day.final_rem = f_rem.value;
            // مزامنة sysDB.fatima
            sysDB.fatima = day;
            
            localStorage.setItem('ABDO_SYSTEM_FINAL_DB', JSON.stringify(sysDB));
        }

        function recalcFatimaSummaryLive() {
            let grandTotal = Math.floor(parseFloat(document.getElementById('f_total_work').value)) || 0;
            let prev = Math.floor(parseFloat(document.getElementById('f_prev').value)) || 0;
            let rec = Math.floor(parseFloat(document.getElementById('f_rec').value)) || 0;
            
            let rem = (prev + rec) - grandTotal;
            let f_rem = document.getElementById('f_rem');
            f_rem.value = (rem === 0 && !prev && !grandTotal && !rec) ? '' : rem;
            
            let day = getFatimaDay();
            day.prev_val = document.getElementById('f_prev').value ? prev : '';
            day.received_val = document.getElementById('f_rec').value ? rec : '';
            day.final_rem = f_rem.value;
            // مزامنة sysDB.fatima
            sysDB.fatima = day;
            
            localStorage.setItem('ABDO_SYSTEM_FINAL_DB', JSON.stringify(sysDB));
        }

  function deletePurchaseRecord(id) {
    let idx = sysDB.purchases[activeMerchant].findIndex(x => x.id === id);
    if(idx === -1) return;

    if(!confirm("هل أنت متأكد من مسح هذه العملية؟")) return;

    let item = JSON.parse(JSON.stringify(sysDB.purchases[activeMerchant][idx]));
    
    // تم إضافة الـ index هنا حسب مراجعة شات جي بي تي
    item.__restore = {
        type: 'purchase',
        merchant: activeMerchant,
        index: idx
    };

    addToTrashBin(item, 'purchases', 'المشتريات — ' + (activeMerchant === 'bayan' ? 'البيان' : 'سمسم'));

    sysDB.purchases[activeMerchant].splice(idx, 1);
    saveDB();
    renderActiveSection();
    showToast('تم النقل للسلة', 'success');
}

        function showInline(dbKey, id, type) { document.getElementById(`btns-${dbKey}-${id}`).style.display = 'none'; document.getElementById(`inline-${dbKey}-${id}`).style.display = 'flex'; document.getElementById(`input-${dbKey}-${id}`).focus(); inlineActionState[`${dbKey}_${id}`] = type; }
        function hideInline(dbKey, id) { document.getElementById(`btns-${dbKey}-${id}`).style.display = 'flex'; document.getElementById(`inline-${dbKey}-${id}`).style.display = 'none'; document.getElementById(`input-${dbKey}-${id}`).value = ''; delete inlineActionState[`${dbKey}_${id}`]; }

        // ===== دوال بطاقات ديون العملاء 2050 =====
        let _custCardMode = {}; // id -> 'add' | 'sub'

        function custCardAction(id, type) {
            // إخفاء الأزرار وإظهار حقل الإدخال
            let btns = document.getElementById('cust-btns-' + id);
            let inp  = document.getElementById('cust-input-' + id);
            let lbl  = document.getElementById('cust-label-' + id);
            let val  = document.getElementById('cust-val-' + id);
            if(!btns || !inp) return;
            btns.style.display = 'none';
            inp.style.display  = 'flex';
            lbl.innerText = type === 'add' ? '➕ إضافة:' : '💳 تسديد:';
            val.value = '';
            val.focus();
            _custCardMode[id] = type;
        }

        function custCardCancel(id) {
            let btns = document.getElementById('cust-btns-' + id);
            let inp  = document.getElementById('cust-input-' + id);
            if(!btns || !inp) return;
            inp.style.display  = 'none';
            btns.style.display = 'flex';
            delete _custCardMode[id];
        }

        function custCardSubmit(id) {
            let valEl = document.getElementById('cust-val-' + id);
            if(!valEl) return;
            let amt = Math.floor(parseFloat(valEl.value));
            if(isNaN(amt) || amt <= 0) { valEl.focus(); return; }

            let type = _custCardMode[id];
            let arr  = sysDB.customer_pages[activeCustomerPageIndex].debts;
            let item = arr.find(d => d.id === id);
            if(!item) return;

            if(type === 'add') {
                item.amount += amt;
                logAction(`إضافة (${amt} د.ل) لحساب [${item.name}] — الإجمالي: ${Math.floor(item.amount)}`, 'ديون العملاء');
                showToast(`✅ تمت الإضافة — ${item.name}: ${Math.floor(item.amount)} د.ل`, 'success');
            } else {
                if(amt > item.amount) {
                    showToast(`⚠️ المبلغ (${amt}) أكبر من الدين (${Math.floor(item.amount)})!`, 'error');
                    valEl.focus(); return;
                }
                item.amount -= amt;
                item.lastPaymentDate = Date.now();
                logAction(`تسديد (${amt} د.ل) من [${item.name}] — المتبقي: ${Math.floor(item.amount)}`, 'ديون العملاء');
               if(item.amount <= 0) {

    const archivedItem = JSON.parse(JSON.stringify({
        ...item,
        amount: 0
    }));

    addToTrashBin(
        archivedItem,
        'customers',
        'ديون العملاء'
    );

    const idx = arr.findIndex(x => x.id === item.id);

    if(idx !== -1){
        arr.splice(idx,1);
    }

    saveDB();

    showToast(
        `🎉 تم تصفية حساب ${item.name} ونقله للسلة`,
        'success'
    );

} else {

    showToast(
        `✅ تسديد ${amt} — المتبقي: ${Math.floor(item.amount)} د.ل`,
        'success'
    );

}
            }
            delete _custCardMode[id];
            saveDB();
            renderActiveSection();
        }

        function submitInline(dbKey, id) {
            let val = Math.floor(parseFloat(document.getElementById(`input-${dbKey}-${id}`).value)); if (isNaN(val) || val <= 0) return;
            let arr = getDbArr(dbKey); let target = arr.find(item => item.id === id); let type = inlineActionState[`${dbKey}_${id}`];
            let sectionNames3 = { customers: 'ديون العملاء', companies: 'حسابات الشركات', wholesale: 'كبار العملاء' };
            let sec = sectionNames3[dbKey] || dbKey;
            if (type === 'add') {
                target.amount += val;
                logAction(`إضافة مبلغ (${val} د.ل) لحساب [${target.name}] — الإجمالي: ${Math.floor(target.amount)}`, sec);
            }
            else if (type === 'sub') {
                if (val > target.amount) return;
                target.amount -= val; target.lastPaymentDate = Date.now();
                logAction(`تسديد (${val} د.ل) من حساب [${target.name}] — المتبقي: ${Math.floor(target.amount)}`, sec);
                if (target.amount <= 0) { arr = arr.filter(item => item.id !== id); setDbArr(dbKey, arr); }
            }
            saveDB(); renderActiveSection();
            if(type === 'sub') showToast(`تم التسديد بنجاح`, "success");
        }

        function softDelete(dbKey, id) {
            let arr = getDbArr(dbKey);
            let index = arr.findIndex(item => item.id === id);
            if(index === -1) return;
            let item = arr[index];
            let sectionNames = { customers: 'ديون العملاء', companies: 'حسابات الشركات', wholesale: 'كبار العملاء', trusts: 'الودائع والأمانات' };
            addToTrashBin(item, dbKey, sectionNames[dbKey] || dbKey);
            logAction(`حذف حساب [${item.name}] — القيمة: ${Math.floor(item.amount)} د.ل`, sectionNames[dbKey] || dbKey);
            arr.splice(index, 1);
            setDbArr(dbKey, arr); saveDB(); renderActiveSection();
            let toastId = Date.now();
            deletedItemsStore[toastId] = { item: item, originalIndex: index, dbKey: dbKey };
            showUndoToast(toastId, item.name);
        }

        function showUndoToast(toastId, name) {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast warning`;
            toast.id = `toast-${toastId}`;
            toast.style.display = 'flex'; toast.style.justifyContent = 'space-between'; toast.style.width = '320px'; toast.style.borderLeft = '4px solid var(--warning)';
            toast.innerHTML = `<span style="font-size:13px; font-weight:900; color:#fff;">🗑️ مسح: ${name}</span><button style="background:var(--warning); color:#000; border:none; padding:6px 15px; border-radius:4px; font-weight:900; cursor:pointer;" onclick="undoDelete(${toastId})">تراجع ↩️</button>`;
            container.appendChild(toast);
            setTimeout(() => {
                let t = document.getElementById(`toast-${toastId}`);
                if (t) { t.style.animation = 'slideOut 0.4s forwards'; setTimeout(() => { t.remove(); delete deletedItemsStore[toastId]; }, 400); logAction(`مسح نهائي لحساب [${name}].`); }
            }, 10000);
        }

        function undoDelete(toastId) {
            let data = deletedItemsStore[toastId];
            if(!data) return;
            let arr = getDbArr(data.dbKey);
            arr.splice(data.originalIndex, 0, data.item); 
            setDbArr(data.dbKey, arr); saveDB(); renderActiveSection();
            let t = document.getElementById(`toast-${toastId}`);
            if (t) { t.style.animation = 'slideOut 0.4s forwards'; setTimeout(() => t.remove(), 400); }
            delete deletedItemsStore[toastId];
            showToast(`تم إرجاع الحساب بنجاح.`, "success");
        }

        function generateActionsHtml(dbKey, item) {
            return `
                <div id="btns-${dbKey}-${item.id}" style="display:flex; gap:3px; flex-wrap:wrap; justify-content:center;">
                    <button class="btn-mini b-add-more" onclick="showInline('${dbKey}', ${item.id}, 'add')">➕</button>
                    <button class="btn-mini b-part" title="تسديد جزئي" onclick="showInline('${dbKey}', ${item.id}, 'sub')">➖</button>
                    <button class="btn-mini b-full" title="مسح فوري" onclick="softDelete('${dbKey}', ${item.id})">❌</button>
                </div>
                <div id="inline-${dbKey}-${item.id}" class="inline-input-box">
                    <input type="number" id="input-${dbKey}-${item.id}" autocomplete="off" placeholder="المبلغ" onkeydown="if(event.key === 'Enter') submitInline('${dbKey}', ${item.id})">
                    <button class="btn-mini b-calc" onclick="openCalcModal('input-${dbKey}-${item.id}')" title="حاسبة">🧮</button>
                    <button class="btn-mini b-add-more" onclick="submitInline('${dbKey}', ${item.id})">✔️</button>
                    <button class="btn-mini b-full" onclick="hideInline('${dbKey}', ${item.id})">❌</button>
                </div>
            `;
        }

        function showTrustInline(id, type) {
            document.getElementById(`btns-trusts-${id}`).style.display = 'none';
            let inlineBox = document.getElementById(`inline-trusts-${id}`);
            inlineBox.style.display = 'flex';
            inlineActionState[`trusts_${id}`] = type;

            if (type === 'deposit') {
                inlineBox.innerHTML = `
                    <input type="number" id="t-lyd-${id}" autocomplete="off" placeholder="+ ليبي" style="width:60px;">
                    <button class="btn-mini b-calc" onclick="openCalcModal('t-lyd-${id}')">🧮</button>
                    <input type="number" id="t-egp-${id}" autocomplete="off" placeholder="+ مصري" style="width:60px;" onkeydown="if(event.key === 'Enter') submitTrustInline(${id})">
                    <button class="btn-mini b-calc" onclick="openCalcModal('t-egp-${id}')">🧮</button>
                    <button class="btn-mini b-add-more" onclick="submitTrustInline(${id})">✔️</button>
                    <button class="btn-mini b-full" onclick="hideTrustInline(${id})">❌</button>
                `;
            } else if (type === 'withdraw') {
                inlineBox.innerHTML = `
                    <input type="number" id="t-lyd-${id}" autocomplete="off" placeholder="- ليبي" style="width:60px;">
                    <button class="btn-mini b-calc" onclick="openCalcModal('t-lyd-${id}')">🧮</button>
                    <input type="number" id="t-egp-${id}" autocomplete="off" placeholder="- مصري" style="width:60px;" onkeydown="if(event.key === 'Enter') submitTrustInline(${id})">
                    <button class="btn-mini b-calc" onclick="openCalcModal('t-egp-${id}')">🧮</button>
                    <button class="btn-mini b-add-more" onclick="submitTrustInline(${id})">✔️</button>
                    <button class="btn-mini b-full" onclick="hideTrustInline(${id})">❌</button>
                `;
            } else if (type === 'convert') {
                inlineBox.innerHTML = `
                    <input type="number" id="t-lyd-${id}" autocomplete="off" placeholder="- خصم ليبي" style="width:65px;">
                    <input type="number" id="t-egp-${id}" autocomplete="off" placeholder="قيمة المصري" style="width:65px;" onkeydown="if(event.key === 'Enter') submitTrustInline(${id})">
                    <select id="t-action-${id}" class="glass-input" style="width:auto; padding:2px; font-size:10px; height:26px;">
                        <option value="keep">إبقاء كأمانة</option>
                        <option value="deliver">تسليم للزبون</option>
                    </select>
                    <button class="btn-mini b-calc" onclick="openCalcModal('t-egp-${id}')" title="حاسبة للمصري">🧮</button>
                    <button class="btn-mini b-add-more" onclick="submitTrustInline(${id})">✔️</button>
                    <button class="btn-mini b-full" onclick="hideTrustInline(${id})">❌</button>
                `;
            }
        }

        function hideTrustInline(id) {
            document.getElementById(`btns-trusts-${id}`).style.display = 'flex';
            document.getElementById(`inline-trusts-${id}`).style.display = 'none';
            document.getElementById(`inline-trusts-${id}`).innerHTML = '';
            delete inlineActionState[`trusts_${id}`];
        }

        function submitTrustInline(id) {
            let t = sysDB.trusts.find(item => item.id === id);
            let type = inlineActionState[`trusts_${id}`];
            let lydVal = Math.floor(parseFloat(document.getElementById(`t-lyd-${id}`).value)) || 0;
            let egpVal = Math.floor(parseFloat(document.getElementById(`t-egp-${id}`).value)) || 0;

            if (lydVal <= 0 && egpVal <= 0) return; 

            if (type === 'deposit') {
                t.lyd += lydVal; t.egp += egpVal;
                logAction(`إيداع أمانة: ${lydVal} ليبي / ${egpVal} مصري لحساب [${t.name}].`);
            } else if (type === 'withdraw') {
                if (lydVal > t.lyd || egpVal > t.egp) { showToast("الرصيد لا يكفي للسحب!", "error"); return; }
                t.lyd -= lydVal; t.egp -= egpVal;
                logAction(`سحب أمانة: ${lydVal} ليبي / ${egpVal} مصري من حساب [${t.name}].`);
            } else if (type === 'convert') {
                let action = document.getElementById(`t-action-${id}`).value;
                if (lydVal > t.lyd) { showToast("الرصيد الليبي لا يكفي للتحويل!", "error"); return; }
                
                if (action === 'keep') {
                    t.lyd -= lydVal; t.egp += egpVal;
                    logAction(`تحويل أمانة: خصم ${lydVal} ليبي وإضافة ${egpVal} مصري لحساب [${t.name}].`);
                } else if (action === 'deliver') {
                    t.lyd -= lydVal;
                    logAction(`تحويل وتسليم فوري: خصم ${lydVal} ليبي وتسليم ${egpVal} مصري للزبون [${t.name}].`);
                }
            }

            if (t.lyd <= 0 && t.egp <= 0) { sysDB.trusts = sysDB.trusts.filter(item => item.id !== id); }
            saveDB(); renderActiveSection();
        }

        function generateTrustActionsHtml(t) {
            return `
                <div id="btns-trusts-${t.id}" style="display:flex; gap:3px; flex-wrap:wrap; justify-content:center;">
                    <button class="btn-mini b-add-more" onclick="showTrustInline(${t.id}, 'deposit')">➕ إيداع</button>
                    <button class="btn-mini b-part" onclick="showTrustInline(${t.id}, 'withdraw')">➖ سحب</button>
                    <button class="btn-mini b-conv" onclick="showTrustInline(${t.id}, 'convert')">🔄 تحويل</button>
                    <button class="btn-mini b-full" title="مسح فوري" onclick="softDelete('trusts', ${t.id})">❌</button>
                </div>
                <div id="inline-trusts-${t.id}" class="inline-input-box"></div>
            `;
        }

        function openTreasuryModal(type) {
            treasuryActionType = type;
            document.getElementById('tModalAmount').value = '';
            document.getElementById('tModalDesc').value = '';
            
            let title = document.getElementById('tModalTitle');
            let btn = document.getElementById('tModalSubmitBtn');
            let chipsContainer = document.getElementById('tModalChips');
            
            if(type === 'in') {
                title.innerText = '➕ إيداع في الخزينة';
                title.style.color = 'var(--success)';
                btn.style.background = 'var(--success)';
                btn.style.color = '#000';
                
                let sources = ['الصغير', 'محل محسن', 'مكاتب طرابلس وبنغازي', 'مكتب الحوتة', 'تحصيلات شخصية', 'مصادر أخرى'];
                chipsContainer.innerHTML = sources.map(s => `<div class="chip" onclick="selectTChip(this, '${s}')">${s}</div>`).join('');
                
            } else {
                title.innerText = '➖ سحب من الخزينة';
                title.style.color = 'var(--danger)';
                btn.style.background = 'var(--danger)';
                btn.style.color = '#fff';
                
                let dests = ['مشتريات بضاعة', 'مصاريف نثرية', 'رواتب ومكافآت', 'سحب شخصي', 'تحويلات خارجية', 'منصرف أخرى'];
                chipsContainer.innerHTML = dests.map(s => `<div class="chip" onclick="selectTChip(this, '${s}')">${s}</div>`).join('');
            }
            
            document.getElementById('tModalSourceHidden').value = '';
            document.getElementById('treasuryActionModal').style.display = 'flex';
        }

        function selectTChip(element, value) {
            let chips = document.getElementById('tModalChips').querySelectorAll('.chip');
            chips.forEach(c => { c.classList.remove('active-in'); c.classList.remove('active-out'); });
            
            if(treasuryActionType === 'in') element.classList.add('active-in');
            else element.classList.add('active-out');
            
            document.getElementById('tModalSourceHidden').value = value;
        }

        function submitTreasuryAction() {
            let source = document.getElementById('tModalSourceHidden').value;
            let amount = Math.floor(parseFloat(document.getElementById('tModalAmount').value));
            let desc = document.getElementById('tModalDesc').value.trim();
            
            if(!source) { showToast("الرجاء اختيار المصدر/البند أولاً", "error"); return; }
            if(isNaN(amount) || amount <= 0) { showToast("أدخل مبلغ صحيح", "error"); return; }
            
            if(treasuryActionType === 'out') {
                let logs = sysDB.treasury || [];
                let totalTreasury = logs.reduce((sum, item) => sum + (item.type === 'in' ? item.amount : -item.amount), 0);
                if(amount > totalTreasury) { showToast("رصيد الخزينة لا يكفي للسحب!", "error"); return; }
            }

            sysDB.treasury.unshift({ 
                id: Date.now() + Math.random(), 
                source: source, 
                amount: amount, 
                type: treasuryActionType, 
                desc: desc || (treasuryActionType === 'in' ? 'إيداع مباشر' : 'سحب مباشر') 
            });
            
            logAction(`حركة خزينة (${treasuryActionType === 'in' ? 'وارد' : 'منصرف'}): ${amount} د.ل - [${source}].`);
            saveDB(); 
            document.getElementById('treasuryActionModal').style.display = 'none';
            renderActiveSection();
            showToast(`تم ${treasuryActionType === 'in' ? 'الإيداع' : 'السحب'} بنجاح`, "success");
        }

      window.deleteTreasuryLog = function(id) {
    if(!confirm("هل أنت متأكد من مسح حركة الخزينة؟")) return;

    let idx = sysDB.treasury.findIndex(i => i.id === id);
    if(idx === -1){
        showToast("❌ الحركة غير موجودة", "error");
        return;
    }

    // نسخ العنصر قبل الحذف
    let deletedItem = JSON.parse(JSON.stringify(sysDB.treasury[idx]));

    // 💡 التعديل العبقري: حفظ بيانات مكان السطر للاسترجاع
    deletedItem.__restore = {
        type: 'treasury',
        index: idx
    };

    // نقل للسلة
    addToTrashBin(deletedItem, 'treasury', 'الخزينة');

    // حذف فعلي
    sysDB.treasury.splice(idx, 1);
    
    logAction(`تم نقل حركة خزينة إلى السلة.`);
    saveDB();
    renderActiveSection();
    showToast("🗑️ تم نقل الحركة إلى السلة", "success");
};

        // ============================================================
        // ===== نظام الخزينة المتقدمة - الإصدار 2025 الكامل =====
        // ============================================================

        // --- حالة الخزينة العامة ---
        let txCurrentTab = 'movements';
        let txSearchQuery = '';
        let txActiveVault = 0; // 0 = الخزينة الرئيسية
        let txAiLoaded = false;
        let txAlertsDismissed = [];

        // --- ترقية قاعدة بيانات الخزينة (لا تمس البيانات القديمة) ---
        function upgradeTreasuryDB() {
            // الحفاظ على sysDB.treasury القديمة وترقيتها
            if (!sysDB.treasury) sysDB.treasury = [];

            // إضافة خزائن متعددة (جديد - لا يؤثر على البيانات القديمة)
            if (!sysDB.treasury_vaults) {
                sysDB.treasury_vaults = [
                    { id: 0, name: 'الخزينة الرئيسية', icon: '🏦', color: '#00f2fe', created: Date.now() }
                ];
            }

            // إضافة معرّف الخزينة للحركات القديمة (افتراضي: الخزينة الرئيسية)
            sysDB.treasury.forEach(tx => {
                if (tx.vault_id === undefined) tx.vault_id = 0;
                if (!tx.ts) tx.ts = tx.id || Date.now();
                if (!tx.category) tx.category = tx.type === 'in' ? 'إيداع' : 'مصروف';
            });

            // تهيئة سجل عمليات الخزينة المنفصل
            if (!sysDB.treasury_audit) sysDB.treasury_audit = [];

            // تهيئة تنبيهات الخزينة
            if (!sysDB.treasury_alerts) {
                sysDB.treasury_alerts = {
                    low_balance_threshold: 1000,
                    large_tx_threshold: 5000,
                    enabled: true
                };
            }
        }
        upgradeTreasuryDB();

        // --- حفظ عملية في سجل الخزينة ---
        function logTreasuryAction(action, amount, details) {
            if (!sysDB.treasury_audit) sysDB.treasury_audit = [];
            sysDB.treasury_audit.unshift({
                id: Date.now() + Math.random(),
                ts: Date.now(),
                time: new Date().toLocaleString('ar-EG'),
                action: action,
                amount: amount || 0,
                details: details || '',
                vault_id: txActiveVault
            });
            if (sysDB.treasury_audit.length > 200) sysDB.treasury_audit = sysDB.treasury_audit.slice(0, 200);
        }

        // --- حساب أرصدة الخزائن ---
        function getTreasuryStats(vaultId) {
            let logs = (sysDB.treasury || []).filter(t => (t.vault_id === undefined ? 0 : t.vault_id) === vaultId);
            let totalIn = logs.filter(t => t.type === 'in').reduce((s, t) => s + Math.floor(t.amount), 0);
            let totalOut = logs.filter(t => t.type === 'out').reduce((s, t) => s + Math.floor(t.amount), 0);
            let balance = totalIn - totalOut;

            // حساب صافي اليوم
            let today = new Date();
            today.setHours(0, 0, 0, 0);
            let todayTs = today.getTime();
            let todayIn = logs.filter(t => t.type === 'in' && (t.ts || t.id) >= todayTs).reduce((s, t) => s + Math.floor(t.amount), 0);
            let todayOut = logs.filter(t => t.type === 'out' && (t.ts || t.id) >= todayTs).reduce((s, t) => s + Math.floor(t.amount), 0);

            return { totalIn, totalOut, balance, todayIn, todayOut, todayNet: todayIn - todayOut, count: logs.length };
        }

        function getAllTreasuryStats() {
            let allLogs = sysDB.treasury || [];
            let totalIn = allLogs.filter(t => t.type === 'in').reduce((s, t) => s + Math.floor(t.amount), 0);
            let totalOut = allLogs.filter(t => t.type === 'out').reduce((s, t) => s + Math.floor(t.amount), 0);
            return { totalIn, totalOut, balance: totalIn - totalOut };
        }

        // --- كشف التنبيهات الذكية ---
        function getTreasuryAlerts() {
            let alerts = [];
            let stats = getTreasuryStats(txActiveVault);
            let cfg = sysDB.treasury_alerts || {};

            if (stats.balance < (cfg.low_balance_threshold || 1000) && stats.balance >= 0) {
                alerts.push({ type: 'warning', icon: '⚠️', msg: `رصيد الخزينة منخفض: ${stats.balance} د.ل (أقل من الحد الأدنى ${cfg.low_balance_threshold || 1000} د.ل)` });
            }
            if (stats.balance < 0) {
                alerts.push({ type: 'danger', icon: '🚨', msg: `رصيد الخزينة سالب! المصروفات تتجاوز الإيرادات بـ ${Math.abs(stats.balance)} د.ل` });
            }

            // كشف حركة كبيرة غير معتادة
            let logs = (sysDB.treasury || []).filter(t => (t.vault_id || 0) === txActiveVault);
            let threshold = cfg.large_tx_threshold || 5000;
            let now = Date.now();
            let recentLarge = logs.filter(t => t.amount > threshold && (now - (t.ts || t.id)) < 24 * 60 * 60 * 1000);
            if (recentLarge.length > 0) {
                alerts.push({ type: 'info', icon: '📊', msg: `تم رصد ${recentLarge.length} حركة كبيرة خلال آخر 24 ساعة (أكبر من ${threshold} د.ل)` });
            }

            // تنبيه إذا لم تكن هناك حركات منذ فترة طويلة
            if (logs.length > 0) {
                let lastTx = logs[0];
                let daysSince = Math.floor((now - (lastTx.ts || lastTx.id)) / (1000 * 60 * 60 * 24));
                if (daysSince > 7) {
                    alerts.push({ type: 'info', icon: '🕐', msg: `آخر حركة في الخزينة كانت منذ ${daysSince} يوم` });
                }
            }

            return alerts.filter(a => !txAlertsDismissed.includes(a.msg));
        }

        // --- تحليل الذكاء الاصطناعي ---
        async function runAIAnalysis() {
            let container = document.getElementById('tx-ai-content');
            if (!container) return;
            container.innerHTML = `<div class="ai-loading"><span class="ai-pulse">🤖</span> جاري التحليل الذكي...</div>`;

            let stats = getTreasuryStats(txActiveVault);
            let logs = (sysDB.treasury || []).filter(t => (t.vault_id || 0) === txActiveVault);

            // تحليل محلي بدون API أولاً (فوري)
            let insights = buildLocalInsights(stats, logs);
            renderAIInsights(insights);
            txAiLoaded = true;

            // ثم تحليل متقدم عبر API
            try {
                let summaryData = {
                    balance: stats.balance,
                    totalIn: stats.totalIn,
                    totalOut: stats.totalOut,
                    todayNet: stats.todayNet,
                    txCount: logs.length,
                    last10: logs.slice(0, 10).map(t => ({
                        type: t.type, amount: Math.floor(t.amount), source: t.source, category: t.category
                    })),
                    topSources: getTopSources(logs)
                };

                const response = await fetch("https://api.anthropic.com/v1/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "claude-sonnet-4-20250514",
                        max_tokens: 1000,
                        messages: [{
                            role: "user",
                            content: `أنت مستشار مالي متخصص. قم بتحليل بيانات الخزينة التالية وقدّم 4 نقاط تحليلية باللغة العربية. أجب فقط بـ JSON بالشكل التالي بدون أي نص إضافي:
{"insights":[{"type":"good|warn|alert|info","icon":"emoji","title":"عنوان قصير","text":"تحليل 2 جملة"}]}

البيانات: ${JSON.stringify(summaryData)}`
                        }]
                    })
                });

                if (response.ok) {
                    let data = await response.json();
                    let text = data.content.map(b => b.text || '').join('');
                    let clean = text.replace(/```json|```/g, '').trim();
                    let parsed = JSON.parse(clean);
                    if (parsed.insights && parsed.insights.length) {
                        renderAIInsights(parsed.insights);
                    }
                }
            } catch (e) {
                // إذا فشل الـ API نبقى بالتحليل المحلي
            }
        }

        function getTopSources(logs) {
            let counts = {};
            logs.forEach(t => {
                let k = t.source || 'غير محدد';
                counts[k] = (counts[k] || 0) + Math.floor(t.amount);
            });
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => ({ source: k, total: v }));
        }

        function buildLocalInsights(stats, logs) {
            let insights = [];
            let spendRate = stats.totalIn > 0 ? ((stats.totalOut / stats.totalIn) * 100).toFixed(1) : 0;

            if (stats.balance > 0 && spendRate < 70) {
                insights.push({ type: 'good', icon: '✅', title: 'وضع مالي صحي', text: `نسبة الإنفاق ${spendRate}% من الإيرادات. الخزينة بوضع جيد مع رصيد إيجابي.` });
            } else if (spendRate >= 90) {
                insights.push({ type: 'alert', icon: '🔴', title: 'إنفاق مرتفع جداً', text: `نسبة الإنفاق ${spendRate}% — تجاوزت الحد المأمون. يُنصح بمراجعة المصروفات.` });
            } else {
                insights.push({ type: 'warn', icon: '🟡', title: 'نسبة إنفاق متوسطة', text: `نسبة الإنفاق ${spendRate}%. راقب الأنماط الشهرية لتجنب العجز.` });
            }

            // تحليل اليوم
            if (stats.todayNet > 0) {
                insights.push({ type: 'good', icon: '📈', title: 'حركة إيجابية اليوم', text: `صافي اليوم +${stats.todayNet} د.ل. يوم مالي ناجح.` });
            } else if (stats.todayNet < 0) {
                insights.push({ type: 'warn', icon: '📉', title: 'صرف أكثر من الوارد اليوم', text: `صافي اليوم ${stats.todayNet} د.ل. تأكد أن المصروفات مبررة.` });
            } else {
                insights.push({ type: 'info', icon: '📊', title: 'لا حركات اليوم', text: `لم تُسجَّل أي حركات اليوم بعد.` });
            }

            // توقع بسيط
            if (logs.length >= 5) {
                let avgOut = stats.totalOut / Math.max(logs.filter(t => t.type === 'out').length, 1);
                let daysCapacity = avgOut > 0 ? Math.floor(stats.balance / avgOut) : 999;
                if (daysCapacity < 10 && daysCapacity >= 0) {
                    insights.push({ type: 'alert', icon: '⏰', title: 'تحذير: رصيد يكفي لأيام قليلة', text: `بناءً على متوسط الإنفاق، الرصيد يكفي لنحو ${daysCapacity} عملية صرف قادمة.` });
                } else {
                    insights.push({ type: 'info', icon: '🔮', title: 'توقع استمرارية جيد', text: `الرصيد الحالي كافٍ لتغطية نفقات طويلة المدى بناءً على نمط الإنفاق.` });
                }
            }

            return insights;
        }

        function renderAIInsights(insights) {
            let container = document.getElementById('tx-ai-content');
            if (!container) return;
            container.innerHTML = `<div class="ai-insights">
                ${insights.map(i => `
                    <div class="ai-insight ${i.type}">
                        <div class="ai-insight-icon">${i.icon}</div>
                        <div class="ai-insight-title">${i.title}</div>
                        <div class="ai-insight-text">${i.text}</div>
                    </div>
                `).join('')}
            </div>`;
        }

        // --- إضافة خزينة جديدة ---
        function addNewVault() {
            let name = prompt('اسم الخزينة الجديدة:');
            if (!name || !name.trim()) return;
            let icons = ['💼', '🏪', '💵', '🔐', '📦', '🏧'];
            let colors = ['#34d399', '#f59e0b', '#a78bfa', '#f87171', '#60a5fa', '#fb923c'];
            let id = Date.now();
            let idx = sysDB.treasury_vaults.length % icons.length;
            sysDB.treasury_vaults.push({
                id: id, name: name.trim(), icon: icons[idx], color: colors[idx], created: Date.now()
            });
            logAction(`إضافة خزينة جديدة: ${name.trim()}`, 'الخزينة');
            logTreasuryAction('إضافة خزينة جديدة', 0, name.trim());
            saveDB();
            renderActiveSection();
            showToast(`✅ تمت إضافة الخزينة: ${name.trim()}`, 'success');
        }

        // --- تحويل بين الخزائن ---
        function openTransferModal() {
            if (sysDB.treasury_vaults.length < 2) {
                showToast('⚠️ تحتاج إلى خزينتين على الأقل للتحويل', 'warning');
                return;
            }
            let modal = document.getElementById('txTransferModal');
            let fromSel = document.getElementById('txTransferFrom');
            let toSel = document.getElementById('txTransferTo');
            if (!modal) return;
            
            let options = sysDB.treasury_vaults.map(v => `<option value="${v.id}">${v.icon} ${v.name}</option>`).join('');
            fromSel.innerHTML = options;
            toSel.innerHTML = options;
            fromSel.value = txActiveVault;
            toSel.value = sysDB.treasury_vaults.find(v => v.id !== txActiveVault)?.id || sysDB.treasury_vaults[0].id;
            
            modal.style.display = 'flex';
        }

        function submitTransfer() {
            let fromId = parseInt(document.getElementById('txTransferFrom').value);
            let toId = parseInt(document.getElementById('txTransferTo').value);
            let amount = Math.floor(parseFloat(document.getElementById('txTransferAmount').value));
            let note = document.getElementById('txTransferNote').value.trim();

            if (fromId === toId) { showToast('⚠️ لا يمكن التحويل من وإلى نفس الخزينة', 'error'); return; }
            if (isNaN(amount) || amount <= 0) { showToast('⚠️ أدخل مبلغاً صحيحاً', 'error'); return; }

            let fromStats = getTreasuryStats(fromId);
            if (amount > fromStats.balance) { showToast('❌ رصيد المصدر لا يكفي', 'error'); return; }

            let fromVault = sysDB.treasury_vaults.find(v => v.id === fromId);
            let toVault = sysDB.treasury_vaults.find(v => v.id === toId);

            let txId = Date.now();
            sysDB.treasury.unshift({
                id: txId, ts: txId, type: 'out', amount: amount,
                source: `تحويل إلى ${toVault.name}`,
                desc: note || `تحويل إلى خزينة ${toVault.name}`,
                vault_id: fromId, category: 'تحويل'
            });
            sysDB.treasury.unshift({
                id: txId + 1, ts: txId + 1, type: 'in', amount: amount,
                source: `تحويل من ${fromVault.name}`,
                desc: note || `تحويل من خزينة ${fromVault.name}`,
                vault_id: toId, category: 'تحويل'
            });

            logAction(`تحويل ${amount} د.ل من ${fromVault.name} إلى ${toVault.name}`, 'الخزينة');
            logTreasuryAction('تحويل بين خزائن', amount, `من ${fromVault.name} إلى ${toVault.name}`);
            saveDB();
            document.getElementById('txTransferModal').style.display = 'none';
            renderActiveSection();
            showToast(`✅ تم تحويل ${amount} د.ل بنجاح`, 'success');
        }

        // --- سجل عمليات الخزينة ---
        function openTreasuryAuditLog() {
            let modal = document.getElementById('txAuditModal');
            let content = document.getElementById('txAuditContent');
            if (!modal || !content) return;
            
            let logs = sysDB.treasury_audit || [];
            if (!logs.length) {
                content.innerHTML = '<p style="text-align:center;color:#64748b;padding:20px;">لا توجد سجلات بعد</p>';
            } else {
                content.innerHTML = logs.slice(0, 50).map(l => `
                    <div style="background:#f8fafc;border-right:3px solid #0284c7;border-radius:6px;padding:10px;margin-bottom:6px;">
                        <div style="font-size:11px;color:#f59e0b;font-weight:900;">${l.time}</div>
                        <div style="font-weight:900;color:#0f172a;">${l.action}: ${l.amount > 0 ? Math.floor(l.amount) + ' د.ل' : ''}</div>
                        ${l.details ? `<div style="font-size:11px;color:#64748b;">${l.details}</div>` : ''}
                    </div>
                `).join('');
            }
            modal.style.display = 'flex';
        }

        // --- تصدير تقرير الخزينة PDF ---
        function exportTreasuryPDF(period) {
            let logs = (sysDB.treasury || []).filter(t => (t.vault_id || 0) === txActiveVault);
            let now = Date.now();
            let filtered = logs;

            if (period === 'daily') filtered = logs.filter(t => (now - (t.ts || t.id)) <= 24 * 60 * 60 * 1000);
            else if (period === 'weekly') filtered = logs.filter(t => (now - (t.ts || t.id)) <= 7 * 24 * 60 * 60 * 1000);
            else if (period === 'monthly') filtered = logs.filter(t => (now - (t.ts || t.id)) <= 30 * 24 * 60 * 60 * 1000);
            else if (period === 'yearly') filtered = logs.filter(t => (now - (t.ts || t.id)) <= 365 * 24 * 60 * 60 * 1000);

            let totalIn = filtered.filter(t => t.type === 'in').reduce((s, t) => s + Math.floor(t.amount), 0);
            let totalOut = filtered.filter(t => t.type === 'out').reduce((s, t) => s + Math.floor(t.amount), 0);
            let vault = sysDB.treasury_vaults.find(v => v.id === txActiveVault) || { name: 'الخزينة الرئيسية' };
            let periodLabels = { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري', yearly: 'سنوي', all: 'كامل' };
            let dateStr = new Date().toLocaleDateString('ar-EG');

            let rows = filtered.map((t, i) => {
                let ts = t.ts || t.id;
                let d = new Date(ts).toLocaleDateString('ar-EG');
                let isIn = t.type === 'in';
                return `<tr>
                    <td>${i + 1}</td>
                    <td>${d}</td>
                    <td style="color:${isIn ? '#059669' : '#dc2626'};font-weight:900;">${isIn ? '+' : '-'}${Math.floor(t.amount)} د.ل</td>
                    <td>${t.source || '-'}</td>
                    <td style="color:${isIn ? '#059669' : '#dc2626'}">${isIn ? 'وارد' : 'منصرف'}</td>
                    <td>${t.desc || '-'}</td>
                </tr>`;
            }).join('');

            let w = window.open('', '_blank', 'width=900,height=700');
            w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
            <meta charset="UTF-8"><title>تقرير الخزينة - ${periodLabels[period] || 'كامل'}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
                *{margin:0;padding:0;box-sizing:border-box} body{font-family:'Tajawal',sans-serif;direction:rtl;background:#fff;color:#0f172a;padding:20px;font-size:13px}
                .header{text-align:center;border-bottom:3px solid #0369a1;padding-bottom:15px;margin-bottom:20px;}
                .header h1{font-size:22px;font-weight:900;color:#0369a1} .header p{color:#64748b;margin-top:5px;font-size:13px}
                .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
                .sbox{background:#f8fafc;border-radius:8px;padding:14px;text-align:center;border:1px solid #e2e8f0}
                .sbox .val{font-size:22px;font-weight:900;} .sbox .lbl{font-size:11px;color:#64748b;margin-top:4px}
                table{width:100%;border-collapse:collapse;margin-top:10px}
                th{background:#0369a1;color:#fff;padding:8px 6px;font-size:12px;text-align:center}
                td{padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px}
                tr:nth-child(even) td{background:#f8fafc}
                .footer{text-align:center;margin-top:20px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
                @media print{.no-print{display:none}}
            </style></head><body>
            <div class="header">
                <h1>💰 تقرير الخزينة — ${vault.name}</h1>
                <p>الفترة: ${periodLabels[period] || 'كامل'} • التاريخ: ${dateStr}</p>
            </div>
            <div class="summary">
                <div class="sbox"><div class="val" style="color:#059669">${totalIn} د.ل</div><div class="lbl">إجمالي الوارد</div></div>
                <div class="sbox"><div class="val" style="color:#dc2626">${totalOut} د.ل</div><div class="lbl">إجمالي المنصرف</div></div>
                <div class="sbox"><div class="val" style="color:${totalIn-totalOut >= 0 ? '#059669' : '#dc2626'}">${totalIn - totalOut} د.ل</div><div class="lbl">الصافي</div></div>
            </div>
            <table>
                <thead><tr><th>ت</th><th>التاريخ</th><th>المبلغ</th><th>المصدر/البند</th><th>النوع</th><th>الملاحظة</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:20px;">لا توجد حركات</td></tr>'}</tbody>
            </table>
            <div class="footer">المنظومة المالية المركزية — تقرير الخزينة ${dateStr}</div>
            <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script>
            </body></html>`);
            w.document.close();
            logAction(`تصدير تقرير خزينة ${periodLabels[period] || 'كامل'}`, 'الخزينة');
        }

        // --- تصدير Excel للخزينة ---
        function exportTreasuryExcel() {
            let logs = (sysDB.treasury || []).filter(t => (t.vault_id || 0) === txActiveVault);
            let vault = sysDB.treasury_vaults.find(v => v.id === txActiveVault) || { name: 'الخزينة الرئيسية' };
            
            let headers = ['ت', 'التاريخ', 'النوع', 'المبلغ (د.ل)', 'المصدر/البند', 'الفئة', 'الملاحظة'];
            let rows = logs.map((t, i) => {
                let ts = t.ts || t.id;
                return [i + 1, new Date(ts).toLocaleDateString('ar-EG'), t.type === 'in' ? 'وارد' : 'منصرف', Math.floor(t.amount), t.source || '', t.category || '', t.desc || ''];
            });
            let totalIn = logs.filter(t => t.type === 'in').reduce((s, t) => s + Math.floor(t.amount), 0);
            let totalOut = logs.filter(t => t.type === 'out').reduce((s, t) => s + Math.floor(t.amount), 0);
            rows.push(['', '', 'إجمالي الوارد', totalIn, '', '', '']);
            rows.push(['', '', 'إجمالي المنصرف', totalOut, '', '', '']);
            rows.push(['', '', 'الصافي', totalIn - totalOut, '', '', '']);

            try {
                let wb = XLSX.utils.book_new();
                let ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                ws['!cols'] = headers.map(() => ({ wch: 18 }));
                XLSX.utils.book_append_sheet(wb, ws, vault.name);
                let ds = new Date().toISOString().slice(0, 10);
                XLSX.writeFile(wb, `تقرير_الخزينة_${ds}.xlsx`);
                showToast('✅ تم تصدير Excel بنجاح!', 'success');
                logAction('تصدير Excel للخزينة', 'الخزينة');
            } catch (e) {
                showToast('❌ فشل التصدير: ' + e.message, 'error');
            }
        }

        // --- حذف حركة خزينة ---
        function deleteTreasuryLog(id) {
            if (!confirm('تأكيد حذف هذه الحركة؟')) return;
            let item = sysDB.treasury.find(t => t.id === id);
            if (item) logTreasuryAction('حذف حركة', item.amount, `${item.source} - ${item.type === 'in' ? 'وارد' : 'منصرف'}`);
            sysDB.treasury = sysDB.treasury.filter(t => t.id !== id);
            logAction('حذف حركة من الخزينة.', 'الخزينة');
            saveDB(); renderActiveSection();
        }

        // --- نسخة احتياطية للخزينة ---
        function backupTreasury() {
            let data = {
                treasury: sysDB.treasury,
                treasury_vaults: sysDB.treasury_vaults,
                treasury_audit: sysDB.treasury_audit,
                exported_at: new Date().toISOString()
            };
            let blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a');
            let ds = new Date().toISOString().slice(0, 10);
            a.href = url; a.download = `نسخة_خزينة_${ds}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            logAction('نسخة احتياطية من الخزينة', 'الخزينة');
            showToast('✅ تم حفظ نسخة الخزينة!', 'success');
        }

        // --- ===== الرندر الرئيسي للخزينة ===== ---
        function renderTreasurySection() {
            const container = document.getElementById('dynamicSectionContent');
            upgradeTreasuryDB();

            let stats = getTreasuryStats(txActiveVault);
            let allStats = getAllTreasuryStats();
            let alerts = getTreasuryAlerts();
            let vault = sysDB.treasury_vaults.find(v => v.id === txActiveVault) || sysDB.treasury_vaults[0];
            let logs = (sysDB.treasury || []).filter(t => (t.vault_id || 0) === txActiveVault);

            // فلترة حسب البحث
            let filtered = txSearchQuery
                ? logs.filter(t => (t.source || '').includes(txSearchQuery) || (t.desc || '').includes(txSearchQuery) || (t.category || '').includes(txSearchQuery))
                : logs;

            // --- بناء KPI Cards ---
            let spendPct = stats.totalIn > 0 ? ((stats.totalOut / stats.totalIn) * 100).toFixed(0) : 0;
            let progressClass = spendPct < 60 ? 'safe' : spendPct < 85 ? 'warn' : 'danger';
            let netTrend = stats.todayNet > 0 ? 'trend-up' : stats.todayNet < 0 ? 'trend-down' : 'trend-neutral';
            let netTrendText = stats.todayNet > 0 ? `▲ +${stats.todayNet}` : stats.todayNet < 0 ? `▼ ${stats.todayNet}` : '— صفر';

            let kpiHtml = `
            <div class="tx-kpi-row">
                <div class="tx-kpi balance">
                    <div class="tx-kpi-icon">🏦</div>
                    <div class="tx-kpi-label">الرصيد المتاح</div>
                    <div class="tx-kpi-value">${stats.balance.toLocaleString()}</div>
                    <div class="tx-kpi-sub">دينار ليبي</div>
                    <div class="tx-progress-wrap">
                        <div class="tx-progress-label"><span>نسبة الإنفاق</span><span>${spendPct}%</span></div>
                        <div class="tx-progress-track"><div class="tx-progress-fill ${progressClass}" style="width:${Math.min(spendPct, 100)}%"></div></div>
                    </div>
                </div>
                <div class="tx-kpi income">
                    <div class="tx-kpi-icon">📥</div>
                    <div class="tx-kpi-label">إجمالي المقبوضات</div>
                    <div class="tx-kpi-value">${stats.totalIn.toLocaleString()}</div>
                    <div class="tx-kpi-sub">إجمالي الوارد</div>
                </div>
                <div class="tx-kpi expense">
                    <div class="tx-kpi-icon">📤</div>
                    <div class="tx-kpi-label">إجمالي المدفوعات</div>
                    <div class="tx-kpi-value">${stats.totalOut.toLocaleString()}</div>
                    <div class="tx-kpi-sub">إجمالي المنصرف</div>
                </div>
                <div class="tx-kpi net">
                    <div class="tx-kpi-trend ${netTrend}">${netTrendText}</div>
                    <div class="tx-kpi-icon">📊</div>
                    <div class="tx-kpi-label">صافي الحركة اليومية</div>
                    <div class="tx-kpi-value">${stats.todayNet > 0 ? '+' : ''}${stats.todayNet.toLocaleString()}</div>
                    <div class="tx-kpi-sub">وارد: ${stats.todayIn} | صادر: ${stats.todayOut}</div>
                </div>
            </div>`;

            // --- التنبيهات ---
            let alertsHtml = '';
            if (alerts.length > 0) {
                alertsHtml = `<div class="tx-alerts">
                    ${alerts.map((a, i) => `
                        <div class="tx-alert tx-alert-${a.type}">
                            <span>${a.icon}</span>
                            <span>${a.msg}</span>
                            <button class="tx-alert-close" onclick="txAlertsDismissed.push('${a.msg.replace(/'/g, '')}'); renderTreasurySection()">✕</button>
                        </div>
                    `).join('')}
                </div>`;
            }

            // --- أزرار الإجراءات ---
            let actionsHtml = `
            <div class="tx-action-strip">
                <button class="tx-btn tx-btn-deposit" onclick="openTreasuryModal('in')">📥 إيداع</button>
                <button class="tx-btn tx-btn-withdraw" onclick="openTreasuryModal('out')">📤 سحب / مصروف</button>
                <button class="tx-btn tx-btn-transfer" onclick="openTransferModal()">🔄 تحويل بين الخزائن</button>
                <button class="tx-btn tx-btn-ai" onclick="txCurrentTab='ai'; renderTreasurySection(); runAIAnalysis()">🤖 التحليل الذكي</button>
                <button class="tx-btn tx-btn-report" onclick="txCurrentTab='reports'; renderTreasurySection()">📋 التقارير</button>
                <button class="tx-btn tx-btn-backup" onclick="backupTreasury()">💾 نسخة احتياطية</button>
            </div>`;

            // --- تبويبات ---
            let tabs = [
                { id: 'movements', label: '📜 كشف الحركات' },
                { id: 'vaults', label: '🏦 الخزائن' },
                { id: 'ai', label: '🤖 الذكاء الاصطناعي' },
                { id: 'reports', label: '📊 التقارير' },
                { id: 'audit', label: '🔍 سجل العمليات' },
                { id: 'perms', label: '🔐 الصلاحيات' }
            ];
            let tabsHtml = `<div class="tx-tabs">
                ${tabs.map(t => `<button class="tx-tab ${txCurrentTab === t.id ? 'active' : ''}" onclick="txCurrentTab='${t.id}'; renderTreasurySection()">${t.label}</button>`).join('')}
            </div>`;

            // --- محتوى التبويب ---
            let tabContent = '';

            if (txCurrentTab === 'movements') {
                let rows = filtered.map((item, idx) => {
                    let isOut = item.type === 'out';
                    let amtColor = isOut ? 'var(--danger)' : 'var(--success)';
                    let sign = isOut ? '−' : '+';
                    let ts = item.ts || item.id;
                    let dateStr = new Date(ts).toLocaleDateString('ar-EG');
                    let timeStr = new Date(ts).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                    let badgeClass = isOut ? 'tx-badge-out' : 'tx-badge-in';
                    let badgeText = item.category === 'تحويل' ? 'تحويل' : isOut ? 'منصرف' : 'وارد';
                    let badgeCSS = item.category === 'تحويل' ? 'tx-badge-transfer' : badgeClass;
                    return `<tr style="background:${isOut ? 'rgba(248,113,113,0.03)' : 'rgba(52,211,153,0.03)'}">
                        <td class="serial-cell">${idx + 1}</td>
                        <td style="font-size:11px;color:var(--text-muted);">${dateStr}<br><span style="font-size:10px;">${timeStr}</span></td>
                        <td style="color:${amtColor};font-weight:900;font-size:15px;direction:ltr;">${sign} ${Math.floor(item.amount).toLocaleString()}</td>
                        <td><b>${item.source || '—'}</b></td>
                        <td><span class="tx-badge ${badgeCSS}">${badgeText}</span></td>
                        <td style="color:var(--text-muted);font-size:11px;">${item.desc || '—'}</td>
                        <td><button class="btn-mini b-full" onclick="deleteTreasuryLog(${item.id})">❌</button></td>
                    </tr>`;
                }).join('');

                tabContent = `
                <div class="tx-table-wrap">
                    <div class="tx-table-header">
                        <span class="tx-table-title">📜 كشف حركة الخزينة — ${vault.icon} ${vault.name} (${filtered.length} حركة)</span>
                        <input class="tx-search-box" placeholder="🔍 بحث في الحركات..." value="${txSearchQuery}" oninput="txSearchQuery=this.value; renderTreasurySection()">
                    </div>
                    <div style="overflow-x:auto;">
                    <table>
                        <thead><tr>
                            <th class="serial-cell">ت</th><th>التاريخ</th><th>المبلغ (د.ل)</th><th>المصدر/البند</th><th>النوع</th><th>البيان</th><th>حذف</th>
                        </tr></thead>
                        <tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">لا توجد حركات في الخزينة</td></tr>'}</tbody>
                    </table>
                    </div>
                </div>`;
            }

            else if (txCurrentTab === 'vaults') {
                let vaultsGrid = sysDB.treasury_vaults.map(v => {
                    let vs = getTreasuryStats(v.id);
                    return `<div class="tx-vault ${v.id === txActiveVault ? 'selected' : ''}" onclick="txActiveVault=${v.id}; txCurrentTab='movements'; renderTreasurySection()">
                        ${v.id === txActiveVault ? '<span class="tx-vault-badge">✓ نشطة</span>' : ''}
                        <div style="font-size:28px;margin-bottom:8px;">${v.icon}</div>
                        <div class="tx-vault-name">${v.name}</div>
                        <div class="tx-vault-balance">${vs.balance.toLocaleString()} د.ل</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">
                            وارد: <span style="color:var(--success);">${vs.totalIn}</span> | منصرف: <span style="color:var(--danger);">${vs.totalOut}</span>
                        </div>
                    </div>`;
                }).join('');

                tabContent = `
                <div class="tx-vaults-grid">${vaultsGrid}</div>
                <button class="tx-btn tx-btn-deposit" style="max-width:240px;" onclick="addNewVault()">➕ إضافة خزينة جديدة</button>`;
            }

            else if (txCurrentTab === 'ai') {
                tabContent = `
                <div class="ai-panel">
                    <div class="ai-header">
                        <div class="ai-icon">🤖</div>
                        <div>
                            <div class="ai-title">المساعد المالي الذكي</div>
                            <div class="ai-subtitle">تحليل متقدم للمصروفات والإيرادات وتوقعات السيولة</div>
                        </div>
                        <button onclick="txAiLoaded=false; runAIAnalysis()" style="margin-right:auto;background:rgba(139,92,246,0.2);border:1px solid rgba(139,92,246,0.3);color:#a78bfa;border-radius:6px;padding:6px 14px;cursor:pointer;font-weight:900;font-size:12px;font-family:Tajawal,sans-serif;">🔄 تحديث التحليل</button>
                    </div>
                    <div id="tx-ai-content">
                        <div class="ai-loading">اضغط <b>"تحديث التحليل"</b> لبدء التحليل الذكي بالذكاء الاصطناعي</div>
                    </div>
                </div>`;
                // تشغيل تلقائي
                setTimeout(() => { if (!txAiLoaded) runAIAnalysis(); }, 300);
            }

            else if (txCurrentTab === 'reports') {
                tabContent = `
                <div style="margin-bottom:16px;">
                    <h3 style="color:var(--primary);font-size:14px;margin-bottom:12px;">📋 تقارير الخزينة</h3>
                    <div class="tx-report-grid">
                        <button class="tx-report-btn" onclick="exportTreasuryPDF('daily')"><span class="icon">📅</span>تقرير يومي</button>
                        <button class="tx-report-btn" onclick="exportTreasuryPDF('weekly')"><span class="icon">📆</span>تقرير أسبوعي</button>
                        <button class="tx-report-btn" onclick="exportTreasuryPDF('monthly')"><span class="icon">🗓️</span>تقرير شهري</button>
                        <button class="tx-report-btn" onclick="exportTreasuryPDF('yearly')"><span class="icon">📊</span>تقرير سنوي</button>
                        <button class="tx-report-btn" onclick="exportTreasuryPDF('all')"><span class="icon">📄</span>كشف كامل PDF</button>
                        <button class="tx-report-btn" onclick="exportTreasuryExcel()"><span class="icon">📗</span>تصدير Excel</button>
                        <button class="tx-report-btn" onclick="window.print()"><span class="icon">🖨️</span>طباعة</button>
                        <button class="tx-report-btn" onclick="backupTreasury()"><span class="icon">💾</span>نسخة احتياطية</button>
                    </div>
                </div>
                ${buildMiniChart(logs)}`;
            }

            else if (txCurrentTab === 'audit') {
                let auditLogs = (sysDB.treasury_audit || []).slice(0, 50);
                let auditRows = auditLogs.map((l, i) => `
                    <tr>
                        <td class="serial-cell">${i + 1}</td>
                        <td style="font-size:11px;">${l.time}</td>
                        <td style="font-weight:900;">${l.action}</td>
                        <td style="color:var(--success);">${l.amount > 0 ? Math.floor(l.amount) + ' د.ل' : '—'}</td>
                        <td style="color:var(--text-muted);font-size:11px;">${l.details || '—'}</td>
                    </tr>`).join('');
                tabContent = `
                <div class="tx-table-wrap">
                    <div class="tx-table-header">
                        <span class="tx-table-title">🔍 سجل عمليات الخزينة (${auditLogs.length} سجل)</span>
                    </div>
                    <div style="overflow-x:auto;max-height:60vh;">
                    <table>
                        <thead><tr><th class="serial-cell">ت</th><th>الوقت</th><th>العملية</th><th>المبلغ</th><th>التفاصيل</th></tr></thead>
                        <tbody>${auditRows || '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">لا توجد سجلات</td></tr>'}</tbody>
                    </table>
                    </div>
                </div>`;
            }

            else if (txCurrentTab === 'perms') {
                let roles = [
                    { name: '👑 مدير النظام', perms: ['عرض الأرصدة', 'إيداع', 'سحب', 'تحويل', 'حذف حركات', 'إضافة خزائن', 'تصدير', 'سجل العمليات', 'إعدادات التنبيهات'], allow: [true, true, true, true, true, true, true, true, true] },
                    { name: '💼 مدير مالي', perms: ['عرض الأرصدة', 'إيداع', 'سحب', 'تحويل', 'حذف حركات', 'إضافة خزائن', 'تصدير', 'سجل العمليات'], allow: [true, true, true, true, true, false, true, true] },
                    { name: '📊 محاسب', perms: ['عرض الأرصدة', 'إيداع', 'سحب', 'تحويل', 'حذف حركات', 'تصدير'], allow: [true, true, true, false, false, true] },
                    { name: '👤 مستخدم عادي', perms: ['عرض الأرصدة', 'إيداع', 'سحب'], allow: [true, true, false] }
                ];
                tabContent = `
                <div style="margin-bottom:14px;">
                    <h3 style="color:var(--primary);font-size:14px;margin-bottom:12px;">🔐 هيكل الصلاحيات</h3>
                    <div class="tx-perm-grid">
                        ${roles.map(r => `
                        <div class="tx-perm-card">
                            <div class="tx-perm-role">${r.name}</div>
                            ${r.perms.map((p, i) => `
                                <div class="tx-perm-item ${r.allow[i] ? 'allow' : 'deny'}">
                                    ${r.allow[i] ? '✅' : '❌'} ${p}
                                </div>`).join('')}
                        </div>`).join('')}
                    </div>
                </div>`;
            }

            // --- الرندر الكامل ---
            container.innerHTML = `
                <div class="tx-dashboard">
                    ${kpiHtml}
                    ${alertsHtml}
                    ${actionsHtml}
                    ${tabsHtml}
                    ${tabContent}
                </div>

                <!-- نافذة تحويل بين الخزائن -->
                <div class="modal-overlay" id="txTransferModal" style="display:none;">
                    <div class="modal-box" style="max-width:420px; text-align:center;">
                        <h3 style="color:var(--primary);">🔄 تحويل بين الخزائن</h3>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
                            <div>
                                <label style="font-size:12px;color:var(--text-muted);">من الخزينة</label>
                                <select id="txTransferFrom" class="glass-input" style="width:100%;height:35px;margin-top:4px;"></select>
                            </div>
                            <div>
                                <label style="font-size:12px;color:var(--text-muted);">إلى الخزينة</label>
                                <select id="txTransferTo" class="glass-input" style="width:100%;height:35px;margin-top:4px;"></select>
                            </div>
                        </div>
                        <input type="number" id="txTransferAmount" class="glass-input" style="width:100%;text-align:center;font-size:20px;height:48px;margin-bottom:10px;" placeholder="المبلغ (د.ل)">
                        <input type="text" id="txTransferNote" class="glass-input" style="width:100%;margin-bottom:14px;" placeholder="ملاحظة (اختياري)">
                        <div style="display:flex;gap:8px;">
                            <button class="btn-g" style="flex:1;background:var(--primary);color:#000;" onclick="submitTransfer()">✅ تأكيد التحويل</button>
                            <button class="btn-g" style="flex:0.5;background:var(--danger);" onclick="document.getElementById('txTransferModal').style.display='none'">إلغاء</button>
                        </div>
                    </div>
                </div>
            `;
        }

        // --- رسم بياني مبسط للأشهر ---
        function buildMiniChart(logs) {
            if (!logs.length) return '';
            let months = {};
            logs.forEach(t => {
                let d = new Date(t.ts || t.id);
                let key = `${d.getMonth() + 1}/${d.getFullYear()}`;
                if (!months[key]) months[key] = { in: 0, out: 0 };
                if (t.type === 'in') months[key].in += Math.floor(t.amount);
                else months[key].out += Math.floor(t.amount);
            });
            let keys = Object.keys(months).slice(-6);
            if (!keys.length) return '';
            let maxVal = Math.max(...keys.flatMap(k => [months[k].in, months[k].out])) || 1;

            let bars = keys.map(k => {
                let inH = Math.max((months[k].in / maxVal) * 70, 4);
                let outH = Math.max((months[k].out / maxVal) * 70, 4);
                return `<div style="flex:1;display:flex;gap:2px;align-items:flex-end;flex-direction:column;position:relative;">
                    <div style="display:flex;gap:2px;align-items:flex-end;width:100%">
                        <div class="tx-bar tx-bar-in" style="height:${inH}px;flex:1;" title="وارد: ${months[k].in}"></div>
                        <div class="tx-bar tx-bar-out" style="height:${outH}px;flex:1;" title="منصرف: ${months[k].out}"></div>
                    </div>
                    <div style="font-size:9px;color:var(--text-muted);text-align:center;width:100%;margin-top:4px;">${k}</div>
                </div>`;
            }).join('');

            return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:14px;">
                <div style="font-size:12px;font-weight:900;color:var(--text-muted);margin-bottom:10px;">📈 تاريخ الحركات (آخر 6 أشهر)
                    <span style="color:var(--success);margin-right:12px;">■ وارد</span>
                    <span style="color:var(--danger);">■ منصرف</span>
                </div>
                <div class="tx-chart-bar">${bars}</div>
            </div>`;
        }

        // تعريف treasuryActionType لتوافق الكود القديم
        let treasuryActionType = 'in';

        function renderActiveSection() {
            autoCloseDay(); let activeFocus = document.activeElement.id;
            const container = document.getElementById('dynamicSectionContent');
if (currentTabNum === 1) {
                // التأكد من تهيئة القسم 
                if(typeof activeCustomerPageIndex === 'undefined' || activeCustomerPageIndex === null) {
                    activeCustomerPageIndex = 0;
                }
                
                if (!sysDB.customer_pages || sysDB.customer_pages.length === 0) {
                    sysDB.customer_pages = [{ 
                        id: 1, 
                        label: 'اليوم الأول — ' + new Date().toLocaleDateString('ar-EG'), 
                        created_at: Date.now(), 
                        old_debt: 0,
                        new_work: 0,
                        collected: 0,
                        debts: [] 
                    }];
                    activeCustomerPageIndex = 0;
                    saveDB();
                }

                if(activeCustomerPageIndex >= sysDB.customer_pages.length) {
                    activeCustomerPageIndex = sysDB.customer_pages.length - 1;
                }

                let activePage = sysDB.customer_pages[activeCustomerPageIndex];

                // مترجم الذكاء: لو دي داتا قديمة، هنعتبر كل الديون الحالية هي باقي قديم
                if (activePage.old_debt === undefined) {
                    let currentTotal = activePage.debts.reduce((sum, item) => sum + Math.floor(item.amount), 0);
                    activePage.old_debt = currentTotal;
                    activePage.new_work = 0;
                    activePage.collected = 0;
                    saveDB();
                }

                let totalOld = activePage.old_debt || 0;
                let totalNew = activePage.new_work || 0;
                let totalCollected = activePage.collected || 0;
               // الرصيد المرحل = مرحل قديم + جديد - تحصيل
let totalRem = Math.round(
    Math.max(
        0,
        Number(totalOld) + Number(totalNew) - Number(totalCollected)
    )
);

// لو اليوم الحالي ولسه مفيش كروت، اعرض الموجود فعلياً
if (
    isLatestDay &&
    totalRem === 0 &&
    Array.isArray(activePage.debts)
) {
    totalRem = Math.round(activePage.debts.reduce(
        (s, d) => s + Number(d.amount || 0),
        0
    ));
}

                // --- 1. نظام التراجع (شبكة الأمان 10 ثواني) ---
                window.deletedCustStore = window.deletedCustStore || {};

                window.undoCustPayment = function(toastId) {
                    let data = window.deletedCustStore[toastId];
                    if(!data) return;
                    let page = sysDB.customer_pages[data.pageIdx];
                    if(page) {
                        page.debts.push(data.item);
                        page.collected -= data.amt;
                        if(page.collected < 0) page.collected = 0; // تأمين الرصيد
                        saveDB();
                        renderActiveSection();
                        showToast(`تم التراجع ورجوع حساب [${data.item.name}]`, "success");
                    }
                    let t = document.getElementById(`toast-${toastId}`);
                    if (t) { t.style.animation = 'slideOut 0.4s forwards'; setTimeout(() => t.remove(), 400); }
                    delete window.deletedCustStore[toastId];
                };

                // --- 2. دالة الدفع الكامل والمسح ---
                window.payAndRemoveCustomerDebt = function(id) {
                    let page = sysDB.customer_pages[activeCustomerPageIndex];
                    let idx = page.debts.findIndex(d => d.id === id);
                    if(idx !== -1) {
                        // أخذ نسخة من الزبون قبل مسحه عشان التراجع
                        let item = JSON.parse(JSON.stringify(page.debts[idx])); 
                        let amt = Math.floor(item.amount);
                        addToTrashBin(item, 'customers', 'ديون العملاء (تسديد تسلسل)');
                        page.collected += amt;
                        page.debts.splice(idx, 1);
                        
                        saveDB(); 
                        renderActiveSection();

                        // إنشاء زرار التراجع لمدة 10 ثواني
                        let toastId = Date.now();
                        window.deletedCustStore[toastId] = { item: item, pageIdx: activeCustomerPageIndex, amt: amt };
                        
                        const container = document.getElementById('toast-container');
                        const toast = document.createElement('div');
                        toast.className = `toast warning`;
                        toast.id = `toast-${toastId}`;
                        toast.style.display = 'flex'; toast.style.justifyContent = 'space-between'; toast.style.width = '320px'; toast.style.borderLeft = '4px solid var(--warning)';
                        toast.innerHTML = `<span style="font-size:13px; font-weight:900; color:#fff;">✔️ سداد كامل: ${item.name}</span><button style="background:var(--warning); color:#000; border:none; padding:6px 15px; border-radius:4px; font-weight:900; cursor:pointer;" onclick="undoCustPayment(${toastId})">تراجع ↩️</button>`;
                        container.appendChild(toast);
                        
                        setTimeout(() => {
                            let t = document.getElementById(`toast-${toastId}`);
                            if (t) { 
                                t.style.animation = 'slideOut 0.4s forwards'; 
                                setTimeout(() => { t.remove(); delete window.deletedCustStore[toastId]; }, 400); 
                                logAction(`تسديد ومسح حساب [${item.name}] بقيمة ${amt} د.ل`, 'ديون العملاء');
                            }
                        }, 10000); // 10 ثواني بالظبط
                    }
                };

                // --- 3. دوال التسديد الجزئي ---
                window.showCustPartPay = function(id) {
                    document.getElementById('cust-btns-' + id).style.display = 'none';
                    document.getElementById('cust-inline-' + id).style.display = 'flex';
                    setTimeout(() => document.getElementById('cust-part-input-' + id).focus(), 100);
                };
                
                window.hideCustPartPay = function(id) {
                    document.getElementById('cust-btns-' + id).style.display = 'flex';
                    document.getElementById('cust-inline-' + id).style.display = 'none';
                    document.getElementById('cust-part-input-' + id).value = '';
                };

                window.submitCustPartPay = function(id) {
                    let input = document.getElementById('cust-part-input-' + id);
                    let val = Math.floor(parseFloat(input.value));
                    if(isNaN(val) || val <= 0) return;

                    let page = sysDB.customer_pages[activeCustomerPageIndex];
                    let item = page.debts.find(d => d.id === id);
                    if(!item) return;

                    if(val > item.amount) {
                        showToast('المبلغ المدخل أكبر من الدين الفعلي!', 'error');
                        return;
                    }

                    item.amount -= val;
                    page.collected += val; // إضافة الفلوس للكارت
                    
                    logAction(`تسديد جزئي (${val} د.ل) من حساب [${item.name}] — المتبقي: ${Math.floor(item.amount)}`, 'ديون العملاء');
                    
                    if(item.amount <= 0) {
                        page.debts = page.debts.filter(d => d.id !== id);
                        showToast(`تم تصفية حساب ${item.name} بالكامل`, 'success');
                    } else {
                        showToast(`تم تسديد ${val} د.ل بنجاح`, 'success');
                    }
                    
                    saveDB();
                    renderActiveSection();
                };

                // --- 4. إضافة زبون جديد سريع ---
                window.addFastCustomerDebt = function() {
                    let nameInput = document.getElementById('addNameInput');
                    let amtInput = document.getElementById('addAmountInput');
                    let name = nameInput.value.trim();
                    let amt = Math.floor(parseFloat(amtInput.value));

                    if (!name || isNaN(amt) || amt <= 0) { 
                        showToast("برجاء إدخال اسم ومبلغ صحيح", "error"); 
                        return; 
                    }
                    
                    let page = sysDB.customer_pages[activeCustomerPageIndex];
                    
                    if(page.debts.some(item => item.name === name)) { 
                        showToast(`⚠️ الاسم [${name}] مسجل مسبقاً! قم بعمل تسديد جزئي بدلاً من ذلك.`, "error"); 
                        return; 
                    }

                    page.debts.unshift({ id: Date.now(), name: name, amount: amt, lastPaymentDate: Date.now() });
                    page.new_work += amt; 
                    
                    logAction(`إضافة حساب جديد [${name}] بقيمة ${amt} د.ل`, 'ديون العملاء');
                    saveDB(); 
                    renderActiveSection();
                    
                    setTimeout(() => {
                        let ni = document.getElementById('addNameInput');
                        if(ni) ni.focus();
                    }, 100);
                };

                // --- 5. دالة تقفيل اليوم ---
                window.closeCustomerDay = function() {
                    if(!confirm('هل أنت متأكد من إقفال اليوم وترحيل الباقي ليوم جديد؟')) return;
                    
                    let pages = sysDB.customer_pages;
                    let currentDay = pages[activeCustomerPageIndex];
                    let rem = (currentDay.old_debt || 0) + (currentDay.new_work || 0) - (currentDay.collected || 0);
                    let newDebts = JSON.parse(JSON.stringify(currentDay.debts));
                    
                    let todayStr = new Date().toLocaleDateString('ar-EG');
                    pages.push({ 
                        id: Date.now(), 
                        label: 'اليوم ' + (pages.length + 1) + ' — ' + todayStr, 
                        created_at: Date.now(), 
                        old_debt: rem, 
                        new_work: 0, 
                        collected: 0, 
                        debts: newDebts 
                    });

                    activeCustomerPageIndex = pages.length - 1;
                    logAction(`تم تقفيل اليوم وترحيل أرصدة العملاء بقيمة ${rem} د.ل`, 'ديون العملاء');
                    saveDB(); 
                    renderActiveSection();
                    showToast('تم فتح يوم جديد وترحيل الأرصدة بنجاح!', 'success');
                };

                let dayTabsHtml = sysDB.customer_pages.map((p, i) => {
                    let isActive = i === activeCustomerPageIndex;
                    return `<button onclick="activeCustomerPageIndex=${i}; renderActiveSection()" style="padding:5px 12px;border-radius:6px;font-size:11px;font-weight:900;cursor:pointer;background:${isActive?"var(--primary)":"transparent"};color:${isActive?"#000":"var(--primary)"};border:1px solid var(--primary);white-space:nowrap;flex-shrink:0;">${p.label || 'اليوم '+(i+1)}</button>`;
                }).join("");

                let searchQuery = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase() : '';
                let filteredList = activePage.debts.filter(item => item.name.toLowerCase().includes(searchQuery));
                let third = Math.ceil(filteredList.length / 3);

                let renderRows = (list, offset) => list.map((item, index) => {
                    return `<tr>
                        <td class="serial-cell">${offset + index + 1}</td>
                        <td><b style="font-size:14px;">${item.name}</b></td>
                        <td style="color:var(--danger); font-weight:900; font-size:16px;">${Math.floor(item.amount)}</td>
                        <td style="width:140px;">
                            <div id="cust-btns-${item.id}" style="display:flex; gap:4px; justify-content:center;">
                                <button class="btn-mini b-part" style="padding:6px 8px; font-size:11px; border-radius:4px;" onclick="showCustPartPay(${item.id})" title="دفع جزء من المبلغ">➖ جزئي</button>
                                <button class="btn-mini b-add-more" style="padding:6px 8px; font-size:11px; border-radius:4px; box-shadow:0 2px 4px rgba(0,0,0,0.2);" onclick="payAndRemoveCustomerDebt(${item.id})" title="دفع المبلغ بالكامل ومسح الحساب">✔ كامل</button>
                            </div>
                            <div id="cust-inline-${item.id}" style="display:none; gap:4px; justify-content:center; align-items:center;">
                                <input type="number" id="cust-part-input-${item.id}" class="glass-input" style="width:65px; height:26px; padding:0 4px; text-align:center; font-size:13px; font-weight:900; color:#000; background:#fff;" placeholder="المبلغ" onkeydown="if(event.key==='Enter') submitCustPartPay(${item.id})">
                                <button class="btn-mini b-add-more" style="padding:4px 8px;" onclick="submitCustPartPay(${item.id})">✔</button>
                                <button class="btn-mini b-full" style="padding:4px 8px;" onclick="hideCustPartPay(${item.id})">❌</button>
                            </div>
                        </td>
                    </tr>`;
                }).join('');

                let tableHeader = `<thead><tr><th class="serial-cell" style="width:40px;">ت</th><th>الاسم</th><th>المبلغ</th><th>إجراء التحصيل</th></tr></thead>`;

                container.innerHTML = `
                    <style>.b-calc, #calcModal { display: none !important; }</style>

                    <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(56,189,248,0.07);border:1px solid rgba(56,189,248,0.2);border-radius:8px;padding:10px 16px;margin-bottom:8px;">
                        <div style="font-size:17px;font-weight:900;color:var(--text-main);">👥 ديون العملاء (الكاشير السريع)</div>
                        <button onclick="closeCustomerDay()" style="background:var(--primary);color:#000;border:none;border-radius:6px;padding:7px 18px;font-size:13px;font-weight:900;cursor:pointer;font-family:Tajawal,sans-serif;box-shadow:0 4px 10px rgba(56,189,248,0.3);">🔄 تقفيل اليوم (ترحيل)</button>
                    </div>
                    
                    <div style="display:flex;gap:6px;overflow-x:auto;padding:4px 0 15px;align-items:center;flex-wrap:nowrap;">
                        <span style="color:var(--text-muted);font-size:11px;flex-shrink:0;">📅 الأرشيف:</span>
                        ${dayTabsHtml}
                    </div>

                    <div style="display:flex; gap:15px; margin-bottom:20px; justify-content:center; flex-wrap:wrap;">
                        <div style="flex:1; min-width:160px; background:linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,41,59,0.8)); border:1px solid var(--text-muted); border-radius:12px; padding:15px; text-align:center; box-shadow:0 6px 15px rgba(0,0,0,0.2);">
                            <div style="font-size:13px; color:var(--text-muted); font-weight:900; margin-bottom:8px;">💳 مُرحّل من إمبارح</div>
                            <div style="font-size:26px; font-weight:900; color:var(--text-main);">${totalOld}</div>
                        </div>
                        <div style="flex:1; min-width:160px; background:linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.1)); border:1px solid var(--warning); border-radius:12px; padding:15px; text-align:center; box-shadow:0 6px 15px rgba(245,158,11,0.15);">
                            <div style="font-size:13px; color:var(--warning); font-weight:900; margin-bottom:8px;">↗️ شغل جديد (اليوم)</div>
                            <div style="font-size:26px; font-weight:900; color:var(--warning);">${totalNew}</div>
                        </div>
                        <div style="flex:1; min-width:160px; background:linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.1)); border:1px solid var(--success); border-radius:12px; padding:15px; text-align:center; box-shadow:0 6px 15px rgba(16,185,129,0.15);">
                            <div style="font-size:13px; color:var(--success); font-weight:900; margin-bottom:8px;">↙️ كاش متحصلات (تسديد)</div>
                            <div style="font-size:26px; font-weight:900; color:var(--success);">${totalCollected}</div>
                        </div>
                        <div style="flex:1; min-width:160px; background:linear-gradient(135deg, rgba(239,68,68,0.1), rgba(220,38,38,0.1)); border:1px solid var(--danger); border-radius:12px; padding:15px; text-align:center; box-shadow:0 6px 15px rgba(239,68,68,0.15);">
                            <div style="font-size:13px; color:var(--danger); font-weight:900; margin-bottom:8px;">م الباقي الفعلي (ديون مفتوحة)</div>
                            <div style="font-size:26px; font-weight:900; color:var(--danger);">${totalRem}</div>
                        </div>
                    </div>

                    <div class="smart-toolbar" style="border:2px solid var(--primary); box-shadow: 0 4px 15px rgba(56,189,248,0.15); border-radius:10px;">
                        <div class="toolbar-group">
                            <input type="text" id="addNameInput" list="savedNames" autocomplete="off" class="glass-input" placeholder="اسم العميل..." style="width:180px; height:45px; font-size:16px;" onkeydown="if(event.key === 'Enter') addFastCustomerDebt()">
                            <input type="number" id="addAmountInput" autocomplete="off" class="glass-input" placeholder="المبلغ" style="width:120px; height:45px; font-size:18px; text-align:center; font-weight:900;" onkeydown="if(event.key === 'Enter') addFastCustomerDebt()">\n<input type="date" id="addDueDateInput" class="glass-input" title="تاريخ الاستحقاق (اختياري)" style="height:45px; width:130px; font-size:14px; text-align:center;">
                            <button class="btn-g btn-add" style="height:45px; font-size:16px; padding:0 25px; box-shadow:0 4px 10px rgba(0,230,118,0.3);" onclick="addFastCustomerDebt()">✔️ إضافة (إنتر)</button>
                        </div>
                        <div class="toolbar-group">
                            <input type="text" id="searchInput" autocomplete="off" class="glass-input" placeholder="🔍 بحث سريع..." value="${searchQuery}" oninput="renderActiveSection()" style="width:150px; height:40px;">
                        </div>
                    </div>

                    <div class="split-layout" style="margin-top:15px;">
                        <div class="table-container" style="border:1px solid var(--primary);">
                            <table>${tableHeader}<tbody>${renderRows(filteredList.slice(0, third), 0) || '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">لا توجد ديون.</td></tr>'}</tbody></table>
                        </div>
                        <div class="table-container" style="border:1px solid var(--primary);">
                            <table>${tableHeader}<tbody>${renderRows(filteredList.slice(third, third * 2), third) || '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">لا توجد ديون.</td></tr>'}</tbody></table>
                        </div>
                        <div class="table-container" style="border:1px solid var(--primary);">
                            <table>${tableHeader}<tbody>${renderRows(filteredList.slice(third * 2), third * 2) || '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">لا توجد ديون.</td></tr>'}</tbody></table>
                        </div>
                    </div>
                `;
            }
          else if (currentTabNum === 2 || currentTabNum === 3) {
                let dbKey = currentTabNum === 2 ? 'companies' : 'wholesale';
                let pagesKey = currentTabNum === 2 ? 'company_pages' : 'wholesale_pages';
                let activePageIndexKey = currentTabNum === 2 ? 'activeCompanyPageIndex' : 'activeWholesalePageIndex';

                // معالجة مشكلة undefined وتأمين المتغيرات
                if(typeof window[activePageIndexKey] === 'undefined' || window[activePageIndexKey] === null) {
                    window[activePageIndexKey] = 0;
                }
                
                if (!sysDB[pagesKey] || sysDB[pagesKey].length === 0) {
                    sysDB[pagesKey] = [{ id: 1, label: 'اليوم الأول — ' + new Date().toLocaleDateString('ar-EG'), created_at: Date.now(), carried_forward: false, debts: [] }];
                    window[activePageIndexKey] = 0;
                    saveDB();
                }

                if(window[activePageIndexKey] >= sysDB[pagesKey].length) {
                    window[activePageIndexKey] = sysDB[pagesKey].length - 1;
                }

                let activePage = sysDB[pagesKey][window[activePageIndexKey]];

                let dayTabsHtml = sysDB[pagesKey].map((p, i) => {
                    let isActive = i === window[activePageIndexKey];
                    let badge = p.carried_forward ? `<span style="background:#059669;color:#fff;border-radius:3px;padding:1px 5px;font-size:9px;margin-left:4px;">↩مرحل</span>` : "";
                    return `<button onclick="window['${activePageIndexKey}']=${i}; renderActiveSection()" style="padding:5px 12px;border-radius:6px;font-size:11px;font-weight:900;cursor:pointer;background:${isActive?"var(--primary)":"transparent"};color:${isActive?"#000":"var(--primary)"};border:1px solid var(--primary);white-space:nowrap;flex-shrink:0;">${badge}${p.label || 'اليوم '+(i+1)}</button>`;
                }).join("");

                let totalOld = 0, totalNew = 0, totalSum = 0, totalPaid = 0, totalRem = 0;
                let searchQuery = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase() : '';
                let filteredDebts = activePage.debts.filter(d => d.name.toLowerCase().includes(searchQuery));

                let rowsHtml = filteredDebts.map((item, index) => {
                    let transNewWork = item.transactions ? item.transactions.reduce((s, t) => s + t.result, 0) : 0;
                    let manualNewWork = item.new_work || 0;
                    let totalNewWork = manualNewWork + transNewWork;
                    
                    let oldDebt = item.old_debt || 0;
                    let total = oldDebt + totalNewWork;
                    let paid = item.payment || 0;
                    let rem = total - paid;

                    totalOld += oldDebt; totalNew += totalNewWork; totalSum += total; totalPaid += paid; totalRem += rem;
                    
                    // تحديث القيم في الذاكرة لتكون جاهزة للترحيل
                    item.total = total; item.remaining = rem;

                    return `
                    <tr style="height:42px; border-bottom: 1px solid var(--border);">
                        <td class="serial-cell">${index + 1}</td>
                        <td style="font-weight:900; color:var(--primary); font-size:14px;">${item.name}</td>
                        <td><input type="number" class="glass-input" style="width:80px;text-align:center;font-weight:900;" value="${oldDebt}" onchange="updateDebtField('${pagesKey}', ${item.id}, 'old_debt', this.value)"></td>
                        
                        <td><input type="number" class="glass-input" style="width:80px;text-align:center;font-weight:900;color:var(--warning);background:rgba(245,158,11,0.05);" value="${totalNewWork}" onchange="updateDebtField('${pagesKey}', ${item.id}, 'new_work', this.value); sysDB['${pagesKey}'][window['${activePageIndexKey}']].debts.find(d=>d.id==${item.id}).transactions=[]; saveDB(); renderActiveSection();"></td>
                        
                        <td style="color:var(--secondary); font-weight:900; font-size:15px; background:rgba(56,189,248,0.05);">${total}</td>
                        
                        <td><input type="number" class="glass-input" style="width:80px;text-align:center;font-weight:900;color:var(--success);" value="${paid}" onchange="updateDebtField('${pagesKey}', ${item.id}, 'payment', this.value)"></td>
                        
                        <td style="color:var(--danger); font-weight:900; font-size:16px; background:rgba(239,68,68,0.05);">${rem}</td>
                        <td>
                            <button class="btn-mini b-calc" onclick="openTransactionModal('${pagesKey}', ${item.id}, '${item.name}')" title="عمليات حسابية معقدة">➕ عمليات</button>
                            <button class="btn-mini b-full" onclick="deleteDebtItem('${pagesKey}', ${item.id})">❌</button>
                        </td>
                    </tr>`;
                }).join('');

                let sectionTitle = currentTabNum === 2 ? '🏢 حسابات الشركات' : '📦 كبار العملاء (جملة)';

                container.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(56,189,248,0.07);border:1px solid rgba(56,189,248,0.2);border-radius:8px;padding:10px 16px;margin-bottom:8px;">
                        <div style="font-size:17px;font-weight:900;color:var(--text-main);">${sectionTitle}</div>
                        <button onclick="createNewDebtDay('${pagesKey}', '${activePageIndexKey}')" style="background:var(--primary);color:#000;border:none;border-radius:6px;padding:7px 18px;font-size:13px;font-weight:900;cursor:pointer;font-family:Tajawal,sans-serif;box-shadow:0 4px 10px rgba(56,189,248,0.3);">➕ يوم جديد (ترحيل الأرصدة)</button>
                    </div>
                    <div style="display:flex;gap:6px;overflow-x:auto;padding:4px 0 8px;align-items:center;flex-wrap:nowrap;">
                        <span style="color:var(--text-muted);font-size:11px;flex-shrink:0;">📅 الأيام:</span>
                        ${dayTabsHtml}
                    </div>

                    <div class="smart-toolbar">
                        <div class="toolbar-group">
                            <input type="text" id="newClientName" autocomplete="off" class="glass-input" placeholder="الاسم..." style="width:150px;" onkeydown="if(event.key === 'Enter') addNewDebtClient('${pagesKey}')">
                            <input type="number" id="newClientOldDebt" autocomplete="off" class="glass-input" placeholder="باقي قديم" style="width:90px;" onkeydown="if(event.key === 'Enter') addNewDebtClient('${pagesKey}')">
                            <button class="btn-g btn-add" onclick="addNewDebtClient('${pagesKey}')">✔️ إضافة</button>
                        </div>
                        <div class="toolbar-group">
                            <input type="text" id="searchInput" autocomplete="off" class="glass-input" placeholder="🔍 فلتر بالاسم..." value="${searchQuery}" oninput="renderActiveSection()" style="width:140px;">
                        </div>
                    </div>

                    <div class="table-container" style="width:100%; border:2px solid var(--border); box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom:20px;">
                        <table>
                            <thead style="background:var(--bg-dark);">
                                <tr>
                                    <th class="serial-cell">ID</th>
                                    <th>الاسم</th>
                                    <th>باقي قديم</th>
                                    <th>شغل جديد</th>
                                    <th>الإجمالي</th>
                                    <th>تسديد</th>
                                    <th>الباقي المستحق</th>
                                    <th>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml || '<tr><td colspan="8" style="text-align:center; padding:30px; font-size:16px; color:var(--text-muted);">لا توجد حسابات مسجلة في هذا اليوم.</td></tr>'}
                            </tbody>
                        </table>
                    </div>

                    <h3 style="color:var(--text-muted); font-size:14px; margin-bottom:10px; text-align:center;">📊 خلاصة إجماليات اليوم</h3>
                    <div style="display:flex; gap:15px; margin-bottom:30px; justify-content:center; flex-wrap:wrap;">
                        <div style="flex:1; min-width:160px; background:linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,41,59,0.8)); border:1px solid var(--text-muted); border-radius:12px; padding:20px; text-align:center; box-shadow:0 6px 15px rgba(0,0,0,0.2);">
                            <div style="font-size:13px; color:var(--text-muted); font-weight:900; margin-bottom:8px;">إجمالي باقي قديم</div>
                            <div style="font-size:26px; font-weight:900; color:var(--text-main);">${totalOld}</div>
                        </div>
                        <div style="flex:1; min-width:160px; background:linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.1)); border:1px solid var(--warning); border-radius:12px; padding:20px; text-align:center; box-shadow:0 6px 15px rgba(245,158,11,0.15);">
                            <div style="font-size:13px; color:var(--warning); font-weight:900; margin-bottom:8px;">إجمالي شغل جديد</div>
                            <div style="font-size:26px; font-weight:900; color:var(--warning);">${totalNew}</div>
                        </div>
                        <div style="flex:1; min-width:160px; background:linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.1)); border:1px solid var(--success); border-radius:12px; padding:20px; text-align:center; box-shadow:0 6px 15px rgba(16,185,129,0.15);">
                            <div style="font-size:13px; color:var(--success); font-weight:900; margin-bottom:8px;">إجمالي التسديد</div>
                            <div style="font-size:26px; font-weight:900; color:var(--success);">${totalPaid}</div>
                        </div>
                        <div style="flex:1; min-width:160px; background:linear-gradient(135deg, rgba(239,68,68,0.1), rgba(220,38,38,0.1)); border:1px solid var(--danger); border-radius:12px; padding:20px; text-align:center; box-shadow:0 6px 15px rgba(239,68,68,0.15);">
                            <div style="font-size:13px; color:var(--danger); font-weight:900; margin-bottom:8px;">الباقي المستحق (النهائي)</div>
                            <div style="font-size:26px; font-weight:900; color:var(--danger);">${totalRem}</div>
                        </div>
                    </div>
                `;
                if (typeof ensureTransactionModal === 'function') ensureTransactionModal();
            }
            else if (currentTabNum === 4) {
                let searchQuery = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase() : '';
                let totalLyd = sysDB.trusts.reduce((sum, item) => sum + Math.floor(item.lyd), 0);
                let totalEgp = sysDB.trusts.reduce((sum, item) => sum + Math.floor(item.egp), 0);

                let filteredTrusts = sysDB.trusts.filter(t => t.name.toLowerCase().includes(searchQuery));
                
                let trustRows = filteredTrusts.map((t, index) => `<tr><td class="serial-cell">${index + 1}</td><td><b>${t.name}</b></td><td style="color:var(--success); font-weight:900;">${Math.floor(t.lyd)}</td><td style="color:var(--purple); font-weight:900;">${Math.floor(t.egp)}</td><td style="min-width:250px;">${generateTrustActionsHtml(t)}</td></tr>`).join('');

                let toolbarHtml = `
                    <div class="smart-toolbar">
                        <div class="toolbar-group">
                            <div class="badge-total-top" style="color:var(--success); border-color:var(--success); background:rgba(0,230,118,0.1);">ليبي: ${totalLyd}</div>
                            <div class="badge-total-top" style="color:var(--purple); border-color:var(--purple); background:rgba(213,0,249,0.1);">مصري: ${totalEgp}</div>
                        </div>
                        <div class="toolbar-group">
                            <input type="text" id="trustName" list="savedNames" autocomplete="off" class="glass-input" placeholder="صاحب الأمانة..." style="width:130px;" onkeydown="if(event.key === 'Enter') addNewTrust()">
                            <input type="number" id="trustLyd" autocomplete="off" class="glass-input" placeholder="ليبي" style="width:60px;" onkeydown="if(event.key === 'Enter') addNewTrust()">
                            <button class="btn-g b-calc" style="height:30px; padding:0 8px;" onclick="openCalcModal('trustLyd')" title="حاسبة">🧮</button>
                            <input type="number" id="trustEgp" autocomplete="off" class="glass-input" placeholder="مصري" style="width:60px;" onkeydown="if(event.key === 'Enter') addNewTrust()">
                            <button class="btn-g b-calc" style="height:30px; padding:0 8px;" onclick="openCalcModal('trustEgp')" title="حاسبة">🧮</button>
                            <button class="btn-g btn-add" onclick="addNewTrust()">✔️ تسجيل</button>
                        </div>
                        <div class="toolbar-group">
                            <input type="text" id="searchInput" autocomplete="off" class="glass-input" placeholder="🔍 فلتر..." value="${searchQuery}" oninput="renderActiveSection()" style="width:100px;">
                        </div>
                    </div>`;

                container.innerHTML = `${toolbarHtml}<div class="table-container"><table><thead><tr><th class="serial-cell">ت</th><th>الاسم</th><th>دينار ليبي</th><th>جنيه مصري</th><th>العمليات الذكية</th></tr></thead><tbody>${trustRows || '<tr><td colspan="5" style="text-align:center; padding:40px;">لا توجد أمانات.</td></tr>'}</tbody></table></div>`;
            }
            
            else if (currentTabNum === 5) {
                renderTreasurySection();
            }

            else if (currentTabNum === 6) {
                let records = sysDB.purchases[activeMerchant] || [];
                
                let merchantTabs = `
                    <div style="display:flex; gap:10px; margin-bottom:15px; justify-content:center;">
                        <button class="btn-g" style="flex:1; height:45px; font-weight:900; font-size:16px; border-radius:8px; transition:0.3s; background: ${activeMerchant === 'bayan' ? 'var(--primary)' : 'var(--bg-card)'}; color: ${activeMerchant === 'bayan' ? '#000' : 'var(--text-main)'}; border: 2px solid var(--primary);" onclick="switchMerchant('bayan')">🏬 التاجر: البيان</button>
                        <button class="btn-g" style="flex:1; height:45px; font-weight:900; font-size:16px; border-radius:8px; transition:0.3s; background: ${activeMerchant === 'semsem' ? 'var(--warning)' : 'var(--bg-card)'}; color: ${activeMerchant === 'semsem' ? '#000' : 'var(--text-main)'}; border: 2px solid var(--warning);" onclick="switchMerchant('semsem')">🏬 التاجر: سمسم</button>
                    </div>
                `;

                let totalPurchases = records.reduce((s, i) => s + i.total, 0);
                let totalPaid = records.reduce((s, i) => s + i.paid, 0);
                let totalRemaining = records.reduce((s, i) => s + i.remaining, 0);
                
                let v_remaining_egp = 0;
                records.forEach(item => {
                    if (item.name.includes('فودافون') && !item.parent_id) {
                        let consumed = (item.v_c1||0) + (item.v_c2||0) + (item.v_c3||0) + (item.v_c4||0);
                        let currentDeficit = getVodafoneDeficit(activeMerchant, item.id);
                        let net = item.qty - consumed + currentDeficit;
                        if (net > 0) v_remaining_egp += net;
                    }
                });

                let vodafoneBadgeHtml = '';
                if (v_remaining_egp > 0) {
                    vodafoneBadgeHtml = `<div class="badge-total-top" style="font-size:15px; color:#fff; background:linear-gradient(135deg, #d500f9, #8b5cf6); border-color:var(--purple); box-shadow: 0 0 10px rgba(213,0,249,0.4);">إجمالي باقي فودافون (مصري): ${v_remaining_egp}</div>`;
                }

                let summaryHtml = `
                    <div style="display:flex; gap:10px; justify-content:center; margin-bottom:15px; flex-wrap:wrap; align-items:center;">
                        <div class="badge-total-top" style="font-size:15px; color:var(--text-main); background:rgba(255,255,255,0.1); border-color:var(--text-muted);">إجمالي المشتريات: ${totalPurchases}</div>
                        <div class="badge-total-top" style="font-size:15px; color:var(--success); background:rgba(0,230,118,0.1); border-color:var(--success);">إجمالي المُسدد: ${totalPaid}</div>
                        <div class="badge-total-top" style="font-size:15px; color:${totalRemaining >= 0 ? '#10b981' : '#ef4444'}; background:rgba(255,255,255,0.1); border-color:${totalRemaining >= 0 ? '#10b981' : '#ef4444'};">إجمالي الباقي: ${totalRemaining} د.ل</div>
                        ${vodafoneBadgeHtml}
                    </div>
                `;

                let inputsHtml = `
                    <div class="table-container" style="margin-bottom: 15px; overflow:visible;">
                        <table class="input-table">
                            <thead>
                                <tr>
                                    <th style="width: 25%;">البيان</th>
                                    <th style="width: 15%;">الكمية</th>
                                    <th style="width: 6%;">العملية</th>
                                    <th style="width: 12%;">السعر</th>
                                    <th style="width: 14%;">الإجمالي</th>
                                    <th style="width: 14%;">التسديد</th>
                                    <th style="width: 14%;">حفظ</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><input type="text" id="p_name" class="glass-input" autocomplete="off" style="width:100%; text-align:right;" placeholder="اكتب هنا..." onkeydown="if(event.key === 'Enter') addPurchaseRecord()"></td>
                                    <td><input type="number" id="p_qty" class="glass-input" autocomplete="off" style="width:100%; text-align:center;" placeholder="0" oninput="updateLiveTotal()" onkeydown="if(event.key === 'Enter') addPurchaseRecord()"></td>
                                    <td>
                                        <div style="display:flex; flex-direction:column; align-items:center; background:rgba(0,0,0,0.3); padding:4px; border-radius:4px; border:1px solid var(--border);">
                                            <label style="cursor:pointer; margin-bottom:2px;"><input type="radio" name="p_op" value="*" checked onchange="updateLiveTotal()"> ✖</label>
                                            <label style="cursor:pointer;"><input type="radio" name="p_op" value="/" onchange="updateLiveTotal()"> ➗</label>
                                        </div>
                                    </td>
                                    <td><input type="number" id="p_price" class="glass-input" autocomplete="off" style="width:100%; text-align:center;" placeholder="0" oninput="updateLiveTotal()" onkeydown="if(event.key === 'Enter') addPurchaseRecord()"></td>
                                    <td><div id="live_total_disp" style="font-size:16px; font-weight:900; color:var(--primary);">0</div></td>
                                    <td><input type="number" id="p_paid" class="glass-input" autocomplete="off" style="width:100%; text-align:center;" placeholder="0" onkeydown="if(event.key === 'Enter') addPurchaseRecord()"></td>
                                    <td><button class="btn-g btn-add" style="width:100%; height:35px; font-size:14px;" onclick="addPurchaseRecord()">➕ إضافة</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                `;

                let vodafoneRecords = records.filter(item => item.name.includes('فودافون') && !item.parent_id);
                let vTableHtml = '';
                if (vodafoneRecords.length > 0) {
                    let vRows = vodafoneRecords.map((item, index) => {
                        let c1 = item.v_c1 || '';
                        let c2 = item.v_c2 || '';
                        let c3 = item.v_c3 || '';
                        let c4 = item.v_c4 || '';
                        let consumed = (item.v_c1||0) + (item.v_c2||0) + (item.v_c3||0) + (item.v_c4||0);
                        let currentDeficit = getVodafoneDeficit(activeMerchant, item.id);
                        let net = item.qty - consumed + currentDeficit;

                        return `
                        <tr>
                            <td class="serial-cell" style="font-size:18px !important;">ت ${index + 1}</td>
                            <td style="font-size:16px;"><b>${item.name}</b></td>
                            <td style="color:var(--primary); font-weight:900; font-size:18px;">${item.qty}</td>
                            <td><input type="number" id="v1_${item.id}" autocomplete="off" class="glass-input vodafone-consume-input" value="${c1}" oninput="updateVodafone(${item.id}, 1, this.value)"></td>
                            <td><input type="number" id="v2_${item.id}" autocomplete="off" class="glass-input vodafone-consume-input" value="${c2}" oninput="updateVodafone(${item.id}, 2, this.value)"></td>
                            <td><input type="number" id="v3_${item.id}" autocomplete="off" class="glass-input vodafone-consume-input" value="${c3}" oninput="updateVodafone(${item.id}, 3, this.value)"></td>
                            <td><input type="number" id="v4_${item.id}" autocomplete="off" class="glass-input vodafone-consume-input" value="${c4}" oninput="updateVodafone(${item.id}, 4, this.value)"></td>
                            <td style="color:var(--danger); font-weight:900; font-size:18px;">${consumed}</td>
                            <td style="color:var(--success); font-weight:900; font-size:18px;">${net}</td>
                        </tr>
                        `;
                    }).join('');

                    vTableHtml = `
                        <h3 style="color:var(--purple); margin-top:20px; margin-bottom:10px; padding-bottom:5px; border-bottom:2px dashed var(--purple);">📊 إدخال الاستهلاكيات (تجمع أوتوماتيكياً)</h3>
                        <div class="table-container" style="width:100%; margin-bottom:25px; border:2px solid var(--purple); box-shadow: 0 0 15px rgba(213,0,249,0.3);">
                            <table>
                                <thead style="background:rgba(213,0,249,0.15);">
                                    <tr>
                                        <th class="serial-cell">ت</th>
                                        <th style="font-size:14px;">البيان</th>
                                        <th style="font-size:14px;">الكمية (مصري)</th>
                                        <th style="font-size:14px;">استهلاك 1️⃣</th>
                                        <th style="font-size:14px;">استهلاك 2️⃣</th>
                                        <th style="font-size:14px;">استهلاك 3️⃣</th>
                                        <th style="font-size:14px;">استهلاك 4️⃣</th>
                                        <th style="font-size:14px;">إجمالي الاستهلاك</th>
                                        <th style="font-size:14px;">الباقي (مصري)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${vRows}
                                </tbody>
                            </table>
                        </div>
                    `;
                }

                let tableRows = records.map((item, index) => {
                    let isDeficit = item.parent_id ? 'background: rgba(255, 23, 68, 0.05);' : '';
                    let priceDisplay = item.parent_id 
                        ? `<input type="number" class="glass-input" autocomplete="off" style="width:70px; text-align:center; height:26px; font-size:14px; padding:0; font-weight:900; color:var(--warning);" value="${item.price}" onchange="updateDeficitPrice(${item.id}, this.value)">` 
                        : item.price;

                    return `
                    <tr style="${isDeficit}">
                        <td class="serial-cell">ت ${index + 1}</td>
                        <td><b>${item.name}</b></td>
                        <td style="color:var(--primary); font-weight:900;">${item.qty}</td>
                        <td style="color:var(--warning); font-weight:900;">${priceDisplay}</td>
                        <td style="color:var(--text-main); font-weight:900; font-size:14px;">${item.total}</td>
                        <td style="color:var(--success); font-weight:900; font-size:14px;">${item.paid}</td>
                        <td style="color:var(--danger); font-weight:900; font-size:14px;">${item.remaining}</td>
                        <td><button class="btn-mini b-full" onclick="deletePurchaseRecord(${item.id})">❌ حذف</button></td>
                    </tr>
                    `;
                }).join('');

                let tableHeader = `<thead><tr><th class="serial-cell">ت</th><th>البيان</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th><th>التسديد</th><th>الباقي النهائي</th><th>إجراء</th></tr></thead>`;
                
                container.innerHTML = merchantTabs + summaryHtml + inputsHtml + vTableHtml + `<h3 style="color:var(--text-muted); margin-bottom:10px;">📜 التسلسل العام للمشتريات</h3><div class="table-container" style="width:100%;"><table>${tableHeader}<tbody>${tableRows || '<tr><td colspan="8" style="text-align:center; padding:30px;">لا توجد عمليات مشتريات مسجلة لهذا التاجر.</td></tr>'}</tbody></table></div>`;
            }

            // القسم الثامن - قسم فاطمة 
            else if (currentTabNum === 8) {
                if(!sysDB.fatima_days || !sysDB.fatima_days.length) {
                    let today = new Date().toLocaleDateString("ar-EG", {year:"numeric", month:"long", day:"numeric"});
                    sysDB.fatima_days = [{
                        id: 1, label: "اليوم الأول — " + today, created_at: Date.now(), carried_forward: false,
                        prev_val: sysDB.fatima?.prev_val || "", total_work: sysDB.fatima?.total_work || "",
                        received_val: sysDB.fatima?.received_val || "", final_rem: sysDB.fatima?.final_rem || "",
                        rows: sysDB.fatima?.rows || Array.from({length:25}, () => ({val:"",comm:"",tot:""}))
                    }];
                    sysDB.fatima_active_day = 0;
                    saveDB();
                }
                if(sysDB.fatima_active_day === undefined) sysDB.fatima_active_day = 0;
                let fatima = sysDB.fatima_days[sysDB.fatima_active_day];
                sysDB.fatima = fatima;

                let dayTabsHtml = sysDB.fatima_days.map((d, i) => {
                    let isActive = i === sysDB.fatima_active_day;
                    let rem = parseFloat(d.final_rem) || 0;
                    let badge = d.carried_forward ? `<span style="background:#059669;color:#fff;border-radius:3px;padding:1px 5px;font-size:9px;margin-left:4px;">↩${Math.floor(parseFloat(d.prev_val)||0)}</span>` : "";
                    return `<button onclick="switchFatimaDay(${i})" style="padding:5px 12px;border-radius:6px;font-size:11px;font-weight:900;cursor:pointer;background:${isActive?"#6d28d9":"rgba(109,40,217,0.1)"};color:${isActive?"#fff":"#8b5cf6"};border:1px solid ${isActive?"#6d28d9":"rgba(109,40,217,0.25)"};white-space:nowrap;flex-shrink:0;">${badge}${d.label}${rem!==0&&!isActive?`<span style="color:#fbbf24;font-size:9px;"> (${Math.floor(rem)})</span>`:""}</button>`;
                }).join("");

                let rowsHtml = fatima.rows.map((r, i) => `
                    <tr style="height:30px;">
                        <td style="width:26px;text-align:center;font-size:11px;font-weight:700;padding:2px;color:#78350f;">${i+1}</td>
                        <td style="padding:2px 4px;"><input type="number" id="f_v_${i}" class="glass-input" autocomplete="off" style="width:100%;text-align:center;font-size:13px;height:26px;padding:0 4px;color:#78350f;font-weight:700;" value="${r.val}" onchange="recalcFatimaLive(${i})"></td>
                        <td style="padding:2px 4px;"><input type="number" id="f_c_${i}" class="glass-input" autocomplete="off" style="width:100%;text-align:center;font-size:13px;height:26px;padding:0 4px;color:#78350f;font-weight:700;" value="${r.comm}" onchange="recalcFatimaLive(${i})"></td>
                        <td style="padding:2px 4px;"><input type="number" id="f_t_${i}" class="glass-input" readonly style="width:100%;text-align:center;font-size:13px;height:26px;font-weight:900;color:#92400e;background:rgba(146,64,14,0.08);border:1px solid rgba(146,64,14,0.15);padding:0 4px;" value="${r.tot}"></td>
                    </tr>
                `).join("");

                let FATIMA_H = "calc(100vh - 230px)";
                container.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(109,40,217,0.07);border:1px solid rgba(109,40,217,0.2);border-radius:8px;padding:10px 16px;margin-bottom:8px;">
                        <div style="font-size:17px;font-weight:900;color:var(--text-main);">👩‍💼 قسم فاطمة</div>
                        <button onclick="createNewFatimaDay()" style="background:#6d28d9;color:#fff;border:none;border-radius:6px;padding:7px 18px;font-size:13px;font-weight:900;cursor:pointer;font-family:Tajawal,sans-serif;">➕ يوم جديد</button>
                    </div>
                    <div style="display:flex;gap:6px;overflow-x:auto;padding:4px 0 8px;align-items:center;flex-wrap:nowrap;">
                        <span style="color:var(--text-muted);font-size:11px;flex-shrink:0;">📅</span>
                        ${dayTabsHtml}
                    </div>
                    ${fatima.carried_forward ? `<div style="background:rgba(5,150,105,0.08);border:1px solid rgba(5,150,105,0.3);border-radius:6px;padding:6px 14px;margin-bottom:8px;font-size:12px;font-weight:900;color:#059669;">↩️ تم ترحيل الباقي (<b>${Math.floor(parseFloat(fatima.prev_val)||0)}</b>) تلقائياً</div>` : ""}
                    <div style="display:flex;gap:14px;align-items:stretch;height:${FATIMA_H};">
                        <div style="flex:0 0 300px;display:flex;flex-direction:column;border:1px solid rgba(146,64,14,0.2);border-radius:8px;overflow:hidden;">
                            <div style="background:rgba(146,64,14,0.08);padding:8px 12px;border-bottom:1px solid rgba(146,64,14,0.15);text-align:center;">
                                <span style="font-size:13px;font-weight:900;color:#92400e;">📋 جدول العمليات</span>
                            </div>
                            <div style="overflow-y:auto;flex:1;">
                                <table style="table-layout:fixed;width:100%;border-collapse:collapse;">
                                    <colgroup><col style="width:26px;"><col><col><col></colgroup>
                                    <thead>
                                        <tr style="height:30px;background:rgba(146,64,14,0.06);position:sticky;top:0;z-index:1;">
                                            <th style="text-align:center;font-size:11px;padding:3px;font-weight:900;color:#78350f;">ت</th>
                                            <th style="text-align:center;font-size:11px;padding:3px;font-weight:900;color:#78350f;">القيمة</th>
                                            <th style="text-align:center;font-size:11px;padding:3px;font-weight:900;color:#78350f;">العمولة</th>
                                            <th style="text-align:center;font-size:11px;padding:3px;font-weight:900;color:#78350f;">الإجمالي</th>
                                        </tr>
                                    </thead>
                                    <tbody>${rowsHtml}</tbody>
                                </table>
                            </div>
                        </div>
                        <div id="fatimaSummaryBox" style="flex:1;display:flex;flex-direction:column;border:1px solid rgba(109,40,217,0.25);border-radius:8px;overflow:hidden;">
                            <div style="background:rgba(109,40,217,0.09);padding:12px;text-align:center;border-bottom:1px solid rgba(109,40,217,0.15);">
                                <div style="font-size:14px;font-weight:900;color:#7c3aed;">📊 خلاصة — ${fatima.label}</div>
                            </div>
                            <div style="flex:1;display:flex;flex-direction:column;justify-content:space-evenly;padding:16px 20px;gap:12px;">
                                <div style="display:flex;flex-direction:column;gap:5px;">
                                    <label style="font-size:13px;font-weight:900;color:#78350f;">القيمة السابقة ${fatima.carried_forward?"<span style='font-size:10px;background:#059669;color:#fff;border-radius:3px;padding:1px 6px;'>↩ مرحّل</span>":""}</label>
                                    <input type="number" id="f_prev" class="glass-input" autocomplete="off" style="width:100%;text-align:center;font-size:22px;font-weight:900;height:52px;padding:0 10px;color:#92400e;border:1px solid rgba(146,64,14,0.25);border-radius:6px;" value="${fatima.prev_val}" onchange="recalcFatimaSummaryLive()">
                                </div>
                                <div style="display:flex;flex-direction:column;gap:5px;">
                                    <label style="font-size:13px;font-weight:900;color:#065f46;">القيمة المستلمة</label>
                                    <input type="number" id="f_rec" class="glass-input" autocomplete="off" style="width:100%;text-align:center;font-size:22px;font-weight:900;height:52px;padding:0 10px;color:var(--success);border:1px solid rgba(52,211,153,0.3);border-radius:6px;" value="${fatima.received_val}" onchange="recalcFatimaSummaryLive()">
                                </div>
                                <div style="display:flex;flex-direction:column;gap:5px;">
                                    <label style="font-size:13px;font-weight:900;color:#78350f;">إجمالي الشغل</label>
                                    <input type="number" id="f_total_work" class="glass-input" readonly style="width:100%;text-align:center;font-size:22px;font-weight:900;height:52px;padding:0 10px;color:var(--warning);background:rgba(0,0,0,0.12);border:1px solid rgba(251,191,36,0.2);border-radius:6px;" value="${fatima.total_work}">
                                </div>
                                <div style="display:flex;flex-direction:column;gap:5px;">
                                    <label style="font-size:13px;font-weight:900;color:#991b1b;">الباقي النهائي</label>
                                    <input type="number" id="f_rem" class="glass-input" readonly style="width:100%;text-align:center;font-size:26px;font-weight:900;height:60px;padding:0 10px;color:var(--danger);background:rgba(0,0,0,0.12);border:1px solid rgba(248,113,113,0.25);border-radius:8px;" value="${fatima.final_rem}">
                                </div>
                            </div>
                            <div style="padding:12px 16px;border-top:1px solid rgba(109,40,217,0.12);background:rgba(0,0,0,0.08);">
                                <button onclick="downloadFatimaImage()" style="width:100%;background:#6d28d9;color:#fff;border:none;border-radius:6px;padding:9px;font-size:13px;font-weight:900;cursor:pointer;font-family:Tajawal,sans-serif;">🖼️ تنزيل كصورة</button>
                            </div>
                        </div>
                    </div>
                `;
            }

            else { 
                container.innerHTML = `
                <div class="smart-toolbar" style="justify-content:center;">
                    <div class="toolbar-group">
                        <span style="font-weight:900; color:var(--primary); font-size:14px; margin-right:15px;">القسم تحت الإنشاء - جاري برمجته</span>
                    </div>
                </div>
                <div class="glass-panel-unified" style="justify-content:center; padding:40px; margin-top:10px;"><h2 style="color:var(--text-muted); font-size:18px;">مساحة القسم جاهزة للتصميم والتطوير.</h2></div>`;
            }

            if (activeFocus && document.getElementById(activeFocus)) { let el = document.getElementById(activeFocus); el.focus(); let val = el.value; el.value = ''; el.value = val; }
        }

        function checkAndAddNewDebt(dbKey) {
            const name = document.getElementById('addNameInput').value.trim(); 
            const amt = Math.floor(parseFloat(document.getElementById('addAmountInput').value));
            if (!name || isNaN(amt) || amt <= 0) { showToast("برجاء إدخال اسم وقيمة ماليّة صحيحة", "error"); return; }
            let arr = getDbArr(dbKey);
            
            if(arr.some(item => item.name === name)) { 
                showToast(`⚠️ الاسم [${name}] مسجل مسبقاً! يمنع التكرار، عدل على الحساب الموجود.`, "error"); 
                return; 
            }

            // تاريخ الاستحقاق (اختياري)
            let dueDateInput = document.getElementById('addDueDateInput');
            let dueDate = dueDateInput && dueDateInput.value ? new Date(dueDateInput.value).getTime() : null;
            
            let sectionNames2 = { customers: 'ديون العملاء', companies: 'حسابات الشركات', wholesale: 'كبار العملاء' };
            arr.push({ id: Date.now(), name: name, amount: amt, lastPaymentDate: Date.now(), dueDate: dueDate });
            logAction(`إضافة حساب جديد [${name}] بقيمة ${amt} د.ل`, sectionNames2[dbKey] || dbKey);
            saveDB(); renderActiveSection();
        }

        function addNewTrust() { 
            const name = document.getElementById('trustName').value.trim(); 
            const lyd = Math.floor(parseFloat(document.getElementById('trustLyd').value) || 0); 
            const egp = Math.floor(parseFloat(document.getElementById('trustEgp').value) || 0); 
            if (!name || (lyd <= 0 && egp <= 0)) return; 
            
            if(sysDB.trusts.some(item => item.name === name)) { 
                showToast(`⚠️ صاحب الأمانة [${name}] مسجل مسبقاً! يرجى التعديل من الجدول.`, "error"); 
                return; 
            }
            
            sysDB.trusts.push({ id: Date.now(), name: name, lyd: lyd, egp: egp }); 
            logAction(`تسجيل أمانة لـ [${name}].`); saveDB(); renderActiveSection(); 
        }

        // ==========================================
        // ===== نظام الحفظ التلقائي المُحسّن =====
        // ==========================================
        const SNAPSHOT_KEYS = ['snap_0','snap_1','snap_2','snap_3','snap_4','snap_5'];
        const SNAP_INTERVAL_MS = 10 * 60 * 1000;
        const AUTO_DOWNLOAD_MS = 60 * 60 * 1000;
        let snapIndex = 0;

        function setSaveStatus(state, text) {
            let dot = document.getElementById('saveDot');
            let txt = document.getElementById('saveStatusText');
            if(!dot || !txt) return;
            dot.className = 'save-dot' + (state==='saving'?' saving':state==='error'?' error':'');
            txt.innerText = text;
        }

        function updateLastSaveText() {
            let el = document.getElementById('lastSaveText');
            if(!el) return;
            let now = new Date();
            el.innerText = `آخر حفظ: ${now.toLocaleTimeString('ar-EG', {hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;
        }

        function takeSnapshot() {
            try {
                let snapshot = { ts: Date.now(), label: new Date().toLocaleString('ar-EG'), data: JSON.stringify(sysDB) };
                localStorage.setItem('abdo_snap_' + (snapIndex % SNAPSHOT_KEYS.length), JSON.stringify(snapshot));
                snapIndex++;
                localStorage.setItem('abdo_snap_index', snapIndex);
                setSaveStatus('ok', '✅ نسخة تلقائية محفوظة');
                updateLastSaveText();
                setTimeout(() => setSaveStatus('ok', 'جاهز'), 2500);
            } catch(e) { setSaveStatus('error', '⚠️ فشل النسخ التلقائي!'); }
        }

        function autoDownloadBackup() {
            try {
                let blob = new Blob([JSON.stringify(sysDB)], {type:'application/json'});
                let url = URL.createObjectURL(blob);
                let a = document.createElement('a');
                let now = new Date();
                let ds = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
                a.href = url; a.download = `نسخة_تلقائية_${ds}.json`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('💾 تم تنزيل نسخة احتياطية تلقائية!', 'success');
                logAction('تنزيل نسخة احتياطية تلقائية كل ساعة.');
            } catch(e) { showToast('⚠️ تعذر التنزيل التلقائي', 'error'); }
        }

        function manualBackupNow() {
            setSaveStatus('saving', '⏳ جاري الحفظ...');
            setTimeout(() => { takeSnapshot(); createBackup(); }, 200);
        }

        function openRecoveryModal() {
            document.getElementById('recoveryModal').style.display = 'flex';
            let list = document.getElementById('recoverySlotsList');
            let snaps = [];
            for(let i=0; i<SNAPSHOT_KEYS.length; i++) {
                try { let r = localStorage.getItem('abdo_snap_'+i); if(r) snaps.push({key:'abdo_snap_'+i, ...JSON.parse(r)}); } catch(e) {}
            }
            snaps.sort((a,b) => b.ts - a.ts);
            if(!snaps.length) { list.innerHTML = `<p style="text-align:center;color:#64748b;padding:20px;">لا توجد نسخ تلقائية بعد (تُؤخذ كل 10 دقائق).</p>`; return; }
            list.innerHTML = snaps.map(snap => {
                let age = Math.round((Date.now()-snap.ts)/60000);
                let ageStr = age < 60 ? `منذ ${age} دقيقة` : `منذ ${Math.round(age/60)} ساعة`;
                let size = Math.round(snap.data.length/1024);
                return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                    <div><div style="font-weight:900;font-size:13px;color:#0f172a;">🕐 ${snap.label}</div>
                    <div style="font-size:11px;color:#64748b;">${ageStr} • ${size} KB</div></div>
                    <button class="btn-g" style="background:#10b981;color:#000;font-size:11px;height:30px;" onclick="restoreSnapshot('${snap.key}')">↩️ استعادة</button>
                </div>`;
            }).join('');
        }

        function restoreSnapshot(key) {
            if(!confirm('⚠️ سيتم استبدال البيانات الحالية. متأكد؟')) return;
            try {
                let snap = JSON.parse(localStorage.getItem(key));
                let data = JSON.parse(snap.data);
                if(!data || typeof data !== 'object') throw new Error('بيانات غير صالحة');
                sysDB = data;
                if(!sysDB.trash_bin) sysDB.trash_bin = [];
                if(!sysDB.audit_log) sysDB.audit_log = [];
                saveDB();
                logAction(`استعادة snapshot بتاريخ: ${snap.label}`);
                document.getElementById('recoveryModal').style.display = 'none';
                renderActiveSection();
                showToast('✅ تم استعادة النسخة بنجاح!', 'success');
            } catch(e) { showToast('❌ فشل في قراءة النسخة!', 'error'); }
        }

        function startAutoSaveSystem() {
            snapIndex = parseInt(localStorage.getItem('abdo_snap_index') || '0');
            setInterval(takeSnapshot, SNAP_INTERVAL_MS);
            setInterval(() => { if(sessionStorage.getItem('abdo_logged_in')==='1') autoDownloadBackup(); }, AUTO_DOWNLOAD_MS);
            updateLastSaveText();
        }

        // ===== تشغيل نظام المستخدمين =====
        window.addEventListener('load', function() {
            if (!sessionStorage.getItem('abdo_logged_in')) {
                initAuthSystem();
                // دوال محرك حسابات الشركات وكبار العملاء (الترحيل والعمليات)
        window.ensureTransactionModal = function() {
            if (document.getElementById('debtTransactionModal')) return;
            let modalHtml = `
            <div class="modal-overlay" id="debtTransactionModal" style="display:none; z-index:999999; justify-content:center; align-items:center;">
                <div class="modal-box" style="max-width: 400px; text-align:center; background:#0f172a; border:2px solid var(--primary);">
                    <h3 id="dtModalTitle" style="color:var(--primary); margin-bottom:15px; margin-top:0;">إضافة عملية</h3>
                    <input type="hidden" id="dtPagesKey">
                    <input type="hidden" id="dtClientId">

                    <input type="number" id="dtAmount" autocomplete="off" class="glass-input" style="width:90%; text-align:center; font-size:20px; height:45px; margin-bottom:10px;" placeholder="المبلغ">

                    <div style="display:flex; gap:10px; margin-bottom:10px; justify-content:center; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; border:1px solid var(--border); width:90%; margin:0 auto 10px;">
                        <label style="cursor:pointer; font-weight:900;"><input type="radio" name="dtOpType" value="multiply" checked> ضرب (×)</label>
                        <label style="cursor:pointer; font-weight:900;"><input type="radio" name="dtOpType" value="divide"> قسمة (÷)</label>
                    </div>

                    <input type="number" id="dtRate" autocomplete="off" class="glass-input" style="width:90%; text-align:center; font-size:20px; height:45px; margin-bottom:15px;" placeholder="السعر">

                    <div style="display:flex; gap:8px; width:90%; margin:0 auto;">
                        <button class="btn-g" style="flex:1; background:var(--success); color:#000; font-size:14px;" onclick="saveDebtTransaction()">✔️ حفظ العملية</button>
                        <button class="btn-g" style="flex:1; background:var(--danger); font-size:14px;" onclick="document.getElementById('debtTransactionModal').style.display='none'">❌ إلغاء</button>
                    </div>

                    <div id="dtTransactionsList" style="margin-top:15px; max-height:150px; overflow-y:auto; text-align:right; border-top:1px solid var(--border); padding-top:10px; width:90%; margin:15px auto 0;">
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        window.updateDebtField = function(pagesKey, id, field, val) {
            let amt = Math.floor(parseFloat(val)) || 0;
            let pageIdx = window[pagesKey === 'company_pages' ? 'activeCompanyPageIndex' : 'activeWholesalePageIndex'];
            let client = sysDB[pagesKey][pageIdx].debts.find(d => d.id === id);
            if(client) {
                client[field] = amt;
                saveDB();
                renderActiveSection();
            }
        }

     window.deleteDebtItem = function(pagesKey, id) {
    if(!confirm('هل أنت متأكد من مسح هذا الحساب من هذا اليوم؟')) return;

    let pageIdx = window[
        pagesKey === 'company_pages'
        ? 'activeCompanyPageIndex'
        : 'activeWholesalePageIndex'
    ];

    let page = sysDB[pagesKey]?.[pageIdx];
    if(!page || !page.debts) return;

    let idx = page.debts.findIndex(d => d.id === id);
    if(idx === -1) return;

    // تجهيز نسخة للاسترجاع
    let deletedItem = JSON.parse(JSON.stringify(page.debts[idx]));

    addToTrashBin({
        type: 'debtItem',
        pagesKey,
        pageIndex: pageIdx,
        clientName: deletedItem.name,
        itemData: deletedItem
    },
    pagesKey === 'company_pages' ? 'companies' : 'wholesale',
    pagesKey === 'company_pages'
        ? 'حسابات الشركات'
        : 'كبار العملاء');

    // حذف فعلي
    page.debts.splice(idx, 1);

    saveDB();
    renderActiveSection();

    showToast('✅ تم نقل الحساب إلى سلة المحذوفات', 'success');
}

        window.addNewDebtClient = function(pagesKey) {
            let name = document.getElementById('newClientName').value.trim();
            let oldDebt = Math.floor(parseFloat(document.getElementById('newClientOldDebt').value)) || 0;
            if(!name) { showToast('يرجى كتابة الاسم', 'error'); return; }

            let pageIdx = window[pagesKey === 'company_pages' ? 'activeCompanyPageIndex' : 'activeWholesalePageIndex'];
            let debts = sysDB[pagesKey][pageIdx].debts;

            if(debts.some(d => d.name === name)) {
                showToast('الاسم مسجل مسبقاً في هذا اليوم', 'error'); return;
            }

            debts.push({ id: Date.now(), name: name, old_debt: oldDebt, new_work: 0, payment: 0, transactions: [] });
            saveDB(); renderActiveSection(); showToast('تمت الإضافة بنجاح', 'success');
        }

        window.createNewDebtDay = function(pagesKey, indexKey) {
            let pages = sysDB[pagesKey];
            let currentDay = pages[pages.length - 1];

            if(!confirm('هل تريد فعلاً إقفال اليوم وترحيل الباقي ليوم جديد؟')) return;

            let newDebts = currentDay.debts.map(d => {
                let total = (d.old_debt || 0) + (d.transactions ? d.transactions.reduce((s, t) => s + t.result, 0) : (d.new_work || 0));
                let rem = total - (d.payment || 0);
                return { id: Date.now() + Math.random(), name: d.name, old_debt: rem, new_work: 0, payment: 0, transactions: [] };
            });

            let todayStr = new Date().toLocaleDateString('ar-EG');
            pages.push({ id: Date.now(), label: 'اليوم ' + (pages.length + 1) + ' — ' + todayStr, created_at: Date.now(), carried_forward: true, debts: newDebts });

            window[indexKey] = pages.length - 1;
            saveDB(); renderActiveSection();
            showToast('تم فتح يوم جديد وترحيل الأرصدة بنجاح!', 'success');
        }

        window.openTransactionModal = function(pagesKey, clientId, clientName) {
            ensureTransactionModal();
            document.getElementById('dtPagesKey').value = pagesKey;
            document.getElementById('dtClientId').value = clientId;
            document.getElementById('dtModalTitle').innerText = 'عمليات: ' + clientName;
            document.getElementById('dtAmount').value = '';
            document.getElementById('dtRate').value = '';
            renderTransactionsList(pagesKey, clientId);
            document.getElementById('debtTransactionModal').style.display = 'flex';
            setTimeout(() => document.getElementById('dtAmount').focus(), 100);
        }

        window.renderTransactionsList = function(pagesKey, clientId) {
            let pageIdx = window[pagesKey === 'company_pages' ? 'activeCompanyPageIndex' : 'activeWholesalePageIndex'];
            let client = sysDB[pagesKey][pageIdx].debts.find(d => d.id === clientId);
            let listDiv = document.getElementById('dtTransactionsList');

            if(!client || !client.transactions || client.transactions.length === 0) {
                listDiv.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:12px;">لا توجد عمليات مضافة</div>';
                return;
            }

            listDiv.innerHTML = client.transactions.map((t, i) => `
                <div style="display:flex; justify-content:space-between; background:rgba(255,255,255,0.05); padding:8px; margin-bottom:5px; border-radius:4px; font-size:13px; font-weight:900;">
                    <span>${t.amount} ${t.type === 'multiply' ? '×' : '÷'} ${t.rate} = <b style="color:var(--warning);">${t.result}</b></span>
                    <button class="btn-mini b-full" onclick="deleteDebtTransaction('${pagesKey}', ${clientId}, ${i})">❌</button>
                </div>
            `).join('');
        }

        window.saveDebtTransaction = function() {
            let pagesKey = document.getElementById('dtPagesKey').value;
            let clientId = parseFloat(document.getElementById('dtClientId').value);
            let amount = parseFloat(document.getElementById('dtAmount').value);
            let rate = parseFloat(document.getElementById('dtRate').value);
            let type = document.querySelector('input[name="dtOpType"]:checked').value;

            if(!amount || !rate) { showToast('أدخل المبلغ والسعر', 'error'); return; }

            let result = Math.floor(type === 'multiply' ? amount * rate : amount / rate);
            let pageIdx = window[pagesKey === 'company_pages' ? 'activeCompanyPageIndex' : 'activeWholesalePageIndex'];
            let client = sysDB[pagesKey][pageIdx].debts.find(d => d.id === clientId);

            if(client) {
                if(!client.transactions) client.transactions = [];
                client.transactions.push({ amount, rate, type, result });
                saveDB(); renderActiveSection(); renderTransactionsList(pagesKey, clientId);
                document.getElementById('dtAmount').value = '';
                document.getElementById('dtAmount').focus();
            }
        }
window.deleteDebtTransaction = function(pagesKey, clientId, transIdx) {
    if(!confirm('هل أنت متأكد من مسح هذا التسلسل؟')) return;

    let pageIdx =
        window[pagesKey === 'company_pages'
            ? 'activeCompanyPageIndex'
            : 'activeWholesalePageIndex'];

    let page = sysDB[pagesKey]?.[pageIdx];
    if(!page || !page.debts) return;

    let client = page.debts.find(d => d.id === clientId);

    if(
        !client ||
        !Array.isArray(client.transactions) ||
        !client.transactions[transIdx]
    ) {
        showToast("❌ لم يتم العثور على التسلسل", "error");
        return;
    }

    // نسخ العملية قبل الحذف
    let deletedTrans = {
        type: 'transaction',
        clientId: client.id,
        clientName: client.name,
        pageIndex: pageIdx,
        pagesKey,
        transactionIndex: transIdx,
        transaction: JSON.parse(
            JSON.stringify(client.transactions[transIdx])
        )
    };

    // النقل للسلة
    addToTrashBin(
        deletedTrans,
        'transactions',
        pagesKey === 'company_pages'
            ? 'تسلسل (شركات)'
            : 'تسلسل (كبار العملاء)'
    );

    // الحذف
    client.transactions.splice(transIdx, 1);

    saveDB();

    renderActiveSection();

    // حماية لو نافذة العمليات اتقفلت
    if (typeof renderTransactionsList === 'function') {
        renderTransactionsList(pagesKey, clientId);
    }

    showToast("✅ تم نقل التسلسل إلى السلة", "success");
};
        

        // ======== كود الربط بالسحابة (المزامنة الذكية) ========
        let _saveDBBusy = false;
        window.saveDB = async function() {
            if(_saveDBBusy) return;
            _saveDBBusy = true;
            try {
                // 1. إضافة ختم زمني (عشان نعرف أحدث نسخة بالثانية)
                sysDB.last_updated = Date.now();

                // 2. الحفظ في المتصفح كنسخة احتياطية سريعة
                localStorage.setItem('ABDO_SYSTEM_FINAL_DB', JSON.stringify(sysDB));
                
                // 3. الإرسال لخزنة MongoDB السحابية
                await fetch('/api/save_data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sysDB)
                }).catch(e => console.log("السحابة غير متصلة مؤقتاً، تم الحفظ محلياً."));
            } catch(e) { console.error("خطأ عام في الحفظ:", e); }
            
            setTimeout(() => { _saveDBBusy = false; }, 300);
        };

        let originalOnload = window.onload;
        window.onload = async function() {
            try {
                // 1. سحب النسخة المحلية من المتصفح
                let localDataStr = localStorage.getItem('ABDO_SYSTEM_FINAL_DB');
                let localDB = localDataStr ? JSON.parse(localDataStr) : null;
                let localTime = (localDB && localDB.last_updated) ? localDB.last_updated : 0;

                // 2. سحب النسخة اللي على السحابة
                let cloudDB = null;
                let cloudTime = 0;
                try {
                    let response = await fetch(API_BASE + '/api/load_data');
                    let result = await response.json();
                    if (result.status === 'success' && result.data) {
                        cloudDB = result.data;
                        cloudTime = cloudDB.last_updated ? cloudDB.last_updated : 0;
                    }
                } catch(e) { console.log("جاري العمل محلياً لصعوبة الاتصال بالسحابة..."); }

                // 3. المزامنة الذكية (قاضية على مشكلة ضياع البيانات)
                if (localDB && localTime > cloudTime) {
                    // لو النت قطع واشتغلت محلي، المحلي هيكسب ويترفع يغطي السحابة
                    sysDB = localDB;
                    fetch(API_BASE + '/api/save_data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(sysDB)
                    }).catch(e=>{});
                } else if (cloudDB && cloudTime >= localTime) {
                    // لو متصفح جديد (زي إيدج) أو السحابة أحدث، السحابة تكسب وتغطي المتصفح
                    sysDB = cloudDB;
                    localStorage.setItem('ABDO_SYSTEM_FINAL_DB', JSON.stringify(sysDB));
                } else if (localDB) {
                    sysDB = localDB; // لو مفيش نت خالص
                }

                // 4. أمر فرش الداتا على الشاشة
                if(typeof renderActiveSection === 'function') {
                    renderActiveSection();
                }

            } catch(e) { console.error("خطأ أثناء المزامنة:", e); }
            
            if(typeof originalOnload === 'function') {
                originalOnload();
            }
        };
// ==============================================
        if(typeof updateUserChip === 'function') updateUserChip();
    }
});


// ====== UI Split Logic ======
function switchMainApp(appId, btnElement) {

    document.querySelectorAll('.top-nav-tab')
        .forEach(btn => btn.classList.remove('active'));

    (
        btnElement ||
        document.querySelector(
            `.top-nav-tab[data-app="${appId}"]`
        )
    )?.classList.add('active');

    const items = {
        clients: ['item_1','item_2','item_3'],
        treasury: ['item_4','item_5'],
        purchases: ['item_6','item_8']
    };

    document.querySelectorAll('.menu-item')
        .forEach(el => {
            el.style.display =
                items[appId]?.includes(el.id)
                ? 'flex'
                : 'none';
        });

    // شيلنا الضغط التلقائي هنا
}

document.addEventListener('DOMContentLoaded', () => {

    switchMainApp('clients');

    requestAnimationFrame(() => {

        let firstItem =
            document.getElementById('item_1');

     if(firstItem){
    console.time('open_section');
    firstItem.click();
    console.timeEnd('open_section');
}

    });

});
