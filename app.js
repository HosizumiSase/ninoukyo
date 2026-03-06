// プロの小技：文章内にカンマ（、や , ）が含まれていてデータがズレるのを防ぐため、
// format=csv ではなく format=tsv（タブ区切り）で取得します！
const membersUrl = "https://docs.google.com/spreadsheets/d/1JFVoWc_eaSYJUFbgM_dgLLlPxXrU08dVQAjxuYmre7Q/export?format=tsv&gid=0";
const relationsUrl = "https://docs.google.com/spreadsheets/d/1JFVoWc_eaSYJUFbgM_dgLLlPxXrU08dVQAjxuYmre7Q/export?format=tsv&gid=746317027";

<script>
    const STORAGE_POS_KEY = 'shinobizakura_positions_v9';
    let activeGroups = [];
    let groupColorMap = { }; // グループと色の対応表

    // 選択状態管理用
    let selectedId = null;
    let dragStartCoords = {x: 0, y: 0 };

    const SIZES = {
        normal: {w: 240, h: 110 },
    compact: {w: 56, h: 56 }
  };

    // カラーパレット
    const COLOR_PALETTE = [
    {bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-900', badge: 'bg-red-200 text-red-800' },
    {bg: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-900', badge: 'bg-indigo-200 text-indigo-800' },
    {bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-900', badge: 'bg-emerald-200 text-emerald-800' },
    {bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-900', badge: 'bg-amber-200 text-amber-800' },
    {bg: 'bg-sky-50', border: 'border-sky-400', text: 'text-sky-900', badge: 'bg-sky-200 text-sky-800' },
    {bg: 'bg-fuchsia-50', border: 'border-fuchsia-400', text: 'text-fuchsia-900', badge: 'bg-fuchsia-200 text-fuchsia-800' },
    {bg: 'bg-slate-100', border: 'border-slate-400', text: 'text-slate-900', badge: 'bg-slate-200 text-slate-800' },
    {bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-900', badge: 'bg-orange-200 text-orange-800' },
    {bg: 'bg-lime-50', border: 'border-lime-400', text: 'text-lime-900', badge: 'bg-lime-200 text-lime-800' },
    {bg: 'bg-violet-50', border: 'border-violet-400', text: 'text-violet-900', badge: 'bg-violet-200 text-violet-800' },
    {bg: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-900', badge: 'bg-rose-200 text-rose-800' },
    {bg: 'bg-cyan-50', border: 'border-cyan-400', text: 'text-cyan-900', badge: 'bg-cyan-200 text-cyan-800' },
    {bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-900', badge: 'bg-yellow-200 text-yellow-800' },
    {bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-900', badge: 'bg-purple-200 text-purple-800' },
    {bg: 'bg-teal-50', border: 'border-teal-400', text: 'text-teal-900', badge: 'bg-teal-200 text-teal-800' },
    {bg: 'bg-pink-50', border: 'border-pink-400', text: 'text-pink-900', badge: 'bg-pink-200 text-pink-800' },
    {bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-900', badge: 'bg-blue-200 text-blue-800' },
    {bg: 'bg-stone-50', border: 'border-stone-400', text: 'text-stone-900', badge: 'bg-stone-200 text-stone-800' },
    ];

    let members = [];
    let relations = [];
    let positionCache = { };
    let visibleGroups = new Set();
    let expandedCardIds = new Set();
    let isCompactMode = false;

    let isDragging = false;
    let hasMoved = false;
    let draggingId = null;
    let dragOffset = {x: 0, y: 0 };
    let isPanning = false;
    let panStart = {x: 0, y: 0 };
    let panOffset = {x: 0, y: 0 };
    let scale = 1;
    let zoomTimeout = null;
    let initialPinchDistance = null;
    let initialScale = 1;
    let isRelationMode = false;
    let relationDragStartId = null;

  window.onload = () => {
        lucide.createIcons();
    initFilterMenu();
    loadLocalData();
    loadData();
    setupEvents();
  };

    // --- UI制御系 ---
    function toggleHeaderMenu() {
    const menu = document.getElementById('mobile-menu');
    const icon = document.getElementById('header-menu-icon');

    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
    menu.classList.add('flex');
    icon.setAttribute('data-lucide', 'x'); 
    } else {
        menu.classList.add('hidden');
    menu.classList.remove('flex');
    icon.setAttribute('data-lucide', 'menu');
    }
    lucide.createIcons();
  }

    function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isActive = !sidebar.classList.contains('-translate-x-full');

    if (isActive) {
        sidebar.classList.add('-translate-x-full');
    } else {
        sidebar.classList.remove('-translate-x-full');
    // サイドバーを開くときにリストを再描画（フィルタ状態などの反映のため）
    renderMemberList();
    }
  }

    function renderMemberList() {
    const listContainer = document.getElementById('member-list');
    const filterText = document.getElementById('search-input').value.toLowerCase();

    // 現在表示対象（フィルタON）かつ、検索テキストにマッチするメンバー
    const filteredMembers = members.filter(m => {
        const isVisibleGroup = visibleGroups.has(m.Group);
    const matchesSearch = !filterText ||
    m.Name.toLowerCase().includes(filterText) ||
    (m.DiscordName && m.DiscordName.toLowerCase().includes(filterText)) ||
    (m.Group && m.Group.toLowerCase().includes(filterText));
    return isVisibleGroup && matchesSearch;
    });

    if (filteredMembers.length === 0) {
        listContainer.innerHTML = '<div class="text-slate-400 text-xs text-center p-4">該当するメンバーがいません</div>';
    return;
    }

    listContainer.innerHTML = filteredMembers.map(m => {
        const style = getGroupStyle(m.Group);
    const isSelected = String(m.ID) === String(selectedId);
    const activeClass = isSelected ? 'bg-pink-50 border-pink-200 ring-1 ring-pink-300' : 'bg-white border-slate-200 hover:bg-slate-50';

    return `
    <div onclick="focusOnMember('${m.ID}')" class="p-3 border rounded cursor-pointer transition-all ${activeClass}">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs shadow-sm ${style.bg} ${style.text}">
                ${m.Name.charAt(0)}
            </div>
            <div class="min-w-0 flex-1">
                <div class="font-bold text-sm text-slate-700 truncate">${m.Name}</div>
                <div class="text-[10px] text-slate-400 flex gap-2">
                    <span>${m.Group}</span>
                    <span>${m.Race || ''}</span>
                </div>
            </div>
        </div>
        <div class="mt-2 text-xs text-slate-500 whitespace-pre-wrap leading-relaxed">${m.Description || '詳細なし'}</div>
    </div>
    `;
    }).join('');
  }

    function filterMemberList() {
        renderMemberList();
  }

    function focusOnMember(id) {
        // 1. 選択状態にする
        selectedId = String(id);

    // 2. サイドバーの表示更新（選択ハイライトのため）
    renderMemberList();

    // 3. キャンバスのレンダリング更新
    render();

      // 4. そのメンバーの座標へパン（移動）する
      const targetMember = members.find(m => String(m.ID) === String(id));
    if (targetMember) {
          // コンテナの中心
          const container = document.getElementById('canvas-container');
    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;

    // ノードの中心（現在のscale考慮なしのワールド座標）
    const dim = getNodeDimensions();
    const nodeCx = targetMember.x + dim.w / 2;
    const nodeCy = targetMember.y + dim.h / 2;

    // 目標のpanOffsetを計算: center = panOffset + nodePos * scale
    // よって panOffset = center - nodePos * scale
    // ズーム倍率は変えずに移動だけする
    panOffset.x = cx - nodeCx * scale;
    panOffset.y = cy - nodeCy * scale;

    updateTransform();
      }

      // 5. スマホなどの場合、サイドバーを閉じたほうが見やすいかも？（お好みで）
      // toggleSidebar(); 
  }

    function toggleLegend() {
    const content = document.getElementById('legend-content');
    content.classList.toggle('hidden');
  }

    function closeAllMenus(e) {
    if (!e.target.closest('#filter-btn-pc') && !e.target.closest('#filter-menu-pc')) {
        document.getElementById('filter-menu-pc').classList.add('hidden');
    }
    if (!e.target.closest('#legend-btn') && !e.target.closest('#legend-content')) {
        document.getElementById('legend-content').classList.add('hidden');
    }
    // サイドバー外をクリックしたら閉じる処理を入れるならここ
    // if (!e.target.closest('#sidebar') && !e.target.closest('button[onclick="toggleSidebar()"]')) {
        //    document.getElementById('sidebar').classList.add('-translate-x-full');
        // }
    }

    function getNodeDimensions() {
    return isCompactMode ? SIZES.compact : SIZES.normal;
  }

    function toggleCompactMode() {
        isCompactMode = !isCompactMode;
    const btnText = document.getElementById('text-view-mode-pc');
    const btnIcon = document.getElementById('icon-view-mode-pc');
    if (isCompactMode) {
      if(btnText) btnText.innerText = '詳細';
    if(btnIcon) btnIcon.setAttribute('data-lucide', 'maximize-2');
    } else {
      if(btnText) btnText.innerText = '縮小';
    if(btnIcon) btnIcon.setAttribute('data-lucide', 'minimize-2');
    }
    lucide.createIcons();
    render(); 
  }

    async function loadData() {
        document.getElementById('loading').classList.remove('hidden');

    try {
        // Fetchで2つのシートを同時に爆速読み込み
        const [memRes, relRes] = await Promise.all([
    fetch(membersUrl),
    fetch(relationsUrl)
    ]);

    const memText = await memRes.text();
    const relText = await relRes.text();

        // GASの parseData() の代わりになる、TSVテキストをJSON配列にする関数
        const parseTSV = (text) => {
            const rows = text.split(/\r?\n/).filter(r => r.trim()); // 改行で分割して空行を削除
    if(rows.length < 2) return [];
            const headers = rows[0].split('\t').map(h => h.trim());
            return rows.slice(1).map(row => {
                const cols = row.split('\t');
    let obj = { };
                headers.forEach((h, i) => obj[h] = cols[i]);
    return obj;
            });
        };

    const fetchedMembers = parseTSV(memText);
    const fetchedRelations = parseTSV(relText);

    // データを流し込む
    onDataLoaded({members: fetchedMembers, relations: fetchedRelations });

    } catch (error) {
        console.error("データの読み込みに失敗しました:", error);
    useFallbackData(error);
    }
}

    function useFallbackData(e) {
    if(e) console.log('Using fallback data due to error:', e);
    const fallbackMembers = [
    {ID: 1, Name: "朧(おぼろ)", DiscordName: "あふろ(おぼろ)", Group: "Fox", Race: "黒孤", Personality: "穏やか", Description: "白桜に魅せられ家臣になり、忍桜郷の忍びとして警護の任につく。" },
    {ID: 15, Name: "白桜（びゃくおう）", DiscordName: "", Group: "Spirit", Race: "妖", Personality: "寛容・穏やか", Description: "遥か昔より忍桜郷を治める妖。" },
    {ID: 16, Name: "星麗（せいら）", DiscordName: "星澄せいす（セイラ）", Group: "Ninja", Race: "忍", Personality: "底抜けに明るい元気くのいち", Description: "忍桜郷に迷い込んで憧れの忍者たちの実在に帰ることも忘れて居着いてしまった現代忍者っ子。" },
    {ID: 17, Name: "鬮目(くじめ)", DiscordName: "ぽっぽﾁｬﾝ（くじめ）", Group: "Spirit", Race: "人食い妖怪", Personality: "喋り好きのサボり魔", Description: "死に場所を探して彷徨っていたときに忍桜郷に迷い込んだ。" },
    {ID: 18, Name: "秋華(しゅうか)", DiscordName: "ぽんみず(しゅうか)", Group: "Fox", Race: "妖狐", Personality: "優しくて、お話が大好き(会うごとに敬語が崩れていく)妹みたいな感じ", Description: "まだ幼く、記憶がおぼろげな頃から忍桜郷にいる。\n基本自由な性格でお庭で遊んだりしているが、みんなに過保護で見守られているため、木に登ろうとしたり危険なことをするとすぐ怒られちゃうのが最近の悩み事。\n自分はもう一人前だと思っている。" }
    ];
    const fallbackRelations = [{ID: 'r1', From: 1, To: 15, Label: '主従', Type: 'arrow' }];
    onDataLoaded({members: fallbackMembers, relations: fallbackRelations });
  }

    function onDataLoaded(data) {
        members = data.members;
    relations = data.relations || [];
    
    activeGroups = [...new Set(members.map(m => m.Group))].sort();
    updateColorMap();

    if (visibleGroups.size === 0) {
        visibleGroups = new Set(activeGroups);
    } else {
        const newSet = new Set();
        visibleGroups.forEach(g => {
            if (activeGroups.includes(g)) newSet.add(g);
        });
        activeGroups.forEach(g => {
        newSet.add(g); 
        });
    visibleGroups = newSet;
    }

    initFilterMenu();

    const COLUMNS = 5;
    const X_START = 50; const Y_START = 150;
    const X_GAP = 280; const Y_GAP = 160; 

    members.forEach((m, index) => {
      const strId = String(m.ID);
    if (positionCache[strId]) {
        m.x = positionCache[strId].x;
    m.y = positionCache[strId].y;
      } else {
        if (m.ID == 15) {m.x = 425; m.y = 40; }
    else {
           const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    m.x = X_START + col * X_GAP;
    m.y = Y_START + row * Y_GAP;
        }
      }
    });
    render();
    updateTransform();
    document.getElementById('loading').classList.add('hidden');
  }

    function updateColorMap() {
        activeGroups.sort();
    groupColorMap = { };
    activeGroups.forEach((group, index) => {
        groupColorMap[group] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });
  }

    function loadLocalData() {
    const posJson = localStorage.getItem(STORAGE_POS_KEY);
    if (posJson) { try {positionCache = JSON.parse(posJson); } catch (e) {console.error(e); } }
  }

    function savePositions() {
    const cache = { };
    members.forEach(m => {cache[String(m.ID)] = { x: m.x, y: m.y }; });
    localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(cache));
  }

    function resetData() {
        Swal.fire({
            title: '配置初期化',
            text: "保存された位置情報を削除しますか？",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: '初期化',
            cancelButtonText: 'キャンセル'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem(STORAGE_POS_KEY);
                positionCache = {};
                resetZoom();
                loadData();
            }
        });
  }

    // --- フィルタ・UI制御 ---
    function initFilterMenu() {
    const renderFilterItems = (containerId, checkboxIdPrefix) => {
        const list = document.getElementById(containerId);
    if(!list) return;
        list.innerHTML = activeGroups.map(group => {
            const style = getGroupStyle(group);
    return `
    <label class="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
        <input type="checkbox" value="${group}" ${visibleGroups.has(group) ? 'checked' : ''} onchange="toggleFilter('${group}')" class="rounded text-pink-500 focus:ring-pink-500 filter-checkbox">
            <span class="w-3 h-3 rounded-full border ${style.bg} ${style.border}"></span>
            <span>${group}</span>
    </label>`;
        }).join('');
    };

    renderFilterItems('filter-list-pc', 'pc');
    renderFilterItems('filter-list-mobile', 'mobile');

    updateFilterUI();
  }

    function toggleFilter(group) {
    if (visibleGroups.has(group)) visibleGroups.delete(group);
    else visibleGroups.add(group);
    updateFilterUI();
    render();
    renderMemberList(); 
  }

    function toggleAllFilters(checkbox) {
    const checkboxes = document.querySelectorAll('.filter-checkbox');
    if (checkbox.checked) {
        visibleGroups = new Set(activeGroups);
        checkboxes.forEach(cb => cb.checked = true);
    } else {
        visibleGroups.clear();
        checkboxes.forEach(cb => cb.checked = false);
    }
    render();
    renderMemberList();
  }

    function updateFilterUI() {
    const updateCheckbox = (id) => {
        const el = document.getElementById(id);
    if(!el) return;
        if (visibleGroups.size === activeGroups.length && activeGroups.length > 0) {
        el.checked = true; el.indeterminate = false;
        } else if (visibleGroups.size === 0) {
        el.checked = false; el.indeterminate = false;
        } else {
        el.checked = false; el.indeterminate = true;
        }
    };
    updateCheckbox('filter-all-pc');
  }

    function toggleFilterMenu(e) {
        e.stopPropagation();
    document.getElementById('filter-menu-pc').classList.toggle('hidden');
  }

    function showConfigModal() {
        Swal.fire({
            title: 'データ管理',
            text: '配置情報の書き出し/読み込み',
            icon: 'info',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: '書き出し',
            denyButtonText: '読み込み',
            cancelButtonText: '閉じる'
        }).then((result) => {
            if (result.isConfirmed) exportPositions();
            else if (result.isDenied) importPositions();
        });
  }

    function exportPositions() {
    const jsonStr = JSON.stringify(positionCache, null, 2);
    Swal.fire({
        title: '配置データ',
    html: `<textarea id="export-area" class="w-full h-32 p-2 text-xs font-mono border rounded bg-slate-50" readonly>${jsonStr}</textarea>`,
    confirmButtonText: 'コピー',
    showCancelButton: true,
    cancelButtonText: '閉じる'
    }).then((res) => {
      if(res.isConfirmed) {
        const copyText = document.getElementById("export-area");
    copyText.select();
        navigator.clipboard.writeText(copyText.value).then(() => showToast('コピーしました', 'success'));
      }
    });
  }

    async function importPositions() {
    const {value: jsonStr } = await Swal.fire({
        title: '配置データ',
    input: 'textarea',
    inputPlaceholder: 'JSONデータを貼り付け...',
    showCancelButton: true,
    confirmButtonText: '適用'
    });
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
    if (typeof parsed !== 'object') throw new Error();
    positionCache = parsed;
    localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(positionCache));
    loadData();
    showToast('適用しました', 'success');
      } catch (e) {
        Swal.fire('エラー', '形式が正しくありません', 'error');
      }
    }
  }

    function arrangeByGroup() {
    if (selectedId) {
        const centerNode = members.find(m => String(m.ID) === String(selectedId));
    if (centerNode) {
        Swal.fire({
            title: '中心に整列',
            text: `「${centerNode.Name}」を中心に放射状に配置しますか？`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '配置',
            cancelButtonText: 'キャンセル'
        }).then((result) => {
            if (result.isConfirmed) {
                const CX = 600;
                const CY = 400;

                centerNode.x = CX;
                centerNode.y = CY;

                const otherMembers = members.filter(m => String(m.ID) !== String(selectedId));
                const count = otherMembers.length;

                if (count > 0) {
                    const radius = 350 + (count * 10);
                    const angleStep = (2 * Math.PI) / count;

                    otherMembers.forEach((m, index) => {
                        const angle = index * angleStep;
                        m.x = CX + radius * Math.cos(angle);
                        m.y = CY + radius * Math.sin(angle);
                    });
                }

                savePositions();
                render();
                showToast('中心に配置しました', 'success');
            }
        });
    return;
        }
    }

    Swal.fire({
        title: '整列しますか？',
    text: "現在の配置をリセットして種族順に並べます",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: '整列'
    }).then((result) => {
      if (result.isConfirmed) {
        const sorted = [...members].sort((a, b) => {
          if (a.ID == 15) return -1; if (b.ID == 15) return 1;
    if (a.Group === b.Group) return a.ID - b.ID;
    return a.Group.localeCompare(b.Group);
        });
    const COLUMNS = 5;
    const X_START = 50; const Y_START = 150;
    const X_GAP = 280; const Y_GAP = 160;
        sorted.forEach((m, index) => {
            const original = members.find(mem => mem.ID == m.ID);
    if(original) {
                if (original.ID == 15) {original.x = 425; original.y = 40; }
    else {
                    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    original.x = X_START + col * X_GAP;
    original.y = Y_START + row * Y_GAP;
                }
            }
        });
    savePositions();
    render();
    showToast('整列しました', 'success');
      }
    });
  }

    function toggleRelationMode() {
        isRelationMode = !isRelationMode;
    relationDragStartId = null;
    selectedId = null;
    const btn = document.getElementById('btn-relation-mode-pc');
    const canvas = document.getElementById('canvas-container');
    const indicator = document.getElementById('mode-indicator');

    if (isRelationMode) {
        btn.classList.remove('bg-pink-50', 'text-pink-700', 'border-pink-200');
    btn.classList.add('bg-pink-600', 'text-white', 'border-pink-700', 'shadow-md');
    canvas.classList.add('relation-mode');
    indicator.classList.remove('hidden');
    } else {
        btn.classList.add('bg-pink-50', 'text-pink-700', 'border-pink-200');
    btn.classList.remove('bg-pink-600', 'text-white', 'border-pink-700', 'shadow-md');
    canvas.classList.remove('relation-mode');
    indicator.classList.add('hidden');
    document.getElementById('drag-line').classList.add('hidden');
    }
    render(); 
  }

    function startRelationDragFromButton(e, id) {
    if(e.cancelable) e.preventDefault();
    e.stopPropagation();
    relationDragStartId = String(id);
    const indicator = document.getElementById('mode-indicator');
    indicator.innerText = "ドラッグして相手のカードで離してください";
    indicator.classList.remove('hidden');
    renderEdges();
  }

    function toggleAccordion(e, id) {
        e.stopPropagation();
    const strId = String(id);
    if (expandedCardIds.has(strId)) expandedCardIds.delete(strId);
    else expandedCardIds.add(strId);
    render();
  }

    // --- 座標計算 ---
    function getCenter(node, actualW, actualH) {
    const w = actualW || getNodeDimensions().w;
    const h = actualH || getNodeDimensions().h;
    return {x: node.x + w / 2, y: node.y + h / 2 };
  }

    function getRectIntersection(node, targetPoint, actualW, actualH) {
    // 実際のサイズが渡されていればそれを使い、なければデフォルト値を使う
    const dim = getNodeDimensions();
    const wVal = actualW || dim.w;
    const hVal = actualH || dim.h;

    const center = getCenter(node, wVal, hVal);
    const w = (wVal / 2) + 4;
    const h = (hVal / 2) + 4;

    const dx = targetPoint.x - center.x;
    const dy = targetPoint.y - center.y;

    if (dx === 0 && dy === 0) return center;

    if (isCompactMode) {
        const angle = Math.atan2(dy, dx);
    return {
        x: center.x + Math.cos(angle) * w,
    y: center.y + Math.sin(angle) * w 
        };
    }

    const slope = dy / dx;
    if (Math.abs(dx) * h > Math.abs(dy) * w) {
      if (dx > 0) return {x: center.x + w, y: center.y + w * slope };
    else return {x: center.x - w, y: center.y - w * slope };
    } else {
      if (dy > 0) return {x: center.x + (h / slope), y: center.y + h };
    else return {x: center.x - (h / slope), y: center.y - h };
    }
  }

    // --- 編集・保存処理 ---
    async function handleEditClick(e, id) {
        e.stopPropagation();
    const m = members.find(mem => String(mem.ID) === String(id));
    const groupOptions = activeGroups.map(g => `<option value="${g}">`).join('');

        const {value: formValues } = await Swal.fire({
            title: '編集',
        html:
        `<div class="flex flex-col gap-3 text-left">
            <div><label class="text-xs font-bold text-gray-500">名前</label><input id="swal-input1" class="swal2-input !m-0 !w-full !h-10 !text-sm" value="${m.Name}"></div>
            <div><label class="text-xs font-bold text-gray-500">Discord名</label><input id="swal-input2" class="swal2-input !m-0 !w-full !h-10 !text-sm" value="${m.DiscordName || ''}"></div>
            <div><label class="text-xs font-bold text-gray-500">グループ</label><input list="group-datalist" id="swal-input-group" class="swal2-input !m-0 !w-full !h-10 !text-sm" value="${m.Group}" placeholder="選択または入力"><datalist id="group-datalist">${groupOptions}</datalist></div>
            <div><label class="text-xs font-bold text-gray-500">種族 (Race)</label><input id="swal-input-race" class="swal2-input !m-0 !w-full !h-10 !text-sm" value="${m.Race || ''}"></div>
            <div><label class="text-xs font-bold text-gray-500">性格</label><input id="swal-input3" class="swal2-input !m-0 !w-full !h-10 !text-sm" value="${m.Personality || ''}"></div>
            <div><label class="text-xs font-bold text-gray-500">詳細</label><textarea id="swal-input4" class="swal2-textarea !m-0 !w-full !text-sm">${m.Description || ''}</textarea></div>
        </div>`,
        showCancelButton: true,
        confirmButtonText: '保存',
      preConfirm: () => {
        return {
            Name: document.getElementById('swal-input1').value,
        DiscordName: document.getElementById('swal-input2').value,
        Group: document.getElementById('swal-input-group').value,
        Race: document.getElementById('swal-input-race').value,
        Personality: document.getElementById('swal-input3').value,
        Description: document.getElementById('swal-input4').value
        }
      }
    });
        if (formValues) {
            Object.assign(m, formValues);
        if(!activeGroups.includes(formValues.Group) && formValues.Group){
            activeGroups.push(formValues.Group);
        visibleGroups.add(formValues.Group);
        updateColorMap();
        initFilterMenu();
      }
        render();
        saveMemberToServer({ID: m.ID, ...formValues });
    }
  }

        function saveMemberToServer(data) {
    if (typeof google !== 'undefined' && google.script) {
            google.script.run
                .withFailureHandler((err) => Swal.fire('Error', '保存失敗: ' + err, 'error'))
                .withSuccessHandler(() => showToast('更新しました', 'success'))
                .updateMember(data);
    } else showToast('更新しました(プレビュー)', 'success');
  }

        function createRelation(fromId, toId) {
    if (fromId === toId) return;
    const fromName = members.find(m => String(m.ID) === String(fromId))?.Name || '不明';
    const toName = members.find(m => String(m.ID) === String(toId))?.Name || '不明';

        Swal.fire({
            title: '関係性',
        html: `<div class="text-sm mb-2">${fromName} ▶ ${toName}</div>`,
        input: 'text',
        inputPlaceholder: '例: 仲良し',
        showCancelButton: true,
        confirmButtonText: '作成'
    }).then((result) => {
        if (result.isConfirmed) {
            const newRel = {ID: 'rel_' + Date.now(), From: fromId, To: toId, Label: result.value || '', Type: 'arrow' };
        relations.push(newRel);
        render();
        saveToServer(newRel);
        }
    });
  }

        function handleLabelClick(e, relId) {
    if (!isRelationMode) return;
        e.stopPropagation();
        editRelation(relId);
  }

        function editRelation(relId) {
    const rel = relations.find(r => r.ID == relId);
        if (!rel) return;
        Swal.fire({
            title: '関係編集',
        input: 'text',
        inputValue: rel.Label,
        showCancelButton: true,
        confirmButtonText: '更新',
        showDenyButton: true,
        denyButtonText: '削除',
        denyButtonColor: '#ef4444'
    }).then((result) => {
      if (result.isConfirmed) {
            rel.Label = result.value;
        render();
        updateRelationLabel(rel.ID, result.value);
      } else if (result.isDenied) {
            deleteRelationFromServer(relId);
      }
    });
  }

        function updateRelationLabel(id, newLabel) {
    if (typeof google !== 'undefined' && google.script) {
            google.script.run
                .withFailureHandler((err) => Swal.fire('Error', '失敗: ' + err, 'error'))
                .withSuccessHandler(() => showToast('更新しました', 'success'))
                .updateRelationLabel(id, newLabel);
    } else showToast('更新しました(プレビュー)', 'success');
  }

        function saveToServer(relation) {
    if (typeof google !== 'undefined' && google.script) {
            google.script.run
                .withFailureHandler((err) => {
                    Swal.fire('Error', '失敗: ' + err, 'error');
                    relations = relations.filter(r => r.ID !== relation.ID);
                    render();
                })
                .addRelationToSheet(relation);
        showToast('追加しました', 'success');
    } else showToast('追加しました(プレビュー)', 'success');
  }

        function deleteRelationFromServer(relId) {
    const original = [...relations];
    relations = relations.filter(r => r.ID !== relId);
        render();
        if (typeof google !== 'undefined' && google.script) {
            google.script.run
                .withSuccessHandler(() => showToast('削除しました', 'success'))
                .withFailureHandler((err) => {
                    relations = original;
                    render();
                    Swal.fire('Error', '失敗: ' + err, 'error');
                })
                .deleteRelation(relId);
    } else showToast('削除しました(プレビュー)', 'info');
  }

        function showToast(msg, icon = 'info') {
    const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
      timerProgressBar: true, didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
        Toast.fire({icon: icon, title: msg });
  }

        function updateTransform() {
    const world = document.getElementById('world');
        world.style.transform = `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`;
        document.getElementById('zoom-level').innerText = `${Math.round(scale * 100)}%`;
  }

        function resetZoom() {
            scale = 1; panOffset = {x: 0, y: 0 };
        updateTransform(); optimizeAfterZoom();
  }

        function optimizeAfterZoom() {
    const world = document.getElementById('world');
        world.style.transform = world.style.transform + ' translateZ(0)';
  }

        // --- イベントハンドラ統合（マウス・タッチ共通化） ---
        function setupEvents() {
    const container = document.getElementById('canvas-container');
        const world = document.getElementById('world');

    // ヘルパー: 座標取得を安全に
    const getClientPos = (e) => {
        if (e.touches && e.touches.length > 0) {
            return {x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return {x: e.clientX, y: e.clientY };
    };

    // ズーム（ホイール）
    container.addEventListener('wheel', e => {
            e.preventDefault();
        world.style.willChange = 'transform';
        const zoomSpeed = 0.001;
        const newScale = Math.min(Math.max(0.1, scale - e.deltaY * zoomSpeed), 3);
        const pos = getClientPos(e);
        applyZoom(pos.x, pos.y, newScale);
    }, {passive: false });

    // 開始イベント (mousedown, touchstart)
    const onStart = (e) => {
      // マルチタッチ（ピンチズーム開始）
      if (e.touches && e.touches.length === 2) {
            e.preventDefault();
        initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
        initialScale = scale;
        return;
      }

        // シングルタッチ/クリック
        const pos = getClientPos(e);
        const target = document.elementFromPoint(pos.x, pos.y);

        // UI要素やコントロールは除外
        if (target && (target.closest('button') || target.closest('select') || target.closest('.swal2-container') || target.closest('.relation-label'))) {
         return; 
      }

        const nodeCard = target.closest('.node-card');
        if (nodeCard) {
          // 重要: カードをタッチした瞬間にブラウザデフォルト動作(スクロールなど)を即殺す
          if (e.cancelable) e.preventDefault();

        const id = nodeCard.dataset.id;
        if (isRelationMode) {
            relationDragStartId = String(id);
        renderEdges(); 
          } else {
            hasMoved = false; // 移動フラグリセット
        startDrag(e, id);
          }
      } else {
          // 背景クリック時は選択解除
          if (!isRelationMode) {
             if (selectedId) {
            selectedId = null;
        render();
             }
        isPanning = true;
        panStart.x = pos.x - panOffset.x;
        panStart.y = pos.y - panOffset.y;
        container.classList.add('grabbing');
          }
      }
    };

    // 移動イベント (mousemove, touchmove)
    const onMove = (e) => {
      // ピンチズーム中
      if (e.touches && e.touches.length === 2) {
            e.preventDefault();
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        if (initialPinchDistance > 0) {
          const newScale = Math.min(Math.max(0.1, initialScale * (currentDistance / initialPinchDistance)), 3);
        const center = getMidpoint(e.touches[0], e.touches[1]);
        applyZoom(center.x, center.y, newScale);
        }
        return;
      }

        const pos = getClientPos(e);
        const worldX = (pos.x - panOffset.x) / scale;
        const worldY = (pos.y - panOffset.y) / scale;

        if (isDragging && draggingId) {
        if(e.cancelable) e.preventDefault();

        // 微小な動きは無視する（タップ判定用）
        const dx = Math.abs(pos.x - dragStartCoords.x);
        const dy = Math.abs(pos.y - dragStartCoords.y);
        if (dx > 3 || dy > 3) {
            hasMoved = true;
        }

        if (hasMoved) {
            const m = members.find(mem => String(mem.ID) === String(draggingId));
        if (m) {
            m.x = worldX - dragOffset.x;
        m.y = worldY - dragOffset.y;
        updateNodePositions();
        renderEdges(); 
            }
        }
      }
        else if (relationDragStartId) {
        if(e.cancelable) e.preventDefault();
        const dragLine = document.getElementById('drag-line');
        const fromNode = members.find(m => String(m.ID) === String(relationDragStartId));

        const fromElem = document.querySelector(`.node-card[data-id="${fromNode.ID}"]`);
        const actualW = fromElem ? fromElem.offsetWidth : null;
        const actualH = fromElem ? fromElem.offsetHeight : null;

        const startPoint = getRectIntersection(fromNode, {x: worldX, y: worldY}, actualW, actualH);
        dragLine.setAttribute('x1', startPoint.x);
        dragLine.setAttribute('y1', startPoint.y);
        dragLine.setAttribute('x2', worldX);
        dragLine.setAttribute('y2', worldY);
        dragLine.classList.remove('hidden');
      }
        else if (isPanning) {
        if(e.cancelable) e.preventDefault();
        panOffset.x = pos.x - panStart.x;
        panOffset.y = pos.y - panStart.y;
        updateTransform();
      }
    };

    // 終了イベント (mouseup, touchend)
    const onEnd = (e) => {
            initialPinchDistance = null; // ピンチリセット
        let needRender = false;

        if (isDragging) {
        if(draggingId) {
          const card = document.querySelector(`.node-card[data-id="${draggingId}"]`);
        if(card) card.classList.remove('is-dragging');
        }

        // 移動していない（タップの）場合、選択状態をトグル
        if (!hasMoved) {
            if (selectedId === draggingId) {
            selectedId = null; // 既に選択されていれば解除
            } else {
            selectedId = draggingId; // 選択
            }
        }

        isDragging = false;
        draggingId = null;
        savePositions();
        needRender = true;
      }

        if (relationDragStartId) {
        // touchendの場合、changedTouchesから座標を取得
        const clientX = e.clientX || (e.changedTouches ? e.changedTouches[0].clientX : 0);
        const clientY = e.clientY || (e.changedTouches ? e.changedTouches[0].clientY : 0);

        const droppedElement = document.elementFromPoint(clientX, clientY);
        const nodeCard = droppedElement ? droppedElement.closest('.node-card') : null;

        if (nodeCard) {
          const toId = nodeCard.dataset.id;
        createRelation(relationDragStartId, toId);
        }

        relationDragStartId = null;
        document.getElementById('drag-line').classList.add('hidden');
        if (!isRelationMode) document.getElementById('mode-indicator').classList.add('hidden');
        needRender = true;
      }

        if (isPanning) {
            isPanning = false;
        container.classList.remove('grabbing');
      }

        if (needRender) render(); 
    };

        // リスナー登録
        container.addEventListener('mousedown', onStart);
        container.addEventListener('touchstart', onStart, {passive: false });

        window.addEventListener('mousemove', onMove, {passive: false });
        window.addEventListener('touchmove', onMove, {passive: false });

        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchend', onEnd);
  }

        function applyZoom(centerX, centerY, newScale) {
    const container = document.getElementById('canvas-container');
        const world = document.getElementById('world');
        const rect = container.getBoundingClientRect();

        const mouseX = centerX - rect.left;
        const mouseY = centerY - rect.top;

        const worldMouseX = (mouseX - panOffset.x) / scale;
        const worldMouseY = (mouseY - panOffset.y) / scale;

        panOffset.x = mouseX - worldMouseX * newScale;
        panOffset.y = mouseY - worldMouseY * newScale;
        scale = newScale;
        updateTransform();

        if (zoomTimeout) clearTimeout(zoomTimeout);
    zoomTimeout = setTimeout(() => {world.style.willChange = 'auto'; optimizeAfterZoom(); }, 300);
  }

        function getDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
  }
        function getMidpoint(t1, t2) {
    return {x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
  }

        function startDrag(e, id) {
            isDragging = true;
        draggingId = String(id);

        const card = document.querySelector(`.node-card[data-id="${id}"]`);
        if(card) card.classList.add('is-dragging');

    const m = members.find(mem => String(mem.ID) === String(id));

        // 座標取得ロジックを安全に
        let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
            clientX = e.clientX;
        clientY = e.clientY;
    }

        // 開始座標を記録（移動判定用）
        dragStartCoords = {x: clientX, y: clientY };

        const worldX = (clientX - panOffset.x) / scale;
        const worldY = (clientY - panOffset.y) / scale;

        dragOffset.x = worldX - m.x;
        dragOffset.y = worldY - m.y;

        renderEdges(); 
  }

        // レンダリング、スタイル関連
        // 重要：描画順を Nodes -> Edges に変更して、Edges描画時にDOMサイズを取得できるようにする
        function render() {
            renderNodes();
        // ノード描画直後に一度同期的にEdgeを描画
        renderEdges();
        lucide.createIcons();
    // 念のため少し待ってから再度Edgeを描画（初期ロード時のフォント読み込み待ちなど対策）
    requestAnimationFrame(() => renderEdges());
  }

        // ドラッグ中など、DOM構造を変えずに位置だけ更新する関数
        function updateNodePositions() {
    const visibleNodeIds = new Set(members.filter(m => visibleGroups.has(m.Group)).map(m => String(m.ID)));

        // 現在表示されているカードのみ更新
        const cards = document.querySelectorAll('.node-card');
    cards.forEach(card => {
        const id = card.dataset.id;
        if (visibleNodeIds.has(id)) {
            const m = members.find(mem => String(mem.ID) === id);
        if (m) {
            card.style.left = `${m.x}px`;
        card.style.top = `${m.y}px`;
            }
        }
    });
  }

        function renderEdges() {
    const staticGroup = document.getElementById('static-edges');
        const edgesLayer = document.getElementById('edges-layer');
        let html = '';
    const visibleNodeIds = members.filter(m => visibleGroups.has(m.Group)).map(m => String(m.ID));

        // ハイライト対象のID（ドラッグ中または矢印作成中のノードID）
        const activeId = draggingId || relationDragStartId || selectedId;
        const isHighlightMode = activeId !== null;

        // ハイライト中はレイヤーのZ-Indexを上げてカードの上に表示
        if (isHighlightMode) {
            edgesLayer.style.zIndex = 20; 
    } else {
            edgesLayer.style.zIndex = 0;
    }

    // 描画順序を制御：ハイライトモード時は、関連する矢印を「後（手前）」に描画する
    // そのために配列をソートする（非破壊的にコピーしてから）
    const sortedRelations = [...relations].sort((a, b) => {
        if (!isHighlightMode) return 0;
        const aIsRelated = String(a.From) === String(activeId) || String(a.To) === String(activeId);
        const bIsRelated = String(b.From) === String(activeId) || String(b.To) === String(activeId);
        if (aIsRelated && !bIsRelated) return 1;  // aが関連なら後ろへ
        if (!aIsRelated && bIsRelated) return -1; // bが関連なら後ろへ
        return 0;
    });

    sortedRelations.forEach(r => {
      if (!visibleNodeIds.includes(String(r.From)) || !visibleNodeIds.includes(String(r.To))) return;
      const from = members.find(m => String(m.ID) === String(r.From));
      const to = members.find(m => String(m.ID) === String(r.To));
        if (!from || !to) return;

        // DOMから実際のサイズを取得（なければデフォルト）
        const fromElem = document.querySelector(`.node-card[data-id="${from.ID}"]`);
        const toElem = document.querySelector(`.node-card[data-id="${to.ID}"]`);

        const fromW = fromElem ? fromElem.offsetWidth : null;
        const fromH = fromElem ? fromElem.offsetHeight : null;
        const toW = toElem ? toElem.offsetWidth : null;
        const toH = toElem ? toElem.offsetHeight : null;

        let center1 = getCenter(from, fromW, fromH);
        let center2 = getCenter(to, toW, toH);
      
      const isBiDir = relations.some(other => String(other.From) == String(r.To) && String(other.To) == String(r.From) && other.ID !== r.ID);

        if (isBiDir) {
        const dx = center2.x - center1.x;
        const dy = center2.y - center1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            const offset = 10; const nx = -dy / len; const ny = dx / len;
        center1 = {x: center1.x + nx * offset, y: center1.y + ny * offset };
        center2 = {x: center2.x + nx * offset, y: center2.y + ny * offset };
        }
      }

        const p1 = getRectIntersection(from, center2, fromW, fromH);
        const p2 = getRectIntersection(to, center1, toW, toH);

        if (isBiDir) {
         const dx = p2.x - p1.x; const dy = p2.y - p1.y; const len = Math.sqrt(dx * dx + dy * dy);
         if(len > 0) {
             const offset = 6; const nx = -dy / len; const ny = dx / len;
        p1.x += nx * offset; p1.y += ny * offset; p2.x += nx * offset; p2.y += ny * offset;
         }
      }

        // ハイライト用のスタイル決定
        const isRelated = isHighlightMode && (String(r.From) === String(activeId) || String(r.To) === String(activeId));

        // デフォルトスタイル
        let strokeColor = '#94a3b8'; // slate-400
        let strokeWidth = 2;
        let opacity = 1;
        let labelColor = '#475569';
        let labelBg = 'white';
        let labelStroke = '#e2e8f0';
        const isDash = r.Type === 'dash';
        let marker = isDash ? 'none' : 'url(#arrowhead)'; // 破線の場合は元々矢印なし？

        // arrowタイプの場合は常に矢印をつける（破線でも）
        if (r.Type !== 'dash' || isHighlightMode) { // ハイライト時は破線でも矢印つけちゃう？いや、タイプに従う
            // 元のコードでは isDash = r.Type === 'dash' で marker-end="url(#arrowhead)" だったので、破線でも矢印はついていたはず
            marker = 'url(#arrowhead)';
      }

        if (isHighlightMode) {
          if (isRelated) {
            strokeColor = '#ec4899'; // pink-600
        strokeWidth = 3;
        opacity = 1;
        labelColor = '#db2777'; // pink-700
        labelBg = '#fdf2f8'; // pink-50
        labelStroke = '#fbcfe8'; // pink-200
        marker = 'url(#arrowhead-active)';
          } else {
            opacity = 0.1; // 関係ない矢印は薄く
          }
      }

        const cursorClass = isRelationMode ? 'cursor-pointer' : '';

        html += `<g class="group" style="opacity: ${opacity}; transition: opacity 0.2s;">
            <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"
                stroke="${strokeColor}" stroke-width="${strokeWidth}"
                stroke-dasharray="${isDash ? '5,5' : 'none'}"
                marker-end="${marker}" />
            <g class="relation-label ${cursorClass}" onclick="handleLabelClick(event, '${r.ID}')" ontouchstart="handleLabelClick(event, '${r.ID}')">
                <rect x="${(p1.x+p2.x)/2 - 20}" y="${(p1.y+p2.y)/2 - 10}" width="40" height="20" rx="4"
                    fill="${labelBg}" stroke="${labelStroke}" />
                <text x="${(p1.x+p2.x)/2}" y="${(p1.y+p2.y)/2}" text-anchor="middle" dominant-baseline="middle"
                    fill="${labelColor}" font-size="10" font-weight="500">${r.Label || ''}</text>
            </g>
        </g>`;
    });
        staticGroup.innerHTML = html;
  }

        function renderNodes() {
    const container = document.getElementById('nodes-layer');
        const dim = getNodeDimensions();

    container.innerHTML = members.map((m, i) => {
      const isVisible = visibleGroups.has(m.Group);
        const visibilityClass = isVisible ? '' : 'hidden-node';
        const style = getGroupStyle(m.Group);
        const isDraggingClass = (draggingId == String(m.ID)) ? 'is-dragging' : '';

        // 選択状態かどうか判定
        const isSelected = String(m.ID) === String(selectedId);
        // 選択時にピンク色の枠線を常時表示（フェードなし）
        const selectedClass = isSelected ? '!border-pink-500 ring-4 ring-pink-200 z-50' : '';

        if (isCompactMode) {
         return `
        <div class="node-card compact absolute bg-white border-2 hover:shadow-lg ${style.border} ${isDraggingClass} ${visibilityClass} ${selectedClass} pointer-events-auto ${isRelationMode ? '' : 'cursor-grab'} ${isDraggingClass}"
            style="width: ${dim.w}px; height: ${dim.h}px; left: ${m.x}px; top: ${m.y}px;"
            data-id="${m.ID}"
            oncontextmenu="return false;">
            <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner ${style.bg} ${style.text}">
                ${m.Name.charAt(0)}
            </div>
            <div class="node-name-label">${m.Name}</div>
        </div>`;
      }

        const isExpanded = expandedCardIds.has(String(m.ID));
        const expandedClass = isExpanded ? 'is-expanded' : '';
        const chevronIcon = isExpanded ? 'chevron-up' : 'chevron-down';
        const bodyClass = isExpanded ? 'block' : 'hidden';

        let displayName = m.Name;
        let furigana = '';
        const match = m.Name.match(/^(.+?)[（\(](.+?)[）\)]$/);
        if (match) {
            displayName = match[1].trim();
        furigana = match[2].trim();    
      }

        return `
        <div class="node-card group absolute bg-white border-2 rounded-xl shadow-sm flex flex-col pointer-events-auto ${isRelationMode ? '' : 'cursor-grab'} hover:shadow-lg ${style.border} ${isDraggingClass} ${visibilityClass} ${expandedClass} ${selectedClass}"
            style="width: ${dim.w}px; min-height: ${dim.h}px; left: ${m.x}px; top: ${m.y}px;"
            data-id="${m.ID}"
            oncontextmenu="return false;">
            <div class="flex items-center gap-3 p-3 pb-2 border-b border-transparent">
                <div class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm shadow-inner ${style.bg} ${style.text}">${displayName.charAt(0)}</div>
                <div class="flex flex-col overflow-hidden min-w-0 flex-1 justify-center">
                    ${furigana ? `<div class="text-[9px] text-slate-500 truncate leading-none mb-0.5">${furigana}</div>` : ''}
                    <div class="font-bold text-sm text-slate-800 truncate leading-tight" title="${m.Name}">${displayName}</div>
                    <div class="text-[10px] text-slate-400 truncate flex items-center gap-0.5 mt-0.5"><i data-lucide="user" width="10" height="10"></i> ${m.DiscordName || '-'}</div>
                </div>
            </div>
            <div class="px-3 pb-2 flex flex-col gap-1">
                <span class="text-[10px] px-1.5 py-0.5 rounded-full w-fit ${style.badge}">${m.Race || '不明'}</span>
                <div class="flex items-center justify-between mt-1">
                    <div class="text-slate-500 text-xs overflow-hidden truncate flex-1 mr-2" title="${m.Personality}">${m.Personality || '-'}</div>
                    <button onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()" onclick="toggleAccordion(event, '${m.ID}')" class="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors flex-shrink-0"><i data-lucide="${chevronIcon}" width="16"></i></button>
                </div>
            </div>
            <div class="${bodyClass} px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/50 rounded-b-lg">
                <div class="text-xs text-slate-600 leading-relaxed mb-3 break-words bg-white p-2 rounded border border-slate-100">${m.Description || '詳細情報はありません'}</div>
                <div class="flex gap-2">
                    <button onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()" onclick="handleEditClick(event, '${m.ID}')" class="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:text-pink-600 transition flex items-center justify-center gap-1"><i data-lucide="edit" width="12"></i> 編集</button>
                    <button onmousedown="startRelationDragFromButton(event, '${m.ID}')" ontouchstart="startRelationDragFromButton(event, '${m.ID}')" class="px-2 py-1.5 text-xs font-medium text-white bg-pink-500 border border-pink-600 rounded hover:bg-pink-600 transition flex items-center justify-center shadow-sm cursor-crosshair" title="矢印作成"><i data-lucide="move-right" width="14"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');
  }
        function getGroupStyle(groupName) {
    if (!groupName) return COLOR_PALETTE[0];
        return groupColorMap[groupName] || COLOR_PALETTE[0];
  }

        // --- 画像コピー処理 ---
        async function copyAsImage() {
    if (members.length === 0) return;

        // 1. 全体の範囲を計算
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasVisibleMembers = false;

    members.forEach(m => {
        if (!visibleGroups.has(m.Group)) return;
        hasVisibleMembers = true;

        const el = document.querySelector(`.node-card[data-id="${m.ID}"]`);
        // DOM要素が見つからない場合はデフォルトサイズを使用
        const w = el ? el.offsetWidth : SIZES.normal.w;
        const h = el ? el.offsetHeight : SIZES.normal.h;

        minX = Math.min(minX, m.x);
        minY = Math.min(minY, m.y);
        maxX = Math.max(maxX, m.x + w);
        maxY = Math.max(maxY, m.y + h);
    });

        if (!hasVisibleMembers) {
            showToast('表示されているカードがありません', 'warning');
        return;
    }

        const PADDING = 50;
        const width = maxX - minX + (PADDING * 2);
        const height = maxY - minY + (PADDING * 2);

        Swal.fire({
            title: '画像生成中...',
        text: 'しばらくお待ち下さい',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

        try {
        const world = document.getElementById('world');

        // html2canvas実行
        // 現在のDOM構造をそのまま使い、onclone内で座標変換だけリセットして全体を映す
        const canvas = await html2canvas(world, {
            // キャンバスサイズをコンテンツ全体に合わせる
            width: width,
        height: height,
        // 描画の基準位置（ここからwidth/height分だけ撮る）
        x: minX - PADDING,
        y: minY - PADDING,
        // 背景色
        backgroundColor: '#fdf2f8',
        // レスポンシブ崩れ防止（画面幅がコンテンツより小さいとレイアウトが変わるため、十分な幅を指定）
        windowWidth: width + 100,
        windowHeight: height + 100,
        logging: false,
        useCORS: true,
        scale: 2, // 高解像度（適度）
            onclone: (clonedDoc) => {
                const clonedWorld = clonedDoc.getElementById('world');
        // キャプチャ時のズーム/パンを無効化して、素の状態（scale=1, translate(0,0)）にする
        // これにより、座標計算通りの位置にレンダリングされる
        clonedWorld.style.transform = 'none';
            }
        });

        canvas.toBlob(async (blob) => {
            try {
                // クリップボード書き込みを試行
                const item = new ClipboardItem({'image/png': blob });
        await navigator.clipboard.write([item]);
        Swal.fire({
            icon: 'success',
        title: 'コピーしました',
        text: 'クリップボードに画像がコピーされました',
        timer: 2000,
        showConfirmButton: false
                });
            } catch (err) {
            // 失敗時は画像を表示してユーザーに保存を促す
            console.error(err);
        const url = canvas.toDataURL();
        Swal.fire({
            title: '画像生成完了',
        text: '自動コピーに失敗しました。画像を長押しまたは右クリックして保存してください。',
        imageUrl: url,
        imageAlt: '相関図',
        imageWidth: '100%',
        showCloseButton: true,
        confirmButtonText: '閉じる'
                });
            }
        });

    } catch (e) {
            console.error(e);
        Swal.fire('エラー', '画像の生成に失敗しました', 'error');
    }
  }
</script>