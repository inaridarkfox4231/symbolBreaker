
// quadTreeを用いた衝突判定のコードは、
// 古都ことさん（@kfurumiya）のブログ（https://sbfl.net/blog/2017/12/03/javascript-collision/）
// を参考にしました。感謝します。

// 当たり判定：hide:trueのものは除外。hitPointが無いか、あっても0のものは除外。inFrameを満たさなくても除外。

// Particleは10個くらいの四角形（中身すっからかん）を色付けてふちだけのやつ回転しながら
// ランダムで方向決めてスピードは4から0に減らす感じでゆっくりとばすみたいな。

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
  mySystem.createPlayer(weaponData);

  mySystem.addPatternSeed({
      x:(0.5 - (600 / AREA_WIDTH)), y:0.2, shotDirection:90, speed:1, bgColor:"black",
      action:{
          main:[{hide:true}, {shotCollisionFlag:ENEMY},
                {shotShape:"squareMiddle"}, {shotAction:["set", "stop"]},
                {shotColor:"red"},
                {short:"all"}, {short:"set2", sp1:2, sp2:6}, {short:"set3", sp1:2, sp2:4, sp3:6}, {wait:40},
                {shotColor:"orange"},
                {short:"set3", sp1:4, sp2:6, sp3:8}, {short:"set2", sp1:2, sp2:10},
                {short:"set2", sp1:4, sp2:8}, {wait:40},
                {shotColor:"yellow"},
                {short:"all"}, {short:"set2", sp1:2, sp2:10}, {short:"set3", sp1:4, sp2:6, sp3:8}, {wait:40},
                {wait:160},
                {shotColor:"ltgreen"},
                {short:"set4", sp1:2, sp2:6, sp3:8, sp4:10}, {short:"set3", sp1:2, sp2:6, sp3:10},
                {short:"set4", sp1:2, sp2:4, sp3:6, sp4:10}, {wait:40},
                {shotColor:"blue"},
                {short:"all"}, {short:"set2", sp1:2, sp2:10}, {short:"all"}, {wait:40},
                {shotColor:"dkblue"},
                {short:"set4", sp1:2, sp2:6, sp3:8, sp4:10}, {short:"set3", sp1:2, sp2:6, sp3:10},
                {short:"set4", sp1:2, sp2:4, sp3:6, sp4:10}, {wait:40},
                {shotColor:"purple"},
                {short:"all"}, {short:"set2", sp1:2, sp2:10}, {short:"all"}, {wait:80},
                {shotColor:"black"}, {shotAction:["set", "eliminate"]},
                {shotSpeed:["set", 0]}, {shotCollisionFlag:PLAYER}, {fire:""}, {vanish:true}
          ],
          stop:[{speed:["set", 0, 40]}],
          eliminate:[{shotCollisionFlag:PLAYER_BULLET}, {shotDirection:["set", 90]}, {shotSpeed:["set", 8]},
                     {shotShape:"laserLarge"}, {shotColor:"grey"}, {shotAction:["set", "laserHead"]},
                     {fire:""}, {wait:30}, {short:"leftFadeOut"}],
          laserHead:[{wait:30}, {short:"leftFadeOut"}]
      },
      short:{
          all:[{shotSpeed:["set", 0]},
               {catch:"a"}, {shotSpeed:["add", 2]}, {fire:""}, {loop:5, back:"a"}, {wait:40}],
          set2:[{shotSpeed:["set", "$sp1"]}, {fire:""}, {shotSpeed:["set", "$sp2"]}, {fire:""}, {wait:40}],
          set3:[{shotSpeed:["set", "$sp1"]}, {fire:""}, {shotSpeed:["set", "$sp2"]}, {fire:""},
                {shotSpeed:["set", "$sp3"]}, {fire:""}, {wait:40}],
          set4:[{shotSpeed:["set", "$sp1"]}, {fire:""}, {shotSpeed:["set", "$sp2"]}, {fire:""},
                {shotSpeed:["set", "$sp3"]}, {fire:""}, {shotSpeed:["set", "$sp4"]}, {fire:""}, {wait:40}],
          leftFadeOut:[{speed:["set", 4]}, {direction:["set", 180]}]
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
