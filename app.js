// プロの小技：文章内にカンマ（、や , ）が含まれていてデータがズレるのを防ぐため、
// format=csv ではなく format=tsv（タブ区切り）で取得します！
const membersUrl = "https://docs.google.com/spreadsheets/d/1JFVoWc_eaSYJUFbgM_dgLLlPxXrU08dVQAjxuYmre7Q/export?format=tsv&gid=【ここをメンバーシートのgidに変更】";
const relationsUrl = "https://docs.google.com/spreadsheets/d/1JFVoWc_eaSYJUFbgM_dgLLlPxXrU08dVQAjxuYmre7Q/export?format=tsv&gid=0";

async function initNetwork() {
    try {
        // 1. メンバー一覧と関係性データの両方を同時にFetch（爆速化のため並行処理）
        const [membersRes, relationsRes] = await Promise.all([
            fetch(membersUrl),
            fetch(relationsUrl)
        ]);

        const membersText = await membersRes.text();
        const relationsText = await relationsRes.text();

        // --- メンバー（ノード）の作成 ---
        const membersRows = membersText.split('\n');
        const nodesData = [];

        for (let i = 1; i < membersRows.length; i++) {
            const row = membersRows[i].trim();
            if (!row) continue;

            // TSVなのでタブ（\t）で分割します
            const cols = row.split('\t');

            const id = cols[0];          // ID
            const name = cols[1];        // Name (例: 白桜)
            const group = cols[3];       // Group (例: Fox, Wolf)
            const description = cols[6]; // Description (説明文)

            if (id && name) {
                // グループごとに色を変えるちょっとした遊び心
                let nodeColor = "#ffb3ba"; // デフォルト（Spiritなど）
                if (group === "Fox") nodeColor = "#ffdfba"; // キツネ系はオレンジ
                if (group === "Wolf") nodeColor = "#baffc9"; // オオカミ系はグリーン

                nodesData.push({
                    id: id,
                    label: name,
                    title: `【${name}】\n${description}`, // ←エモ機能：マウスホバーで説明文が出ます！
                    shape: "dot", // まん丸のデザイン
                    size: 25,     // 丸の大きさ
                    color: nodeColor
                });
            }
        }

        // --- 関係性（エッジ）の作成 ---
        const relationsRows = relationsText.split('\n');
        const edgesData = [];

        for (let i = 1; i < relationsRows.length; i++) {
            const row = relationsRows[i].trim();
            if (!row) continue;

            const cols = row.split('\t');
            const fromId = cols[1];   // FromのID
            const toId = cols[2];     // ToのID
            const relation = cols[3]; // Label (関係性)

            if (fromId && toId) {
                edgesData.push({
                    from: fromId,
                    to: toId,
                    label: relation,
                    arrows: "to",
                    font: { align: 'middle' }, // 文字を矢印の真ん中に
                    color: { color: '#999', highlight: '#333' } // 矢印の色
                });
            }
        }

        // --- 描画処理 ---
        const container = document.getElementById("mynetwork");
        const data = {
            nodes: new vis.DataSet(nodesData),
            edges: new vis.DataSet(edgesData)
        };
        const options = {
            nodes: {
                font: { size: 16, color: '#333', face: 'sans-serif' },
                borderWidth: 2
            },
            physics: {
                barnesHut: { gravitationalConstant: -3000, springLength: 250 } // キャラ名が被らないよう少し反発力を強めに
            }
        };

        new vis.Network(container, data, options);

    } catch (error) {
        console.error("データの読み込みに失敗しました:", error);
        alert("スプレッドシートの読み込みに失敗しました。");
    }
}

initNetwork();