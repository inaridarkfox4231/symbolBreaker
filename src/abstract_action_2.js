// やり直し。

// アイデア
// Systemをプログラムのたびに継承して必要な機能を付け加える形にする。そうすればグローバルどうのこうのっていう
// 問題からは解放されるよ。
// あとオブジェクトプールを直接updateやdrawに使う方法についても検討するべき。いちいち出し入れしなくてもいいと思う。

// 流れは・・？いい加減、始めたい。
// まずSystemはメインループではupdateとexecuteとdrawを行う。
// update:情報の更新
// execute:actionループを進める、実行する
// draw:描画する

// ejectとか排除系は挟むならdrawの前かな。描画しない的な。

// 作りたいものが分からん
// ていうかあれ、弾幕バリエーションを作るとして、それは何を作ったことになるのかっていうね。そういうのをある程度はっきりさせないと
// 何も作れないし何も始まらんよね。
// たとえば今目標にしてる、色んな図形がはじっこから回転しながら出てきて回転を止めてまた消えていくっていうのをたくさん作るんだったら
// そういうの作るとはどういうことかとかいろいろはっきりさせないとね。

// わかった
// 具体的にするわ。
// あちこちに円が出たり消えたり
// 次は三角形が出たり消えたり
// 次は三角形が回転しながら現れて出てまた回転しながら消える
// 次は正方形が・・（以下略）

// いい加減何でもいいから形にしてくれって感じ

// ------------------------Global------------------------ //

const AREA_WIDTH = 640;
const AREA_HEIGHT = 480;
let base;

// ------------------------Unit------------------------ //

// actionを実行するだけ。updateやdrawは用意するだけ（abstractってやつ）
class Unit{
  constructor(){
    this.counter = new LoopCounter();
  }
  initialize(){

  }
  setPattern(){

  }
  update(){

  }
  execute(){

  }
  draw(){

  }
}

// ------------------------Generator------------------------ //

class Generator extends Unit{
  constructor(){
    super();
  }
}

// ------------------------System------------------------ //
// プログラムのたびに継承して使う。
// じゃあベースには何をもってくるのさ

class System{
  constructor(){

  }
}

// ------------------------Command------------------------ //
// 命令は最初からクラスで書こうね。で、必要なものをその都度継承で用意する的な？
// で、どんなコマンドが出るかっていうのを・・それも個別に・・うん。だから根っこは共通で葉っぱだけ取り替えるイメージ。

class Command{
  constructor(){

  }
  execute(){

  }
}

// ------------------------Parser------------------------ //
// パーサーってクラスにした方がいいのかしら。関数にすると何かとあれよね。うん。メソッドがばらけちゃうんでね・・
// で、どんな略式命令からどんなコマンドを出すかっていうのを辞書形式で持たせてパースの際にその情報を使うようにするとか。

// seedの解釈
class Parser{
  constructor(){

  }
}

// ------------------------Utility------------------------ //

// ここは関数でいいか。
// プログラムによって色々
function createUnit(ptn){

}

// ------------------------Setup & Draw------------------------ //

function setup(){
  createCanvas(AREA_WIDTH, AREA_HEIGHT);
  base = createGraphics(AREA_WIDTH, AREA_HEIGHT);
  base.background(220);
  textSize(32);
  textAlign(CENTER, CENTER);
}

function draw(){
  clear();
  image(base, 0, 0);
  text("進捗ダメです", AREA_WIDTH * 0.5, AREA_HEIGHT * 0.5);
}

// ------------------------Loop Counter------------------------ //
// ループのcommandについて。
// 仕様まとめといてね。構造的にはスタックです。

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
