
// quadTreeを用いた衝突判定のコードは、
// 古都ことさん（@kfurumiya）のブログ（https://sbfl.net/blog/2017/12/03/javascript-collision/）
// を参考にしました。感謝します。

// 当たり判定：hide:trueのものは除外。hitPointが無いか、あっても0のものは除外。inFrameを満たさなくても除外。

// Particleは10個くらいの四角形（中身すっからかん）を色付けてふちだけのやつ回転しながら
// ランダムで方向決めてスピードは4から0に減らす感じでゆっくりとばすみたいな。

"use strict";

const INF = Infinity; // 長いので

let isLoop = true;
let mySystem; // 外部コードとは別に、こちらでもシステムにアクセスできるオブジェクトが必要ということで。

function preload(){
  /* NOTHING */
}

function setup(){
  mySystem = createSystem(480, 600, 1024);
  // AREA_WIDTH = 480, AREA_HEIGHT = 600が代入される。
  // さらにunitPoolも生成する（1024）
  // unitPoolはあっちでしか使ってないのでこれでいいはず・・・
  createCanvas(AREA_WIDTH, AREA_HEIGHT);
  angleMode(DEGREES);
  textSize(16);

  //unitPool = new ObjectPool(() => { return new Unit(); }, 1024);

  let weaponData = [];
  let weaponCapacity = 0;

  // プレイヤーの攻撃パターン作成
  // デフォルト。黒い弾丸をいっぱい。
  weaponData[weaponCapacity++] = {
    action:{
      main:[{fire:"set4"}, {wait:4}, {loop:INF, back:2}]
    },
    fireDef:{set4:{formation:{type:"frontVertical", count:4, distance:15, interval:15}}}
  };
  // レーザー撃ってみよう。60フレーム経たないと再発射できない。
  weaponData[weaponCapacity++] = {
    shotSpeed:0.1, color:"dkskblue",
    action:{
      main:[{shotAction:["set", "laserUnit"]}, {fire:""}, {wait:60}, {loop:INF, back:2}],
      laserUnit:[{hide:true}, {shotShape:"laserSmall"}, {shotColor:"dkskblue"},
                 {shotSpeed:["set", 24]}, {shotDirection:["set", -90]}, {shotAction:["set", "calm"]},
                 {fire:""}, {wait:30}, {speed:["set", 12]}, {signal:"frameOut"}, {vanish:1}],
      calm:[{bind:true}, {signal:"frameOut"}, {speed:["set", 0.1]}]
    }
  };

  // ここで第二引数は通常PLAYERになってるんだけど、OFFにすることでプレイヤーが無敵になる。そういうオプション。
  // mySystem.createPlayer(weaponData, OFF);
  // target云々があるので・・まあでもディスプレイ用なら要らないか。
  mySystem.createPlayer(weaponData);

  // レーザー1
  mySystem.addPatternSeed({
    x:0.2, y:0.1, collisionFlag:ENEMY, shotSpeed:4, speed:4.8,
    color:"bossBlue", shape:"squareLarge", shotShape:"wedgeMiddle", shotColor:"dkblue",
    action:{
      main:[{shotAction:["set", "laserUnit"]}, {aim:0}, {fire:"way", count:3}, {wait:36},
            {shotAction:["clear"]}, {aim:0}, {fire:"way", count:9}, {wait:8}, {loop:3, back:3},
            {direction:["mirror", 90]}, {loop:INF, back:-1}],
      laserUnit:[{hide:true}, {shotSpeed:["set", 12]}, {shotDirection:["rel", 0]},
                 {shotShape:"laserSmall"}, {shotColor:"bossBlue"}, {shotAction:["set", "calm"]},
                 {fire:""}, {signal:"frameOut"}, {vanish:1}],
      calm:[{bind:true}, {speed:["set", 4, 60]}, {signal:"frameOut"}, {speed:["set", 0.1]}]
    },
    fireDef:{way:{nway:{count:"$count", interval:20}}}
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
