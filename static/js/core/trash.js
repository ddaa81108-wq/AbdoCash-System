// ========== سلة المحذوفات ==========
if (!sysDB.trash_bin) {
    sysDB.trash_bin = [];
}

// =========================================================
// 1. دالة إضافة عنصر للسلة
// =========================================================
function addToTrashBin(item, dbKey, sectionName) {
    if (!item) return;

    if (!Array.isArray(sysDB.trash_bin))
        sysDB.trash_bin = [];

    let trashEntry = {
        id: Date.now() + Math.random(),
        item: JSON.parse(JSON.stringify(item)),
        dbKey,
        sectionName,
        deletedAt: Date.now()
    };

    sysDB.trash_bin.unshift(trashEntry);

    if (sysDB.trash_bin.length > 300)
        sysDB.trash_bin.pop();

    saveDB();
}

// =========================================================
// 2. دالة فتح نافذة السلة
// =========================================================
function openTrashModal() {
    let modal = document.getElementById('trashModal');

    if(!modal){
        showToast("❌ نافذة السلة غير موجودة", "error");
        return;
    }

    modal.style.display = 'flex';
    renderTrashContent();
}

// =========================================================
// 3. دالة عرض محتوى السلة
// =========================================================
function renderTrashContent() {
    let content = document.getElementById('trashContent');
    if(!content) return; 
    
    let trash = sysDB.trash_bin || [];
    
    if(!trash.length) {
        content.innerHTML = `<p style="text-align:center; color:#64748b; padding:20px;">السلة فارغة</p>`;
        return;
    }
    
    let html = trash.map((entry, idx) => {
        let item = entry.item || {};
        let dateStr = entry.deletedAt ? new Date(entry.deletedAt).toLocaleString('ar-EG') : 'تاريخ غير معروف';
        
        let displayName = 
            item?.source ||          
            item?.clientName || 
            item?.name || 
            item?.itemData?.name || 
            item?.transaction?.name || 
            item?.transaction?.clientName || 
            item?.desc ||            
            item?.note || 
            item?.description || 
            item?.details || 
            item?.title || 
            'بند غير معروف';

        let displayAmount = item.amount !== undefined ? `${Math.floor(item.amount)} د.ل` : (item.lyd !== undefined ? `${Math.floor(item.lyd)} ليبي / ${Math.floor(item.egp)} مصري` : '');
        
        return `
        <div class="trash-item" id="trash-entry-${idx}">
            <div class="trash-item-info">
                <div class="trash-item-name">🗑️ ${displayName}</div>
                <div class="trash-item-meta">القسم: ${entry.sectionName || 'غير معروف'} • ${displayAmount} • ${dateStr}</div>
            </div>
            <div class="trash-item-actions">
                <button class="btn-mini b-add-more" onclick="restoreFromTrash(${idx})" title="استرجاع">↩️ استرجاع</button>
                <button class="btn-mini b-full" onclick="permanentDeleteFromTrash(${idx})" title="حذف نهائي">❌ حذف</button>
            </div>
        </div>`;
    }).join('');
    
    if(trash.length > 0) {
        html += `<div style="margin-top:12px;"><button class="btn-g" style="width:100%; background:#ef4444; color:#fff;" onclick="clearAllTrash()">🗑️ إفراغ السلة بالكامل</button></div>`;
    }
    content.innerHTML = html;
}

