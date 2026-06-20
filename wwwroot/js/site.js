var db = null;

const dbName = "address_book";
const storeName = "contacts";
const version = 4;

const contactsform = document.getElementById("contactsform");
const listTb = document.getElementById("listTb");
const msg = document.getElementById("msg");
const showJob = document.getElementById("showJob");
const newbtn = document.getElementById("newbtn");
const addbtn = document.getElementById("addbtn");
const putbtn = document.getElementById("putbtn");
const searchDatabtn = document.getElementById("searchDatabtn");
const findbtn = document.getElementById("findbtn");
const findDate = document.getElementById("findDate");
const clearDatabtn = document.getElementById("clearDatabtn");
const dropDBbtn = document.getElementById("dropDBbtn");

let messageTimer = null;

newbtn.addEventListener("click", newData);
searchDatabtn.addEventListener("click", searchDataStart);
addbtn.addEventListener("click", createAndUpdate);
putbtn.addEventListener("click", createAndUpdate);
findbtn.addEventListener("click", readData);

contactsform.addEventListener("submit", function (e) {
    e.preventDefault();
});

document.getElementById("listTb").addEventListener("click", (e) => {
    let target = e.target.closest("button");

    if (target === null) {
        return;
    }

    e.preventDefault();
    e.stopPropagation();

    //當目標物件是按鈕時才做處理
    if (target.tagName.toLowerCase() === "button") {
        let tr = target.closest("tr");
        let keyNo = parseInt(tr.dataset.key);

        //當按下的是修改鈕
        if (target.classList.contains("mdybtn")) {
            getOneData(keyNo);
        }

        //當按下的是刪除鈕
        if (target.classList.contains("delbtn")) {
            if (confirm("確定要刪除此筆資料？")) {
                deleteData(keyNo);
            }
        }
    }
});

clearDatabtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirm("確定要清空全部資料？")) {
        clearData();
    }
};

document.getElementById("dropDBbtn").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirm("確定要刪除資料庫？\n(刪除之後將重新載入頁面)")) {
        dropDB();
    }
});

//init() 開啟資料庫
(function init() {
    let req = indexedDB.open(dbName, version);

    req.onsuccess = (e) => {
        db = e.target.result;
        contactsList("", "");
    };

    req.onerror = (e) => {
        showMessage("openDB error");
    };

    req.onupgradeneeded = (e) => {
        let thisDB = e.target.result;

        let objectStore = null;
        let needSeedData = false;

        if (!thisDB.objectStoreNames.contains(storeName)) {
            objectStore = thisDB.createObjectStore(storeName, {
                keyPath: "id",
                autoIncrement: true
            });

            needSeedData = true;
        } else {
            objectStore = e.target.transaction.objectStore(storeName);
        }

        createIndexIfMissing(objectStore, "name", "name", { unique: false });
        createIndexIfMissing(objectStore, "tel", "tel", { unique: true });
        createIndexIfMissing(objectStore, "address", "address", { unique: false });
        createIndexIfMissing(objectStore, "email", "email", { unique: false });
        createIndexIfMissing(objectStore, "memo", "memo", { unique: false });
        createIndexIfMissing(objectStore, "timestamp", "timestamp", { unique: false });

        if (needSeedData) {
            //要新增的資料array
            const contactsData = [
                {
                    name: "陳小凌",
                    tel: "0923123123",
                    address: "高雄市",
                    email: "eileen@msa.hinet.net",
                    memo: "朋友",
                    timestamp: new Date()
                },
                {
                    name: "丁小雨",
                    tel: "0922456456",
                    address: "台北市",
                    email: "brain@msa.hinet.net",
                    memo: "老師",
                    timestamp: new Date()
                },
                {
                    name: "劉小華",
                    tel: "0921567567",
                    address: "台中市",
                    email: "mark@hinet.net",
                    memo: "朋友",
                    timestamp: new Date()
                }
            ];

            //新增資料到objectStore
            contactsData.forEach(function (user) {
                objectStore.add(user);
            });
        }

        putbtn.style.display = "none";
        findbtn.style.display = "none";
        findDate.style.display = "none";
    };
})();

function createIndexIfMissing(objectStore, indexName, keyPath, options) {
    if (!objectStore.indexNames.contains(indexName)) {
        objectStore.createIndex(indexName, keyPath, options);
    }
}

function DB_tx(storeName, mode) {
    let tx = db.transaction(storeName, mode);

    tx.onerror = (e) => {
        console.error("tx", e);
    };

    return tx;
}

function newData() {
    putbtn.style.display = "none";
    addbtn.style.display = "inline";
    findbtn.style.display = "none";
    findDate.style.display = "none";
    showJob.innerHTML = "新增資料";
    contactsform.reset();
}

function searchDataStart() {
    putbtn.style.display = "none";
    addbtn.style.display = "none";
    findbtn.style.display = "inline";
    findDate.style.display = "flex";
    showJob.innerHTML = "搜尋資料";
    contactsform.reset();
}

