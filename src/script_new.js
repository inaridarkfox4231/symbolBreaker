// その上で色々書き直し
// やること多くてごめんね

// これどこまで減らせるんだっけ・・
// 画像取り込みとかやりたいわね。

// 情報とコンフィグ消せば相当小さくなるよ。ほんと。
// 指定としては、まずアングルモードは度数法にしてほしい。あと、

// updateとdraw以外消したいです。

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

let mySystem; // これをメインに使っていく

// ---------------------------------------------------------------------------------------- //
// preload.
// もし画像とかjsonとか引き出す必要があれば。

function preload(){
  /* NOTHING */
}

// ---------------------------------------------------------------------------------------- //
// setup. seedの作成がメイン。
// createSystemは中身をそのまま写しちゃえばいい
// entityをmySystemで取り替えれば全部そのまま通用する。ほとんどいじってないので。

function setup(){
  mySystem = createSystem(480, 600, 1024);
  // AREA_WIDTH = 480, AREA_HEIGHT = 600が代入される。
  // さらにunitPoolも生成する（1024）
  // unitPoolはあっちでしか使ってないのでこれでいいはず・・・
  createCanvas(AREA_WIDTH + 160, AREA_HEIGHT);
  angleMode(DEGREES);
  textSize(16);

  let weaponData = [];
  let weaponCapacity = 0;

  // プレイヤーの攻撃パターン作成
  // デフォルト。黒い弾丸をいっぱい。
  weaponData[weaponCapacity++] = {
    action:{
      main:[{shotAction:"go"}, {catch:"a"}, {nway:{count:4, interval:25}},
            {wait:4}, {loop:INF, back:"a"}],
      go:[{wait:5}, {direction:["set", -90]}]
    }
  };

/*
  weaponData[weaponCapacity++] = {
    // ここにいろいろかく
  };
*/
  mySystem.createPlayer(weaponData);

  // ドル記法の実験（かもしれない）
  mySystem.addPatternSeed({
    x:0.5, y:0.3, shotSpeed:4, shotDirection:90, collisionFlag:ENEMY,
    action:{
      main:[{catch:"a"},
            {short:"waygun", count:3}, {short:"waygun", count:5},
            {short:"waygun", count:7}, {short:"waygun", count:9},
            {wait:16}, {loop:INF, back:"a"}]
    },
    short:{waygun:[{nway:{count:"$count", interval:20}}, {wait:4}, {shotDirection:["add", 5]}]}
  })

  // デモ画面1. 90°ずつ回転するやつ。
  // shotDirectionがアレなのでshotAim使ってね
  mySystem.addPatternSeed({
    x:0.5, y:0.5, shotSpeed:2, shotDirection:90, collisionFlag:ENEMY,
    action:{
      main:[{shotAction:"way3burst"}, {catch:"a"},
            {catch:"b"}, {radial:{count:2, action:[{shotAim:["rel", 0]}, {fire:""}]}},
            {wait:8}, {loop:10, back:"b"}, {wait:32},
            {shotDirection:["add", 45]}, {loop:INF, back:"a"}],
      way3burst:[{wait:16}, {shotAction:"fade"},
                 {nway:{count:3, interval:90}}, {vanish:true}],
      fade:[{wait:60}, {vanish:true}],
    }
  })

  // 新しいcircularの実験中。FALさんの4を書き直し。
  // shotDirectionの初期設定は撃ちだした瞬間の進行方向。
  mySystem.addPatternSeed({
    x:0.5, y:0.3, shotSpeed:10, collisionFlag:ENEMY, bgColor:"plgrey", color:"grey",
    action:{
      main:[{shotAction:"sweeping"}, {deco:{color:"grey", shape:"rectSmall"}}, {radial:{count:2}}],
      sweeping:[{speed:["set", 0.001, 30]}, {move:"circular", bearing:-3},
                {bind:true}, {shotDirection:["rel", 0]},
                {shotSpeed:["set", 2]}, {deco:{color:"black", shape:"rectSmall"}},
                {catch:"a"}, {fire:""}, {wait:1}, {shotDirection:["add", 12]}, {loop:INF, back:"a"}]
    }
  })

  // FALさんの8を書き直し。
  // followとかbendとか面倒な事をしない場合、射出方向は撃ちだしたときのshotDirection(この場合0)を
  // radialで回転させたものに、要するに配置時の中心から外側への方向。それが固定されたままくるくる回る仕組み。
  // それがあのthis.bearingの意味だとすればこれでよいのだろうね。(つまり各unitのshotDirectionは固定！)
  // fromParentのshotDirection操作でちょっと修正。
  mySystem.addPatternSeed({
    x:0.5, y:0.3, collisionFlag:ENEMY,
    action:{
      main:[{shotAction:"flower"}, {shotDistance:["set", 120]},
            {radial:{count:16, action:[{shotAim:["rel", 0]}, {fire:""}]}}],
      flower:[{move:"circular", bearing:0.5}, {bind:true}, {shotSpeed:["set", 2]},
              {catch:"a"}, {catch:"b"}, {nway:{count:2, interval:120}}, {wait:6}, {loop:4, back:"b"},
              {wait:16}, {loop:INF, back:"a"}],
    }
  })

  // FALさんの13を書き直し。バリケード。もう過去には戻れない・・
  mySystem.addPatternSeed({
    x:0.5, y:0.3, shotDirection:45, collisionFlag:ENEMY,
    action:{
      main:[{shotAction:"barricade"}, {shotDistance:["set", 120]},
            {radial:{count:3, action:[{shotAim:["rel", 0]}, {fire:""}]}}],
      barricade:[{move:"circular", bearing:1}, {bind:true}, {shotSpeed:["set", 10]},
                 {catch:"a"}, {radial:{count:4}}, {wait:1}, {loop:INF, back:"a"}],
    }
  })



  // FALさんの17書き直し。これで最後。radiusDiffを使うと螺旋軌道を実現できる。
  // 射出方向はその時の親→自分ベクトルに+15または-15したもの。
  // いぇーい＾＾
  mySystem.addPatternSeed({
    x:0.5, y:0.3, shotDirection:90, collisionFlag:ENEMY,
    action:{
      main:[{catch:"a"}, {shotDistance:["set", 50]},
            {shotAction:"scatter"}, {radial:{count:2}}, {wait:120},
            {shotAction:"scatterInv"}, {radial:{count:2}}, {wait:120},
            {loop:INF, back:"a"}],
      scatter:[{short:"scatter", bearing:1.5, dirDiff:15}],
      scatterInv:[{short:"scatter", bearing:-1.5, dirDiff:-15}],
      trap:[{wait:60}, {speed:["set", 3, 120]}]
    },
    short:{
      scatter:[{move:"circular", bearing:"$bearing", radiusDiff:1}, {bind:true},
               {wait:30}, {shotAction:"trap"}, {shotSpeed:["set", 0.0001]}, {catch:"b"},
               {shotDirection:["fromParent", "$dirDiff"]}, {fire:""}, {wait:4}, {loop:INF, back:"b"}]
    }
  })

  // nwayとlineとradialを全部乗せる実験！
  mySystem.addPatternSeed({
    x:0.5, y:0.5, shotDirection:90, shotSpeed:2, collisionFlag:ENEMY,
    action:{
      main:[{catch:"a"}, {nway:{count:6, interval:20, action:"line5"}}, {wait:60}, {loop:INF, back:"a"}],
      line5:[{line:{count:5, upSpeed:0.4, action:"rad2"}}],
      rad2:[{radial:{count:2}}]
    }
  })

  // ボスの攻撃
  // 20発ガトリングを13way, これを真ん中から放ったり、両脇から放ったり。
  // shotDistance使って修正
  mySystem.addPatternSeed({
    x:0.5, y:0.2, collisionFlag:ENEMY,
    action:{
      main:[{shotAction:"fire"},
            {shotSpeed:["set", 0]}, {catch:"a"}, {fire:""}, {wait:120},
            {shotDirection:["set", 0]}, {shotDistance:["set", 120]},
            {radial:{count:2}}, {shotDistance:["set", 0]}, {wait:120},
            {loop:INF, back:"a"}],
      fire:[{hide:true}, {speed:["set", 0]}, {aim:0}, {shotSpeed:["set", 4]},
            {catch:"b"}, {nway:{count:13, interval:8}}, {wait:4}, {loop:20, back:"b"}, {vanish:true}]
    }
  })
  // なんとなく読めた。分かりやすいなこれ（自画自賛）

  // ランダムに9匹？
  mySystem.addPatternSeed({
    x:0.5, y:-0.1,
    action:{
      main:[{hide:true}, {shotColor:"grey"}, {shotShape:"squareMiddle"}, {shotCollisionFlag:ENEMY},
            {shotAction:"enemy1"}, {catch:"a"},
            {short:"setEnemy", dir:0}, {wait:180},
            {short:"setEnemy", dir:180}, {wait:180}, {loop:INF, back:"a"}],
      enemy1:[{shotShape:"wedgeSmall"}, {shotColor:"black"}, {shotSpeed:["set", 4]},
              {speed:["set", 6]}, {direction:["set", 90]},
              {speed:["set", 2, 60]}, {nway:{count:3, interval:30, action:[{aim:5}, {fire:""}]}}],
    },
    short:{setEnemy:[{shotDirection:["set", "$dir"]}, {catch:"b"}, {shotDistance:["set", [60, 180]]},
                     {fire:""}, {wait:16}, {loop:9, back:"b"}]}
  })


  // デモ画面のカミソリrad8が4ずつ方向逆転するやつ
  mySystem.addPatternSeed({
    x:0.5, y:0.5, shotSpeed:2, shotDirection:90, collisionFlag:ENEMY,
    action:{
      main:[{catch:"a"}, {short:"routine", dirDiff:4}, {short:"routine", dirDiff:-4},
            {loop:INF, back:"a"}]
    },
    short:{
      routine:[{catch:"b"}, {radial:{count:8}}, {shotDirection:["add", "$dirDiff"]}, {wait:8},
               {loop:4, back:"b"}, {wait:16}]
    }
  })

  // shotDistanceを80から400まで40ずつ増やして9匹出したあと40ずつ減らして8匹. 12フレーム間隔。
  mySystem.addPatternSeed({
    x:0, y:-0.2, bgColor:"plorange", shotSpeed:8,
    action:{
      main:[{hide:true}, {shotShape:"squareMiddle"}, {shotColor:"orange"}, {shotCollisionFlag:ENEMY},
            {shotAction:"attack1"}, {short:"createEnemy"}, {wait:240},
            {shotAction:"attack2"}, {short:"createEnemy"}, {vanish:true}],
      attack1:[{short:"preparation"}, {catch:"c"},
               {nway:{count:3, interval:45}},
               {wait:60}, {loop:3, back:"c"}, {speed:["set", 8, 30]}],
      attack2:[{short:"preparation"}, {catch:"d"},
               {nway:{count:5, interval:40, action:"line3"}},
               {wait:60}, {loop:3, back:"d"}, {speed:["set", 8, 30]}],
      line3:[{line:{count:3, upSpeed:0.2}}]
    },
    short:{
      createEnemy:[{shotDistance:["set", 40]}, {catch:"a"},
                   {shotDistance:["add", 40]}, {fire:""}, {wait:12}, {loop:9, back:"a"}, {catch:"b"},
                   {shotDistance:["add", -40]}, {fire:""}, {wait:12}, {loop:8, back:"b"}],
      preparation:[{shotShape:"wedgeSmall"}, {shotColor:"dkorange"},
                   {shotSpeed:["set", 4]}, {direction:["set", 90]}, {speed:["set", 1, 60]}, {aim:5}]
    }
  })

  // もっとも単純な形。中央にノードユニットが鎮座しているだけ。ほんとうに、何もしない。
  mySystem.addPatternSeed({x:0.5, y:0.5, action:{main:[]}})

  // shotActionとnwayの基本的な使い方
  mySystem.addPatternSeed({
    x:0.5, y:0.2, shotSpeed:5, shotDirection:90,
    action:{
      main:[{shotAction:"burst"}, {fire:""}],
      burst:[{wait:30}, {nway:{count:5, interval:72, action:"way5"}}, {vanish:true}],
      way5:[{nway:{count:5, interval:10}}]
    }
  })

  // 5, 4, 3, 2. (radial)
  mySystem.addPatternSeed({
    x:0.5, y:0.5, shotSpeed:4, shotDirection:90, collisionFlag:ENEMY, shape:"starLarge", color:"dkblue",
    action:{
      main:[{short:"deco"}, {catch:"a"},{shotAction:"way4"}, {radial:{count:5}}, {wait:300}, {loop:INF, back:"a"}],
      way4:[{short:"preparation"}, {shotAction:"way3"}, {radial:{count:4}}, {vanish:true}],
      way3:[{short:"preparation"}, {shotAction:"way2"}, {radial:{count:3}}, {vanish:true}],
      way2:[{short:"preparation"}, {radial:{count:2}}, {vanish:true}]
    },
    short:{
      preparation:[{short:"deco"}, {speed:["set", 0.1, 15]}, {shotDirection:["rel", 0]}],
      deco:[{deco:{shape:"rectSmall", color:"black"}}]
    }
  })

  // 5, 4, 3, 2. (nway)
  mySystem.addPatternSeed({
    x:0.5, y:0.5, shotSpeed:4, shotDirection:90, collisionFlag:ENEMY, shape:"starLarge", color:"dkblue",
    action:{
      main:[{short:"deco"}, {catch:"a"},{shotAction:"way4"}, {nway:{count:5, interval:72}}, {wait:300}, {loop:INF, back:"a"}],
      way4:[{short:"preparation"}, {shotAction:"way3"}, {nway:{count:4, interval:90}}, {vanish:true}],
      way3:[{short:"preparation"}, {shotAction:"way2"}, {nway:{count:3, interval:120}}, {vanish:true}],
      way2:[{short:"preparation"}, {nway:{count:2, interval:180}}, {vanish:true}]
    },
    short:{
      preparation:[{short:"deco"}, {speed:["set", 1, 15]}, {shotDirection:["rel", 0]}],
      deco:[{deco:{shape:"rectSmall", color:"black"}}]
    }
  })

  // 2, 3, 5, 7. (radial)
  mySystem.addPatternSeed({
    x:0.5, y:0.5, shotSpeed:6, shotDirection:90, collisionFlag:ENEMY, shape:"starLarge", color:"dkblue",
    action:{
      main:[{short:"deco"}, {catch:"a"},{shotAction:"way4"}, {radial:{count:2}}, {wait:300}, {loop:INF, back:"a"}],
      way4:[{short:"preparation"}, {shotAction:"way3"}, {radial:{count:3}}, {vanish:true}],
      way3:[{short:"preparation"}, {shotAction:"way2"}, {radial:{count:5}}, {vanish:true}],
      way2:[{short:"preparation"}, {radial:{count:7}}, {vanish:true}]
    },
    short:{
      preparation:[{short:"deco"}, {speed:["set", 0.1, 15]}, {shotDirection:["rel", 0]}],
      deco:[{deco:{shape:"rectSmall", color:"black"}}]
    }
  })

  // 2, 3, 5, 7. (nway)
  mySystem.addPatternSeed({
    x:0.5, y:0.5, shotSpeed:6, shotDirection:90, collisionFlag:ENEMY, shape:"starLarge", color:"dkblue",
    action:{
      main:[{short:"deco"}, {catch:"a"},{shotAction:"way4"}, {nway:{count:2, interval:180}}, {wait:300}, {loop:INF, back:"a"}],
      way4:[{short:"preparation"}, {shotAction:"way3"}, {nway:{count:3, interval:120}}, {vanish:true}],
      way3:[{short:"preparation"}, {shotAction:"way2"}, {nway:{count:5, interval:72}}, {vanish:true}],
      way2:[{short:"preparation"}, {nway:{count:7, interval:51.4}}, {vanish:true}]
    },
    short:{
      preparation:[{short:"deco"}, {speed:["set", 0.1, 15]}, {shotDirection:["rel", 0]}],
      deco:[{deco:{shape:"rectSmall", color:"black"}}]
    }
  })

  // 5, 3, 3, 2, 2, 2. (nway)
  mySystem.addPatternSeed({
    x:0.5, y:0.5, shotSpeed:6, shotDirection:90, collisionFlag:ENEMY, shape:"starLarge", color:"dkred", bgColor:"plred",
    action:{
      main:[{short:"deco"}, {catch:"a"},{shotAction:"way1"}, {nway:{count:5, interval:72}}, {wait:300}, {loop:INF, back:"a"}],
      way1:[{short:"preparation"}, {shotAction:"way2"}, {nway:{count:3, interval:120}}, {vanish:true}],
      way2:[{short:"preparation"}, {shotAction:"way3"}, {nway:{count:3, interval:120}}, {vanish:true}],
      way3:[{short:"preparation"}, {shotAction:"way4"}, {nway:{count:2, interval:180}}, {vanish:true}],
      way4:[{short:"preparation"}, {shotAction:"way5"}, {nway:{count:2, interval:180}}, {vanish:true}],
      way5:[{short:"preparation"}, {nway:{count:2, interval:180}}, {vanish:true}]
    },
    short:{
      preparation:[{short:"deco"}, {speed:["set", 0.1, 15]}, {shotDirection:["rel", 0]}],
      deco:[{deco:{shape:"rectSmall", color:"red"}}]
    }
  })

  // 2, 2, 2, 3, 3, 5. (nway)
  mySystem.addPatternSeed({
    x:0.5, y:0.5, shotSpeed:6, shotDirection:90, collisionFlag:ENEMY, shape:"starLarge", color:"dkgreen", bgColor:"plgreen",
    action:{
      main:[{short:"deco"}, {catch:"a"},{shotAction:"way1"}, {nway:{count:2, interval:180}}, {wait:300}, {loop:INF, back:"a"}],
      way1:[{short:"preparation"}, {shotAction:"way2"}, {nway:{count:2, interval:180}}, {vanish:true}],
      way2:[{short:"preparation"}, {shotAction:"way3"}, {nway:{count:2, interval:180}}, {vanish:true}],
      way3:[{short:"preparation"}, {shotAction:"way4"}, {nway:{count:3, interval:120}}, {vanish:true}],
      way4:[{short:"preparation"}, {shotAction:"way5"}, {nway:{count:3, interval:120}}, {vanish:true}],
      way5:[{short:"preparation"}, {nway:{count:5, interval:72}}, {vanish:true}]
    },
    short:{
      preparation:[{short:"deco"}, {speed:["set", 0.1, 15]}, {shotDirection:["rel", 0]}],
      deco:[{deco:{shape:"rectSmall", color:"green"}}]
    }
  })

  // 2, 3, 2, 5, 2, 3. (nway)
  mySystem.addPatternSeed({
    x:0.5, y:0.5, shotSpeed:6, shotDirection:90, collisionFlag:ENEMY, shape:"starLarge", color:"dkblue", bgColor:"plblue",
    action:{
      main:[{short:"deco"}, {catch:"a"},{shotAction:"way1"}, {nway:{count:2, interval:180}}, {wait:300}, {loop:INF, back:"a"}],
      way1:[{short:"preparation"}, {shotAction:"way2"}, {nway:{count:3, interval:120}}, {vanish:true}],
      way2:[{short:"preparation"}, {shotAction:"way3"}, {nway:{count:2, interval:180}}, {vanish:true}],
      way3:[{short:"preparation"}, {shotAction:"way4"}, {nway:{count:5, interval:72}}, {vanish:true}],
      way4:[{short:"preparation"}, {shotAction:"way5"}, {nway:{count:2, interval:180}}, {vanish:true}],
      way5:[{short:"preparation"}, {nway:{count:3, interval:120}}, {vanish:true}]
    },
    short:{
      preparation:[{short:"deco"}, {speed:["set", 0.1, 15]}, {shotDirection:["rel", 0]}],
      deco:[{deco:{shape:"rectSmall", color:"blue"}}]
    }
  })

  mySystem.addPatternSeed({
    x:0.5, y:0.4, shotSpeed:4, shotDirection:90, collisionFlag:ENEMY, shape:"starLarge", color:"black", bgColor:"plblue",
    action:{
      main:[{deco:{shape:"rectLarge", color:"dkblue"}}, {catch:"a"}, {shotAction:"rad8"}, {fire:""}, {wait:600}, {loop:INF, back:"a"}],
      rad8:[{deco:{shape:"rectLarge", color:"dkblue"}}, {short:"preparation"}, {shotAction:"rad0"}, {radial:{count:2}}, {vanish:true}],
      rad0:[{deco:{shape:"rectLarge", color:"dkblue"}}, {short:"preparation"}, {shotAction:"rad1"}, {radial:{count:2}}, {vanish:true}],
      rad1:[{deco:{shape:"rectLarge", color:"blue"}}, {short:"preparation"}, {shotAction:"rad2"}, {radial:{count:2}}, {vanish:true}],
      rad2:[{deco:{shape:"rectMiddle", color:"blue"}}, {short:"preparation"}, {shotAction:"rad3"}, {radial:{count:3}}, {vanish:true}],
      rad3:[{deco:{shape:"rectMiddle", color:"blue"}}, {short:"preparation"}, {shotAction:"rad4"}, {radial:{count:2}}, {vanish:true}],
      rad4:[{deco:{shape:"rectMiddle", color:"blue"}}, {short:"preparation"}, {shotAction:"rad5"}, {radial:{count:2}}, {vanish:true}],
      rad5:[{deco:{shape:"rectSmall", color:"blue"}}, {short:"preparation"}, {shotAction:"rad6"}, {radial:{count:2}}, {vanish:true}],
      rad6:[{deco:{shape:"rectSmall", color:"blue"}}, {short:"preparation"}, {shotAction:"rad7"}, {radial:{count:5}}, {vanish:true}],
      rad7:[]
    },
    short:{
      preparation:[{speed:["set", 0.1, 30]}, {shotDirection:["rel", 60]}]
    }
  })

// 回転砲台にならないね。おかしいな・・・
// nwayでアレンジしたけど大して面白くないね。
mySystem.addPatternSeed({
  x:0.5, y:0.5, shotSpeed:6, shotDirection:90, collisionFlag:ENEMY,
  action:{
    main:[{shotShape:"rectSmall"}, {shotAction:"rad5"}, {catch:"a"}, {shotDirection:["add", 12]}, {radial:{count:5}},
          {wait:5}, {loop:INF, back:"a"}],
    rad5:[{shotShape:"rectSmall"}, {shotSpeed:["set", 6]}, {shotDirection:["rel", 0]}, {speed:["set", 0.1, 30]},
          {nway:{count:4, interval:10}}, {vanish:true}]
  }
})

// 久しぶり過ぎていろいろ忘れてるのでなんか書きたいよね・・
// ていうかいったんまとめたい（行数長くていいから）
// てかfireDefやめたんだっけ。そこら辺思い出せないと無理。
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
      fill(255, 0, 0, 140 + sin(frameCount * 6) * 80); // 透明度を変化させて選択状態を可視化
      rect(x, y, 40, 40);
    }
  }
}
