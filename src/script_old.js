// オブジェクトプールから取り出して使う感じで。
// FALworksさんの弾幕アニメ作ってみたい

// burstは自分が消滅してなんかbulletを作るやつだから、
// それを書いてみたい。レイド飽きた。

// クリックによりplayerとwholeSystemが初期化されて別のパターンがセットされる。
// programArrayに登録しておく。以上。

// draw時間かかりすぎ・・あと同じようなコードはパラメータでまとめたいし、
// その・・もっと洗練させて・・んー。
// pushpopなくしたら速くなった。なんじゃい。

// setBurstをなくして、burstの中にいろいろ書くようにするってこと。
// defaultBulletPatternのところに別のパターンを入れちゃうってことね。

// テスト初めて使ったわ。bulletのeject処理が全然うまくいってない。やべぇ。
// やっぱ逆走査しないとだめだよなぁ。
// もっとテストコード活用しないとな・・まあ最終的には無くすけど。

let bulletPool;
let wholeSystem;
let controller;

let drawTimeSum = 0;
let drawTimeAverage = 0;
const AVERAGE_CALC_SPAN = 30;

let isLoop = true;
let showInfo = true;

const UPPER_BOUND = 180;
const LOWER_BOUND = 320;
const LEFT_BOUND = 240;
const RIGHT_BOUND = 240;
const CENTER_X = 240;
const CENTER_Y = 180;
const INITIAL_CAPACITY = 600;

const EMPTY_SLOT = Object.freeze(Object.create(null)); // ダミーオブジェクト

function setup(){
	createCanvas(LEFT_BOUND + RIGHT_BOUND, UPPER_BOUND + LOWER_BOUND + 40);
	textSize(16);
	bulletPool = new ObjectPool(() => { return new Bullet(); }, INITIAL_CAPACITY);
	controller = new ProgramController();
	controller.setProgram(0);
  wholeSystem = new System();
	wholeSystem.setting(controller.getProgram());
}

function draw(){
	background(200, 200, 255);
	translate(CENTER_X, CENTER_Y);
	const updateStart = performance.now(); // 時間表示。
	wholeSystem.update();
	const updateEnd = performance.now();
	const drawStart = performance.now(); // 時間表示。
	wholeSystem.draw();
	controller.draw();
	const drawEnd = performance.now();
	if(showInfo){ showPerformanceInfo(updateEnd - updateStart, drawEnd - drawStart); }
}

// ---------------------------------------------------------------------------------------- //
// Change Program.