// =========================================================
// 4. دالة الاسترجاع من السلة (النسخة الماسية النهائية 💎)
// =========================================================
function restoreFromTrash(idx) {
    let entry = sysDB.trash_bin[idx];
    if(!entry) return;

    let restoredName = "عنصر";
    let restored = false; 

    // 1. حالة المشتريات
    if (entry.dbKey === 'purchases' || (entry.item && entry.item.__restore && entry.item.__restore.type === 'purchase')) {
        let restoreMeta = entry.item.__restore || {};
        let merchant = restoreMeta.merchant;
        let originalIndex = restoreMeta.index;

        if (merchant && sysDB.purchases && sysDB.purchases[merchant]) {
            let restoredItem = JSON.parse(JSON.stringify(entry.item));
            delete restoredItem.__restore;

            if (!sysDB.purchases[merchant].some(x => x.id === restoredItem.id)) {
                if (Number.isInteger(originalIndex) && originalIndex >= 0 && originalIndex <= sysDB.purchases[merchant].length) {
                    sysDB.purchases[merchant].splice(originalIndex, 0, restoredItem);
                } else {
                    sysDB.purchases[merchant].push(restoredItem);
                }
                restoredName = restoredItem.name || restoredItem.description || "عملية مشتريات";
                restored = true; 
            } else {
                showToast("⚠️ العملية موجودة بالفعل", "warning");
                return;
            }
        } else {
            showToast("❌ تعذر تحديد مكان الاسترجاع", "error");
            return;
        }
    }
    // 2. حالة استرجاع "تسلسل" 
    else if (entry.item && entry.item.type === 'transaction') {
        let pKey = entry.item.pagesKey;
        let pIdx = entry.item.pageIndex;
        let cId = entry.item.clientId;
        
        if(sysDB[pKey] && sysDB[pKey][pIdx]) {
            let client = sysDB[pKey][pIdx].debts.find(d => d.id === cId);
            if(client) {
                if(!client.transactions) client.transactions = [];
                
                let tIndex = entry.item.transactionIndex;
                let trans = entry.item.transaction;
                let transId = trans?.id;
                
                let isExist = transId 
                    ? client.transactions.some(t => t.id === transId) 
                    : client.transactions.some(t => JSON.stringify(t) === JSON.stringify(trans));
                
                if (!isExist) {
                    if (Number.isInteger(tIndex) && tIndex >= 0 && tIndex <= client.transactions.length) {
                        client.transactions.splice(tIndex, 0, trans);
                    } else {
                        client.transactions.push(trans);
                    }
                    restoredName = "تسلسل لـ " + entry.item.clientName;
                    restored = true; 
                } else {
                    showToast("⚠️ التسلسل موجود بالفعل", "warning");
                    return;
                }
            } else {
                showToast("❌ الحساب الأصلي غير موجود", "error");
                return;
            }
        } else {
            showToast("❌ الصفحة الأصلية غير موجودة", "error");
            return;
        }
    }
    // 3. حالة استرجاع "حساب شركة" 
    else if (entry.item && entry.item.type === 'debtItem') {
        let pKey = entry.item.pagesKey;
        let pIdx = entry.item.pageIndex;
        
        if(sysDB[pKey] && sysDB[pKey][pIdx]) {
            if (!sysDB[pKey][pIdx].debts.some(d => d.id === entry.item.itemData.id)) {
                sysDB[pKey][pIdx].debts.push(entry.item.itemData);
                restoredName = entry.item.clientName || "حساب شركة/جملة";
                restored = true; 
            } else {
                showToast("⚠️ الحساب موجود بالفعل", "warning");
                return;
            }
        } else {
            showToast("❌ الصفحة الأصلية غير موجودة", "error");
            return;
        }
    }
    // 4. حالة الخزينة
    else if (entry.dbKey === 'treasury' || entry.item?.__restore?.type === 'treasury') {
        let meta = entry.item.__restore || {};
        let restoredItem = JSON.parse(JSON.stringify(entry.item));
        delete restoredItem.__restore;

        if (!sysDB.treasury) sysDB.treasury = []; 

        if (!restoredItem.id || !sysDB.treasury.some(x => x.id === restoredItem.id)) {
            if (Number.isInteger(meta.index) && meta.index >= 0 && meta.index <= sysDB.treasury.length) {
                sysDB.treasury.splice(meta.index, 0, restoredItem);
            } else {
                sysDB.treasury.push(restoredItem);
            }
            restoredName = restoredItem.source || restoredItem.name || restoredItem.note || restoredItem.desc || restoredItem.details || "حركة خزينة";
            restored = true;
        } else {
            showToast("⚠️ الحركة موجودة بالفعل", "warning");
            return;
        }
    }
    // 5. الأقسام العادية (الافتراضي) 
    else {
        let arr = getDbArr(entry.dbKey);
        if(arr) {
            if (!entry.item.id || !arr.some(x => x.id === entry.item.id)) {
                setDbArr(entry.dbKey, [...arr, entry.item]);
                restoredName = entry.item.name || entry.item.note || entry.item.description || "عنصر";
                restored = true;
            } else {
                showToast("⚠️ العنصر موجود بالفعل", "warning");
                return;
            }
        } else {
            showToast("❌ القسم غير متاح", "error");
            return;
        }
    }

    // التنفيذ الفعلي بعد الاسترجاع
    if (restored) {
        sysDB.trash_bin.splice(idx, 1);
        saveDB();
        renderTrashContent();
        if (typeof renderActiveSection === 'function') renderActiveSection();
        if (typeof logAction === 'function') logAction(`استرجاع [${restoredName}]`);
        showToast(`✅ تم استرجاع [${restoredName}]`, "success");
    }
}

// =========================================================
// 5. دالة الحذف النهائي لعنصر واحد
// =========================================================
function permanentDeleteFromTrash(idx) {
    if(!confirm('هل أنت متأكد من الحذف النهائي؟ لن يمكن استرجاع هذا العنصر بعد الآن.'))
        return;

    if(!Array.isArray(sysDB.trash_bin))
        sysDB.trash_bin = [];

    if(idx < 0 || idx >= sysDB.trash_bin.length){
        showToast('❌ العنصر غير موجود', 'error');
        return;
    }

    sysDB.trash_bin.splice(idx, 1);
    saveDB();
    renderTrashContent();

    if(typeof renderActiveSection === 'function'){
        renderActiveSection();
    }

    showToast('🗑️ تم الحذف نهائياً', 'success');
}

// =========================================================
// 6. دالة إفراغ السلة بالكامل
// =========================================================
function clearAllTrash() {
    if(!confirm('هل أنت متأكد من إفراغ سلة المحذوفات بالكامل؟'))
        return;

    if(!Array.isArray(sysDB.trash_bin))
        sysDB.trash_bin = [];

    sysDB.trash_bin.length = 0; 

    saveDB();
    renderTrashContent();

    if(typeof renderActiveSection === 'function'){
        renderActiveSection();
    }

    showToast('💥 تم إفراغ السلة بالكامل', 'success');
}

// =========================================================
// ربط جميع دوال السلة بالواجهة الرئيسية لضمان عمل الأزرار
// =========================================================
window.addToTrashBin = addToTrashBin;
window.openTrashModal = openTrashModal;
window.renderTrashContent = renderTrashContent;
window.restoreFromTrash = restoreFromTrash;
window.permanentDeleteFromTrash = permanentDeleteFromTrash;
window.clearAllTrash = clearAllTrash;