function createAndUpdate(e) {
    e.preventDefault();
    e.stopPropagation();

    if (db === null) {
        showMessage("資料庫尚未開啟");
        return;
    }

    //取得文字方塊輸入內容
    let name = document.getElementById("name").value.trim();
    let tel = document.getElementById("tel").value.trim();
    let address = document.getElementById("address").value.trim();
    let email = document.getElementById("email").value.trim();
    let memo = document.getElementById("memo").value.trim();

    //輸出IDkey的值，判斷是新增或修改
    let IDkey = document.getElementById("IDkey").value.trim();

    if (name === "" || tel === "") {
        showMessage("姓名與電話不可空白");
        return;
    }

    let tx = DB_tx(storeName, "readwrite");

    tx.oncomplete = (e) => {
        contactsList("", "");
        resetToNewMode();
    };

    let store = tx.objectStore(storeName);
    let r = null;
    let value = null;

    if (IDkey === "") {
        //新增資料
        value = {
            name,
            tel,
            address,
            email,
            memo,
            timestamp: new Date()
        };

        r = store.add(value);

        r.onsuccess = (e) => {
            showMessage("資料新增成功!!");
        };

        r.onerror = (e) => {
            showMessage("資料新增失敗!<br>" + e.target.error.message);
        };
    } else {
        //修改資料
        value = {
            id: Number(IDkey),
            name,
            tel,
            address,
            email,
            memo,
            timestamp: new Date()
        };

        r = store.put(value);

        r.onsuccess = (e) => {
            showMessage("資料修改成功!!");
        };

        r.onerror = (e) => {
            showMessage("資料修改失敗!<br>" + e.target.error.message);
        };
    }
}

function contactsList(find, findvalue) {
    let ulist = document.getElementById("listTb");

    if (db === null) {
        ulist.innerHTML = "<caption>資料庫尚未開啟</caption>";
        return;
    }

    ulist.innerHTML = "<caption>載入中...</caption>";

    let tx = DB_tx(storeName, "readonly");
    let store = tx.objectStore(storeName);
    let allRecords = null;

    //判斷是搜尋或是完整資料列表
    if (find !== "") {
        if (find === "timestamp") {
            //當使用建立時間搜尋時
            let d = findvalue.split("|");
            let start = new Date(d[0] + "T00:00:00");
            let end = new Date(d[1] + "T23:59:59");
            findvalue = IDBKeyRange.bound(start, end);
        }

        let index = store.index(find);      //依索引欄位搜尋
        allRecords = index.getAll(findvalue);  //取出搜尋到的全部資料
    } else {
        allRecords = store.getAll();        //取出全部資料
    }

    allRecords.onsuccess = (e) => {
        renderContactsList(e.target.result);
    };

    allRecords.onerror = (e) => {
        console.error("allRecords", e);
    };
}

function readData() {
    if (db === null) {
        showMessage("資料庫尚未開啟");
        return;
    }

    let name = document.getElementById("name").value.trim();
    let tel = document.getElementById("tel").value.trim();
    let address = document.getElementById("address").value.trim();
    let email = document.getElementById("email").value.trim();
    let memo = document.getElementById("memo").value.trim();
    let startDate = document.getElementById("startDate").value;
    let endDate = document.getElementById("endDate").value;
    let conditions = {
        name,
        tel,
        address,
        email,
        memo,
        startDate,
        endDate
    };
    let textFields = ["name", "tel", "address", "email", "memo"];
    let filledTextFields = textFields.filter((field) => conditions[field] !== "");
    let hasDateRange = startDate !== "" && endDate !== "";

    if (filledTextFields.length === 1 && !hasDateRange) {
        let field = filledTextFields[0];
        contactsList(field, conditions[field]);
    } else if (filledTextFields.length === 0 && hasDateRange) {
        contactsList("timestamp", startDate + "|" + endDate);
    } else if (filledTextFields.length > 0 || hasDateRange) {
        contactsFilter(conditions);
    } else {
        contactsList("", "");
    }
}

function contactsFilter(conditions) {
    let ulist = document.getElementById("listTb");

    if (db === null) {
        ulist.innerHTML = "<caption>資料庫尚未開啟</caption>";
        return;
    }

    ulist.innerHTML = "<caption>搜尋中...</caption>";

    let tx = DB_tx(storeName, "readonly");
    let store = tx.objectStore(storeName);
    let request = store.getAll();

    request.onsuccess = (e) => {
        let startTime = conditions.startDate === "" ? null : new Date(conditions.startDate + "T00:00:00").getTime();
        let endTime = conditions.endDate === "" ? null : new Date(conditions.endDate + "T23:59:59").getTime();
        let records = e.target.result.filter((obj) => {
            let time = new Date(obj.timestamp).getTime();
            let ok = true;

            ok = ok && (conditions.name === "" || obj.name.includes(conditions.name));
            ok = ok && (conditions.tel === "" || obj.tel.includes(conditions.tel));
            ok = ok && (conditions.address === "" || obj.address.includes(conditions.address));
            ok = ok && (conditions.email === "" || obj.email.includes(conditions.email));
            ok = ok && (conditions.memo === "" || obj.memo.includes(conditions.memo));
            ok = ok && (startTime === null || time >= startTime);
            ok = ok && (endTime === null || time <= endTime);

            return ok;
        });

        renderContactsList(records);
        showMessage("搜尋完成，共 " + records.length + " 筆資料");
    };
}

