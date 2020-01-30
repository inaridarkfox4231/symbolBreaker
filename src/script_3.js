
// quadTreeを用いた衝突判定のコードは、
// 古都ことさん（@kfurumiya）のブログ（https://sbfl.net/blog/2017/12/03/javascript-collision/）
// を参考にしました。感謝します。

/*
あとはこう書くだけ。
<script src="https://inaridarkfox4231.github.io/gameData/bulletLang1.js"></script>
*/

"use strict";

const INF = Infinity; // 長いので

let isLoop = true;
let mySystem; // 外部コードとは別に、こちらでもシステムにアクセスできるオブジェクトが必要ということで。

function preload(){
  /* NOTHING */
}

function setup(){
  mySystem = createSystem(window.innerWidth, window.innerHeight, 1024);
  // AREA_WIDTH = 480, AREA_HEIGHT = 600が代入される。
  // さらにunitPoolも生成する（1024）
  // unitPoolはあっちでしか使ってないのでこれでいいはず・・・
  createCanvas(AREA_WIDTH, AREA_HEIGHT);
  angleMode(DEGREES);

  let weaponData = [];
  let weaponCapacity = 0;

  // プレイヤーの攻撃パターン作成
  // デフォルト。黒い弾丸をいっぱい。
  weaponData[weaponCapacity++] = {
    action:{
      main:[{catch:"a"}, {fire:""}, {wait:4}, {loop:INF, back:"a"}]
    }
  };

  // ここで第二引数は通常PLAYERになってるんだけど、OFFにすることでプレイヤーが無敵になる。そういうオプション。
  // mySystem.createPlayer(weaponData, OFF);
  // target云々があるので・・まあでもディスプレイ用なら要らないか。
  mySystem.createPlayer(weaponData, OFF);

  mySystem.addPatternSeed({
    x:0.5, y:0, color:"grey", speed:5, direction:180, shotSpeed:0, shotDirection:90, bgColor:"black",
    action:{
      main:[{wait:38}, {direction:["set", 90]}, {wait:32},
            {shotAction:["set", "stay"]}, {shotShape:"rectSmall"}, {shotColor:"red"},
            {short:"lineSet", count:6},
            {shotAction:["set", "curve1"]}, {fire:""}, {wait:1}, {shotAction:["set", "stay"]},
            {short:"lineSet", count:19},
            {direction:["set", 0]}, {wait:28}, {direction:["set", -90]}, {wait:13},
            {shotColor:"orange"}, {shotAction:["set", "curve2"]}, {fire:""}, {wait:13},
            {direction:["set", 0]}, {wait:12}, {direction:["set", 90]},
            {shotColor:"yellow"}, {shotAction:["set", "stay"]},
            {short:"lineSet", count:13},
            {shotAction:["set", "curve3"]}, {fire:""}, {shotAction:["set", "stay"]},
            {short:"lineSet", count:13},
            {direction:["set", 180]}, {wait:32}, {direction:["set", 90]}, {wait:12},
            {shotColor:"green"}, {shotAction:["set", "curve4"]}, {fire:""},
            {direction:["set", 180]}, {wait:8}, {shotAction:["set", "curve5"]}, {fire:""},
            {direction:["set", 90]}, {wait:18}, {direction:["set", 0]},
            {shotAction:["set", "stay"]}, {shotDirection:["set", 0]}, {short:"lineSet", count:16},
            {wait:12}, {direction:["set", -90]}, {wait:13},
            {shotAction:["set", "curve6"]}, {fire:""}, {wait:13},
            {direction:["set", 0]}, {wait:20}, {direction:["set", 90]}, {wait:8},
            {shotColor:"dkblue"}, {shotAction:["set", "curve7"]}, {fire:""},
            {direction:["set", 180]}, {wait:8}, {shotAction:["set", "curve8"]}, {fire:""},
            {direction:["set", 90]}, {wait:18}, {direction:["set", 0]},
            {shotAction:["set", "stay"]}, {shotDirection:["set", 0]}, {short:"lineSet", count:16},
            {wait:12}, {direction:["set", -90]}, {wait:13},
            {shotAction:["set", "curve9"]}, {fire:""},
            {direction:["set", 180]}, {wait:30}, {speed:["set", 2]}, {direction:["set", 90]}
      ],
      curve1:[{short:"preCurve", dir:90, dist:35, bearing:-5, ratio:35/80},
              {shotAction:["set", "scatter1"]}, {fire:""}, {short:"final"}],
      scatter1:[{short:"scatter", color:"red", count:35}],
      curve2:[{short:"preCurve", dir:180, dist:40, bearing:5, ratio:65/40},
              {shotAction:["set", "scatter2"]}, {fire:""},
              {shotMove:"circular", bearing:-5, ratioXY:65/40}, {fire:""}, {short:"final"}],
      scatter2:[{short:"scatter", color:"orange", count:27}],
      curve3:[{short:"preCurve", dir:90, dist:65, bearing:-5, ratio:65/80},
              {shotAction:["set", "scatter3"]},
              {fire:""}, {short:"final"}],
      scatter3:[{short:"scatter", color:"yellow", count:35}],
      curve4:[{short:"preCurve", dir:180, dist:40, bearing:5, ratio:1},
              {shotAction:["set", "scatter4"]},
              {fire:""}, {short:"final"}],
      scatter4:[{short:"scatter", color:"green", count:36}],
      curve5:[{short:"preCurve", dir:0, dist:80, bearing:5, ratio:90/80},
              {shotAction:["set", "scatter5"]},
              {fire:""}, {short:"final"}],
      scatter5:[{short:"scatter", color:"green", count:17}],
      curve6:[{short:"preCurve", dir:0, dist:40, bearing:5, ratio:65/40},
              {shotAction:["set", "scatter6"]},
              {fire:""}, {short:"final"}],
      scatter6:[{short:"scatter", color:"blue", count:72}],
      curve7:[{short:"preCurve", dir:180, dist:40, bearing:5, ratio:1},
              {shotAction:["set", "scatter7"]},
              {fire:""}, {short:"final"}],
      scatter7:[{short:"scatter", color:"dkblue", count:36}],
      curve8:[{short:"preCurve", dir:0, dist:80, bearing:5, ratio:90/80},
              {shotAction:["set", "scatter8"]},
              {fire:""}, {short:"final"}],
      scatter8:[{short:"scatter", color:"dkblue", count:17}],
      curve9:[{short:"preCurve", dir:0, dist:40, bearing:5, ratio:65/40},
              {shotAction:["set", "scatter9"]},
              {fire:""}, {short:"final"}],
      scatter9:[{short:"scatter", color:"purple", count:72}],
      stay:[{short:"final"}]
    },
    short:{
      final:[{signal:"vanish"}, {speed:["set", 8]}],
      lineSet:[{catch:"a"}, {fire:""}, {wait:1}, {loop:"$count", back:"a"}],
      preCurve:[{hide:true}, {shotDirection:["set", "$dir"]}, {shotDistance:["set", "$dist"]},
                {shotMove:"circular", bearing:"$bearing", ratioXY:"$ratio"}],
      scatter:[{hide:true}, {shotColor:"$color"}, {shotShape:"rectSmall"}, {shotAction:["set", "stay"]},
               {catch:"a"}, {wait:1}, {shotDirection:["rel", 0]}, {fire:""}, {loop:"$count", back:"a"},
               {move:"go"}, {speed:["set", 0]}, {signal:"vanish"}, {speed:["set", 8]}]
    }
  })

  mySystem.setPattern(0);

}

function draw(){
  background(mySystem.backgroundColor);
  mySystem.update(); // 更新
  mySystem.collisionCheck(); // 衝突判定
  mySystem.execute(); // 行動
  mySystem.eject(); // 排除
  mySystem.draw(); // 描画

}

// ---------------------------------------------------------------------------------------- //
// KeyAction.

function keyTyped(){
  if(key === 'p'){
    if(isLoop){ noLoop(); isLoop = false; return; }
    else{ loop(); isLoop = true; return; }
  }else if(key === 'r'){
    mySystem.setPattern(0);
  }
}

function keyPressed(){
  // シフトキーでショットチェンジ（予定）
  if(keyCode === SHIFT){
    mySystem.player.shiftPattern();
  }
}
