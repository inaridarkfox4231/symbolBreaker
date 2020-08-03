// mySystemを抽象化する試み
// unitとか・・
// parseとか・・
// unitはパラメータ部分をクラスとして切り離したい。
// じゃあ何を残すか？LoopCounterは共通でいいと思う。
// properFrameCountとかかな・・・
// properFrameCountをcommandが変わるたびに初期化して、同じcommandの
// 中での進捗をprogressとして計算できるようにしたら面白いね。

// 最初の問題：とりあえず何から始めるの？
// unit作るか。パラメータ群のクラス化は後で。
// プールから再利用する際に違うパラメータ群にするときだけ
// そうでなければそのままみたいなシステムにしたいかも

// seed = {setup:{}, action:{main:[], ...}, short:{}} 的な。

let mySystem;
let unitPool;

const EMPTY_SLOT = Object.freeze(Object.create(null)); // ダミーオブジェクト

function setup(){
  createCanvas(400, 400);
  textSize(32);
  textAlign(CENTER, CENTER);
  mySystem = new System();
  unitPool = new ObjectPool(() => {return new Unit();}, 100);
}

function draw(){
  background(220, 200, 255);
  text("進捗ダメです", width * 0.5, height * 0.5);
}

// properFrameCountとcounterだけ共通にして・・
// でも再利用考えたらactiveもデフォでいいかも
// properFrameCount使ってない（actionの実行がmainだから用途がない）
// activeも使ってない（vanishをtrueにしたときパーティクル出させる）
// どっちもデフォでは不要・・んー。
// 名前をtrushで統一してtrushなら排除処理を行うとか？vanishでいいよ
// もうしごと

class System{
  constructor(){
    this.units = new CrossReferenceArray();
    this.seeds = [];
    this.currentPatternIndex = 0;
    this.seedCapacity = 0;
  }
  setup(){
    // なんか決めるみたい。bgCOlorについての情報とか？bgが何種類かあるならそれを決めるとか。ステージによる背景の違いとか
    // 曲選択とかそういった情報を、ああ、もちろん言ってみただけ。
  }
  initialize(){
    this.units.loopReverse("eject"); // ユニットすっからかん。
  }
  addPatternSeed(seed){
    this.seeds.push(seed);
    this.seedCapacity++;
  }
  getPatternIndex(){
    return this.currentPatternIndex;
  }
  setPattern(newPatternIndex){
    if(this.seeds[newPatternIndex] === undefined){ return; }
    let seed = this.seeds[newPatternIndex];
    this.setup(seed.setup);
    this.initialize();
    let ptn = parsePatternSeed(seed);
    this.currentPatternIndex = newPatternIndex;
    // console.log(ptn);
    createUnit(ptn);
  }
  addUnit(newUnit){
    this.units.push(newUnit);
  }
}

class Unit{
  constructor(){
    this.counter = new LoopCounter();
    this.initialize();
  }
  setParameter(){
    // パラメータをセット、まあいろいろ。メソッドで使ったり。drawで使ったり。
    // 線分だったら最大長さとか。多角形ならサイズとかそういうの。文章ならテキスト""とか定めるかも。1行に表示する長さとか？
  }
  initialize(){
    this.action = [];
    this.actionIndex = 0;
    this.counter.initialize();
  }
  setPattern(ptn){
    // actionとかはここで。seedから作ったptnを元にプロフィールを作成する感じ。レシピに従って料理を作るイメージ。
  }
  update(){
    // 動きに関するデフォルトの行動があればそれを実行する感じ
  }
  execute(){
    // actionArrayに定められたあれこれを実行する
    if(this.action.length > 0 && this.actionIndex < this.action.length){
      let debug = 0; // デバッグモード
      let continueFlag = true;
      while(continueFlag){
        const command = this.action[this.actionIndex];
        continueFlag = command.execute(this); // flagがfalseを返すときに抜ける
        debug++; // デバッグモード
        if(debug > 10000){
          console.log("INFINITE LOOP ERROR!!");
          console.log(command, this.actionIndex);
          noLoop(); break; } // デバッグモード
        // actionの終わりに来たら勝手に抜ける。その後は永久にwaitになる（予定）
        if(this.actionIndex === this.action.length){ break; }
      }
    }
  }
  draw(){
    // 描画に関するモジュールが備えてあればそれにより実行することがある
    // そんな感じね
  }
  eject(){
    this.belongingArray.remove(this);
  }
}