function mouseClicked(){
	if(mouseY > height || mouseY < height - 40){ return; }
	if(mouseX < 0 || mouseX > width){ return; }
	const newIndex = Math.floor(mouseX / 30);
	if(newIndex < 0 || newIndex > controller.size - 1){ return; }
	controller.setProgram(newIndex);
	wholeSystem.initialize();
	wholeSystem.setting(controller.getProgram());
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

// ---------------------------------------------------------------------------------------- //
// PerformanceInfomation.

function showPerformanceInfo(updateTime, drawTime){
	fill(0);
	text("using:" + wholeSystem.getBulletCapacity(), 0, height / 16);
  const updateTimeStr = updateTime.toPrecision(4);
  const updateInnerText = `${updateTimeStr}ms`;
  text("updateTime:" + updateInnerText, 0, height / 8);
  const drawTimeStr = drawTime.toPrecision(4);
  const drawInnerText = `${drawTimeStr}ms`;
  text("drawTime:" + drawInnerText, 0, height * 3 / 16);
	drawTimeSum += drawTime;
	if(frameCount % AVERAGE_CALC_SPAN === 0){
		drawTimeAverage = drawTimeSum / AVERAGE_CALC_SPAN;
		drawTimeSum = 0;
	}
	const drawTimeAverageStr = drawTimeAverage.toPrecision(4);
  const drawTimeAverageInnerText = `${drawTimeAverageStr}ms`;
  text("drawTimeAverage:" + drawTimeAverageInnerText, 0, height / 4);
}

// ---------------------------------------------------------------------------------------- //
// Player.

class SelfUnit{
	constructor(){
		this.position = createVector(0, 0);
		this.initialize();
	}
	initialize(){
		this.position.set(0, LOWER_BOUND / 2);
		this.speed = 4;
		this.rotationAngle = 0;
		this.rotationSpeed = toRad(2);
	}
	setPosition(x, y){
		this.position.set(x, y);
	}
	getPosition(){
		return {x:this.position.x, y:this.position.y};
	}
	update(){
		this.rotationAngle += this.rotationSpeed;
	  if(keyIsDown(LEFT_ARROW)){ this.position.x -= this.speed; }
		else if(keyIsDown(RIGHT_ARROW)){ this.position.x += this.speed; }
		else if(keyIsDown(UP_ARROW)){ this.position.y -= this.speed; }
		else if(keyIsDown(DOWN_ARROW)){ this.position.y += this.speed; }
	  this.frameIn();
	}
	frameIn(){
		this.position.x = constrain(this.position.x, -LEFT_BOUND, RIGHT_BOUND);
		this.position.y = constrain(this.position.y, -UPPER_BOUND, LOWER_BOUND);
	}
	draw(){
		push();
		stroke(0);
		translate(this.position.x, this.position.y);
		rotate(this.rotationAngle);
		noFill();
		strokeWeight(2);
		rect(-10, -10, 20, 20);
		strokeWeight(4);
		point(0, 0);
		pop();
	}
}

// ---------------------------------------------------------------------------------------- //
// System.
// 初期化の際にはすべてのcannonに対してinitializeを施す。

class System{
	constructor(){
		this.player = new SelfUnit();
		this.cannonArray = new CrossReferenceArray();
	}
	initialize(){
		this.player.initialize();
		this.cannonArray.loop("initialize");
		this.cannonArray.clear(); // cannon自体もなくす・・これでいい？
	}
	setting(program){
		program(this);
	}
	update(){
		this.cannonArray.loop("update");
		this.player.update();
	}
	draw(){
		this.cannonArray.loop("draw");
		this.player.draw();
	}
	getBulletCapacity(){
		let sum = 0;
		this.cannonArray.forEach((cannon) => { sum += cannon.bulletSet.length; })
		return sum;
	}
}

// ---------------------------------------------------------------------------------------- //
// BulletSystem. というかcannon.
// 初期化の際には手持ちのbulletをすべてPoolに戻す。
// ・・だけでなく、いろいろ初期化しないと・・

// bulletを作るメソッド2つも要るのか・・？んー。

class BulletSystem{
	constructor(){
		this.bulletSet = new CrossReferenceArray();
		this.position = createVector();
		this.initialize();
	}
	initialize(){
		this.bulletSet.loopReverse("vanish"); // すべてのbulletを（あれば）Poolに戻す。
		// 以下、固定された発射する弾丸の情報とかいろいろ
		this.bulletSpeed = 0;
		this.bulletSpeedChange = 0;
		this.bulletDirection = 0;
		this.bulletDirectionVelocity = 0;
		// bulletPatternは弾丸の挙動に関する情報。
		this.bulletPattern = defaultBulletPattern; // 必要に応じて変える。
		// これはbodyに関する情報
		this.rotationAngle = 0;
		this.rotationSpeed = toRad(2);
		// フレームカウント
		this.properFrameCount = 0;
		// bodyの動きを記述する・・これも何かしら・・んー。
		this.position.set(0, 0);
		this.radius = 0;
		this.angle = 0;
		// 弾丸の発射の仕方について
		this.pattern = undefined;
	}
	setting(menu){
		// ここでcannonとbulletとかもろもろ用意する
		menu(this);
	}
	createBullet(){
		let newBullet = bulletPool.use();
		newBullet.properFrameCount = 0;
		newBullet.setPosition(this.position.x, this.position.y);
		newBullet.setPolar(this.bulletSpeed, this.bulletDirection);
		newBullet.parent = this; // 親を設定する
		newBullet.setPattern(this.bulletPattern); // パターンを決める。
		newBullet.vanishFlag = false;
		this.bulletSet.add(newBullet);
	}
	resumeBullet(position, speed, direction, bulletPattern = defaultBulletPattern){
		// 弾丸が親経由でbulletを作らせるときに使うメソッド
		let newBullet = bulletPool.use();
		newBullet.properFrameCount = 0;
		newBullet.setPosition(position.x, position.y);
    newBullet.setPolar(speed, direction);
		newBullet.parent = this;
		newBullet.setPattern(bulletPattern); // burstの廃止に伴い変更。burst以外にもパターンあるでしょ。
		// もしくはコンポジットという手もあるな・・切り替わっても面白そうだ・・
		newBullet.vanishFlag = false;
		this.bulletSet.add(newBullet);
	}
	update(){
		this.position.x = this.radius * Math.cos(toRad(this.angle));
		this.position.y = this.radius * Math.sin(toRad(this.angle));
		this.pattern(this); // インターバルの情報はpatternに含めてしまいましょう。
		this.properFrameCount++;
		this.bulletSet.loop("update");
		this.bulletSet.loopReverse("check"); // ここで排除されるはず・・フラグが立っていれば。
		ejectBulletFailed(this);
		this.rotationAngle += this.rotationSpeed;
	}
	drawBody(){
		push();
		translate(this.position.x, this.position.y);
		rotate(this.rotationAngle);
		fill(0);
		rect(-8, -8, 16, 16);
		pop();
	}
	draw(){
		this.drawBody();
		noStroke();
		fill(0, 0, 255); // 弾丸の色を固定する場所は1ヵ所に。
		this.bulletSet.loop("draw");
	}
}

// ---------------------------------------------------------------------------------------- //
// Bullet.
// parentを付けるとか・・
// burstは途中でvanishして何かしらのbulletを生成して親にcreateさせる感じ（？？）
// createBulletのところ・・んー。
// 位置と速度を指定して弾を補充できるようにしたからこれで？
// あるいは、bullet自体がそういう感じにするべき、なのかも？systemとか分けたりしないで。

// 弾丸の挙動は大きく分けて自分自身の移動とバーストによる弾丸放出の2部構成。
// バーストしなければ挙動そのままで画面外に消えるだけ。
// 一定時間で消える処理でもいいけど・・
// バーストの場合は放出される弾丸に移動の挙動やバーストの挙動をインプットする必要がある。
// と同時に自分の親に所属させるための処理も必要になる、まあそんだけでいいってことで。

// シンプルなものから始めよう。いつだって最初は・・

class Bullet{
	constructor(){
		this.direction = 0;
		this.speed = 0;
		this.position = createVector(0, 0);
		this.velocity = createVector(0, 0);
		this.properFrameCount = 0;
		this.pattern = undefined;
		this.vanishFlag = false; // まずフラグを立ててそれから別処理で破棄するようにしないと面倒が起きる。もうたくさん。
	}
	setPosition(x, y){
		this.position.set(x, y);
	}
	setVelocity(vx, vy){
		this.velocity.set(vx, vy);
	}
	setPolar(speed, angle){
		// angleはdegree指定
		this.speed = speed;
		this.direction = toRad(angle);
		this.velocity.set(this.speed * Math.cos(this.direction), this.speed * Math.sin(this.direction));
	}
	setPattern(newPattern){
		this.pattern = newPattern;
	}
	update(){
		ejectedBulletUpdated(this); // vanishした後も排除されずにupdateされてないかどうか調べるテストコード
		this.properFrameCount++;
		this.pattern(this);
		if(!this.isInFrame()){ this.vanishFlag = true; } // ここではフラグを立てるだけにする。直後に破棄する。
	}
	check(){
		if(this.vanishFlag){ this.vanish(); }
	}
	vanish(){
		// 自分をPoolに戻した後で自分を親から排除する
		this.belongingArray.remove(this);
		bulletPool.recycle(this);
	}
	draw(){
		// push/popは遅いのでやめる
		const x = this.position.x;
		const y = this.position.y;
		const c = Math.cos(this.direction);
		const s = Math.sin(this.direction);
		triangle(x + 6 * c, y + 6 * s, x - 6 * c + 3 * s, y - 6 * s - 3 * c, x - 6 * c - 3 * s, y - 6 * s + 3 * c);
	}
	isInFrame(){
		// フレーム外に出たときの排除処理
		if(this.position.x < -LEFT_BOUND - 10 || this.position.x > RIGHT_BOUND + 10){ return false; }
		if(this.position.y < -UPPER_BOUND - 10 || this.position.y > LOWER_BOUND + 10){ return false; }
		return true;
	}
}

// ---------------------------------------------------------------------------------------- //
// ProgramController.

class ProgramController{
	constructor(){
		this.index = 0;
		this.size = 0;
		this.programArray = [];
		this.currentProgram = undefined;
		this.preparation();
	}
	preparation(){
	  const menuArray = [menu1, menu2, menu3, menu4, menu5, menu8];
		menuArray.forEach((menu) => {
			const singleProgram = singleMenu(menu);
			this.programArray.push(singleProgram);
		})
		const multiMenuArray = [[menu6, menu7], [menu16, menu17]];
		multiMenuArray.forEach((menuArray) => {
			const multiProgram = multiMenu(menuArray);
			this.programArray.push(multiProgram);
		})
		this.size = this.programArray.length;
	}
	setProgram(newIndex){
		this.index = newIndex;
		this.currentProgram = this.programArray[this.index];
	}
	getProgram(){
		return this.currentProgram;
	}
	draw(){
		const y = LOWER_BOUND;
		push();
		for(let i = 0; i < this.size; i++){
			const x = -LEFT_BOUND + i * 30;
			if(i === this.index){ fill(0, 0, 255); }else{ fill(i * 15); }
			rect(x, y, 25, 40);
		}
		pop();
	}
}

function singleMenu(menu){
	return (_system) => {
		let cannon = new BulletSystem();
		cannon.setting(menu);
		_system.cannonArray.add(cannon);
	}
}

function multiMenu(menuArray){
	return (_system) => {
		menuArray.forEach((menu) => {
			let cannon = new BulletSystem();
			cannon.setting(menu);
			_system.cannonArray.add(cannon);
		})
	}
}

// ------------------------------- //
// ???
// オブジェクトとパーサーを作りたい。まずは単純なやつから。目的はまず・・最初のランダムぎゅーんってやつ。
// [2]: 2. [3, 6]: 3から6までのどれかの実数. [3, 9, 1]: 3から9まで間隔1でどれかを取る（3, 4, ..., 9)
// って感じで数指定を表現できるじゃんね。それでいけるんじゃない。
// 何に何を指示するのかイミフ。却下！！！！

// たとえば直進、画面外で消滅。これだけの場合。
// {speed:3, direction:30}で30°方向にスピード3で直進ってなるとする。
// この場合、えー・・bulletに{speed:3, direction:30}を渡すとそういうふうになる的な？
// systemが発射するんだっけ・・インターバル指定。そして、endlessなのかある程度発射して終わりなのか考えるとか。
// endlessかlimitedみたいな。countが正の場合は1減らす、countが0の場合はreturn, endlessはcount=-1としていけそう。
// {endless:{loop:{count:2, pattern:{shot_velocity:["set", [3, 6], [0, 360]], fire:unit?}}, wait:1}}
// 初期設定はショットの速度は方向0大きさ0でしておいて・・"set"ならその値にする、"add"ならその値を加える感じ。
// [a]は値a,[a,b]はa~bランダム、[a,b,i]はi刻みでa~bランダム(Math.floor((b-a)/i)*i)って感じ。
// {limited:{count:20, loop:{count:10, shot_velocity:["add", [0.1], [0]]}, wait:4}}とかいって。

// あれに縛られてると・・あれも不完全だから（得られる情報が、という意味）・・んー。
// 組み込み先はbulletSystemというかcannon, これ統一したほうがいいな。Cannonでクラス名にしたいね。
// Cannonについて、第一階層：弾丸を無限に発射するのか、限界があるのか。
// 動くのか動かないのか、動くとしてどんな風に？
// waitが3なら3ターンおき、とかそういうの？厳密に、厳密に・・んー。

// シンプルにやりたい！！！！！！！！！！！！！！！！！！！！！！！！！！え
// 動きと発射は別々、これを2本柱とし、挙動は適宜合わせる
// 弾丸の挙動も動きと発射（つまりバースト）を別々にする。これでいけるはず。これでいこう。

// {move:..., fire:...{bulletのところに{move:..., fire:...}}}以下続く
// move:isMove:falseで動かない感じ。最初の例とか。fireはたとえばtype:"endlessLoop"なら一定間隔で発射し続ける感じ。
// endlessLoopを検知した後の処理は別の関数にするとか。
// type:"endlessLoop", interval:1, pattern:弾丸はどんなのにする？fire:isFire:falseなら何もしない、感じの。
// vanishしないといけない。画面外に出たらvanishなのか一定時間後にvanishなのかとかその辺。
// 画面外vanishはデフォルトでいいよ・・moveのプロパティに含めて。vanish:-1なら時間では消えない、60なら60フレームで消えるとか。
// 一定進んでからとかは・・waitを使う。wait命令があるとその間は速度を加えるだけ、みたいな。

// waitって何ですか先生！waitとはfireの直後にセットされるカウンターで正だと毎フレーム減らされる、0になったら次のfireを
// 実行できるやつだよ（つまりfire前提）。countが設定されてるならそれが減っていって0になったらvanishする。
// しかしcountが-1の場合それは減らず、延々と続ける。画面外に消えるまで・・
// moveにwaitがある場合はそれが0になるまではただ動くだけって感じの・・？
// それが終わった後でfireが始まってfireの間は意味が変わるとかすれば表現力高そう。
// ??fireはwaitの方だけ・・だよね。よく考えたら。で・・
// wait:30, pattern:... で？ loop: {count: pattern:}, wait:だったらcountだけpatternでbulletを作ってから..
// endlessLoopであればそのサイクルを繰り返す形になる。おわり。

// moveプロパティにwaitがあったらカウンターがセットされてそれだけのあとでfireに進む感じ。
// fireの中のloopの中の・・waitについてはそれを検知したらcounterにセットされてそれが毎回減ってとかそういう。

// {move: isMove:false, fire: isFire:true, type:"endlessLoop", pattern:{loop:{count:2, pattern:A}, wait:1}}
// A = {speed:[3, 6], direction:[0, 360]}

// updateのところにmoveとfireって書くんじゃないかな。で、isMoveやisFireがfalseならスルーみたいな。

// move: isMove:true, circle: {中心とか回る方向とか周期とかその辺}

function interpreter(obj){
	// obj（json形式）からsystemに登録するもろもろの情報を構成する。
	// たとえば中心から動かずに1フレームにつき2発を勝手な方向に速さ3～6で発射とか、
	// 解析の結果そういう風になったら嬉しいねみたいなやつ。
}

// ---------------------------------------------------------------------------------------- //
// program menu.
// ていうかprogramとすべきなんじゃ・・ここ以下のpatternのところを汎用的にして、
// さらにそれを解釈する機構を作りたいんだけど。それができれば大きく前進できる。
// パターン増やす前にそっちやりたい感ある。そうすれば自由自在なのに。

function menu1(_cannon){
	_cannon.pattern = pattern1;
}

function menu2(_cannon){
	_cannon.bulletSpeed = 2;
	_cannon.pattern = pattern2;
}

function menu3(_cannon){
	_cannon.bulletSpeed = 2;
	_cannon.bulletDirection = 0;
	_cannon.pattern = pattern3;
}

function menu4(_cannon){
	_cannon.bulletSpeed = 2;
	_cannon.bulletDirection = 0;
	_cannon.bulletDirectionVelocity = 12;
	_cannon.angle = 0;
	_cannon.radius = 60;
	_cannon.pattern = pattern4;
}

function menu5(_cannon){
	_cannon.bulletSpeed = 2;
	_cannon.bulletDirection = 0;
	_cannon.bulletDirectionVelocity = 2;
	_cannon.bulletPattern = bulletPattern1;
	_cannon.pattern = pattern5;
}

function menu6(_cannon){
	_cannon.radius = 60;
	_cannon.angle = 0;
	_cannon.pattern = pattern6;
}

function menu7(_cannon){
	_cannon.radius = 60;
	_cannon.angle = 180;
	_cannon.pattern = pattern7;
}

function menu8(_cannon){
	_cannon.bulletSpeed = 5;
	_cannon.bulletPattern = bulletPattern2;
	_cannon.pattern = pattern8;
}

function menu9(_cannon){
	_cannon.bulletSpeed = 6;
	_cannon.bulletDirection = 0;
	_cannon.bulletDirectionVelocity = 15;
	_cannon.bulletPattern = bulletPattern3;
	_cannon.pattern = pattern9;
}

function menu16(_cannon){
	_cannon.bulletSpeed = 2;
	_cannon.bulletDirection = -90;
	_cannon.bulletDirectionVelocity = -12;
	_cannon.angle = 180;
	_cannon.radius = 120;
	_cannon.pattern = pattern17;
}

function menu17(_cannon){
	_cannon.bulletSpeed = 2;
	_cannon.bulletDirection = 90;
	_cannon.bulletDirectionVelocity = 12;
	_cannon.angle = 0;
	_cannon.radius = 120;
	_cannon.pattern = pattern17;
}

// ---------------------------------------------------------------------------------------- //
// pattern.

function pattern1(_cannon){
	const fc = _cannon.properFrameCount;
	if(fc % 1 === 0){
		let loopCount = 2;
		while(loopCount-- > 0){
			_cannon.bulletSpeed = randomRange(3, 6);
			_cannon.bulletDirection = randomRange(0, 360);
			_cannon.createBullet();
		}
	}
}

function pattern2(_cannon){
	const fc = _cannon.properFrameCount;
	if(fc % 60 === 0){
		// 60フレームおきに16個の方向に7WAYを繰り出す。
		// mainDirectionはランダム。自機狙いでもいいかも。
		const radial = 16;
		let mainDirection = 360 * Math.random();
		let loopCount = radial;
		while(loopCount-- > 0){
			// 7WAY
			let ways = 7;
			let intervalAngle = 2;
			_cannon.bulletDirection = mainDirection - 0.5 * (ways - 1) * intervalAngle;
			while(ways-- > 0){
				_cannon.createBullet();
				_cannon.bulletDirection += intervalAngle;
			}
			mainDirection += 360 / radial;
		}
	}
}

function pattern3(_cannon){
	const fc = _cannon.properFrameCount;
	if(fc % 96 === 0){
		_cannon.bulletDirectionVelocity = 0.5;
	}else if(fc % 96 === 48){
		_cannon.bulletDirectionVelocity = -0.5;
	}
	if(fc % 4 === 0 && fc % 48 < 32){
		const radial = 16;
		let loopCount = radial;
		while(loopCount-- > 0){
			_cannon.createBullet();
			_cannon.bulletDirection += 360 / radial;
		}
	}
	_cannon.bulletDirection += _cannon.bulletDirectionVelocity;
}

function pattern4(_cannon){
	const fc = _cannon.properFrameCount;
	_cannon.angle += 2;
	if(fc % 1 === 0){
    _cannon.createBullet();
		_cannon.bulletDirection *= -1;
    _cannon.createBullet();
		_cannon.bulletDirection *= -1;
	}
	_cannon.bulletDirection += _cannon.bulletDirectionVelocity;
}

function pattern5(_cannon){
	const fc = _cannon.properFrameCount;
	if(fc % 8 === 0){
		const radial = 5;
		let loopCount = radial;
		let initialDirection = _cannon.bulletDirection;
		while(loopCount-- > 0){
			_cannon.createBullet();
			_cannon.bulletDirection += 360 / radial;
		}
		_cannon.bulletDirection = initialDirection;
	}
	_cannon.bulletDirection += _cannon.bulletDirectionVelocity;
}

// lineっていうのを・・
function pattern6(_cannon){
	const fc = _cannon.properFrameCount;
	_cannon.angle += 2;
	if(fc % 96 > 32){ return; } // 0, 4, 8, 12, 16, 20, 24, 28.
	if(fc % 4 === 0){
		_cannon.bulletDirection = getPlayerAimAngle(_cannon.position);
		const initialSpeed = 5;
		_cannon.bulletSpeed = initialSpeed;
		const count = 7;
		let n = count;
		while(n-- > 0){
			_cannon.createBullet();
			_cannon.bulletSpeed += 0.3;
		}
	}
}

// lineっていうのを・・
function pattern7(_cannon){
	const fc = _cannon.properFrameCount;
	_cannon.angle -= 2;
	if(fc % 96 < 48 || fc % 96 > 80){ return; } // 48, 52, etc...
	if(fc % 4 === 0){
		_cannon.bulletDirection = getPlayerAimAngle(_cannon.position);
		const initialSpeed = 5;
		_cannon.bulletSpeed = initialSpeed;
		const count = 7;
		let n = count;
		while(n-- > 0){
			_cannon.createBullet();
			_cannon.bulletSpeed += 0.3;
		}
	}
}

// 3つの方向に射出、30フレーム間隔、45°おき、方向はこっちの位置-120～120で、30フレーム後にバースト、
// バーストではこっちの方向-30～30の方向になんか・・わからん！
function pattern8(_cannon){
	const fc = _cannon.properFrameCount;
	if(fc % 30 === 0){
		const pivotDirection = getPlayerAimAngle(_cannon.position, 120);
		const ways = 3;
		const intervalAngle = 45;
		let loopCount = ways;
		_cannon.bulletDirection = pivotDirection - 0.5 * (ways - 1) * intervalAngle;
		while(loopCount-- > 0){
			_cannon.createBullet();
			_cannon.bulletDirection += intervalAngle;
		}
	}
}

// 7つの方向に射出、そのあと2WAYで分裂を3回くりかえしたのち直進
function pattern9(_cannon){
	const fc = _cannon.properFrameCount;
	if(fc % 48 === 0){
		//ここで7つの方向に1発だけ弾を発射するみたい。32フレーム後に消滅する。
		// というかあのコードだとその場にとどめる？それが4フレームおきに8発？スピード6？
		// ある程度進む→2方向にスプリット→ある程度進む→2方向にスプリット・・
		// 最後は直進する弾
		// とりあえず真下で作ってみてそれから7方向にするとか。
		_cannon.bulletDirection += _cannon.bulletDirectionVelocity; /* 15 */ }
}

function pattern17(_cannon){
	const fc = _cannon.properFrameCount;
	_cannon.angle += -3;
	if(fc % 1 === 0){
		_cannon.bulletDirection += _cannon.bulletDirectionVelocity;
		_cannon.createBullet();
	}
}

// ---------------------------------------------------------------------------------------- //
// bulletPattern.
// デフォルトは速度を加えるだけ。

function defaultBulletPattern(_bullet){
	_bullet.position.add(_bullet.velocity);
}

function bulletPattern1(_bullet){
	// 4つの方向にばーん
	_bullet.position.add(_bullet.velocity);
	if(_bullet.properFrameCount < 60){ return; }
	const ways = 4;
	const intervalAngle = 12;
	let direction = toDeg(_bullet.direction) - 0.5 * (ways - 1) * intervalAngle;
	let loopCount = ways;
	while(loopCount-- > 0){
		_bullet.parent.resumeBullet(_bullet.position, _bullet.speed, direction);
		direction += intervalAngle;
	}
	_bullet.vanishFlag = true;
}

function bulletPattern2(_bullet){
	// スピードを0.5ずつ増しつつ24発・・？intervalFramesが2だから2フレームおき。
	// limitCountを24に設定して、properが2で割り切れるときだけ弾丸を作り、・・んー。
	// 31で実行されてる・・・？vanishFlagがtrueなのに排除されずにここに来てるね。
	_bullet.position.add(_bullet.velocity);
	if(_bullet.properFrameCount < 30){ return; }
	if(_bullet.properFrameCount === 30){
		_bullet.burst = {count:24, interval:2, pattern:burst2, speed:5};
		_bullet.burst.speedChange = 0.5;
		_bullet.burst.direction = getPlayerAimAngle(_bullet.position, 30);
		_bullet.setPolar(0, _bullet.burst.direction);
	}
	if((_bullet.properFrameCount - 30) % _bullet.burst.interval === 0){
		_bullet.burst.pattern(_bullet);
		_bullet.burst.count--;
		if(_bullet.burst.count === 0){
			_bullet.vanishFlag = true;
			delete _bullet.burst;
    }
	}
	// burstの中でcountを減らして0になったらvanishFlag=true.
}

function bulletPattern3(_bullet){

}

// ---------------------------------------------------------------------------------------- //
// burst.
// burst = {count:24, interval:2, pattern:...}

function burst2(_bullet){
	_bullet.parent.resumeBullet(_bullet.position, _bullet.burst.speed, _bullet.burst.direction);
	_bullet.burst.speed += _bullet.burst.speedChange;
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
    //objToUse.initialize(); // 個別のイニシャライズ処理を追加
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

// ---------------------------------------------------------------------------------------- //
// Cross Reference Array.
// 使い方・・

// 配列クラスを継承して、要素を追加するときに自動的に親への参照が作られるようにしたもの
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
// Utility.

function toRad(degree){
	return degree * Math.PI / 180;
}

function toDeg(radian){
	return radian * 180 / Math.PI;
}

function getPlayerDirection(pos){
	// posからplayer.positionに向かう方向角
	return atan2(wholeSystem.player.position.y - pos.y, wholeSystem.player.position.x - pos.x);
}

function getPlayerAimAngle(pos, margin = 0){
	// posは射出するユニットの位置(x:, y:)で、marginは振れ幅(Degree)、たとえば30とか120とか。
	// 返す角度はDegreeで与えられる。
  const aimAngle = atan2(wholeSystem.player.position.y - pos.y, wholeSystem.player.position.x - pos.x);
	return (aimAngle * 180 / Math.PI) - Math.random() * 2 * margin + margin;
}

function randomRange(a, b){
	// a以上b以下のfloatをランダムで返す(a<b前提)
	return a + Math.random() * (b - a);
}

// ---------------------------------------------------------------------------------------- //
// test.
// いろんなテスト。

// bulletがフラグ立ってるのにupdateを実行しちゃうとまずいからそこら辺のテスト
function ejectedBulletUpdated(_bullet){
	if(_bullet.vanishFlag){ console.log("ejected bullet updated!"); }
	return;
}

// bulletSystemがcheckしたあとに排除フラグの立っているbulletがあればエラーを返す感じ。
function ejectBulletFailed(_cannon){
	for(let i = 0; i < _cannon.bulletSet.length; i++){
		if(_cannon.bulletSet[i].vanishFlag){ console.log("eject bullet failed!"); break; }
	}
}
