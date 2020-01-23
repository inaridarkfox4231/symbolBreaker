
// quadTreeを用いた衝突判定のコードは、
// 古都ことさん（@kfurumiya）のブログ（https://sbfl.net/blog/2017/12/03/javascript-collision/）
// を参考にしました。感謝します。

// 当たり判定：hide:trueのものは除外。hitPointが無いか、あっても0のものは除外。inFrameを満たさなくても除外。

// Particleは10個くらいの四角形（中身すっからかん）を色付けてふちだけのやつ回転しながら
// ランダムで方向決めてスピードは4から0に減らす感じでゆっくりとばすみたいな。

"use strict";

const INF = Infinity; // 長いので
const DEFAULT_PATTERN_INDEX = 0;

// 今のままでいいからとりあえず関数化とか変数化、やる。
// 解析用グローバル変数
let isLoop = true;
let showInfo = true;

// 解析用パラメータ
let runTimeSum = 0;
let runTimeAverage = 0;
let runTimeMax = 0;
let updateTimeAtMax = 0;
let collisionCheckTimeAtMax = 0;
let actionTimeAtMax = 0;
let ejectTimeAtMax = 0;
let drawTimeAtMax = 0;
let usingUnitMax = 0;
const INDENT = 40;
const AVERAGE_CALC_SPAN = 10;
const TEXT_INTERVAL = 25;

let mySystem; // 外部コードとは別に、こちらでもシステムにアクセスできるオブジェクトが必要ということで。

function preload(){
  /* NOTHING */
}