// update-drawの例
// updateで位置を変えてdrawでそこに文字を表示するとか
// 途中まで表示することでゲームのような文字表示を実現する的な
// この場合actionでは例えば表示する文章の内容を変えるとかそういう感じ
// になるのかしら。あるいは何かしらの操作があるまでwaitするとかも
// 命令に組み込むなど。文章送り。
// 何で思いついたか？なんか思いついたから。
// そうね、updateが文章を流し続ける、actionがコマンド入力までwait
// したり文章の内容を変える、drawが文章を表示する。
// 今作りたいあれだと・・
// updateは特にすることないかな、actionでイージングかけつつあるポイント
// まで移動する、waitする、イージングで消える、
// drawで直線とか出す？
// drawParameterで回転を表現するとか。
// updateは取り外し可能にする。
// drawも取り外し可能にする。

// 難しく考えなくていいから簡単なの作ろうな？

// たとえば？
// .....
// 寝ます。
// 寝たら結論出た
// Unitという形で抽象化するのがそもそもおかしいということにようやく気が付いた。
// 違うんだよ。
// クラスはプログラムごとに作るんだよ、で、それを・・その、なんというかあの、ベースにして、
// 別の何かを・・ていうか持たせるという、実行できる、なんかを。
// その実行する何かをクラス化して・・んぁー。。
// だってプログラムごとにやりたいこと全然違うのに同じ要領で変化のシークエンスを持たせるわけだからね、・・。
// 全部Unitで統一したら無理が出る。そういう感じの。
// 場合によってはObjectPoolさえ必要ない、だってそういうプログラムばかりとは限らないでしょ。普通にいくつか用意して使いまわすだけかも、
// たとえば複数の線分がフェードで上下左右から伸びてきて消えるだけとかだったら、複数用意してそのクラスに自動リセットの機能を・・
// というかactionでリセットさせちゃえば済む話でしょ。そういうことで。その機構だけ簡単に書けるようにすればいいってことですね。

// じゃあseedは何を作るのかって話になるけど。だってノードユニットはどうするのっていう。
// そこだけ一般化して、それが作る
// 根っこのユニットをクラスとして用意して
// updateもdrawも持たない、commandを実行する為だけの存在を用意して
// 機構を使う場合はそれを継承して作る形にするかな

// seedを解釈してptnを作る
// このptnは特別なジェネレータというクラスを作る
// たとえば1匹だけ敵を出すような場合でもジェネレータが1つユニットを作る形式にする（つまり従来のcollisionFlagをENEMYにしてとか
// そういうのはもうやらないってこと）。そのジェネレータの性質を決めたり、フィールドの性質（背景とかそういうの）を決めるのがsetupで、
// ジェネレータの挙動（どんなタイミングでUnitを出すかとかそういうの）を決めるのがactionでそこにはそれが出すUnitのactionの情報や
// そのUnitが出すUnitのactionの情報が全部入ってるのは従来通りとする。
// 書き換えが大変そうだけど。
// で、1つしか作らない場合は、main:"default"ってやると自動的に内容がmain:[{shotAction:"act"}, {fire:""}, {vanish:true}]と
// なるようにしてその下にact:[], 〇〇:[],...ってやればいいんじゃない。短くすることに躍起になって目的を見失っては本末転倒。
// つまりparseでmainが"default"ってなってるか調べてなってたら上のやつをぶち込むわけね。その場合はその下にactがある、これが
// 1匹だけ出す敵の挙動、もしくは何かしらの図形、もしくはテキスト、もしくは得体の知れない何かの挙動を。。
// そうでない場合はあちこちに出すみたいな。
// もともと、この「敵を出す何か」をUnitとして扱うのは無理があったし、どうにかしないといけなかったからちょうどいいわね。
// だって色も形もHPもダメージもないものを「Unit」と呼ぶなんてどうかしてるでしょ。全部不要なわけじゃん。それをさ・・・・

