// ノード（キャラクター）の設定
const nodes = new vis.DataSet([
    { id: 1, label: "メンバーA", shape: "circle", color: "#ffb3ba" },
    { id: 2, label: "メンバーB", shape: "circle", color: "#ffdfba" },
    { id: 3, label: "メンバーC", shape: "circle", color: "#ffffba" }
]);

// エッジ（関係性の矢印）の設定
const edges = new vis.DataSet([
    { from: 1, to: 2, label: "ライバル", arrows: "to" },
    { from: 1, to: 3, label: "師匠", arrows: "to" },
    { from: 2, to: 3, label: "共闘", arrows: "to, from" }
]);

// 描画する場所（HTMLの <div id="mynetwork"></div>）を取得
const container = document.getElementById("mynetwork");

// データをまとめる
const data = {
    nodes: nodes,
    edges: edges
};

// 物理演算（ぽよんぽよん具合）などのオプション設定
const options = {
    physics: {
        barnesHut: {
            gravitationalConstant: -2000,
            springLength: 200
        }
    }
};

// 相関図を生成！
const network = new vis.Network(container, data, options);