function renderContactsList(records) {
    let ulist = document.getElementById("listTb");

    //使用map和join方法合併字串
    let contents = records.map((obj) => {
        return "<tr data-key=\"" + obj.id + "\"><td>" + escapeHtml(obj.name) + "</td><td>"
            + escapeHtml(obj.tel) + "</td><td>" + escapeHtml(obj.address) + "</td><td>"
            + escapeHtml(obj.email) + "</td><td>" + escapeHtml(obj.memo) + "</td><td>"
            + formatDateTime(obj.timestamp)
            + "</td><td><button type=\"button\" class=\"mdybtn smallBtn sprite sprite-edit\" title=\"修改\"></button>"
            + "<button type=\"button\" class=\"delbtn smallBtn sprite sprite-del\" title=\"刪除\"></button></td></tr>";
    }).join("");

    if (contents === "") {
        ulist.innerHTML = "<caption>查無資料!</caption>";
    } else {
        ulist.innerHTML = "<thead><tr><th>姓名</th><th>電話</th><th>地址</th><th>E-Mail</th><th>備註</th><th>建立日期</th><th>&nbsp;</th></tr></thead><tbody>"
            + contents + "</tbody>";
    }
}

function getOneData(keyNo) {
    if (db === null) {
        showMessage("資料庫尚未開啟");
        return;
    }

    let tx = DB_tx(storeName, "readonly");
    let store = tx.objectStore(storeName);
    let request = store.get(keyNo);

    request.onsuccess = (e) => {
        let data = e.target.result;

        if (!data) {
            showMessage("找不到資料");
            return;
        }

        document.getElementById("IDkey").value = data.id;
        document.getElementById("name").value = data.name;
        document.getElementById("tel").value = data.tel;
        document.getElementById("address").value = data.address;
        document.getElementById("email").value = data.email;
        document.getElementById("memo").value = data.memo;

        putbtn.style.display = "inline";
        addbtn.style.display = "none";
        findbtn.style.display = "none";
        findDate.style.display = "none";
        showJob.innerHTML = "修改資料";
    };

    request.onerror = (e) => {
        showMessage("讀取資料失敗!<br>" + e.target.error.message);
    };
}

function deleteData(keyNo) {
    if (db === null) {
        showMessage("資料庫尚未開啟");
        return;
    }

    let tx = DB_tx(storeName, "readwrite");
    let store = tx.objectStore(storeName);
    let r = store.delete(keyNo);

    tx.oncomplete = (e) => {
        contactsList("", "");
    };

    r.onsuccess = (e) => {
        showMessage("資料刪除成功!!");
    };

    r.onerror = (e) => {
        showMessage("資料刪除失敗!<br>" + e.target.error.message);
    };
}

function clearData() {
    if (db === null) {
        showMessage("資料庫尚未開啟");
        return;
    }

    let tx = DB_tx(storeName, "readwrite");  //呼叫DB_tx函式開啟交易
    let store = tx.objectStore(storeName);   //指定存儲物件
    store.clear();                           //清空資料

    tx.oncomplete = (e) => {
        contactsList("", "");               //呼叫contactsList函式顯示列表資料
        resetToNewMode();
        showMessage("資料已清空!!");         //呼叫showMessage函式顯示執行結果
    };
}

function dropDB() {
    if (db !== null) {
        db.close();
        db = null;
    }

    let req = indexedDB.deleteDatabase(dbName);

    req.onsuccess = (e) => {
        showMessage("資料庫已刪除!!");
        setTimeout(() => {
            location.reload();              //重新載入網頁
        }, 500);
    };

    req.onerror = (e) => {
        showMessage("資料庫刪除失敗!<br>" + e.target.error.message);
    };
}

function showMessage(m) {
    document.getElementById("msg").innerHTML = m;

    if (messageTimer !== null) {
        clearTimeout(messageTimer);
    }

    messageTimer = setTimeout(() => {
        document.getElementById("msg").innerHTML = "";
    }, 2000);
}

function resetToNewMode() {
    putbtn.style.display = "none";
    addbtn.style.display = "inline";
    findbtn.style.display = "none";
    findDate.style.display = "none";
    showJob.innerHTML = "新增資料";
    contactsform.reset();
}

function formatDateTime(dateValue) {
    let date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei"
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