function setup(){
  mySystem = createSystem(480, 600, 1024);
  // AREA_WIDTH = 480, AREA_HEIGHT = 600が代入される。
  // さらにunitPoolも生成する（1024）
  // unitPoolはあっちでしか使ってないのでこれでいいはず・・・
  createCanvas(AREA_WIDTH + 160, AREA_HEIGHT);
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

  mySystem.createPlayer(weaponData);

  mySystem.addPatternSeed({
    x:0.5, y:0.3, shotSpeed:4, shotDirection:90, collisionFlag:ENEMY,
    action:{
      main:[{short:"waygun", count:3}, {short:"waygun", count:5},
            {short:"waygun", count:7}, {short:"waygun", count:9},
            {wait:16}, {loop:INF, back:-1}]
    },
    short:{waygun:[{fire:"waygun", count:"$count"}, {wait:4}, {shotDirection:["add", 5]}]},
    fireDef:{waygun:{nway:{count:"$count", interval:20}}}
  })

  // デモ画面1. 90°ずつ回転するやつ。
  mySystem.addPatternSeed({
    x:0.5, y:0.5, shotSpeed:2, shotDirection:90, collisionFlag:ENEMY,
    action:{
      main:[{shotAction:["set", "way3burst"]}, {fire:"rad2"}, {wait:8}, {loop:10, back:2}, {wait:32},
            {shotDirection:["add", 45]}, {loop:INF, back:-2}],
      way3burst:[{wait:16}, {shotAction:["set", "fade"]}, {fire:"way3"}, {vanish:1}],
      fade:[{vanish:60}]
    },
    fireDef:{way3:{nway:{count:3, interval:90}}, rad2:{radial:{count:2}}}
  })

  // 新しいcircularの実験中。FALさんの4を書き直し。
  // shotDirectionの初期設定は撃ちだした瞬間の進行方向。
  mySystem.addPatternSeed({
    x:0.5, y:0.3, shotSpeed:10, collisionFlag:ENEMY,
    action:{
      main:[{shotAction:["set", "sweeping"]}, {fire:"rad2"}],
      sweeping:[{speed:["set", 0.001, 30]}, {behavior:["add", "circ"]}, {bind:true}, {shotDirection:["rel", 0]},
                {shotSpeed:["set", 2]}, {fire:""}, {wait:1}, {shotDirection:["add", 12]}, {loop:INF, back:3}]
    },
    fireDef:{rad2:{radial:{count:2}}},
    behaviorDef:{circ:["circular", {bearing:-3}]}
  })

  // FALさんの8を書き直し。
  // followとかbendとか面倒な事をしない場合、射出方向は撃ちだしたときのshotDirection(この場合0)を
  // radialで回転させたものに、要するに配置時の中心から外側への方向。それが固定されたままくるくる回る仕組み。
  // それがあのthis.bearingの意味だとすればこれでよいのだろうね。(つまり各unitのshotDirectionは固定！)
  mySystem.addPatternSeed({
    x:0.5, y:0.3, collisionFlag:ENEMY,
    action:{
      main:[{shotAction:["set", "flower"]}, {fire:"set"}],
      flower:[{behavior:["add", "circ"]}, {bind:true}, {shotSpeed:["set", 2]},
              {fire:"way2"}, {wait:6}, {loop:4, back:2}, {wait:16}, {loop:INF, back:4}]
    },
    fireDef:{set:{x:120, y:0, radial:{count:16}}, way2:{nway:{count:2, interval:120}}},
    behaviorDef:{circ:["circular", {bearing:0.5}]}
  })

  // FALさんの13を書き直し。バリケード。もう過去には戻れない・・
  mySystem.addPatternSeed({
    x:0.5, y:0.3, shotDirection:45, collisionFlag:ENEMY,
    action:{
      main:[{shotAction:["set", "barricade"]}, {fire:"set"}],
      barricade:[{behavior:["add", "circ"]}, {bind:true}, {shotSpeed:["set", 10]},
                 {fire:"rad4"}, {wait:1}, {loop:INF, back:2}]
    },
    fireDef:{set:{x:120, y:0, radial:{count:3}}, rad4:{radial:{count:4}}},
    behaviorDef:{circ:["circular", {bearing:1}]}
  })

  // FALさんの17書き直し。これで最後。radiusDiffを使うと螺旋軌道を実現できる。
  // 射出方向はその時の親→自分ベクトルに+15または-15したもの。
  // いぇーい＾＾
  mySystem.addPatternSeed({
    x:0.5, y:0.3, shotDirection:90, collisionFlag:ENEMY,
    action:{
      main:[{shotAction:["set", "scatter"]}, {fire:"set"}, {wait:120},
            {shotAction:["set", "scatterInv"]}, {fire:"set"}, {wait:120}, {loop:INF, back:-1}],
      scatter:[{short:"scatter", behavior:"spiral", dirDiff:15}],
      scatterInv:[{short:"scatter", behavior:"spiralInv", dirDiff:-15}],
      trap:[{wait:60}, {speed:["set", 3, 120]}]
    },
    short:{
      scatter:[{behavior:["add", "$behavior"]}, {bind:true},
               {wait:30}, {shotAction:["set","trap"]}, {shotSpeed:["set", 0.0001]},
               {shotDirection:["fromParent", "$dirDiff"]}, {fire:""}, {wait:4}, {loop:INF, back:3}]
    },
    fireDef:{set:{x:50, y:0, radial:{count:2}}},
    behaviorDef:{spiral:["circular", {bearing:1.5, radiusDiff:1}],
                 spiralInv:["circular", {bearing:-1.5, radiusDiff:1}]}
  })

  // ボスの攻撃
  // 20発ガトリングを13way, これを真ん中から放ったり、両脇から放ったり。
  mySystem.addPatternSeed({
    x:0.5, y:0.2, collisionFlag:ENEMY,
    action:{
      main:[{shotAction:["set", "fire"]},
            {shotSpeed:["set", 0]}, {fire:""}, {wait:120},
            {shotDirection:["set", 0]}, {shotSpeed:["set", 120]}, {fire:"rad2"}, {wait:120},
            {loop:INF, back:-2}],
      fire:[{hide:true}, {speed:["set", 0]}, {aim:0}, {shotSpeed:["set", 4]},
            {fire:"way20"}, {wait:4}, {loop:20, back:2}, {vanish:1}]
    },
    fireDef:{way20:{nway:{count:13, interval:8}}, rad2:{radial:{count:2}}}
  })

  // ランダムに9匹？
  mySystem.addPatternSeed({
    x:0.5, y:-0.1,
    action:{
      main:[{hide:true}, {shotAction:["set", "fireGo"]}, {shotShape:"squareMiddle"}, {shotColor:"grey"},
            {short:"setEnemy1", dir:0}, {wait:240}, {short:"setEnemy1", dir:180}, {wait:240},
            {loop:INF, back:-5}],
      fireGo:[{shotShape:"wedgeSmall"}, {shotColor:"black"}, {shotSpeed:["set", 4]}, {aim:5},
              {speed:["set", 6]}, {direction:["set", 90]}, {speed:["set", 1, 60]},
              {fire:"way3"}, {wait:300}, {loop:INF, back:2}]
    },
    short:{
      setEnemy1:[{shotDirection:["set", "$dir"]}, {shotSpeed:["set", [60, 180]]},
                 {fire:""}, {wait:16}, {loop:9, back:3}]
    },
    fireDef:{way3:{nway:{count:3, interval:45}}}
  })

  // デモ画面のカミソリrad8が4ずつ方向逆転するやつ
  mySystem.addPatternSeed({
    x:0.5, y:0.5, shotSpeed:1, shotDirection:90, collisionFlag:ENEMY,
    action:{
      main:[{short:"routine", dirDiff:4}, {short:"routine", dirDiff:-4}, {loop:INF, back:-1}]
    },
    short:{
      routine:[{fire:"rad8"}, {shotDirection:["add", "$dirDiff"]}, {wait:8}, {loop:4, back:3}, {wait:16}]
    },
    fireDef:{rad8:{radial:{count:8}}}
  })

  // 折り返して15匹、パターンを変える。
  mySystem.addPatternSeed({
    x:0.2, y:0, speed:4, direction:0, shotSpeed:8, shotDirection:90, bgColor:"plorange",
    action:{
      main:[{hide:true}, {shotShape:"squareMiddle"}, {shotColor:"orange"},
            {shotAction:["set", "attack1"]}, {short:"createEnemy"},
            {speed:["set", 0]}, {wait:240}, {speed:["set", 4]},
            {shotAction:["set", "attack2"]}, {short:"createEnemy"}, {vanish:1}],
      attack1:[{short:"pattern", fire:"way3"}],
      attack2:[{shotAction:"stay"}, {short:"pattern", fire:"lineway3"}],
      stay:[{speed:["set", 1, 30]}]
    },
    short:{
      createEnemy:[{fire:""}, {wait:12}, {loop:7, back:2}, {fire:""}, {direction:["mirror", 90]},
                    {wait:12}, {fire:""}, {loop:7, back:2}, {direction:["mirror", 90]}],
      pattern:[{shotShape:"wedgeSmall"}, {shotColor:"dkorange"}, {shotSpeed:["set", 4]},
               {speed:["set", 1, 30]}, {aim:5}, {fire:"$fire"}, {wait:60}, {loop:3, back:2},
               {speed:["set", 8, 30]}]
    },
    fireDef:{way3:{nway:{count:3, interval:45}},
             lineway3:{nway:{count:5, interval:40}, line:{count:3, upSpeed:0.2}}}
  })

  // 上下に4発ずつline飛ばして止めてから90°方向に8line飛ばして消滅するパターン
  mySystem.addPatternSeed({
    x:0.5, y:0.5, shotSpeed:1, shotDirection:90, collisionFlag:ENEMY,
    action:{
      main:[{shotAction:["set", "lin8"]}, {short:"linshot", angle:90}, {short:"linshot", angle:-90},
            {wait:30}, {shotDirection:["add", 45]}, {loop:INF, back:6}],
      lin8:[{shotSpeed:["set", 1]}, {speed:["set", 0, 30]}, {fire:"lin8"}, {vanish:1}]
    },
    short:{linshot:[{fire:"lin4", angle:"$angle"}, {shotDirection:["add", 180]}]},
    fireDef:{lin4:{line:{count:4, upSpeed:1}, shotDirOption:["rel", "$angle"]},
             lin8:{line:{count:8, upSpeed:0.5}}
    }
  })

  // 13方向wayで角度10°でaim5で5lineを60間隔、3line2wayを90間隔で放つ感じ。
  mySystem.addPatternSeed({
    x:0.5, y:0.1, shotSpeed:4, collisionFlag:ENEMY,
    action:{
      main:[{aim:0}, {fire:"weapon1"}, {wait:30}, {aim:0}, {fire:"weapon2"}, {wait:40},
            {loop:INF, back:-1}]
    },
    fireDef:{weapon1:{nway:{count:13, interval:8}, line:{count:5, upSpeed:0.2}},
             weapon2:{nway:{count:[13, 2], interval:[8, 2]}, line:{count:3, upSpeed:0.2}}
    }
  })

  // 敵がいっぱい
  mySystem.addPatternSeed({
    x:-0.1, y:0.1,
    action:{
      main:[{hide:true}, {shotShape:"squareMiddle"},
            {shotColor:"orange"},
            {shotSpeed:["set", 8]}, {shotAction:["set", "enemy1"]}, {fire:""}, {wait:8},
            {shotColor:"dkorange"},
            {shotSpeed:["set", [48 + 80, 48 + 400]]}, {shotAction:["set", "enemy2"]}, {fire:""}, {wait:4},
            {loop:16, back:10}, {vanish:1}],
      enemy1:[{shotSpeed:["set", 4]}, {shotShape:"wedgeSmall"}, {shotColor:"red"}, {shotAction:"stay"},
              {wait:10}, {aim:0}, {fire:"way5"}, {speed:["set", 3, 60]}, {direction:["set", 180, 60]},
              {wait:10}, {aim:0}, {fire:"way5"}, {speed:["set", 8, 60]}],
      enemy2:[{speed:["set", 1]}, {direction:["set", 90]}, {shotDirection:["set", 90]}, {shotSpeed:["set", 2]},
              {shotShape:"wedgeSmall"}, {shotColor:"dkred"}, {wait:1},
              {fire:"way3"}, {wait:120}, {loop:2, back:2}, {speed:["set", 8, 60]}],
      stay:[{speed:["set", 1, 30]}]
    },
    fireDef:{
      way5:{nway:{count:5, interval:20}, line:{count:3, upSpeed:0.5}},
      way3:{nway:{count:3, interval:10}}
    }
  })

  // 何がしたいのか分からなくなってきた
  mySystem.addPatternSeed({
    bgColor:"plgreen", collisionFlag:ENEMY,
    x:0.5, y:0.05, shotSpeed:3, shotBehavior:["brAc1"], color:"green", shotColor:"dkgreen",
    action:{
      main:[{aim:0}, {fire:"way7"}, {wait:4}, {shotSpeed:["add", 0.5]}, {shotDirection:["add", 0.3]},
            {loop:20, back:4}, {wait:90}, {shotSpeed:["set", 3]}, {loop:INF, back:-1}]
    },
    fireDef:{way7:{nway:{count:13, interval:10}}},
    behaviorDef:{
      brAc1:["brakeAccell", {threshold:60, friction:0.01, accelleration:0.1}]
    }
  })

  // カーブを使ってみる
  // 設定ミスでdamageがINFになってたのを修正した。まあいいや・・気を付けないとね。
  mySystem.addPatternSeed({
    x:0.5, y:0.1, shotSpeed:200, collisionFlag:OFF, shotCollisionFlag:OFF,
    action:{
      main:[{hide:true}, {shotDirection:["set", 0]}, {shotAction:["set", "right"]}, {fire:""},
            {shotDirection:["set", 180]}, {shotAction:["set", "left"]}, {fire:""}, {vanish:1}],
      right:[{short:"preparate", behavior:"curve2", dir:180}, {short:"fire1"}, {vanish:1}],
      left:[{short:"preparate", behavior:"curve1", dir:0}, {short:"fire1"}, {vanish:1}],
      attack:[{shotSpeed:["set", 3]}, {shotShape:"wedgeSmall"}, {shotColor:"dkblue"},
              {aim:5}, {fire:"way3"}, {wait:16}, {loop:8, back:3}]
    },
    short:{
      preparate:[{shotCollisionFlag:ENEMY},
                 {speed:["set", 0]}, {shotShape:"squareMiddle"},
                 {shotBehavior:["add", "$behavior"]}, {shotAction:["set", "attack"]},
                 {shotDirection:["set", "$dir"]}, {shotSpeed:["set", 6]}],
      fire1:[{fire:""}, {wait:8}, {loop:8, back:2}]
    },
    fireDef:{way3:{nway:{count:3, interval:20}}},
    behaviorDef:{curve1:["curve", {a:1, b:4, c:3}], curve2:["curve", {a:-1, b:-4, c:3}]}
  })

  // なんかx, yでformationのショートカット作ってあったの忘れてた（馬鹿？）。で、ランダム指定できるの？
  // shotDirectionをデフォルトにすれば絶対指定で普通にあれ、そうなるよ。
  // bendも指定できるようにすれば撃ちだしたあれをいろんな方向に飛ばせるね。
  // fall: 5wayを放ちながら落ちていく感じ。raid: 両側から出てきて真ん中に消えていく。
  // sweep: 扇状にぐるんぐるんして下へ。
  // 何パターン追加してんの？？？？
  // ボスなんか作ってる場合か
  // 作るときだけ色や形指定することって出来ないのかなとか。テンポラリー的な？
  mySystem.addPatternSeed({
    x:0, y:-0.1, shotSpeed:2,
    action:{
      main:[{hide:true}, {short:"square", color:"red"},
            {shotAction:["set", "fall"]},
            {fire:"set", x:[80, 400], y:0, bend:90}, {loop:10, back:1},
            {wait:240}, {short:"square", color:"skblue"},
            {shotSpeed:["set", 4]}, {shotAction:["set", "raid"]},
            {fire:"set", x:0, y:0, bend:60}, {shotDelay:["add", 15]}, {loop:10, back:2},
            {shotDelay:["set", 0]},
            {fire:"set", x:480, y:0, bend:120}, {shotDelay:["add", 15]}, {loop:10, back:2},
            {shotDelay:["set", 0]},
            {wait:300}, {short:"square", color:"orange"},
            {shotSpeed:["set", 8]}, {shotAction:["set", "sweep"]},
            {fire:"straight", dist:80, count:5, itv:80, bend:90},
            {wait:360}, {shotShape:"squareLarge"}, {shotColor:"bossBlue"},
            {shotSpeed:["set", 6]}, {shotAction:["set", "boss"]},
            {fire:"set", x:240, y:0, bend:90}, {vanish:1}],
      fall:[{short:"wedge", color:"dkred"},
            {shotSpeed:["set", 4]}, {shotDirection:["set", 90]},
            {aim:5}, {wait:30}, {fire:"way5"}, {loop:4, back:3}, {speed:["set", 8, 60]}],
      raid:[{short:"wedge", color:"dkskblue"},
            {aim:0}, {fire:"way7"}, {wait:30}, {loop:3, back:3},
            {direction:["set", 90, 30]}, {fire:"way7"}, {speed:["set", 8, 30]}],
      sweep:[{short:"wedge", color:"dkorange"},
             {speed:["set", 1, 30]}, {shotSpeed:["set", 4]},
             {short:"sweepShot", iniDir:60, diff:5, wait:4, count:13},
             {wait:60},
             {short:"sweepShot", iniDir:120, diff:-5, wait:4, count:13},
             {speed:["set", 8, 60]}],
      boss:[{shotShape:"wedgeMiddle"}, {shotColor:"dkblue"},
            {speed:["set", 0, 60]}, {shotSpeed:["set", 4]},
            {short:"sweepShot", iniDir:45, diff:5, wait:4, count:19}, {wait:60},
            {aim:0}, {fire:"ways", count:25, interval:4}, {wait:30}, {loop:3, back:3},
            {short:"sweepShot", iniDir:135, diff:-5, wait:4, count:19}, {wait:60},
            {aim:0}, {fire:"lines", waycount:15, interval:12, linecount:3, up:0.5},
            {wait:30}, {loop:3, back:3},
            {direction:["set", 0]}, {speed:["set", 24]}, {wait:10},
            {shotAction:["set", "decel"]}, {speed:["set", 4]}, {shotDirection:["set", 90]},
            {direction:["set", 180]}, {short:"curtain"}, {direction:["set", 0]}, {short:"curtain"},
            {loop:2, back:10}, {direction:["set", 180]}, {speed:["set", 2]}, {wait:120},
            {speed:["set", 0]},
            {shotShape:"wedgeHuge"}, {shotAction:["set", "burst"]},
            {fire:""}, {wait:240}, {shotShape:"wedgeMiddle"}, {shotAction:["clear"]},
            {loop:INF, back:-5}],
      decel:[{speed:["set", 2, 60]}],
      burst:[{speed:["set", 0, 60]}, {hide:true}, {shotSpeed:["set", 2]}, {short:"wedge", color:"black"},
             {shotDirection:["set", [0, 360]]}, {fire:""}, {loop:120, back:2},
             {wait:60}, {loop:3, back:4}, {vanish:1}]
    },
    short:{
      square:[{shotShape:"squareMiddle"}, {shotColor:"$color"}],
      wedge:[{shotShape:"wedgeSmall"}, {shotColor:"$color"}],
      sweepShot:[{shotDirection:["set", "$iniDir"]}, {fire:""}, {shotDirection:["add", "$diff"]},
                 {wait:"$wait"}, {loop:"$count", back:3}],
      curtain:[{fire:""}, {wait:1}, {loop:105, back:2}, {wait:15}]
    },
    fireDef:{
      set:{x:"$x", y:"$y", bend:"$bend"},
      straight:{formation:{type:"frontHorizontal", count:"$count", distance:"$dist", interval:"$itv"}, bend:"$bend"},
      way5:{nway:{count:5, interval:20}}, way7:{nway:{count:7, interval:5}},
      ways:{nway:{count:"$count", interval:"$interval"}},
      lines:{nway:{count:"$waycount", interval:"$interval"}, line:{count:"$linecount", upSpeed:"$up"}}
    }
  })

  // 長方形出してから自滅。
  // せっかくだからsignal使ってみる。できた！面白ぇ！！！
  mySystem.addPatternSeed({
    x:0.5, y:0.5, shotShape:"rectSmall", shotDirection:90, shotSpeed:4, collisionFlag:ENEMY,
    action:{
      main:[{shotAction:["set", "bendto90"]},
            {fire:""}, {wait:4}, {shotDirection:["add", 4]}, {loop:12, back:-1}, {vanish:1}],
      bendto90:[{signal:"vanish"}, {direction:["set", 90]}]
    }
  })

  // 課題1: parentがやられたら破裂。成功。
  mySystem.addPatternSeed({
    x:0.5, y:0.3, collisionFlag:ENEMY, shotDirection:90, shotSpeed:4,
    shotShape:"wedgeMiddle", shotColor:"red", color:"dkred",
    action:{
      main:[{shotAction:["set", "burst"]},
            {shotDirection:["add", [-10, 10]]}, {fire:""}, {wait:16}, {loop:INF, back:3}],
      burst:[{signal:"vanish"}, {shotShape:"wedgeSmall"}, {shotColor:"dkred"},
             {aim:5}, {fire:"rad8"}, {vanish:1}]
    },
    fireDef:{rad8:{radial:{count:8}}}
  })

  // 課題2: 自機のsizeの5倍以内に近付いたらaimしてぎゅーん。
  mySystem.addPatternSeed({
    x:0.5, y:0.5, collisionFlag:ENEMY, shotDirection:90, shotSpeed:1, shotColor:"red", color:"dkred",
    action:{
      main:[{shotAction:["set", "raid"]},
            {shotDirection:["add", 10]}, {fire:""}, {wait:32}, {loop:INF, back:3}],
      raid:[{signal:"approach"}, {direction:["aim", 0]}, {speed:["set", 8, 30]}]
    }
  })

  // 課題3: 敵が、倒れたときに自機狙いを3発発射するやつ。
  // signal:"vanish", follow:trueで自動的に親の位置に移動する。
  // 迫力がないので8発にしました。こら
  mySystem.addPatternSeed({
    x:0, y:0.1, shotColor:"green", shotShape:"squareMiddle", shotSpeed:1,
    action:{
      main:[{hide:true}, {shotAction:["set", "dieAndShot"]},
            {fire:"set", x:[80, 400], y:40}, {wait:60}, {loop:INF, back:2}],
      dieAndShot:[{shotSpeed:["set", 0]}, {shotAction:["set", "aim8"]}, {fire:""}, {shotAction:["clear"]},
                  {shotShape:"wedgeSmall"}, {shotSpeed:["set", 4]}, {shotDirection:["set", 90]},
                  {fire:""}, {wait:32}, {loop:INF, back:2}],
      aim8:[{hide:true}, {signal:"vanish", follow:true},
            {shotShape:"wedgeSmall"}, {shotColor:"dkgreen"}, {shotSpeed:["set", 8]},
            {aim:0}, {fire:""}, {wait:8}, {loop:8, back:3}, {vanish:1}]
    },
    fireDef:{set:{x:"$x", y:"$y", bend:90}}
  })
  // 課題4: 壁で3回反射したらそのまま直進して消える。
  mySystem.addPatternSeed({
    x:0.5, y:0.2, collisionFlag:ENEMY, shotSpeed:4,
    action:{
      main:[{shotAction:["set", "ref3"]}, {aim:0}, {fire:"rad32"}, {wait:240}, {loop:INF, back:3}],
      ref3:[{signal:"reflect"}, {loop:3, back:1}]
    },
    fireDef:{rad32:{radial:{count:32}}}
  })

  // ディレイに問題があった（updateからexecuteを切り離した）ので修正。
  mySystem.addPatternSeed({
    x:0.1, y:0.1, shotSpeed:4, shotDirection:90, speed:8, shotDelay:90, collisionFlag:ENEMY,
    action:{
      main:[{shotAction:["set", "scatter"]}, {shotDelay:["add", -10]},
            {fire:""}, {wait:10}, {loop:INF, back:3}],
      scatter:[{shotDirection:["set", 0]}, {fire:""}, {wait:4}, {shotDirection:["add", 10]},
            {loop:36, back:3}]
    }
  })

  // 敵を倒すと画面外からbulletが襲ってくる(とりあえず上方)
  // こわ。かわしてももう一回狙ってくる。まじこわ。
  mySystem.addPatternSeed({
    x:0.5, y:0.1, shotDirection:-90, collisionFlag:ENEMY,
    action:{
      main:[{shotAction:["set", "hideWait"]}, {fire:"trap"}, {shotAction:["clear"]},
            {shotDirection:["set", 60]}, {shotSpeed:["set", 4]},
            {fire:""}, {shotDirection:["add", 2]}, {wait:4}, {loop:30, back:3},
            {fire:""}, {shotDirection:["add", -2]}, {wait:4}, {loop:30, back:3}, {loop:INF, back:6}],
      hideWait:[{signal:"vanish"}, {direction:["aim", 0]}, {speed:["set", 1]},
                {speed:["set", 8, 120]}, {direction:["aim", 0]}]
    },
    fireDef:{trap:{formation:{type:"frontVertical", distance:64, interval:5, count:96}}}
  })

  // STAGE1
  mySystem.addPatternSeed({
    x:0, y:0, bgColor:"plred",
    action:{
      main:[{hide:true}, {wait:120},
            {short:"decorate", color:"red", shape:"squareMiddle"},
            {shotAction:["set", "leftcurve"]}, {fire:"set", x:0, y:40},
            {wait:16}, {loop:5, back:2}, {wait:120},
            {shotAction:["set", "rightcurve"]}, {fire:"set", x:480, y:40},
            {wait:16}, {loop:5, back:2}, {wait:120},
            {short:"decorate", color:"orange", shape:"squareMiddle"},
            {shotAction:["set", "fall"]}, {fire:"set", x:[40, 440], y:-40}, {loop:10, back:1}, {wait:240},
            {short:"decorate", color:"dkorange", shape:"squareMiddle"},
            {shotAction:["set", "stayFall"]},
            {fire:"set", x:[40, 200], y:-40}, {fire:"set", x:[280, 440], y:-40}, {loop:5, back:2}, {wait:120},
            {shotAction:["set", "whip"]},
            {short:"decorate", color:"dkred", shape:"squareLarge"},
            {fire:"set", x:120, y:-40}, {fire:"set", x:360, y:-40}, {wait:360},
            {shotAction:["set", "way3AndTrap"]},
            {fire:"set", x:120, y:-40}, {fire:"set", x:360, y:-40}, {wait:420},
            {short:"decorate", color:"dkorange", shape:"squareLarge"},
            {shotAction:["set", "fall3"]},
            {fire:"set", x:[200, 280], y:-40}, {loop:5, back:1}, {wait:300},
            {short:"decorate", color:"red", shape:"squareMiddle"},
            {shotAction:["set", "rightcurve"]}, {fire:"set", x:480, y:40},
            {wait:8}, {loop:10, back:2}, {wait:120},
            {shotAction:["set", "leftcurve"]}, {fire:"set", x:0, y:40},
            {wait:8}, {loop:10, back:2}, {wait:360},
            {short:"decorate", color:"bossRed", shape:"doubleWedgeLarge"},
            {shotAction:["set", "boss"]}, {fire:"set", x:240, y:-80}, {vanish:1}],
      leftcurve:[{short:"setV", speed:8, dir:0}, {wait:15}, {short:"curveMove"}],
      rightcurve:[{short:"setV", speed:8, dir:180}, {wait:15}, {short:"curveMove"}],
      fall:[{short:"setV", speed:4, dir:90}, {shotSpeed:["set", 6]},
            {short:"decorate", color:"orange", shape:"wedgeSmall"}, {speed:["set", 1, 30]},
            {wait:5}, {aim:0}, {fire:""}, {loop:15, back:3},
            {speed:["set", 4, 30]}, {wait:5}, {aim:0}, {fire:""}, {loop:5, back:3}],
      stayFall:[{short:"setV", speed:8, dir:90}, {shotSpeed:["set", 3]}, {speed:["set", 0.01, 30]},
                {short:"decorate", color:"dkorange", shape:"wedgeSmall"},
                {aim:0}, {fire:"nwayLine", wcount:3, interval:10, lcount:5, upSpeed:0.5}, {wait:80}, {loop:3, back:3},
                {speed:["set", 2, 240]}, {speed:["set", 8, 60]}],
      whip:[{short:"setV", speed:6, dir:90}, {shotSpeed:["set", 3]}, {speed:["set", 0.01, 30]},
              {shotDirection:["set", 60]}, {short:"decorate", color:"dkred", shape:"wedgeSmall"},
              {fire:""}, {wait:6}, {shotDirection:["add", 4]}, {loop:15, back:3}, {wait:30},
              {fire:""}, {wait:6}, {shotDirection:["add", -4]}, {loop:15, back:3},
              {speed:["set", 8, 60]}],
      way3AndTrap:[{short:"setV", speed:8, dir:90}, {shotSpeed:["set", 4]}, {shotAction:["set", "afterRaid"]},
                   {short:"decorate", color:"dkred", shape:"wedgeSmall"}, {speed:["set", 0.001, 30]},
                   {aim:0}, {fire:"nwayLine", wcount:3, interval:10, lcount:13, upSpeed:0.2},
                   {wait:60}, {loop:3, back:3}, {speed:["set", 8, 60]}],
      fall3:[{short:"setV", speed:6, dir:90}, {shotSpeed:["set", 6]}, {shotAction:["set", "afterRaid"]},
             {short:"decorate", color:"dkorange", shape:"wedgeSmall"}, {speed:["set", 1, 60]},
             {aim:0}, {fire:"nwayLine", wcount:5, interval:20, lcount:20, upSpeed:0.1}, {wait:60},
             {aim:0}, {fire:"nwayLine", wcount:5, interval:20, lcount:20, upSpeed:0.1}, {speed:["set", 8, 30]}],
      boss:[{short:"decorate", color:"bossRed", shape:"wedgeSmall"}, {shotDirection:["set", 90]},
            {shotAction:["set", "soldier"]}, {fire:"setSoldier"}, {shotAction:["clear"]},
            {shotSpeed:["set", 6]}, {short:"setV", speed:6, dir:90}, {speed:["set", 0, 60]},
            {aim:0}, {fire:"nwayLine", wcount:13, interval:8, lcount:20, upSpeed:0.2},
            {wait:60}, {loop:5, back:3},
            {wait:60},
            {shotSpeed:["set", 4]}, {shotShape:"wedgeMiddle"},
            {aim:0}, {fire:"nway", count:13, interval:15}, {wait:8},
            {shotSpeed:["set", 8]}, {shotShape:"wedgeSmall"},
            {aim:0}, {fire:"nway", count:5, interval:8}, {wait:4}, {loop:15, back:3}, {wait:60}, {loop:5, back:12},
            {short:"setV", speed:24, dir:0}, {wait:10},
            {shotAction:["set", "calm"]}, {shotDirection:["set", 90]}, {shotSpeed:["set", 8]},
            {short:"curtain"}, {shotAction:["clear"]},
            {short:"setV", speed:2, dir:180}, {wait:120}, {speed:["set", 0]},
            {shotAction:["set", "burst"]}, {aim:0}, {fire:"rad5"},
            {shotAction:["clear"]}, {shotSpeed:["set", 6]}, {wait:240}, {loop:INF, back:-10}],
      afterRaid:[{signal:"vanish"}, {direction:["aim", 0]}],
      soldier:[{hide:true}, {signal:"vanish"}, {hide:false},
               {direction:["aim", 0]}, {speed:["set", 8, 60]}, {wait:60}, {direction:["aim", 0]}],
      calm:[{speed:["set", 2, 30]}],
      burst:[{short:"decorate", color:"bossRed", shape:"wedgeMiddle"}, {speed:["set", 1, 30]},
             {fire:"rad5"}, {wait:4}, {direction:["add", 3]}, {loop:25, back:3}, {vanish:1}]
    },
    short:{
      decorate:[{shotColor:"$color"}, {shotShape:"$shape"}],
      setV:[{speed:["set", "$speed"]}, {direction:["set", "$dir"]}],
      curveMove:[{shotSpeed:["set", 4]}, {short:"decorate", color:"red", shape:"wedgeSmall"},
                 {aim:0}, {fire:"nway", count:3, interval:10}, {direction:["set", 90, 30]},
                 {aim:0}, {fire:"nway", count:3, interval:10}, {speed:["set", 12, 30]}],
      curtain:[{short:"setV", speed:4, dir:180}, {fire:""}, {wait:1}, {loop:80, back:2}, {wait:40},
               {short:"setV", speed:4, dir:0}, {fire:""}, {wait:1}, {loop:80, back:2}, {wait:40},
               {loop:2, back:12}]
    },
    fireDef:{set:{x:"$x", y:"$y"},
             nway:{nway:{count:"$count", interval:"$interval"}},
             nwayLine:{nway:{count:"$wcount", interval:"$interval"}, line:{count:"$lcount", upSpeed:"$upSpeed"}},
             setSoldier:{formation:{type:"frontVertical", distance:40, count:96, interval:5}},
             rad5:{radial:{count:5}}
    },
  })

  // doubleWedgeの確認
  // さらに新しいcircularの実験、割とうまく行ったね。移動するユニットの周りの回転軌道。
  mySystem.addPatternSeed({
    x:0.5, y:0.5, collisionFlag:ENEMY, shotSpeed:4, shotDirection:90,
    shape:"doubleWedgeLarge", color:"dkblue",
    action:{
      main:[{shotShape:"doubleWedgeMiddle"}, {shotColor:"dkblue"}, {shotCollisionFlag:ENEMY},
            {shotAction:["set", "guard"]}, {shotSpeed:["set", 8]}, {fire:"rad4"}, {wait:60},
            {speed:["set", 2]}, {wait:60}, {direction:["mirror", 90]}, {loop:INF, back:2}],
      guard:[{bind:true}, {speed:["set", 0, 20]}, {behavior:["add", "circ"]}]
    },
    fireDef:{rad4:{radial:{count:4}}},
    behaviorDef:{circ:["circular", {bearing:1}]}
  })

  // 楕円軌道で実験したいわね。できたよ。
  // 親の位置から発射っていうのは実装したところであんま応用効かなさそうね。
  mySystem.addPatternSeed({
    x:0.5, y:0.2, collisionFlag:ENEMY, color:"dkgrey", bgColor:"plgrey",
    action:{
      main:[{shotShape:"squareMiddle"}, {shotColor:"grey"}, {shotCollisionFlag:ENEMY},
            {short:"enemySet", name:"enemy0"}, {short:"enemySet", name:"enemy1"},
            {short:"enemySet", name:"enemy2"}, {short:"enemySet", name:"enemy3"},
            {short:"enemySet", name:"enemy4"}, {short:"enemySet", name:"enemy5"}],
      enemy0:[{short:"enemyPtn", wait:0, shotColor:"blue"}],
      enemy1:[{short:"enemyPtn", wait:40, shotColor:"red"}],
      enemy2:[{short:"enemyPtn", wait:80, shotColor:"yellow"}],
      enemy3:[{short:"enemyPtn", wait:120, shotColor:"blue"}],
      enemy4:[{short:"enemyPtn", wait:160, shotColor:"red"}],
      enemy5:[{short:"enemyPtn", wait:200, shotColor:"yellow"}]
    },
    short:{
      enemySet:[{shotAction:["set", "$name"]}, {fire:"set"}],
      enemyPtn:[{hide:true}, {wait:"$wait"}, {behavior:["add", "ellipse"]}, {hide:false}, {bind:true},
                {shotShape:"wedgeMiddle"}, {shotColor:"$shotColor"}, {shotSpeed:["set", 4]},
                {shotDirection:["fromParent", 0]}, {fire:""}, {wait:2}, {loop:INF, back:3}]
    },
    fireDef:{set:{x:180, y:0}},
    behaviorDef:{ellipse:["circular", {bearing:1.5, ratioXY:0.4}]}
  })

  // freeFallBehavior.
  mySystem.addPatternSeed({
    x:0.5, y:0.3, collisionFlag:ENEMY, shotBehavior:["fall"],
    shape:"squareLarge", color:"bossBlue", shotShape:"wedgeSmall", shotColor:"bossBlue",
    action:{
      main:[{shotAction:["set", "groundRaid"]},
            {shotDirection:["set", [-120, -60]]}, {shotSpeed:["set", [3, 6]]}, {fire:""},
            {wait:30}, {loop:INF, back:-2}],
      groundRaid:[{signal:"ground"}, {behavior:["clear"]},
                  {shotSpeed:["set", 8]}, {speed:["set", 0]}, {shotColor:"bossBlue"},
                  {aim:5}, {fire:""}, {wait:2}, {loop:30, back:2}, {vanish:1}]
    },
    behaviorDef:{fall:["freeFall", {}]}
  })

  // レーザー1
  // 案の定当たり判定で失敗していますね。わぁい。修正修正！
  // 修正した。出来たけどなんか迫力ないな・・つまんね・・
  // これ自機が出せるようにできない？スペースキー押してる時間で太さが変わるの・・
  // ・・・・シュプールかよ！
  // もうちょっと挙動をよくするには、ヘッドに「画面外に出たら静止」、テールに「画面外に出たら消滅」を命令すればいい。
  // 自機が放つ場合にそれを適用したらいいかも。やばい・・パソコン・・
  // frameOutのsignal使って、ヘッドは画面外で速さ0.1, テールは画面外で消滅するようにした。
  // さらにbindで親が（テールが）消えたら同時に消えるようにした。完璧。
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

  // 以前作ったやつー
  // rainbow.
  mySystem.addPatternSeed({
    x:0.5, y:0.1, collisionFlag:ENEMY, shotDirection:90, color:"dkgrey", shotSpeed:4,
    shotShape:"wedgeMiddle", bgColor:"plgrey",
    action:{
      main:[{shotAction:["set", "split2"]},
            {short:"rainbow", type:"", dirDiff:360/7},
            {shotDirection:["add", 4]}, {wait:4}, {loop:8, back:23}, {wait:32}, {loop:4, back:25},
            {shotSpeed:["set", 2]}, {aim:0},
            {short:"rainbow", type:"way6", dirDiff:360/7},
            {shotSpeed:["set", 4]}, {wait:64},
            {short:"rainbow", type:"", dirDiff:360/7},
            {shotDirection:["add", -4]}, {wait:4}, {loop:8, back:23}, {wait:32}, {loop:4, back:25},
            {shotSpeed:["set", 2]}, {aim:0},
            {short:"rainbow", type:"way6", dirDiff:360/7},
            {shotSpeed:["set", 4]}, {wait:64},
            {loop:INF, back:-2}],
      split2:[{speed:["set", 1, 60]}, {fire:"way2"}, {vanish:1}],
    },
    short:{
      rainbow:[{shotColor:"red"}, {fire:"$type"}, {shotDirection:["add", "$dirDiff"]},
               {shotColor:"orange"}, {fire:"$type"}, {shotDirection:["add", "$dirDiff"]},
               {shotColor:"yellow"}, {fire:"$type"}, {shotDirection:["add", "$dirDiff"]},
               {shotColor:"ltgreen"}, {fire:"$type"}, {shotDirection:["add", "$dirDiff"]},
               {shotColor:"blue"}, {fire:"$type"}, {shotDirection:["add", "$dirDiff"]},
               {shotColor:"dkblue"}, {fire:"$type"}, {shotDirection:["add", "$dirDiff"]},
               {shotColor:"purple"}, {fire:"$type"}, {shotDirection:["add", "$dirDiff"]}],
    },
    fireDef:{way2:{nway:{count:2, interval:30}}, way6:{nway:{count:6, interval:8}}}
  })

  // groundRaidのlaserバージョン。
  // calmの中身でwait:30とか適切に間合いを置かなかったせいでいきなりsignalが発動しちゃうバグが発生していたっぽい。
  // クリアできないようにway3にしといた。OK!
  mySystem.addPatternSeed({
    x:0.5, y:0.3, collisionFlag:ENEMY, color:"bossRed", bgColor:"plred",
    shotShape:"wedgeMiddle", shotColor:"dkred", shotSpeed:4, shotBehavior:["fall"],
    action:{
      main:[{shotAction:["set", "braze"]},
            {shotDirection:["set", [-120, -60]]}, {shotSpeed:["set", [3, 6]]},
            {fire:""}, {wait:60}, {loop:INF, back:4}],
      braze:[{signal:"ground"}, {shotSpeed:["set", 0.1]}, {aim:10},
             {shotAction:["set", "laserUnit"]}, {fire:"way3"}, {vanish:1}],
      laserUnit:[{hide:true},
                 {shotShape:"laserMiddle"},
                 {shotAction:["set", "calm"]},
                 {shotSpeed:["set", 12]}, {shotDirection:["rel", 0]},
                 {fire:""}, {speed:["set", 12, 60]}, {signal:"frameOut"}, {vanish:1}],
      calm:[{bind:true}, {wait:30}, {signal:"frameOut"}, {speed:["set", 0.1]}]
    },
    fireDef:{way3:{nway:{count:3, interval:20}}},
    behaviorDef:{fall:["freeFall", {}]}
  })

  // CherryBlossom.
  mySystem.addPatternSeed({
    x:0.5, y:0.2, collisionFlag:ENEMY,
    shape:"cherryLarge", shotShape:"wedgeMiddle", shotColor:"dkgreen", bgColor:"plbrown", color:"bossPink",
    action:{
      main:[{shotSpeed:["set", 4]}, {shotDirection:["set", 45]}, {shotAction:["set", "rad37"]},
            {fire:"rad4"}, {wait:120}, {shotAction:["clear"]},
            {shotDirection:["set", 60]}, {fire:""}, {shotDirection:["add", 6]}, {wait:8}, {loop:10, back:3},
            {wait:30},
            {shotDirection:["set", 120]}, {fire:""}, {shotDirection:["add", -6]}, {wait:8}, {loop:10, back:3},
            {wait:30},
            {shotSpeed:["set", 8]},
            {shotDirection:["set", -15]}, {shotAction:["set", "trap135"]}, {fire:""},
            {shotDirection:["set", 195]}, {shotAction:["set", "trap45"]}, {fire:""}, {wait:240},
            {speed:["set", 4]}, {direction:["set", 90]}, {wait:20}, {speed:["set", 0]},
            {shotColor:"killgreen"},
            {shotAction:["set", "star5"]}, {fire:"rad5"}, {wait:300},
            {speed:["set", 4]}, {direction:["set", -90]}, {wait:20}, {speed:["set", 0]},
            {shotColor:"dkgreen"},
            {loop:INF, back:-1}],
      rad37:[{speed:["set", 1, 60]}, {aim:0}, {shotSpeed:["set", 4]}, {fire:"rad37"}, {vanish:1}],
      trap135:[{short:"trapSeed", fireDir:135}],
      trap45:[{short:"trapSeed", fireDir:45}],
      trap:[{shotDelay:["set", 60]}, {speed:["set", 8]},
            {shotDirection:["add", 20]}, {fire:""}, {wait:1}, {loop:INF, back:3}],
      star5:[{speed:["set", 2, 30]}, {shotSpeed:["set", 6]}, {hide:true},
             {fire:"rad5"}, {wait:6}, {loop:15, back:2}, {vanish:1}],
    },
    short:{
      trapSeed:[{speed:["set", 1, 60]}, {shotDirection:["set", "$fireDir"]}, {shotAction:["set", "trap"]},
               {fire:""}, {vanish:1}]
    },
    fireDef:{rad4:{radial:{count:4}}, rad37:{radial:{count:37}}, rad5:{radial:{count:5}}}
  })

  // めんどうね。
  mySystem.addPatternSeed({
    x:0.0, y:0.0, bgColor:"plbrown",
    action:{
      main:[{deco:{speed:8, direction:90, color:"brown", shape:"squareMiddle"}},
            {shotAction:["set", "enemy1"]},
            {set:{x:[80, 160], y:-40}}, {fire:""}, {wait:10}, {loop:6, back:3}, {wait:120},
            {set:{x:[320, 400], y:-40}}, {fire:""}, {wait:10}, {loop:6, back:3}, {wait:120},
            {set:{x:[200, 280], y:-40}}, {fire:""}, {wait:10}, {loop:6, back:3}, {wait:120},
            {set:{x:120, y:-40}}, {speed:["set", 4]},
            {shotAction:["set", "enemy2"]},
            {fire:""}, {wait:10}, {loop:7, back:2},
            {direction:["set", 180]}, {set:{x:320, y:-40}},
            {fire:""}, {wait:10}, {loop:6, back:2},
            {speed:["set", 0]}],
      enemy1:[{deco:{speed:6, color:"brown", shape:"wedgeSmall"}},
              {speed:["set", 1, 30]}, {aim:0}, {fire:"nway", c:5, itv:20},
              {wait:8}, {loop:10, back:3},
              {wait:60}, {speed:["set", 8, 30]}],
      enemy2:[{deco:{speed:4, color:"brown", shape:"wedgeSmall"}},
              {speed:["set", 1, 30]},
              {aim:0}, {fire:"nwayLine", wc:3, itv:10, lc:3, us:0.5}, {wait:30}, {shotSpeed:["set", 2]},
              {aim:0}, {fire:"radialLine", rc:15, lc:3, us:0.5}, {wait:30},
              {speed:["set", 8, 30]}]
    },
    fireDef:{nway:{nway:{count:"$c", interval:"$itv"}}, radial:{radial:{count:"$c"}},
             nwayRadial:{nway:{count:"$wc", interval:"$itv"}, radial:{count:"$rc"}},
             nwayLine:{nway:{count:"$wc", interval:"$itv"}, line:{count:"$lc", upSpeed:"$us"}},
             radialLine:{radial:{count:"$rc"}, line:{count:"$lc", upSpeed:"$us"}}
    }
  })

  mySystem.setPattern(DEFAULT_PATTERN_INDEX);

}