// seedが作るノードユニットの抽象化。ユニットではない。ユニットの継承を生成する関数を持っている。何を作るかはセットするファクトリー関数次第で、
// 千変万化、いかようにも。
class Generator{
  constructor(factory){
    this.factory = factory; // ユニットを作る関数。ひな形を作るだけ。それをどう加工するかはptn次第。あとまあ、いろいろと。actionに書く。
    // actionがdefaultな場合は1個作ってすぐ消えてさよならだけど。
    // 一つのパターンにつき一つしか存在しないから別にオフにするだけで消さなくてもいいのか。
  }
  setPattern(ptn){

  }
  execute(){

  }
}

// んー。この流れで行くとUnitんとこと同じこと書く羽目になるわな。。。
// Unitの継承としてGeneratorを書けばいいのか。重複嫌いだし。
// つまりさ、ジェネレータをUnitの一種として書くの、間違いじゃないんだよ。actionの機構とかは変わらず使えるでしょ。そこだけ切り取ればいいのよね。

function parsePatternSeed(seed){
}

function createUnit(ptn){
  let newUnit = unitPool.use();
  newUnit.initialize();
  newUnit.setPattern(ptn);
  mySystem.addUnit(newUnit);
}

function clone(_unit){
  let ptn = {};
  createUnit(ptn);
}

// clone.
// fireの抽象化、要するに分身を作る操作。
// 一度にまとめて作るのはやめて、単独を作る操作に還元した。
// 問題はパラメターとかその辺、たとえば自分と同じタイプだったら内容を変更してコピーするとかあー、やめよう、
// 射出するユニットの内容に関する情報を持ってればいい話でしょ。
// しかしその内容を・・あー、メソッドで微調整できるようにしてさ、そういう内容で変えられるようにすればいいよね。

// たとえば出すのが直線とか三角形ならそういう感じの・・
// 例の弾幕とかの場合だと繰り出すのがbullet系なのはもう決まってて、その内容に関するあれこれを変えるメソッドがあったわけ。
// もしくはenemy. enemyの射出。
// HPやダメージは色や形と紐付けてたからその辺を直接いじるメソッドは煩雑さを避けるために用意しなかったけど。
// shotDirectionとか含めても、敵でも弾丸でも同じように・・色とかも。

// shotUnitType
// 今思いついたのは、shotUnitTypeを変えるときに、まずユニット生成時にセットするパラメータや描画モジュールの内容がある程度決まって、
// それ以降のアレンジメソッドでその内容を「そういうユニットを生成すること前提でもって」書き換えるようにするとか。
// これはこのSymbolBreakerにも通じる話のはず。
// 例えば作るのが弾丸であれば弾丸しか作らない前提でいろいろいじるとか、敵なら敵。
// 敵が敵も弾丸も作る場合もあるけどそれは適宜切り替えるようにしてね。
// OFF:敵を作る 敵：敵や弾丸を作る 弾丸：弾丸を作る。こんな感じ。敵が敵を作るのはバリアを張るとかそういうイメージなんだけど。
// (bindしておくことで親が死ぬと勝手に死ぬ子分を量産するとかそういうイメージ)
// OFFっていうか敵生成っていう種類のユニット。"generator"？そんな感じ。shotUnitType？
// cloneTypeの方が適しているかも？

// 今回の場合だと図形を作るgeneratorと図形、図形は何も生み出さないのでそこで終わり、
// 何も生まない場合はcloneType:undefinedでいいよね。
// たとえばデフォを用意するとか。enemyだったらcloneTypeのデフォはenemyBulletだけど、enemy出すときはenemyになるとか。
// で、generatorはfigureね。直線とか多角形とか月型とか。で、commandでその内容を切り替える感じ。
// パラメータの所にどこまで移動するかとか色はどうするかとかを乗せる感じ。

// ------------------------------------------------ //
// CrossReferenceArray.

class CrossReferenceArray extends Array{
  constructor(){
    super();
  }
  add(element){
    this.push(element);
    element.belongingArray = this; // 所属配列への参照
  }
  addMulti(elementArray){
    // 複数の場合
    elementArray.forEach((element) => { this.add(element); })
  }
  remove(element){
    let index = this.indexOf(element, 0);
    this.splice(index, 1); // elementを配列から排除する
  }
  loop(methodName){
	if(this.length === 0){ return; }
    // methodNameには"update"とか"display"が入る。まとめて行う処理。
	for(let i = 0; i < this.length; i++){
	  this[i][methodName]();
	}
  }
  loopReverse(methodName){
    if(this.length === 0){ return; }
    // 逆から行う。排除とかこうしないとエラーになる。もうこりごり。
    for(let i = this.length - 1; i >= 0; i--){
      this[i][methodName]();
    }
  }
  clear(){
    this.length = 0;
  }
}

// ---------------------------------------------------------------------------------------- //
// loopCounter. ループのcommandについて。

class LoopCounter extends Array{
  constructor(){
    super();
    this.initialize();
  }
  initialize(){
    this.length = 0;
    this.currentIndex = 0;
  }
  getLoopCount(){
    // そのときのloopCountを取得する。0～limit-1が返る想定。
    if(this.currentIndex === this.length){ this.push(0); }
    return this[this.currentIndex];
  }
  loopCheck(limit){
    // countを増やす。limitに達しなければfalseを返す。達するならcountを進める。
    if(this.currentIndex === this.length){ this.push(0); }
    this[this.currentIndex]++;
    if(this[this.currentIndex] < limit){ return false; }
    // limitに達した場合はindexを増やす。
    this.currentIndex++;
    return true;
  }
  loopBack(unit, back){
    // unitのactionIndexをbackだけ戻す。その間にcountプロパティをもつcommandがあったら
    // そのたびにcurrentIndexを1減らしてそこの値を0にならす。
    let {action, actionIndex} = unit;
    for(let i = 1; i <= back; i++){
      const currentCommand = action[actionIndex - i];
      if(currentCommand.hasOwnProperty("count")){
        this.currentIndex--;
        this[this.currentIndex] = 0;
      }
    }
    unit.actionIndex -= back; // 最後にまとめて戻す
  }
}

// ---------------------------------------------------------------------------------------- //
// ObjectPool.
// どうやって使うんだっけ・・

class ObjectPool{
	constructor(objectFactory = (() => ({})), initialCapacity = 0){
		this.objPool = [];
		this.nextFreeSlot = null; // 使えるオブジェクトの存在位置を示すインデックス
		this.objectFactory = objectFactory;
		this.grow(initialCapacity);
	}
	use(){
		if(this.nextFreeSlot == null || this.nextFreeSlot == this.objPool.length){
		  this.grow(this.objPool.length || 5); // 末尾にいるときは長さを伸ばす感じ。lengthが未定義の場合はとりあえず5.
		}
		let objToUse = this.objPool[this.nextFreeSlot]; // FreeSlotのところにあるオブジェクトを取得
		this.objPool[this.nextFreeSlot++] = EMPTY_SLOT; // その場所はemptyを置いておく、そしてnextFreeSlotを一つ増やす。
		return objToUse; // オブジェクトをゲットする
	}
	recycle(obj){
		if(this.nextFreeSlot == null || this.nextFreeSlot == -1){
			this.objPool[this.objPool.length] = obj; // 図らずも新しくオブジェクトが出来ちゃった場合は末尾にそれを追加
		}else{
			// 考えづらいけど、this.nextFreeSlotが0のときこれが実行されるとobjPool[-1]にobjが入る。
			// そのあとでrecycleが発動してる間は常に末尾にオブジェクトが増え続けるからFreeSlotは-1のまま。
			// そしてuseが発動した時にその-1にあったオブジェクトが使われてそこにはEMPTY_SLOTが設定される
			this.objPool[--this.nextFreeSlot] = obj;
		}
	}
	grow(count = this.objPool.length){ // 長さをcountにしてcount個のオブジェクトを追加する
		if(count > 0 && this.nextFreeSlot == null){
			this.nextFreeSlot = 0; // 初期状態なら0にする感じ
		}
		if(count > 0){
			let curLen = this.objPool.length; // curLenはcurrent Lengthのこと
			this.objPool.length += Number(count); // countがなんか変でも数にしてくれるからこうしてるみたい？"123"とか。
			// こうするとかってにundefinedで伸ばされるらしい・・長さプロパティだけ増やされる。
			// 基本的にはlengthはpushとか末尾代入（a[length]=obj）で自動的に増えるけどこうして勝手に増やすことも出来るのね。
			for(let i = curLen; i < this.objPool.length; i++){
				// add new obj to pool.
				this.objPool[i] = this.objectFactory();
			}
			return this.objPool.length;
		}
	}
	size(){
		return this.objPool.length;
	}
}