function draw(){
  background(mySystem.backgroundColor);

	const runStart = performance.now();
	const updateStart = performance.now();
  mySystem.update(); // 更新
  const collisionCheckStart = performance.now();
  mySystem.collisionCheck(); // 衝突判定
  const collisionCheckEnd = performance.now();
  const actionStart = performance.now();
  mySystem.execute(); // 行動
  const actionEnd = performance.now();
	const updateEnd = performance.now();
	const ejectStart = performance.now();
  mySystem.eject(); // 排除
	const ejectEnd = performance.now();
	const drawStart = performance.now();
  mySystem.draw(); // 描画
	const drawEnd = performance.now();
  const runEnd = performance.now();

	if(showInfo){ showPerformanceInfo(runEnd - runStart, collisionCheckEnd - collisionCheckStart,
                                    actionEnd - actionStart,
                                    updateEnd - updateStart, ejectEnd - ejectStart, drawEnd - drawStart); }
  drawConfig();
}

// ---------------------------------------------------------------------------------------- //
// PerformanceInfomation.

function showPerformanceInfo(runTime, collisionCheckTime, actionTime, updateTime, ejectTime, drawTime){
  let y = 0; // こうすれば新しいデータを挿入しやすくなる。指定しちゃうといろいろとね・・
  // ほんとは紐付けとかしないといけないんだろうけど。
	fill(mySystem.infoColor);
  y += TEXT_INTERVAL;
  displayInteger(mySystem.getCapacity(), INDENT, y, "using");
  y += TEXT_INTERVAL;
  displayInteger(mySystem.particleArray.length, INDENT, y, "particle");

  y += TEXT_INTERVAL;
  displayRealNumber(runTime, INDENT, y, "runTime");

  runTimeSum += runTime;
  if(frameCount % AVERAGE_CALC_SPAN === 0){
		runTimeAverage = runTimeSum / AVERAGE_CALC_SPAN;
		runTimeSum = 0;
	}
  y += TEXT_INTERVAL;
  displayRealNumber(runTimeAverage, INDENT, y, "runTimeAverage");
  if(runTimeMax < runTime){
    runTimeMax = runTime;
    collisionCheckTimeAtMax = collisionCheckTime;
    actionTimeAtMax = actionTime;
    updateTimeAtMax = updateTime;
    ejectTimeAtMax = ejectTime;
    drawTimeAtMax = drawTime;
  }
  y += TEXT_INTERVAL;
  displayRealNumber(runTimeMax, INDENT, y, "runTimeMax");
  y += TEXT_INTERVAL;
  displayRealNumber(updateTimeAtMax, INDENT, y, "--update");
  y += TEXT_INTERVAL;
  displayRealNumber(collisionCheckTimeAtMax, INDENT, y, "----collision");
  // collisionはエンジン使った方が速いんかな・・あと高速化の工夫がもっと必要なんだろ
  y += TEXT_INTERVAL;
  displayRealNumber(actionTimeAtMax, INDENT, y, "----action");
  // actionはcommand別の内訳が欲しい。
  y += TEXT_INTERVAL;
  displayRealNumber(ejectTimeAtMax, INDENT, y, "--eject");
  y += TEXT_INTERVAL;
  displayRealNumber(drawTimeAtMax, INDENT, y, "--draw");
  // 別にいいけど、runTimeMaxになった時だけあれ、内訳を更新して表示してもいいと思う。--とか付けて。

  if(usingUnitMax < mySystem.getCapacity()){ usingUnitMax = mySystem.getCapacity(); }
  y += TEXT_INTERVAL * 2;
  displayInteger(usingUnitMax, INDENT, y, "usingUnitMax");

  // 色について内訳表示
  y += TEXT_INTERVAL * 2;
  Object.keys(mySystem.drawGroup).forEach((name) => {
    displayInteger(mySystem.drawGroup[name].length, INDENT, y, name);
    y += TEXT_INTERVAL;
  })
}

// 表示関数（実数版）
function displayRealNumber(value, x, y, explanation, precision = 4){
  // 与えられた実数を(x, y)の位置に小数点以下precisionまで表示する感じ(explanation:~~~って感じ)
  const valueStr = value.toPrecision(precision);
  const innerText = `${valueStr}ms`;
  text(explanation + ":" + innerText, x, y);
}

// 整数版
function displayInteger(value, x, y, explanation){
  text(explanation + ":" + value, x, y);
}

// ---------------------------------------------------------------------------------------- //
// KeyAction.

function keyTyped(){
  if(key === 'p'){
    if(isLoop){ noLoop(); isLoop = false; return; }
    else{ loop(); isLoop = true; return; }
  }else if(key === 'i'){
    if(showInfo){ showInfo = false; return; }
    else{ showInfo = true; return; }
  }
}

function keyPressed(){
  // シフトキーでショットチェンジ（予定）
  if(keyCode === SHIFT){
    mySystem.player.shiftPattern();
  }
}

// ---------------------------------------------------------------------------------------- //
// ClickAction.

function mouseClicked(){
  if(!isLoop){ return; } // ループが止まってる時は受け付けない感じ。
  if(mouseX < AREA_WIDTH || mouseX > width){ return; }
  if(mouseY < 0 || mouseY > AREA_HEIGHT){ return; }
  const x = Math.floor((mouseX - AREA_WIDTH) / 40);
  const y = Math.floor(mouseY / 40);
  const nextPatternIndex = y + (Math.floor(AREA_HEIGHT / 40) * x);
  mySystem.setPattern(nextPatternIndex);
  // 解析情報の初期化。こっちでやろうね。
  usingUnitMax = 0;
  runTimeMax = 0;
}

function drawConfig(){
  // 480x600に相当依存しているのであまりよくない・・・かもね。
  fill(220);
  rect(AREA_WIDTH, 0, 160, AREA_HEIGHT);
  const cur = mySystem.getPatternIndex();
  for(let i = 0; i < mySystem.seedCapacity; i++){
    const x = AREA_WIDTH + Math.floor(i / 15) * 40;
    const y = (i % 15) * 40;
    if(i !== cur){
      fill((i % 4) * 50);
      rect(x, y, 40, 40);
    }else{
      fill(255, 0, 0, 140 + sin(frameCount * 6) * 80);
      rect(x, y, 40, 40);
    }
  }
}

// ここから下。
